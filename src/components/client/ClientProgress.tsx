import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Target, Calendar, Award } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface ClientProgressProps {
  token: string;
}

export function ClientProgress({ token }: ClientProgressProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
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
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-8">
        <h1 className="text-primary-foreground mb-1">Your Progress</h1>
        <p className="text-sm text-primary-foreground/80">Track your fitness journey</p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-accent to-accent/80 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-white/80 mb-1">Current Streak</p>
              <p className="text-4xl">
                {data?.streak?.currentStreak || 0} days
              </p>
            </div>
            <div className="text-5xl">🔥</div>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <div>
              <span className="block">Longest</span>
              <span className="text-white">{data?.streak?.longestStreak || 0} days</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <span className="block">Total Workouts</span>
              <span className="text-white">{data?.streak?.totalWorkouts || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* Weekly Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-accent" />
            <div>
              <h3>Weekly Goal</h3>
              <p className="text-sm text-muted-foreground">
                {data?.weeklyGoal?.completed || 0} of {data?.weeklyGoal?.goal || 0} completed
              </p>
            </div>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(
                  ((data?.weeklyGoal?.completed || 0) /
                    Math.max(data?.weeklyGoal?.goal || 1, 1)) *
                    100,
                  100
                )}%`,
              }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-0 left-0 h-full bg-accent rounded-full"
            />
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl p-4 border border-border"
          >
            <Calendar className="w-6 h-6 text-accent mb-2" />
            <p className="text-xs text-muted-foreground mb-1">This Week</p>
            <p className="text-2xl">{data?.weeklyGoal?.completed || 0}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl p-4 border border-border"
          >
            <Award className="w-6 h-6 text-accent mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl">{data?.streak?.totalWorkouts || 0}</p>
          </motion.div>
        </div>

        {/* Placeholder for future features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-8 border border-border text-center"
        >
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="mb-2">More Insights Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            We're working on detailed charts and analytics to help you track your progress over time.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
