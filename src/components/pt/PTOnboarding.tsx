import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Button } from '../ui/button';

interface PTOnboardingProps {
  onComplete: () => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 8 PM
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function PTOnboarding({ onComplete }: PTOnboardingProps) {
  const [availability, setAvailability] = useState<Record<string, number[]>>({});

  const toggleHour = (day: string, hour: number) => {
    setAvailability(prev => {
      const dayHours = prev[day] || [];
      const newHours = dayHours.includes(hour)
        ? dayHours.filter(h => h !== hour)
        : [...dayHours, hour].sort((a, b) => a - b);
      
      return { ...prev, [day]: newHours };
    });
  };

  const isSelected = (day: string, hour: number) => {
    return availability[day]?.includes(hour) || false;
  };

  const formatHour = (hour: number) => {
    if (hour === 12) return '12 PM';
    if (hour === 0) return '12 AM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-accent/20">
      <div className="px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-white mb-3">Set Your Availability</h1>
            <p className="text-white/80">
              Select the hours you're available for client sessions
            </p>
          </div>

          <div className="bg-card rounded-3xl p-6 shadow-2xl border border-border/50 mb-6 overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header with hours */}
              <div className="grid grid-cols-[80px_repeat(14,1fr)] gap-1 mb-2">
                <div></div>
                {HOURS.map(hour => (
                  <div key={hour} className="text-center text-xs text-muted-foreground">
                    {hour === 6 ? '6am' : hour === 12 ? '12pm' : hour === 18 ? '6pm' : ''}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="space-y-1">
                {DAYS.map((day, dayIndex) => (
                  <motion.div
                    key={day}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dayIndex * 0.05 }}
                    className="grid grid-cols-[80px_repeat(14,1fr)] gap-1"
                  >
                    <div className="flex items-center text-sm text-muted-foreground">
                      {day}
                    </div>
                    {HOURS.map(hour => {
                      const selected = isSelected(day, hour);
                      return (
                        <motion.button
                          key={hour}
                          onClick={() => toggleHour(day, hour)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`
                            aspect-square rounded-lg border-2 transition-all
                            ${selected
                              ? 'bg-accent border-accent shadow-lg'
                              : 'bg-muted/30 border-border hover:border-accent/50'
                            }
                          `}
                        >
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          {Object.keys(availability).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-4 mb-6 border border-border"
            >
              <p className="text-sm text-muted-foreground mb-2">Selected Hours:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(availability).map(([day, hours]) => (
                  <div key={day} className="bg-accent/10 px-3 py-1 rounded-lg text-sm">
                    <span>{day}: </span>
                    <span>{hours.length} hours</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={onComplete}
              variant="outline"
              className="flex-1 bg-white hover:bg-white/90"
            >
              Skip for now
            </Button>
            <Button
              onClick={onComplete}
              className="flex-1"
              disabled={Object.keys(availability).length === 0}
            >
              Continue
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
