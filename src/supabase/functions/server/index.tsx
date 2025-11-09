import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient, type User } from "npm:@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { "X-Client-Info": "fitness-edge" } },
});

const app = new Hono();
app.use("*", cors());
app.use("*", logger());

type UserRole = "pt" | "client";

type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  motivation_style: string | null;
  training_frequency_goal: number | null;
  current_streak_weeks: number | null;
  longest_streak_weeks: number | null;
  prefers_metric_units: boolean | null;
  created_at: string;
  updated_at: string;
};

type RoutineSummary = {
  id: string;
  name: string;
  ptId: string;
  clientId: string;
  exercises: Array<{
    id: string;
    exerciseId: string;
    name: string;
    notes: string | null;
    defaultRestSeconds: number | null;
    sets: Array<{
      setNumber: number;
      reps: string;
      rest: string;
      targetWeight: number | null;
    }>;
  }>;
};

type HealthLog = {
  id: string;
  client_id: string;
  injury_title: string;
  details: string | null;
  status: "ACUTE" | "LINGERING" | "RESOLVED";
  logged_at: string;
  created_by_pt: string | null;
};

type StreakStats = {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  totalWorkouts: number;
};

type WeeklyGoalStats = {
  goal: number;
  completed: number;
  weekStart: string;
};

async function extractAuthContext(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return { error: { status: 401, message: "No token provided" } };
  }

  const token = authHeader.replace("Bearer", "").trim();
  if (!token) {
    return { error: { status: 401, message: "Invalid token" } };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: { status: 401, message: "Unauthorized" } };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error", profileError);
    return { error: { status: 500, message: "Failed to load profile" } };
  }

  if (!profile) {
    return { error: { status: 404, message: "Profile not found" } };
  }

  return { authUser: data.user, profile: profile as ProfileRow };
}

function serializeUser(authUser: User, profile: ProfileRow, extra: Record<string, unknown> = {}) {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    name: profile.full_name,
    full_name: profile.full_name,
    training_frequency_goal: profile.training_frequency_goal,
    current_streak_weeks: profile.current_streak_weeks,
    longest_streak_weeks: profile.longest_streak_weeks,
    prefers_metric_units: profile.prefers_metric_units,
    ...extra,
  };
}

function startOfWeek(date: Date): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  result.setUTCDate(result.getUTCDate() - diff);
  return result;
}

function formatSets(
  exercise: any,
  defaultRestSeconds: number | null,
): Array<{ setNumber: number; reps: string; rest: string; targetWeight: number | null }> {
  const sets = Array.isArray(exercise.routine_exercise_sets)
    ? exercise.routine_exercise_sets
    : [];

  if (sets.length > 0) {
    return sets
      .sort((a: any, b: any) => a.set_number - b.set_number)
      .map((set: any) => {
        const reps = set.target_rep_range
          || (set.target_reps ? String(set.target_reps) :
            formatRepsFallback(exercise.prescribed_reps_min, exercise.prescribed_reps_max));
        const restSeconds = set.target_rest_seconds ?? exercise.prescribed_rest_seconds ?? defaultRestSeconds;
        return {
          setNumber: set.set_number,
          reps,
          rest: restSeconds != null ? String(restSeconds) : "",
          targetWeight: set.target_weight ?? exercise.prescribed_weight ?? null,
        };
      });
  }

  const totalSets = exercise.prescribed_sets ?? 0;
  const fallbackReps = formatRepsFallback(exercise.prescribed_reps_min, exercise.prescribed_reps_max);
  const restSeconds = exercise.prescribed_rest_seconds ?? defaultRestSeconds;

  return Array.from({ length: totalSets }, (_, index) => ({
    setNumber: index + 1,
    reps: fallbackReps,
    rest: restSeconds != null ? String(restSeconds) : "",
    targetWeight: exercise.prescribed_weight ?? null,
  }));
}

function formatRepsFallback(min: number | null, max: number | null): string {
  if (min && max && min !== max) {
    return `${min}-${max}`;
  }
  if (min) {
    return String(min);
  }
  return "10";
}

async function fetchClientAssignment(clientId: string) {
  const { data, error } = await supabase
    .from("pt_clients")
    .select("pt_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Error loading PT assignment", error);
    return null;
  }

  return data?.pt_id ?? null;
}

