-- Enable required extensions --------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom enums ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('pt', 'client');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_status') THEN
    CREATE TYPE client_status AS ENUM ('active', 'inactive', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'health_issue_status') THEN
    CREATE TYPE health_issue_status AS ENUM ('ACUTE', 'LINGERING', 'RESOLVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_type') THEN
    CREATE TYPE calendar_event_type AS ENUM ('session', 'break', 'studio');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_source_type') THEN
    CREATE TYPE content_source_type AS ENUM ('youtube_channel', 'youtube_playlist', 'youtube_video', 'article', 'custom');
  END IF;
END $$;

-- Profiles --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                user_role NOT NULL,
  full_name           text NOT NULL,
  email               text NOT NULL,
  motivation_style    text,
  training_frequency_goal smallint DEFAULT 3 CHECK (training_frequency_goal > 0 AND training_frequency_goal <= 14),
  current_streak_weeks smallint DEFAULT 0 CHECK (current_streak_weeks >= 0),
  longest_streak_weeks smallint DEFAULT 0 CHECK (longest_streak_weeks >= 0),
  prefers_metric_units boolean DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);

-- PT to client assignments ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pt_clients (
  pt_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status    client_status NOT NULL DEFAULT 'active',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  PRIMARY KEY (pt_id, client_id)
);

CREATE INDEX IF NOT EXISTS pt_clients_client_idx ON public.pt_clients (client_id);

-- Exercise catalog ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercises_catalog (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_id                  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                   text NOT NULL,
  primary_muscle_group   text,
  secondary_muscle_group text,
  equipment_required     text,
  default_rest_seconds   integer CHECK (default_rest_seconds IS NULL OR default_rest_seconds >= 0),
  instruction_notes      text,
  video_link             text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS exercises_catalog_unique_name_per_pt
  ON public.exercises_catalog (pt_id, lower(name));
CREATE INDEX IF NOT EXISTS exercises_catalog_trgm_name_idx
  ON public.exercises_catalog
  USING gin (name gin_trgm_ops);

-- Routines --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_name   text NOT NULL,
  description    text,
  goal_focus     text,
  is_active      boolean NOT NULL DEFAULT true,
  start_date     date,
  end_date       date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routines_client_idx ON public.routines (client_id, is_active);
CREATE INDEX IF NOT EXISTS routines_pt_idx ON public.routines (pt_id);

-- Routine exercises -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id              uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise_id             uuid NOT NULL REFERENCES public.exercises_catalog(id) ON DELETE RESTRICT,
  position                integer NOT NULL CHECK (position >= 0),
  prescribed_sets         smallint NOT NULL DEFAULT 3 CHECK (prescribed_sets > 0),
  prescribed_reps_min     smallint CHECK (prescribed_reps_min > 0),
  prescribed_reps_max     smallint CHECK (prescribed_reps_max IS NULL OR prescribed_reps_max >= prescribed_reps_min),
  prescribed_weight       numeric(8,2) CHECK (prescribed_weight IS NULL OR prescribed_weight >= 0),
  prescribed_rest_seconds integer CHECK (prescribed_rest_seconds IS NULL OR prescribed_rest_seconds >= 0),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS routine_exercises_routine_idx
  ON public.routine_exercises (routine_id, position);

-- Session logs ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id    uuid REFERENCES public.routines(id) ON DELETE SET NULL,
  pt_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  performed_at  timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  client_notes  text,
  perceived_effort numeric(3,1) CHECK (perceived_effort IS NULL OR (perceived_effort >= 0 AND perceived_effort <= 10)),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_logs_client_idx ON public.session_logs (client_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS session_logs_routine_idx ON public.session_logs (routine_id, performed_at DESC);

CREATE TABLE IF NOT EXISTS public.session_log_sets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_log_id       uuid NOT NULL REFERENCES public.session_logs(id) ON DELETE CASCADE,
  exercise_id          uuid NOT NULL REFERENCES public.exercises_catalog(id) ON DELETE RESTRICT,
  set_number           smallint NOT NULL CHECK (set_number > 0),
  logged_weight        numeric(8,2) CHECK (logged_weight IS NULL OR logged_weight >= 0),
  logged_reps          smallint CHECK (logged_reps IS NULL OR logged_reps >= 0),
  logged_rpe           numeric(3,1) CHECK (logged_rpe IS NULL OR (logged_rpe >= 0 AND logged_rpe <= 10)),
  actual_rest_seconds  integer CHECK (actual_rest_seconds IS NULL OR actual_rest_seconds >= 0),
  is_personal_best     boolean DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_log_sets_session_idx
  ON public.session_log_sets (session_log_id, set_number);
CREATE INDEX IF NOT EXISTS session_log_sets_exercise_idx
  ON public.session_log_sets (exercise_id);

-- Client health logs ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_health_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_at     timestamptz NOT NULL DEFAULT now(),
  injury_title  text NOT NULL,
  details       text,
  status        health_issue_status NOT NULL,
  severity      text,
  created_by_pt uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS client_health_logs_client_idx
  ON public.client_health_logs (client_id, status, logged_at DESC);

-- PT content sources ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pt_content_sources (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type      content_source_type NOT NULL,
  source_identifier text NOT NULL,
  title            text,
  thumbnail_url    text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pt_content_sources_unique
  ON public.pt_content_sources (pt_id, source_type, source_identifier);

-- PT calendar -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pt_calendar_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title            text NOT NULL,
  event_type       calendar_event_type NOT NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  recurrence_rrule text,
  location         text,
  notes            text,
  is_all_day       boolean NOT NULL DEFAULT false,
  external_uid     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pt_calendar_events_pt_idx
  ON public.pt_calendar_events (pt_id, start_at);
CREATE INDEX IF NOT EXISTS pt_calendar_events_rrule_idx
  ON public.pt_calendar_events USING btree (recurrence_rrule) WHERE recurrence_rrule IS NOT NULL;

-- Materialized views / helper tables -----------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_bests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id     uuid NOT NULL REFERENCES public.exercises_catalog(id) ON DELETE CASCADE,
  session_log_set_id uuid NOT NULL REFERENCES public.session_log_sets(id) ON DELETE CASCADE,
  metric          text NOT NULL DEFAULT 'tonnage',
  metric_value    numeric(12,2) NOT NULL,
  achieved_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS personal_bests_unique
  ON public.personal_bests (client_id, exercise_id, metric);

-- Update timestamp helper -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER touch_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_exercises_catalog_updated_at
  BEFORE UPDATE ON public.exercises_catalog
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_routine_exercises_updated_at
  BEFORE UPDATE ON public.routine_exercises
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_pt_content_sources_updated_at
  BEFORE UPDATE ON public.pt_content_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_pt_calendar_events_updated_at
  BEFORE UPDATE ON public.pt_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
