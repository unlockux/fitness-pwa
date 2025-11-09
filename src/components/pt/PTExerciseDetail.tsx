import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ChevronLeft, Save } from "lucide-react";
import { projectId } from "../../utils/supabase/info";

interface PTExerciseDetailProps {
  token: string;
  exerciseId: string;
  onBack: () => void;
}

interface ExerciseDetailResponse {
  exercise: {
    id: string;
    name: string;
    primaryMuscleGroup: string | null;
    equipmentRequired: string | null;
    defaultRestSeconds: number | null;
    instructionNotes: string | null;
    videoLink: string | null;
  };
}

export function PTExerciseDetail({ token, exerciseId, onBack }: PTExerciseDetailProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [defaultRest, setDefaultRest] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [videoLink, setVideoLink] = useState("");

  useEffect(() => {
    const fetchExercise = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/exercises/${exerciseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 401) {
          throw new Error("Your session has expired. Please sign out and log in again.");
        }

        if (!response.ok) {
          throw new Error("Failed to load exercise details");
        }

        const data: ExerciseDetailResponse = await response.json();
        const exercise = data.exercise;

        setName(exercise.name ?? "");
        setPrimaryMuscle(exercise.primaryMuscleGroup ?? "");
        setEquipment(exercise.equipmentRequired ?? "");
        setDefaultRest(exercise.defaultRestSeconds ?? "");
        setNotes(exercise.instructionNotes ?? "");
        setVideoLink(exercise.videoLink ?? "");
      } catch (err: any) {
        console.error("Load exercise details error", err);
        setError(err.message || "Unable to load exercise details");
      } finally {
        setLoading(false);
      }
    };

    if (exerciseId) {
      fetchExercise();
    }
  }, [exerciseId, token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: name.trim() || null,
      primaryMuscleGroup: primaryMuscle.trim() || null,
      equipmentRequired: equipment.trim() || null,
      defaultRestSeconds: defaultRest === "" ? null : Number(defaultRest),
      instructionNotes: notes.trim() || null,
      videoLink: videoLink.trim() || null,
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/exercises/${exerciseId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Your session has expired. Please sign out and log in again.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to update exercise");
      }

      setSuccess("Exercise updated successfully.");
    } catch (err: any) {
      console.error("Update exercise error", err);
      setError(err.message || "Unable to update exercise");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-semibold mt-4">Edit exercise</h1>
        <p className="text-sm text-primary-foreground/80 mt-2 max-w-xl">
          Changes made here update the exercise anywhere it is referenced across your routines.
        </p>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Loading exercise...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6"
          >
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="exerciseName">Exercise name</Label>
                <input
                  id="exerciseName"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Romanian Deadlift"
                  required
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryMuscle">Primary muscle group</Label>
                <input
                  id="primaryMuscle"
                  type="text"
                  value={primaryMuscle}
                  onChange={(event) => setPrimaryMuscle(event.target.value)}
                  placeholder="Hamstrings"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment</Label>
                <input
                  id="equipment"
                  type="text"
                  value={equipment}
                  onChange={(event) => setEquipment(event.target.value)}
                  placeholder="Barbell, bands, bodyweight"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultRest">Default rest (seconds)</Label>
                <input
                  id="defaultRest"
                  type="number"
                  min={0}
                  value={defaultRest === "" ? "" : defaultRest}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "") {
                      setDefaultRest("");
                    } else {
                      setDefaultRest(Number(value));
                    }
                  }}
                  placeholder="90"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  inputMode="numeric"
                />
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="notes">Coaching notes & default set guidance</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={`Example:\n3 sets · 8 reps @ RPE7\nTempo 3-1-1, focus on full hip hinge.`}
                rows={6}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
              <p className="text-xs text-muted-foreground">
                These notes appear during routine building and session logging. Include target sets, reps, RPE, or cues.
              </p>
            </section>

            <section className="space-y-2">
              <Label htmlFor="videoLink">Demo video link</Label>
              <input
                id="videoLink"
                type="url"
                value={videoLink}
                onChange={(event) => setVideoLink(event.target.value)}
                placeholder="https://..."
                className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                inputMode="url"
              />
            </section>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                {success}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save exercise"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