async function fetchClientRoutines(clientId: string): Promise<RoutineSummary[]> {
  const { data, error } = await supabase
    .from("routines")
    .select(`
      id,
      pt_id,
      client_id,
      routine_name,
      routine_exercises (
        id,
        exercise_id,
        position,
        notes,
        prescribed_sets,
        prescribed_reps_min,
        prescribed_reps_max,
        prescribed_weight,
        prescribed_rest_seconds,
        exercise:exercises_catalog (
          id,
          name,
          instruction_notes,
          default_rest_seconds
        ),
        routine_exercise_sets (
          set_number,
          target_reps,
          target_rep_range,
          target_weight,
          target_rest_seconds
        )
      )
    `)
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching routines", error);
    throw new Error("Failed to fetch routines");
  }

  return (data || []).map((routine: any) => {
    const exercises = (routine.routine_exercises || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((exercise: any) => {
        const defaultRestSeconds = exercise.exercise?.default_rest_seconds ?? null;
        return {
          id: exercise.id,
          exerciseId: exercise.exercise_id,
          name: exercise.exercise?.name ?? "Exercise",
          notes: exercise.notes ?? exercise.exercise?.instruction_notes ?? null,
          defaultRestSeconds,
          sets: formatSets(exercise, defaultRestSeconds),
        };
      });

    return {
      id: routine.id,
      name: routine.routine_name,
      ptId: routine.pt_id,
      clientId: routine.client_id,
      exercises,
    };
  });
}

async function fetchClientSessions(clientId: string) {
  const { data, error } = await supabase
    .from("session_logs")
    .select("id, routine_id, performed_at")
    .eq("client_id", clientId)
    .order("performed_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions", error);
    throw new Error("Failed to fetch session logs");
  }

  return data || [];
}

function computeStreakStats(sessionLogs: Array<{ performed_at: string }>): StreakStats {
  if (!sessionLogs.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      totalWorkouts: 0,
    };
  }

  const uniqueDates = Array.from(
    new Set(sessionLogs.map((log) => new Date(log.performed_at).toISOString().split("T")[0])),
  );

  const uniqueDatesAsc = [...uniqueDates].sort();
  const uniqueDatesDesc = [...uniqueDates].sort().reverse();
  const todayStr = new Date().toISOString().split("T")[0];

  let longestStreak = 0;
  let streakCounter = 0;
  let previousDate: Date | null = null;

  uniqueDatesAsc.forEach((dateStr) => {
    const currentDate = new Date(dateStr + "T00:00:00.000Z");
    if (!previousDate) {
      streakCounter = 1;
    } else {
      const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000));
      streakCounter = diffDays === 1 ? streakCounter + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, streakCounter);
    previousDate = currentDate;
  });

  let currentStreak = 0;
  if (uniqueDatesDesc[0] === todayStr) {
    currentStreak = 1;
    let expectedDate = new Date(todayStr + "T00:00:00.000Z");
    for (let i = 1; i < uniqueDatesDesc.length; i += 1) {
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
      const expectedStr = expectedDate.toISOString().split("T")[0];
      if (uniqueDatesDesc[i] === expectedStr) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastWorkoutDate: uniqueDatesDesc[0] ?? null,
    totalWorkouts: sessionLogs.length,
  };
}

function computeWeeklyGoal(
  profile: ProfileRow,
  sessionLogs: Array<{ performed_at: string }>,
  routineCount: number,
): WeeklyGoalStats {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const completed = sessionLogs.filter((log) => {
    const performed = new Date(log.performed_at);
    return performed >= weekStart && performed < weekEnd;
  }).length;

  const goal = profile.training_frequency_goal && profile.training_frequency_goal > 0
    ? profile.training_frequency_goal
    : routineCount;

  return {
    goal,
    completed,
    weekStart: weekStart.toISOString(),
  };
}

async function fetchClientDashboard(profile: ProfileRow): Promise<{
  routines: RoutineSummary[];
  streak: StreakStats;
  weeklyGoal: WeeklyGoalStats;
}> {
  const [routines, sessions] = await Promise.all([
    fetchClientRoutines(profile.id),
    fetchClientSessions(profile.id),
  ]);

  const streak = computeStreakStats(sessions);
  const weeklyGoal = computeWeeklyGoal(profile, sessions, routines.length);

  return { routines, streak, weeklyGoal };
}

async function fetchRoutineDetail(routineId: string, clientId: string): Promise<RoutineSummary | null> {
  const routines = await fetchClientRoutines(clientId);
  return routines.find((routine) => routine.id === routineId) ?? null;
}

