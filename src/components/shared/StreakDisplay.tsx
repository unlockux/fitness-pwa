import React from 'react';
import { Flame, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

export function StreakDisplay({ currentStreak, longestStreak, compact = false }: StreakDisplayProps) {
  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 bg-gradient-to-r from-warning/10 to-warning/5 px-4 py-2 rounded-xl border border-warning/20"
      >
        <Flame className="w-5 h-5 text-warning" />
        <div className="flex items-baseline gap-1">
          <span className="text-2xl text-foreground">{currentStreak}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-muted-foreground">Your Streak</h3>
        <Flame className="w-5 h-5 text-warning" />
      </div>
      
      <div className="flex items-baseline gap-2 mb-6">
        <motion.span
          key={currentStreak}
          initial={{ scale: 1.2, color: '#F59E0B' }}
          animate={{ scale: 1, color: '#0F172A' }}
          transition={{ duration: 0.3 }}
          className="text-5xl"
        >
          {currentStreak}
        </motion.span>
        <span className="text-muted-foreground">days</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="w-4 h-4" />
        <span>Best: {longestStreak} days</span>
      </div>
    </motion.div>
  );
}
