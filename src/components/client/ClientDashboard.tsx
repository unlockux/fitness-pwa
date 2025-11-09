import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Plus, LogOut } from 'lucide-react';
import { StreakDisplay } from '../shared/StreakDisplay';
import { ProgressRing } from '../shared/ProgressRing';
import { WorkoutCard } from '../shared/WorkoutCard';
import { Button } from '../ui/button';
import { projectId } from '../../utils/supabase/info';

interface ClientDashboardProps {
  user: any;
  token: string;
  onStartWorkout: (routine: any) => void;
  onLogout: () => void;
}

interface DashboardData {
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastWorkoutDate: string | null;
    totalWorkouts: number;
  };
  weeklyGoal: {
    goal: number;
    completed: number;
    weekStart: string;
  };
  routines: any[];
}

export function ClientDashboard({ user, token, onStartWorkout, onLogout }: ClientDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/client/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-primary-foreground mb-1"
            >
              Hey, {(user?.firstName ?? user?.name ?? '').split(' ')[0]}! 👋
            </motion.h1>
            <p className="text-primary-foreground/80 text-sm">{today}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-primary-foreground hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Streak Display (Compact) */}
        {data && (
          <StreakDisplay
            currentStreak={data.streak.currentStreak}
            longestStreak={data.streak.longestStreak}
            compact
          />
        )}
      </div>

      <div className="px-6 -mt-4">
        {/* Weekly Progress */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="mb-1">Weekly Goal</h3>
                <p className="text-sm text-muted-foreground">
                  {data.weeklyGoal.completed} of {data.weeklyGoal.goal} workouts completed
                </p>
              </div>
              <ProgressRing
                completed={data.weeklyGoal.completed}
                goal={data.weeklyGoal.goal}
                size={100}
                strokeWidth={8}
              />
            </div>
          </motion.div>
        )}

        {/* Today's Workouts */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2>Today's Workouts</h2>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>

          {data?.routines && data.routines.length > 0 ? (
            <div className="space-y-3">
              {data.routines.map((routine: any, index: number) => (
                <motion.div
                  key={routine.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <WorkoutCard
                    title={routine.name}
                    exercises={routine.exercises?.length || 0}
                    estimatedTime={routine.exercises?.length * 5}
                    scheduled="Today"
                    onStart={() => onStartWorkout(routine)}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl p-8 border border-border text-center"
            >
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2">No workouts yet</h3>
              <p className="text-sm text-muted-foreground">
                Your trainer will assign workouts soon
              </p>
            </motion.div>
          )}
        </div>

        {/* Stats Summary */}
        {data && data.streak.totalWorkouts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Total Workouts</p>
              <p className="text-3xl">{data.streak.totalWorkouts}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-1">This Week</p>
              <p className="text-3xl">{data.weeklyGoal.completed}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