async function fetchLastWorkout(clientId: string, routineId: string, routine: RoutineSummary) {
  const { data, error } = await supabase
    .from("session_logs")
    .select(`
      id,
      performed_at,
      session_log_sets (
        exercise_id,
        set_number,
        logged_weight,
        logged_reps,
        logged_rpe,
        actual_rest_seconds
      )
    `)
    .eq("client_id", clientId)
    .eq("routine_id", routineId)
    .order("performed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching last workout", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const exercises = routine.exercises.map((exercise) => {
    const sets = (data.session_log_sets || [])
      .filter((set: any) => set.exercise_id === exercise.exerciseId)
      .sort((a: any, b: any) => a.set_number - b.set_number)
      .map((set: any) => ({
        setNumber: set.set_number,
        reps: set.logged_reps ?? 0,
        weight: Number(set.logged_weight ?? 0),
        rpe: set.logged_rpe,
        rest: set.actual_rest_seconds,
      }));

    return {
      exerciseId: exercise.exerciseId,
      sets,
    };
  });

  return {
    id: data.id,
    performedAt: data.performed_at,
    exercises,
  };
}

async function createNotification(params: {
  userId: string;
  type: string;
  title?: string;
  message: string;
  clientId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title ?? null,
    message: params.message,
    client_id: params.clientId ?? null,
    metadata: params.metadata ?? null,
  });

  if (error) {
    console.error("Failed to create notification", error, params);
  }
}

app.post("/make-server-d58ce8ef/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();

    if (!email || !password || !name || !role) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    if (role !== "pt" && role !== "client") {
      return c.json({ error: "Invalid role" }, 400);
    }

    const loweredEmail = String(email).toLowerCase();

    const { data, error } = await supabase.auth.admin.createUser({
      email: loweredEmail,
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });

    if (error || !data.user) {
      console.error("Signup error", error);
      return c.json({ error: error?.message ?? "Failed to create user" }, 400);
    }

    const insertProfile = await supabase.from("profiles").insert({
      id: data.user.id,
      role,
      full_name: name,
      email: loweredEmail,
      training_frequency_goal: role === "client" ? 3 : null,
    });

    if (insertProfile.error) {
      console.error("Profile insert error", insertProfile.error);
      return c.json({ error: "Failed to create profile" }, 400);
    }

    return c.json({
      user: {
        id: data.user.id,
        email: loweredEmail,
        role,
        name,
      },
    });
  } catch (error) {
    console.error("Signup exception", error);
    return c.json({ error: "Server error during signup" }, 500);
  }
});

app.get("/make-server-d58ce8ef/auth/user", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { authUser, profile } = context;
  const ptId = profile.role === "client" ? await fetchClientAssignment(profile.id) : null;

  return c.json({
    user: serializeUser(authUser, profile, { pt_id: ptId }),
  });
});

app.get("/make-server-d58ce8ef/client/dashboard", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { authUser, profile } = context;

  if (profile.role !== "client") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const dashboard = await fetchClientDashboard(profile);
    return c.json(dashboard);
  } catch (error) {
    console.error("Client dashboard error", error);
    return c.json({ error: "Failed to load dashboard" }, 500);
  }
});

app.get("/make-server-d58ce8ef/client/session/:routineId", async (c) => {
  const routineId = c.req.param("routineId");
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "client") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const routine = await fetchRoutineDetail(routineId, profile.id);
    if (!routine) {
      return c.json({ error: "Routine not found" }, 404);
    }

    const lastWorkout = await fetchLastWorkout(profile.id, routineId, routine);
    return c.json({ routine, lastWorkout });
  } catch (error) {
    console.error("Session lookup error", error);
    return c.json({ error: "Failed to load session" }, 500);
  }
});

