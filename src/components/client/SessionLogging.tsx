import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Repeat, Plus, Minus, Youtube, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { RestTimer } from '../shared/RestTimer';
import { Input } from '../ui/input';
import { projectId } from '../../utils/supabase/info';

interface SessionLoggingProps {
  routine: any;
  token: string;
  onBack: () => void;
  onComplete: () => void;
}

interface SetLog {
  reps: number;
  weight: number;
}

export function SessionLogging({ routine, token, onBack, onComplete }: SessionLoggingProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<Record<number, SetLog[]>>({});
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [showRestHub, setShowRestHub] = useState(false);
  const [restHubTab, setRestHubTab] = useState<'youtube' | 'stats'>('youtube');

  useEffect(() => {
    fetchLastWorkout();
  }, []);

  const fetchLastWorkout = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/client/session/${routine.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLastWorkout(data.lastWorkout);
      }
    } catch (error) {
      console.error('Error fetching last workout:', error);
    }
  };

  const currentExercise = routine.exercises[currentExerciseIndex];
  const currentLogs = exerciseLogs[currentExerciseIndex] || [];
  const lastExerciseData = lastWorkout?.exercises?.[currentExerciseIndex];

  const addSet = () => {
    // Get default values from the prescribed sets or use fallback
    const prescribedSets = currentExercise.sets || [];
    const nextSetIndex = currentLogs.length;
    const prescribedSet = prescribedSets[nextSetIndex] || prescribedSets[prescribedSets.length - 1];
    
    const defaultReps = prescribedSet?.reps ? parseInt(prescribedSet.reps) || 10 : 10;
    const lastSet = currentLogs[currentLogs.length - 1] || { reps: defaultReps, weight: 0 };
    
    setExerciseLogs({
      ...exerciseLogs,
      [currentExerciseIndex]: [...currentLogs, { ...lastSet }],
    });
  };

  const repeatLastSet = () => {
    const lastSet = lastExerciseData?.sets?.[lastExerciseData.sets.length - 1];
    if (lastSet) {
      setExerciseLogs({
        ...exerciseLogs,
        [currentExerciseIndex]: [...currentLogs, { reps: lastSet.reps, weight: lastSet.weight }],
      });
    }
  };

  const updateSet = (setIndex: number, field: 'reps' | 'weight', value: number) => {
    const updatedLogs = [...currentLogs];
    updatedLogs[setIndex] = { ...updatedLogs[setIndex], [field]: value };
    setExerciseLogs({
      ...exerciseLogs,
      [currentExerciseIndex]: updatedLogs,
    });
  };

  const removeSet = (setIndex: number) => {
    const updatedLogs = currentLogs.filter((_, i) => i !== setIndex);
    setExerciseLogs({
      ...exerciseLogs,
      [currentExerciseIndex]: updatedLogs,
    });
  };

  const nextExercise = () => {
    if (currentExerciseIndex < routine.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setShowRestHub(false);
    } else {
      completeWorkout();
    }
  };

  const completeWorkout = async () => {
    try {
      const exercises = routine.exercises.map((ex: any, i: number) => ({
        routineExerciseId: ex.id,
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: (exerciseLogs[i] || []).map((set) => ({
          reps: set.reps,
          weight: set.weight,
        })),
      }));

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/client/log-workout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            routineId: routine.id,
            exercises,
          }),
        }
      );

      onComplete();
    } catch (error) {
      console.error('Error logging workout:', error);
    }
  };

  const prescribed = Array.isArray(currentExercise.sets) ? currentExercise.sets.length : (currentExercise.sets || 3);
  const actual = currentLogs.length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-6 sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-primary-foreground hover:bg-white/10 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-primary-foreground">{routine.name}</h2>
            <p className="text-sm text-primary-foreground/80">
              Exercise {currentExerciseIndex + 1} of {routine.exercises.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${((currentExerciseIndex + 1) / routine.exercises.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Exercise Info */}
        <motion.div
          key={currentExerciseIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <h2 className="mb-2">{currentExercise.name}</h2>
          {currentExercise.notes && (
            <p className="text-sm text-muted-foreground">{currentExercise.notes}</p>
          )}
        </motion.div>

        {/* Set Status */}
        <div className="flex items-center justify-between bg-card rounded-2xl p-4 border border-border">
          <div>
            <p className="text-sm text-muted-foreground">Sets</p>
            <p className="text-2xl">
              <span className={actual >= prescribed ? 'text-success' : ''}>{actual}</span>
              <span className="text-muted-foreground"> / {prescribed}</span>
            </p>
          </div>
          
          {lastExerciseData && (
            <Button
              variant="outline"
              size="sm"
              onClick={repeatLastSet}
              className="gap-2"
            >
              <Repeat className="w-4 h-4" />
              Repeat Last
            </Button>
          )}
        </div>

        {/* Last Set Card */}
        {lastExerciseData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/50 rounded-xl p-4 border border-border"
          >
            <p className="text-xs text-muted-foreground mb-2">LAST WORKOUT</p>
            <div className="flex gap-4">
              {lastExerciseData.sets?.slice(-1).map((set: SetLog, i: number) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-xl">{set.reps}</span>
                  <span className="text-xs text-muted-foreground">reps</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="text-xl">{set.weight}</span>
                  <span className="text-xs text-muted-foreground">lbs</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sets Log */}
        <div className="space-y-3">
          <h3>Log Sets</h3>
          <AnimatePresence>
            {currentLogs.map((set, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card rounded-xl p-4 border border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-8">#{i + 1}</span>
                  
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Reps</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSet(i, 'reps', Math.max(0, set.reps - 1))}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={set.reps}
                          onChange={(e) => updateSet(i, 'reps', parseInt(e.target.value) || 0)}
                          className="text-center h-8"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSet(i, 'reps', set.reps + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Weight (lbs)</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSet(i, 'weight', Math.max(0, set.weight - 5))}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={set.weight}
                          onChange={(e) => updateSet(i, 'weight', parseInt(e.target.value) || 0)}
                          className="text-center h-8"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSet(i, 'weight', set.weight + 5)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSet(i)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <Button onClick={addSet} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Set
          </Button>
        </div>

        {/* Rest Timer */}
        <RestTimer onComplete={() => setShowRestHub(true)} />

        {/* Rest Hub Carousel */}
        {showRestHub && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <div className="flex border-b border-border">
              <button
                onClick={() => setRestHubTab('youtube')}
                className={`flex-1 px-4 py-3 text-sm transition-colors ${
                  restHubTab === 'youtube'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Youtube className="w-4 h-4 inline mr-2" />
                Form Tips
              </button>
              <button
                onClick={() => setRestHubTab('stats')}
                className={`flex-1 px-4 py-3 text-sm transition-colors ${
                  restHubTab === 'stats'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Progress
              </button>
            </div>

            <div className="p-6">
              {restHubTab === 'youtube' ? (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Youtube className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">YouTube embed placeholder</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4>Personal Records</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Best Set</p>
                    <p className="text-2xl">
                      {lastExerciseData?.sets?.[0]?.reps || 0} reps × {lastExerciseData?.sets?.[0]?.weight || 0} lbs
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Complete Button */}
        <Button
          onClick={nextExercise}
          className="w-full"
          size="lg"
          disabled={currentLogs.length === 0}
        >
          {currentExerciseIndex < routine.exercises.length - 1 ? (
            <>Next Exercise</>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Complete Workout
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
