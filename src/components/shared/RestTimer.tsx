import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';

interface RestTimerProps {
  initialSeconds?: number;
  onComplete?: () => void;
}

export function RestTimer({ initialSeconds = 90, onComplete }: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [targetSeconds, setTargetSeconds] = useState(initialSeconds);

  useEffect(() => {
    let interval: any = null;

    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, onComplete]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSeconds(targetSeconds);
  };

  const adjustTime = (delta: number) => {
    const newTarget = Math.max(30, Math.min(600, targetSeconds + delta));
    setTargetSeconds(newTarget);
    if (!isActive) {
      setSeconds(newTarget);
    }
  };

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = (seconds / targetSeconds) * 100;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-muted-foreground">Rest Timer</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => adjustTime(-15)}
            disabled={isActive}
            className="h-8 w-8 p-0"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => adjustTime(15)}
            disabled={isActive}
            className="h-8 w-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        {/* Progress ring */}
        <svg className="w-full h-auto" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-secondary"
          />
          <motion.circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-accent transform -rotate-90 origin-center"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
            initial={false}
            animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - progress / 100) }}
            transition={{ duration: 0.3 }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${minutes}:${secs}`}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className="text-5xl tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={toggleTimer}
          className="flex-1"
          variant={isActive ? "secondary" : "default"}
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start
            </>
          )}
        </Button>
        <Button onClick={resetTimer} variant="outline" className="px-4">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