app.post("/make-server-d58ce8ef/client/log-workout", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "client") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const body = await c.req.json();
    const routineId = body.routineId as string;
    const exercises = Array.isArray(body.exercises) ? body.exercises : [];
    const performedAt = body.date ? new Date(body.date).toISOString() : new Date().toISOString();

    const routine = await fetchRoutineDetail(routineId, profile.id);
    if (!routine) {
      return c.json({ error: "Routine not found" }, 404);
    }

    const ptId = routine.ptId ?? null;

    const { data: insertedLog, error: logError } = await supabase
      .from("session_logs")
      .insert({
        routine_id: routineId,
        client_id: profile.id,
        pt_id: ptId,
        performed_at: performedAt,
      })
      .select("id")
      .single();

    if (logError || !insertedLog) {
      console.error("Log workout error", logError);
      return c.json({ error: "Failed to log workout" }, 500);
    }

    const sessionLogId = insertedLog.id;

    const setsPayload: any[] = [];
    exercises.forEach((exercise: any) => {
      const routineExercise = routine.exercises.find((ex) =>
        ex.id === exercise.routineExerciseId || ex.exerciseId === exercise.exerciseId || ex.name === exercise.name
      );

      if (!routineExercise) {
        return;
      }

      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
      sets.forEach((set: any, index: number) => {
        setsPayload.push({
          session_log_id: sessionLogId,
          exercise_id: routineExercise.exerciseId,
          set_number: index + 1,
          logged_weight: set.weight ?? set.logged_weight ?? null,
          logged_reps: set.reps ?? set.logged_reps ?? null,
          logged_rpe: set.rpe ?? null,
          actual_rest_seconds: set.rest ?? null,
        });
      });
    });

    if (setsPayload.length) {
      const { error: setsError } = await supabase
        .from("session_log_sets")
        .insert(setsPayload);

      if (setsError) {
        console.error("Failed to insert log sets", setsError);
      }
    }

    // Refresh stats for response
    const [sessions, routines] = await Promise.all([
      fetchClientSessions(profile.id),
      fetchClientRoutines(profile.id),
    ]);
    const streak = computeStreakStats(sessions);
    const weeklyGoal = computeWeeklyGoal(profile, sessions, routines.length);

    // Notify PT if assigned
    if (ptId) {
      await createNotification({
        userId: ptId,
        type: "client_logged_workout",
        clientId: profile.id,
        title: "Client workout",
        message: `${profile.full_name} completed a workout`,
        metadata: { routineId },
      });
    }

    return c.json({ success: true, streak, weeklyGoal });
  } catch (error) {
    console.error("Log workout exception", error);
    return c.json({ error: "Server error logging workout" }, 500);
  }
});

app.get("/make-server-d58ce8ef/pt/dashboard", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const { data: assignments, error } = await supabase
      .from("pt_clients")
      .select("client_id")
      .eq("pt_id", profile.id)
      .eq("status", "active");

    if (error) {
      console.error("PT dashboard assignments error", error);
      return c.json({ error: "Failed to load clients" }, 500);
    }

    const clientIds = (assignments || []).map((row) => row.client_id);
    if (clientIds.length === 0) {
      return c.json({ clients: [], alerts: [] });
    }

    const { data: clientProfiles, error: clientError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", clientIds);

    if (clientError) {
      console.error("PT dashboard client profiles error", clientError);
      return c.json({ error: "Failed to load client profiles" }, 500);
    }

    const clients = await Promise.all(
      (clientProfiles || []).map(async (clientProfile: ProfileRow) => {
        const dashboard = await fetchClientDashboard(clientProfile);
        return {
          id: clientProfile.id,
          name: clientProfile.full_name,
          email: clientProfile.email,
          streak: dashboard.streak,
          weeklyGoal: dashboard.weeklyGoal,
          routines: dashboard.routines,
        };
      }),
    );

    const clientIdToProfile = (clientProfiles || []).reduce<Record<string, ProfileRow>>((acc, profileRow) => {
      acc[profileRow.id] = profileRow as ProfileRow;
      return acc;
    }, {});

    const { data: healthLogs, error: healthError } = await supabase
      .from("client_health_logs")
      .select("id, client_id, injury_title, details, status, logged_at, created_by_pt")
      .in("client_id", clientIds)
      .order("logged_at", { ascending: false });

    if (healthError) {
      console.error("PT dashboard health logs error", healthError);
      return c.json({ error: "Failed to load client health logs" }, 500);
    }

    const healthLogsByClient = new Map<string, HealthLog[]>();
    (healthLogs || []).forEach((log: HealthLog) => {
      if (!healthLogsByClient.has(log.client_id)) {
        healthLogsByClient.set(log.client_id, []);
      }
      healthLogsByClient.get(log.client_id)!.push(log);
    });

    const activeIssueByClient = new Map<string, HealthLog>();
    healthLogsByClient.forEach((logs, clientId) => {
      const active = logs.find((log) => log.status === "ACUTE" || log.status === "LINGERING");
      if (active) {
        activeIssueByClient.set(clientId, active);
      }
    });

    const { data: upcomingSessions, error: upcomingError } = await supabase
      .from("pt_calendar_events")
      .select("id, title, client_id, start_at, end_at, event_type")
      .eq("pt_id", profile.id)
      .eq("event_type", "session")
      .gte("start_at", new Date().toISOString())
      .lte("start_at", new Date(Date.now() + 15 * 60 * 1000).toISOString());

    if (upcomingError) {
      console.error("PT dashboard upcoming sessions error", upcomingError);
      return c.json({ error: "Failed to load upcoming sessions" }, 500);
    }

    const alerts =
      (upcomingSessions || [])
        .filter((session: any) => session.client_id && activeIssueByClient.has(session.client_id))
        .map((session: any) => {
          const issue = activeIssueByClient.get(session.client_id)!;
          const clientProfile = clientIdToProfile[session.client_id];
          return {
            eventId: session.id,
            clientId: session.client_id,
            clientName: clientProfile?.full_name ?? "Client",
            sessionStart: session.start_at,
            sessionEnd: session.end_at,
            injuryTitle: issue.injury_title,
            status: issue.status,
          };
        }) || [];

    const clientsWithHealth = clients.map((client) => {
      const logs = healthLogsByClient.get(client.id) || [];
      const activeIssue = activeIssueByClient.get(client.id) || null;
      const mostRecentLog = logs[0] ?? null;
      return {
        ...client,
        activeHealthIssue: activeIssue
          ? {
              id: activeIssue.id,
              status: activeIssue.status,
              injuryTitle: activeIssue.injury_title,
              loggedAt: activeIssue.logged_at,
            }
          : null,
        mostRecentHealthLog: mostRecentLog
          ? {
              id: mostRecentLog.id,
              status: mostRecentLog.status,
              injuryTitle: mostRecentLog.injury_title,
              loggedAt: mostRecentLog.logged_at,
            }
          : null,
      };
    });

    return c.json({ clients: clientsWithHealth, alerts });
  } catch (error) {
    console.error("PT dashboard error", error);
    return c.json({ error: "Failed to load PT dashboard" }, 500);
  }
});

