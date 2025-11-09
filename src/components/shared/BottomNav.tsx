import React from 'react';
import { Home, Bell, Calendar, Users, TrendingUp, Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  role: 'pt' | 'client';
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export function BottomNav({ role, activeScreen, onNavigate }: BottomNavProps) {
  const ptNavItems = [
    { id: 'pt-dashboard', label: 'Home', icon: Home },
    { id: 'pt-activity', label: 'Activity', icon: Bell },
    { id: 'pt-calendar', label: 'Calendar', icon: Calendar },
    { id: 'pt-settings', label: 'Settings', icon: Settings },
  ];

  const clientNavItems = [
    { id: 'client-dashboard', label: 'Home', icon: Home },
    { id: 'client-activity', label: 'Activity', icon: Bell },
    { id: 'client-progress', label: 'Progress', icon: TrendingUp },
  ];

  const navItems = role === 'pt' ? ptNavItems : clientNavItems;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center justify-center gap-1 relative flex-1 h-full"
              >
                {isActive && (
                  <motion.div
                    layoutId={`${role}-nav-indicator`}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-accent' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`text-xs transition-colors ${
                    isActive ? 'text-accent' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
