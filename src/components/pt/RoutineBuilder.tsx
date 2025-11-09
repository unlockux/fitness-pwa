import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, Reorder } from "motion/react";
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Plus,
  Mic,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { projectId } from "../../utils/supabase/info";

interface RoutineBuilderProps {
  token: string;
  routineId?: string | null;
  initialClientId?: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

interface ExerciseSet {
  id: string;
  reps: string;
  rest: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  notes: string;
  catalogId?: string | null;
  defaultRestSeconds?: number | null;
}

interface ExerciseSuggestion {
  id: string;
  name: string;
  primaryMuscleGroup?: string | null;
  equipmentRequired?: string | null;
  defaultRestSeconds?: number | null;
  instructionNotes?: string | null;
  videoLink?: string | null;
  similarity?: number | null;
}

export function RoutineBuilder({
  token,
  routineId,
  initialClientId,
  onBack,
  onSuccess,
}: RoutineBuilderProps) {
  const [routineName, setRoutineName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [smartInput, setSmartInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] =
    useState<string>("");
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionAbortRef = useRef<AbortController | null>(null);
  const suggestionBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const smartInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchClients();
  }, [token]);

  const loadSuggestions = useCallback(
    async (query: string) => {
      if (!token) return;

      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
      }

      const controller = new AbortController();
      suggestionAbortRef.current = controller;
      setIsSearching(true);

      try {
        const params = new URLSearchParams();
        if (query.trim()) {
          params.set("query", query.trim());
        }
        params.set("limit", "8");

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/exercises?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.exercises || []);
        } else {
          const errorText = await response.text().catch(() => "");
          console.error("Error fetching exercise suggestions:", errorText);
          setSuggestions([]);
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Error fetching exercise suggestions:", error);
          setSuggestions([]);
        }
      } finally {
        if (suggestionAbortRef.current === controller) {
          suggestionAbortRef.current = null;
          setIsSearching(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    loadSuggestions("");
  }, [loadSuggestions]);

  useEffect(() => {
    const trimmed = smartInput.trim();
    if (!trimmed) {
      loadSuggestions("");
      return;
    }

    const handler = setTimeout(() => {
      loadSuggestions(trimmed);
    }, 300);

    return () => clearTimeout(handler);
  }, [smartInput, loadSuggestions]);

  useEffect(() => {
    if (routineId && clients.length > 0) {
      fetchRoutine();
    }
  }, [routineId, clients]);

  useEffect(() => {
    return () => {
      if (suggestionAbortRef.current) {
        suggestionAbortRef.current.abort();
      }
      if (suggestionBlurTimeout.current) {
        clearTimeout(suggestionBlurTimeout.current);
      }
    };
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        if (
          data.clients &&
          data.clients.length > 0 &&
          !routineId
        ) {
          // Use initialClientId if provided, otherwise default to first client
          setSelectedClientId(initialClientId || data.clients[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutine = async () => {
    if (!routineId) return;

    try {
      // Find the routine in the clients data
      for (const client of clients) {
        const routine = client.routines?.find(
          (r: any) => r.id === routineId,
        );
        if (routine) {
          setRoutineName(routine.name);
          setSelectedClientId(client.id);

          // Convert routine exercises to the format we use in the builder
          const loadedExercises: Exercise[] =
            routine.exercises.map(
              (ex: any, exIndex: number) => ({
                id: `ex-${Date.now()}-${exIndex}`,
                name: ex.name,
                notes: ex.notes || "",
                catalogId: ex.exerciseId,
                defaultRestSeconds: ex.defaultRestSeconds,
                sets: ex.sets.map(
                  (set: any, setIndex: number) => ({
                    id: `set-${Date.now()}-${exIndex}-${setIndex}`,
                    reps: set.reps,
                    rest: set.rest,
                  }),
                ),
              }),
            );

          setExercises(loadedExercises);
          break;
        }
      }
    } catch (error) {
      console.error("Error loading routine:", error);
    }
  };

  const addExerciseFromSmartInput = () => {
    if (!smartInput.trim()) return;

    // Simple parsing - in production, this would use fuzzy search/STT
    const parts = smartInput.toLowerCase().split(" ");
    const name = smartInput.trim();
    const fallbackName = name || "New Exercise";
    let numSets = 1;
    let reps = "10";
    let rest = "90";

    // Try to extract numbers
    parts.forEach((part, i) => {
      if (part === "sets" && i > 0)
        numSets = parseInt(parts[i - 1]) || 1;
      if (part === "reps" && i > 0) reps = parts[i - 1];
      if ((part === "sec" || part === "seconds") && i > 0)
        rest = parts[i - 1];
    });

    const matchedSuggestion = suggestions.find(
      (suggestion) =>
        suggestion.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (matchedSuggestion) {
      addExercise({
        name: matchedSuggestion.name,
        numSets,
        defaultReps: reps,
        defaultRest: rest,
        catalogId: matchedSuggestion.id,
        notes: matchedSuggestion.instructionNotes ?? "",
        defaultRestSeconds: matchedSuggestion.defaultRestSeconds ?? undefined,
      });
    } else {
      addExercise({
        name: fallbackName,
        numSets,
        defaultReps: reps,
        defaultRest: rest,
      });
    }

    setSmartInput("");
    setShowSuggestions(false);
  };

  const addExercise = ({
    name = "New Exercise",
    numSets = 1,
    defaultReps = "10",
    defaultRest = "90",
    catalogId = null,
    notes = "",
    defaultRestSeconds = undefined,
  }: {
    name?: string;
    numSets?: number;
    defaultReps?: string;
    defaultRest?: string;
    catalogId?: string | null;
    notes?: string;
    defaultRestSeconds?: number | null | undefined;
  }) => {
    const sets: ExerciseSet[] = Array.from(
      { length: numSets },
      (_, i) => ({
        id: `set-${Date.now()}-${i}`,
        reps: defaultReps,
        rest: defaultRest,
      }),
    );

    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      name,
      catalogId,
      defaultRestSeconds,
      sets,
      notes,
    };
    setExercises([...exercises, newExercise]);
  };

  const handleSuggestionSelect = (suggestion: ExerciseSuggestion) => {
    if (suggestionBlurTimeout.current) {
      clearTimeout(suggestionBlurTimeout.current);
      suggestionBlurTimeout.current = null;
    }
    addExercise({
      name: suggestion.name,
      numSets: 3,
      defaultReps: "10",
      defaultRest:
        suggestion.defaultRestSeconds != null
          ? String(suggestion.defaultRestSeconds)
          : "90",
      catalogId: suggestion.id,
      notes: suggestion.instructionNotes ?? "",
      defaultRestSeconds: suggestion.defaultRestSeconds ?? undefined,
    });
    setSmartInput("");
    setShowSuggestions(false);
    setTimeout(() => {
      smartInputRef.current?.focus();
    }, 0);
  };

  const updateExercise = (
    id: string,
    field: keyof Exercise,
    value: any,
  ) => {
    setExercises(
      exercises.map((ex) =>
        ex.id === id
          ? {
              ...ex,
              [field]: value,
              ...(field === "name" ? { catalogId: null } : {}),
            }
          : ex,
      ),
    );
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof ExerciseSet,
    value: string,
  ) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.id === setId
                ? { ...set, [field]: value }
                : set,
            ),
          };
        }
        return ex;
      }),
    );
  };

  const addSetToExercise = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet: ExerciseSet = {
            id: `set-${Date.now()}`,
            reps: lastSet?.reps || "10",
            rest: lastSet?.rest || "90",
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }
        return ex;
      }),
    );
  };

  const removeSetFromExercise = (
    exerciseId: string,
    setId: string,
  ) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.filter((set) => set.id !== setId),
          };
        }
        return ex;
      }),
    );
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const saveRoutine = async () => {
    if (
      !routineName.trim() ||
      exercises.length === 0 ||
      !selectedClientId
    ) {
      return;
    }

    setSaving(true);
    try {
      const url = routineId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/routine/${routineId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/routine`;

      const response = await fetch(url, {
        method: routineId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: routineName,
          clientId: selectedClientId,
          exercises: exercises.map(({ id, catalogId, defaultRestSeconds, sets, ...ex }) => ({
            ...ex,
            catalogId,
            defaultRestSeconds,
            sets: sets.map(({ id: setId, ...set }) => set),
          })),
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        console.error(
          "Error saving routine:",
          await response.text(),
        );
      }
    } catch (error) {
      console.error("Error saving routine:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground px-6 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-primary-foreground hover:bg-white/10 -ml-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-primary-foreground">
              Create Routine
            </h2>
          </div>
        </div>
        <div className="px-6 py-20 text-center">
          <div className="bg-card rounded-2xl p-8 border border-border max-w-md mx-auto">
            <h3 className="mb-2">No Clients Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need to add clients before creating routines.
              Add a client from your dashboard first.
            </p>
            <Button onClick={onBack}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-primary-foreground hover:bg-white/10 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-primary-foreground">
              Create Routine
            </h2>
            <p className="text-sm text-primary-foreground/80">
              {exercises.length} exercises
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            AI Suggest
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Client Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Label htmlFor="client">Client</Label>
          <select
            id="client"
            value={selectedClientId}
            onChange={(e) =>
              setSelectedClientId(e.target.value)
            }
            className="w-full mt-1.5 px-4 py-2 bg-background border border-border rounded-lg"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.email})
              </option>
            ))}
          </select>
        </motion.div>

        {/* Routine Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Label htmlFor="routineName">Routine Name</Label>
          <Input
            id="routineName"
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder="e.g., Upper Body Strength"
            className="mt-1.5"
          />
        </motion.div>

        {/* Smart Add Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 border border-border"
        >
          <Label
            htmlFor="smartInput"
            className="flex items-center gap-2"
          >
            <Mic className="w-4 h-4 text-accent" />
            Smart Add Exercise
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="smartInput"
              ref={smartInputRef}
              value={smartInput}
              onChange={(e) => {
                setSmartInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && addExerciseFromSmartInput()
              }
              onFocus={() => {
                if (suggestionBlurTimeout.current) {
                  clearTimeout(suggestionBlurTimeout.current);
                  suggestionBlurTimeout.current = null;
                }
                setShowSuggestions(true);
              }}
              onBlur={() => {
                suggestionBlurTimeout.current = setTimeout(() => {
                  setShowSuggestions(false);
                }, 120);
              }}
              placeholder="Try: Bench Press 3 sets 10 reps 90 sec"
              className="flex-1"
            />
            <Button
              onClick={addExerciseFromSmartInput}
              disabled={!smartInput.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Type or speak to add exercises quickly
          </p>
          {showSuggestions && (
            <div className="mt-3 border border-border rounded-lg bg-background shadow-sm overflow-hidden">
              {isSearching ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionSelect(suggestion);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{suggestion.name}</span>
                      {suggestion.defaultRestSeconds != null && (
                        <span className="text-xs text-muted-foreground">
                          Rest {suggestion.defaultRestSeconds}s
                        </span>
                      )}
                    </div>
                    {(suggestion.primaryMuscleGroup ||
                      suggestion.equipmentRequired) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.primaryMuscleGroup || "—"}
                        {suggestion.equipmentRequired
                          ? ` · ${suggestion.equipmentRequired}`
                          : ""}
                      </p>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  No matches found. Press enter to add this as a new exercise.
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Exercise List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>Exercises</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addExercise({})}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {exercises.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={exercises}
              onReorder={setExercises}
              className="space-y-3"
            >
              {exercises.map((exercise, index) => (
                <Reorder.Item
                  key={exercise.id}
                  value={exercise}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl p-4 border border-border shadow-sm cursor-grab active:cursor-grabbing"
                  >
                    <div className="relative flex items-start gap-3 mb-4">
                      <GripVertical className="w-5 h-5 text-muted-foreground mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-muted-foreground w-8">
                            #{index + 1}
                          </span>
                          <Input
                            value={exercise.name}
                            onChange={(e) =>
                              updateExercise(
                                exercise.id,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="Exercise name"
                            className="flex-1 py-[4px] px-[12px] mr-12"
                          />
                        </div>

                        {/* Individual Sets */}
                        <div className="-mx-4 px-4 space-y-2 mb-[8px] p-[0px] mt-[0px] mr-[0px] ml-[-32px]">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                              Sets ({exercise.sets.length})
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                addSetToExercise(exercise.id)
                              }
                              className="h-6 px-2 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Set
                            </Button>
                          </div>

                          {exercise.sets.map(
                            (set, setIndex) => (
                              <div
                                key={set.id}
                                className="flex items-center gap-2 bg-muted/50 rounded-lg p-2"
                              >
                                <span className="text-xs text-muted-foreground w-6 text-center">
                                  {setIndex + 1}
                                </span>
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Reps
                                    </Label>
                                    <Input
                                      type="text"
                                      value={set.reps}
                                      onChange={(e) =>
                                        updateSet(
                                          exercise.id,
                                          set.id,
                                          "reps",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="10 or 10-12"
                                      className="mt-1 h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Rest (sec)
                                    </Label>
                                    <Input
                                      type="text"
                                      value={set.rest}
                                      onChange={(e) =>
                                        updateSet(
                                          exercise.id,
                                          set.id,
                                          "rest",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="90 or 60-90"
                                      className="mt-1 h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                {exercise.sets.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeSetFromExercise(
                                        exercise.id,
                                        set.id,
                                      )
                                    }
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ),
                          )}
                        </div>

                        <Textarea
                          value={exercise.notes}
                          onChange={(e) =>
                            updateExercise(
                              exercise.id,
                              "notes",
                              e.target.value,
                            )
                          }
                          placeholder="Notes (optional)"
                          className="resize-none -mx-4 px-4"
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          removeExercise(exercise.id)
                        }
                        className="absolute top-0 right-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <div className="bg-card rounded-2xl p-8 border border-border text-center">
              <p className="text-muted-foreground">
                No exercises added yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Use the smart add input or click the Add button
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <Button
          onClick={saveRoutine}
          className="w-full"
          size="lg"
          disabled={
            !routineName.trim() ||
            exercises.length === 0 ||
            !selectedClientId ||
            saving
          }
        >
          {saving ? "Saving..." : "Save Routine"}
        </Button>
      </div>
    </div>
  );
}