async function resolveExerciseCatalogId(
  ptId: string,
  exercise: { catalogId?: string | null; name: string; notes?: string | null; defaultRestSeconds?: number | null },
) {
  const trimmedName = exercise.name.trim();

  if (exercise.catalogId) {
    const { data, error } = await supabase
      .from("exercises_catalog")
      .select("id")
      .eq("id", exercise.catalogId)
      .eq("pt_id", ptId)
      .maybeSingle();

    if (!error && data) {
      return data.id;
    }
  }

  const { data: existing, error: lookupError } = await supabase
    .from("exercises_catalog")
    .select("id")
    .eq("pt_id", ptId)
    .ilike("name", trimmedName)
    .maybeSingle();

  if (lookupError && lookupError.code !== "PGRST116") {
    console.error("Lookup exercise error", lookupError);
  }

  if (existing) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("exercises_catalog")
    .insert({
      pt_id: ptId,
      name: trimmedName,
      instruction_notes: exercise.notes ?? null,
      default_rest_seconds: exercise.defaultRestSeconds ?? null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error("Failed to create exercise in catalog");
  }

  return inserted.id;
}

async function upsertRoutine(
  params: {
    routineId?: string;
    ptId: string;
    clientId: string;
    name: string;
    exercises: Array<{
      id?: string;
      name: string;
      notes?: string | null;
      catalogId?: string | null;
      defaultRestSeconds?: number | null;
      sets?: Array<{ reps?: string | number; rest?: string | number; weight?: number | null }>;
    }>;
  },
) {
  const payload = {
    pt_id: params.ptId,
    client_id: params.clientId,
    routine_name: params.name,
  };

  let routineId = params.routineId;

  if (!routineId) {
    const { data, error } = await supabase
      .from("routines")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to create routine", error);
      throw new Error("Routine creation failed");
    }

    routineId = data.id;
  } else {
    const { error } = await supabase
      .from("routines")
      .update(payload)
      .eq("id", routineId)
      .eq("pt_id", params.ptId);

    if (error) {
      console.error("Failed to update routine", error);
      throw new Error("Routine update failed");
    }

    await supabase.from("routine_exercises").delete().eq("routine_id", routineId);
  }

  let position = 0;
  for (const exercise of params.exercises) {
    const exerciseId = await resolveExerciseCatalogId(params.ptId, exercise);

    const { data: routineExercise, error } = await supabase
      .from("routine_exercises")
      .insert({
        routine_id: routineId,
        exercise_id: exerciseId,
        position,
        notes: exercise.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !routineExercise) {
      console.error("Failed to insert routine exercise", error);
      continue;
    }

    const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
    if (sets.length) {
      const setsPayload = sets.map((set, index) => ({
        routine_exercise_id: routineExercise.id,
        set_number: index + 1,
        target_rep_range: typeof set.reps === "string" && set.reps.includes("-") ? set.reps : null,
        target_reps: typeof set.reps === "number" ? set.reps : Number(set.reps) || null,
        target_rest_seconds: set.rest != null ? Number(set.rest) : null,
        target_weight: set.weight ?? null,
      }));

      const { error: setError } = await supabase
        .from("routine_exercise_sets")
        .insert(setsPayload);

      if (setError) {
        console.error("Failed to insert routine sets", setError);
      }
    }

    position += 1;
  }

  return routineId;
}

app.post("/make-server-d58ce8ef/pt/routine", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const body = await c.req.json();
    const routineId = await upsertRoutine({
      ptId: profile.id,
      clientId: body.clientId,
      name: body.name,
      exercises: body.exercises || [],
    });

    const routine = await fetchRoutineDetail(routineId, body.clientId);
    return c.json({ routine });
  } catch (error) {
    console.error("Create routine error", error);
    return c.json({ error: "Failed to create routine" }, 500);
  }
});

