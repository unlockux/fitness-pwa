import React from 'react';
import { ChevronRight, Clock, Dumbbell } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';

interface WorkoutCardProps {
  title: string;
  exercises: number;
  estimatedTime?: number;
  scheduled?: string;
  onStart: () => void;
}

export function WorkoutCard({ title, exercises, estimatedTime, scheduled, onStart }: WorkoutCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm cursor-pointer"
      onClick={onStart}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="mb-2">{title}</h3>
          {scheduled && (
            <p className="text-sm text-muted-foreground">{scheduled}</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="w-4 h-4" />
          <span>{exercises} exercises</span>
        </div>
        {estimatedTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{estimatedTime} min</span>
          </div>
        )}
      </div>

      <Button className="w-full mt-4">
        Start Workout
      </Button>
    </motion.div>
  );
}
