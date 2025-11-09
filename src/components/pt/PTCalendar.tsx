import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, User, Coffee, Dumbbell } from 'lucide-react';
import { Button } from '../ui/button';
import { projectId } from '../../utils/supabase/info';

interface PTCalendarProps {
  token: string;
  onBack: () => void;
}

export function PTCalendar({ token, onBack }: PTCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/calendar`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEventsForDay = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.startDate).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'session': return User;
      case 'break': return Coffee;
      case 'studio': return Dumbbell;
      default: return User;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'session': return 'bg-accent text-accent-foreground';
      case 'break': return 'bg-warning/20 text-warning-foreground border-warning/40';
      case 'studio': return 'bg-success/20 text-success-foreground border-success/40';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
            <h2 className="text-primary-foreground">Calendar</h2>
            <p className="text-sm text-primary-foreground/80">Manage your schedule</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Event
          </Button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={previousMonth}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-primary-foreground">{monthName}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextMonth}
            className="text-primary-foreground hover:bg-white/10"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 border border-border shadow-sm"
        >
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const dayEvents = getEventsForDay(day);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  className={`
                    aspect-square rounded-lg p-1 border
                    ${day ? 'bg-background cursor-pointer hover:bg-muted/50' : 'bg-transparent border-transparent'}
                    ${isToday ? 'border-accent border-2' : 'border-border'}
                  `}
                >
                  {day && (
                    <div className="h-full flex flex-col">
                      <div className={`text-center text-sm mb-1 ${isToday ? 'text-accent' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event, i) => {
                          const Icon = getEventIcon(event.type);
                          return (
                            <div
                              key={i}
                              className={`text-xs px-1 py-0.5 rounded border ${getEventColor(event.type)}`}
                            >
                              <Icon className="w-2.5 h-2.5 inline mr-0.5" />
                              <span className="truncate text-[10px]">{event.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-accent" />
            <span className="text-sm text-muted-foreground">1:1 Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success/20 border border-success/40" />
            <span className="text-sm text-muted-foreground">Studio Activities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning/20 border border-warning/40" />
            <span className="text-sm text-muted-foreground">Breaks</span>
          </div>
        </motion.div>

        {/* Upcoming Events */}
        {events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <h3 className="mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {events.slice(0, 5).map((event, index) => {
                const Icon = getEventIcon(event.type);
                return (
                  <div
                    key={index}
                    className="bg-card rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventColor(event.type)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="mb-1">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.startDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