app.put("/make-server-d58ce8ef/pt/routine/:routineId", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const body = await c.req.json();
    const routineId = c.req.param("routineId");

    await upsertRoutine({
      routineId,
      ptId: profile.id,
      clientId: body.clientId,
      name: body.name,
      exercises: body.exercises || [],
    });

    const routine = await fetchRoutineDetail(routineId, body.clientId);
    return c.json({ routine });
  } catch (error) {
    console.error("Update routine error", error);
    return c.json({ error: "Failed to update routine" }, 500);
  }
});

app.get("/make-server-d58ce8ef/pt/calendar", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("pt_calendar_events")
    .select("*")
    .eq("pt_id", profile.id)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Get calendar error", error);
    return c.json({ error: "Failed to load calendar" }, 500);
  }

  const events = (data || []).map((event) => ({
    id: event.id,
    title: event.title,
    type: event.event_type,
    startDate: event.start_at,
    endDate: event.end_at,
    clientId: event.client_id,
    recurrenceRule: event.recurrence_rrule,
    isAllDay: event.is_all_day,
    location: event.location,
    notes: event.notes,
  }));

  return c.json({ events });
});

app.post("/make-server-d58ce8ef/pt/calendar", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const body = await c.req.json();
    const payload = {
      pt_id: profile.id,
      client_id: body.clientId ?? null,
      title: body.title,
      event_type: body.type,
      start_at: body.startDate,
      end_at: body.endDate,
      recurrence_rrule: body.recurrenceRule ?? null,
      notes: body.notes ?? null,
      location: body.location ?? null,
      is_all_day: body.isAllDay ?? false,
    };

    const { data, error } = await supabase
      .from("pt_calendar_events")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Add calendar event error", error);
      return c.json({ error: "Failed to create event" }, 500);
    }

    return c.json({
      event: {
        id: data.id,
        title: data.title,
        type: data.event_type,
        startDate: data.start_at,
        endDate: data.end_at,
        clientId: data.client_id,
        recurrenceRule: data.recurrence_rrule,
        isAllDay: data.is_all_day,
        location: data.location,
        notes: data.notes,
      },
    });
  } catch (error) {
    console.error("Calendar event exception", error);
    return c.json({ error: "Failed to create event" }, 500);
  }
});

