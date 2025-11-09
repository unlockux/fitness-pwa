import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ChevronLeft, ChevronRight, Dumbbell, Loader2, Search } from "lucide-react";
import { projectId } from "../../utils/supabase/info";

interface PTExerciseLibraryProps {
  token: string;
  onBack: () => void;
  onSelectExercise: (exerciseId: string) => void;
}

interface ExerciseListItem {
  id: string;
  name: string;
  primaryMuscleGroup?: string | null;
  equipmentRequired?: string | null;
  defaultRestSeconds?: number | null;
  instructionNotes?: string | null;
}

export function PTExerciseLibrary({ token, onBack, onSelectExercise }: PTExerciseLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("" as string);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("query", query.trim());
      }
      params.set("limit", "100");

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/exercises?${params.toString()}`,
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
        throw new Error("Failed to load exercises");
      }

      const data = await response.json();
      setExercises(data.exercises || []);
    } catch (err: any) {
      console.error("Fetch exercises error", err);
      setError(err.message || "Unable to load exercises");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExercises("");
    }
  }, [token]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    fetchExercises(searchTerm);
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
        <h1 className="text-2xl font-semibold mt-4">Exercise Library</h1>
        <p className="text-sm text-primary-foreground/80 mt-2 max-w-xl">
          Review and refine the shared catalogue your clients rely on. Editing a movement here updates
          it everywhere instantly.
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Label htmlFor="exerciseSearch" className="text-sm text-muted-foreground">
            Search exercises
          </Label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="exerciseSearch"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="e.g. Back squat, tempo push-up"
                className="w-full h-9 rounded-md border border-input bg-white pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </form>

        <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-sm text-destructive">{error}</div>
          ) : exercises.length === 0 ? (
            <div className="px-6 py-12 text-sm text-muted-foreground">
              No exercises found. Try adjusting your search.
            </div>
          ) : (
            exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onSelectExercise(exercise.id)}
                className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-card-foreground">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[exercise.primaryMuscleGroup, exercise.equipmentRequired]
                        .filter(Boolean)
                        .join(" • ") || "General"}
                    </p>
                    {exercise.defaultRestSeconds != null && (
                      <p className="text-xs text-muted-foreground">
                        Default rest: {exercise.defaultRestSeconds}s
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
