import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Target, Zap, Heart, Brain } from 'lucide-react';
import { Button } from '../ui/button';

interface ClientOnboardingProps {
  onComplete: () => void;
}

const GOALS = [
  { id: 'strength', label: 'Build Strength', icon: Zap, color: 'from-accent to-accent/80' },
  { id: 'weight_loss', label: 'Lose Weight', icon: Target, color: 'from-destructive to-destructive/80' },
  { id: 'endurance', label: 'Improve Endurance', icon: Heart, color: 'from-success to-success/80' },
  { id: 'wellness', label: 'General Wellness', icon: Brain, color: 'from-warning to-warning/80' },
];

const MOTIVATION_STYLES = [
  {
    id: 'encouraging',
    title: 'Encouraging & Supportive',
    description: 'Positive reinforcement and gentle nudges',
    emoji: '🌟',
  },
  {
    id: 'competitive',
    title: 'Competitive & Challenging',
    description: 'Push yourself with goals and challenges',
    emoji: '🏆',
  },
  {
    id: 'data_driven',
    title: 'Data-Driven',
    description: 'Track metrics and analyze progress',
    emoji: '📊',
  },
];

export function ClientOnboarding({ onComplete }: ClientOnboardingProps) {
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedMotivation, setSelectedMotivation] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 0 && selectedGoal) {
      setStep(1);
    } else if (step === 1 && selectedMotivation) {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-accent/20 relative overflow-hidden">
      {/* Progress dots */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-2 z-10">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
              >
                <h1 className="text-white mb-3">What's Your Primary Goal?</h1>
                <p className="text-white/80">Choose what matters most to you</p>
              </motion.div>

              <div className="space-y-3 mb-8">
                {GOALS.map((goal, index) => {
                  const Icon = goal.icon;
                  const isSelected = selectedGoal === goal.id;

                  return (
                    <motion.button
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`w-full bg-white rounded-2xl p-6 text-left transition-all ${
                        isSelected ? 'ring-4 ring-accent shadow-2xl' : 'shadow-lg'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 bg-gradient-to-br ${goal.color} rounded-xl flex items-center justify-center`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-foreground">{goal.label}</h3>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                          >
                            <ChevronRight className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleNext}
                  disabled={!selectedGoal}
                  className="w-full"
                  size="lg"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="w-full text-white hover:bg-white/10"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="motivation"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
              >
                <h1 className="text-white mb-3">How Do You Stay Motivated?</h1>
                <p className="text-white/80">We'll tailor your experience</p>
              </motion.div>

              <div className="space-y-3 mb-8">
                {MOTIVATION_STYLES.map((style, index) => {
                  const isSelected = selectedMotivation === style.id;

                  return (
                    <motion.button
                      key={style.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedMotivation(style.id)}
                      className={`w-full bg-white rounded-2xl p-6 text-left transition-all ${
                        isSelected ? 'ring-4 ring-accent shadow-2xl' : 'shadow-lg'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{style.emoji}</div>
                        <div className="flex-1">
                          <h3 className="text-foreground mb-1">{style.title}</h3>
                          <p className="text-sm text-muted-foreground">{style.description}</p>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 bg-accent rounded-full flex items-center justify-center mt-1"
                          >
                            <ChevronRight className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleNext}
                  disabled={!selectedMotivation}
                  className="w-full"
                  size="lg"
                >
                  Get Started
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="w-full text-white hover:bg-white/10"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