app.post("/make-server-d58ce8ef/pt/create-client", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const { name, email, password } = await c.req.json();
    if (!name || !email) {
      return c.json({ error: "Name and email are required" }, 400);
    }

    const loweredEmail = String(email).toLowerCase();
    const tempPassword = password || `Fitness${Math.random().toString(36).slice(-8)}!`;

    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: loweredEmail,
      password: tempPassword,
      user_metadata: { name, role: "client" },
      email_confirm: true,
    });

    if (error || !authData.user) {
      console.error("Create client error", error);
      return c.json({ error: error?.message ?? "Failed to create client" }, 400);
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      role: "client",
      full_name: name,
      email: loweredEmail,
      training_frequency_goal: 3,
    });

    if (profileError) {
      console.error("Insert client profile error", profileError);
      return c.json({ error: "Failed to create client profile" }, 400);
    }

    const { error: assignmentError } = await supabase.from("pt_clients").insert({
      pt_id: profile.id,
      client_id: authData.user.id,
      status: "active",
    });

    if (assignmentError) {
      console.error("PT assignment error", assignmentError);
    }

    await createNotification({
      userId: profile.id,
      type: "client_created",
      title: "Client added",
      message: `${name} has been added as a client`,
      clientId: authData.user.id,
    });

    return c.json({
      client: {
        id: authData.user.id,
        name,
        email: loweredEmail,
      },
      credentials: {
        email: loweredEmail,
        password: tempPassword,
      },
    });
  } catch (error) {
    console.error("Create client exception", error);
    return c.json({ error: "Server error creating client" }, 500);
  }
});

app.post("/make-server-d58ce8ef/pt/update-client", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const body = await c.req.json();
    const clientId = body.clientId as string;
    const name = body.name as string | undefined;
    const email = body.email as string | undefined;

    if (!clientId) {
      return c.json({ error: "Client ID is required" }, 400);
    }

    const { data: assignment, error } = await supabase
      .from("pt_clients")
      .select("client_id")
      .eq("pt_id", profile.id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (error || !assignment) {
      return c.json({ error: "Client not found" }, 404);
    }

    if (name || email) {
      const updates: any = {};
      if (name) updates.full_name = name;
      if (email) updates.email = String(email).toLowerCase();

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", clientId);

      if (profileError) {
        console.error("Update client profile error", profileError);
        return c.json({ error: "Failed to update client" }, 400);
      }

      const authUpdates: any = {};
      if (email) authUpdates.email = String(email).toLowerCase();
      if (name) authUpdates.user_metadata = { name, role: "client" };

      if (Object.keys(authUpdates).length) {
        const { error: authError } = await supabase.auth.admin.updateUserById(clientId, authUpdates);
        if (authError) {
          console.error("Update client auth error", authError);
        }
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update client exception", error);
    return c.json({ error: "Server error updating client" }, 500);
  }
});

app.get("/make-server-d58ce8ef/pt/health-logs", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const clientId = c.req.query("clientId");
  if (!clientId) {
    return c.json({ error: "clientId query parameter is required" }, 400);
  }

  const { data: assignment, error } = await supabase
    .from("pt_clients")
    .select("client_id")
    .eq("pt_id", profile.id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !assignment) {
    return c.json({ error: "Client not found" }, 404);
  }

  const { data, error: logsError } = await supabase
    .from("client_health_logs")
    .select("id, client_id, injury_title, details, status, logged_at, created_by_pt")
    .eq("client_id", clientId)
    .order("logged_at", { ascending: false });

  if (logsError) {
    console.error("Fetch health logs error", logsError);
    return c.json({ error: "Failed to fetch health logs" }, 500);
  }

  return c.json({ logs: data || [] });
});

app.post("/make-server-d58ce8ef/pt/health-logs", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const { clientId, injuryTitle, details, status } = await c.req.json();

    if (!clientId || !injuryTitle || !status) {
      return c.json({ error: "clientId, injuryTitle, and status are required" }, 400);
    }

    if (!["ACUTE", "LINGERING", "RESOLVED"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const { data: assignment, error } = await supabase
      .from("pt_clients")
      .select("client_id")
      .eq("pt_id", profile.id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (error || !assignment) {
      return c.json({ error: "Client not found" }, 404);
    }

    const { data, error: insertError } = await supabase
      .from("client_health_logs")
      .insert({
        client_id: clientId,
        injury_title: injuryTitle,
        details: details ?? null,
        status,
        created_by_pt: profile.id,
      })
      .select("id, client_id, injury_title, details, status, logged_at, created_by_pt")
      .single();

    if (insertError) {
      console.error("Create health log error", insertError);
      return c.json({ error: "Failed to create health log" }, 500);
    }

    return c.json({ log: data });
  } catch (error) {
    console.error("Create health log exception", error);
    return c.json({ error: "Server error creating health log" }, 500);
  }
});

app.get("/make-server-d58ce8ef/pt/exercises", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const searchQuery = c.req.query("query") ?? c.req.query("q") ?? "";
  const limitParam = c.req.query("limit");
  const parsedLimit = Number.parseInt(limitParam ?? "", 10);
  const limit = Number.isNaN(parsedLimit) ? 10 : Math.min(Math.max(parsedLimit, 1), 25);

  const { data, error } = await supabase.rpc("search_pt_exercises", {
    pt_uuid: profile.id,
    search_query: searchQuery,
    result_limit: limit,
  });

  if (error) {
    console.error("Search exercises error", error);
    return c.json({ error: "Failed to search exercises" }, 500);
  }

  const exercises = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    primaryMuscleGroup: row.primary_muscle_group,
    equipmentRequired: row.equipment_required,
    defaultRestSeconds: row.default_rest_seconds,
    instructionNotes: row.instruction_notes,
    videoLink: row.video_link,
    similarity: row.similarity_score,
  }));

  return c.json({ exercises });
});

app.get("/make-server-d58ce8ef/pt/notifications", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, client_id, metadata, is_read, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("PT notifications error", error);
    return c.json({ error: "Failed to load notifications" }, 500);
  }

const rows = data || [];
const clientIdSet = new Set<string>();
rows.forEach((row: any) => {
  if (row.client_id) {
    clientIdSet.add(row.client_id);
  }
});

let clientNames: Record<string, string> = {};
if (clientIdSet.size > 0) {
  const { data: clientProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", Array.from(clientIdSet));

  if (profileError) {
    console.error("Notification client lookup error", profileError);
  } else {
    clientNames = (clientProfiles || []).reduce((acc: Record<string, string>, item: any) => {
      acc[item.id] = item.full_name;
      return acc;
    }, {});
  }
}

const notifications = rows.map((row: any) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  clientId: row.client_id,
  clientName: row.client_id ? clientNames[row.client_id] : undefined,
  metadata: row.metadata,
  isRead: row.is_read,
  timestamp: row.created_at,
}));

  return c.json({ notifications });
});

app.post("/make-server-d58ce8ef/pt/notifications/:notificationId/read", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const notificationId = c.req.param("notificationId");
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", profile.id);

  if (error) {
    console.error("Mark notification read error", error);
    return c.json({ error: "Failed to update notification" }, 500);
  }

  return c.json({ success: true });
});

app.post("/make-server-d58ce8ef/pt/notifications/read-all", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", profile.id);

  if (error) {
    console.error("Mark all notifications error", error);
    return c.json({ error: "Failed to update notifications" }, 500);
  }

  return c.json({ success: true });
});

app.get("/make-server-d58ce8ef/client/notifications", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "client") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, metadata, is_read, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Client notifications error", error);
    return c.json({ error: "Failed to load notifications" }, 500);
  }

  const notifications = (data || []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: row.metadata,
    isRead: row.is_read,
    timestamp: row.created_at,
  }));

  return c.json({ notifications });
});

app.post("/make-server-d58ce8ef/client/notifications/:notificationId/read", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "client") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const notificationId = c.req.param("notificationId");
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", profile.id);

  if (error) {
    console.error("Mark client notification read error", error);
    return c.json({ error: "Failed to update notification" }, 500);
  }

  return c.json({ success: true });
});

app.post("/make-server-d58ce8ef/client/notifications/read-all", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "client") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", profile.id);

  if (error) {
    console.error("Mark all client notifications error", error);
    return c.json({ error: "Failed to update notifications" }, 500);
  }

  return c.json({ success: true });
});

app.post("/make-server-d58ce8ef/pt/reset-client-password", async (c) => {
  const context = await extractAuthContext(c);
  if (context.error) {
    return c.json({ error: context.error.message }, context.error.status);
  }

  const { profile } = context;
  if (profile.role !== "pt") {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const { clientId } = await c.req.json();
    if (!clientId) {
      return c.json({ error: "Client ID is required" }, 400);
    }

    const { data: assignment, error } = await supabase
      .from("pt_clients")
      .select("client_id")
      .eq("pt_id", profile.id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (error || !assignment) {
      return c.json({ error: "Client not found" }, 404);
    }

    const newPassword = `Fitness${Math.random().toString(36).slice(-8)}!`;
    const { error: updateError } = await supabase.auth.admin.updateUserById(clientId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Reset password error", updateError);
      return c.json({ error: "Failed to reset password" }, 400);
    }

    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", clientId)
      .maybeSingle();

    return c.json({
      success: true,
      credentials: {
        email: clientProfile?.email ?? "",
        password: newPassword,
      },
    });
  } catch (error) {
    console.error("Reset password exception", error);
    return c.json({ error: "Server error resetting password" }, 500);
  }
});

Deno.serve(app.fetch);