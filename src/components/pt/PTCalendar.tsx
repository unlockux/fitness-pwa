import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, User, Coffee, Dumbbell } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { projectId } from '../../utils/supabase/info';
import { cn } from '../ui/utils';

interface PTCalendarProps {
  token: string;
  onBack: () => void;
}

export function PTCalendar({ token, onBack }: PTCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'threeDay' | 'day'>('month');
  const [clients, setClients] = useState<any[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'session' | 'break' | 'studio'>('session');
  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toTimeInputValue = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const normaliseDuration = (minutes: number) => {
    const safeMinutes = Number.isFinite(minutes) ? minutes : 60;
    const snapped = Math.round(safeMinutes / 15) * 15;
    return Math.min(90, Math.max(15, snapped));
  };

  const [eventDate, setEventDate] = useState(() => toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(() => toTimeInputValue(new Date()));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [eventNotes, setEventNotes] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  const openCreateEvent = (date?: Date) => {
    const now = new Date();
    const targetDate = date ? new Date(date) : now;
    const isoDate = toDateInputValue(targetDate);
    const defaultTime = date
      ? (date.toDateString() === now.toDateString()
          ? toTimeInputValue(now)
          : '09:00')
      : toTimeInputValue(now);

    setEventTitle('');
    setEventNotes('');
    setEventType('session');
    setEventDate(isoDate);
    setStartTime(defaultTime);
    setDurationMinutes(60);
    setSelectedClientId('');
    setError('');
    setEditingEvent(null);
    setIsDeleting(false);
    setShowAddEvent(true);
  };

  const openEditEvent = (event: any) => {
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : null;

    setEditingEvent(event);
    setEventType((event.type ?? 'session') as 'session' | 'break' | 'studio');
    setEventTitle(event.title ?? '');
    setEventNotes(event.notes ?? '');
    setEventDate(toDateInputValue(start));
    setStartTime(toTimeInputValue(start));
    setDurationMinutes(() => {
      if (!end) return 60;
      const minutes = (end.getTime() - start.getTime()) / 60000;
      return normaliseDuration(minutes);
    });
    setSelectedClientId(event.clientId ?? '');
    setError('');
    setIsDeleting(false);
    setShowAddEvent(true);
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchCalendar();
    fetchClients();
  }, [token]);

  useEffect(() => {
     if (typeof window === 'undefined') return;
    const query = window.matchMedia('(max-width: 450px)');
    const update = () => setIsCompact(query.matches);
    update();
    if (query.addEventListener) {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  const fetchCalendar = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/calendar`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        console.warn('Calendar request returned 401. Please sign in again.');
        setEvents([]);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
    }
  };

  const closeEventModal = () => {
    setShowAddEvent(false);
    setEditingEvent(null);
    setError('');
    setIsDeleting(false);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setIsDeleting(false);
    setError('');

    try {
      const start = new Date(`${eventDate}T${startTime}`);
      const appliedDuration = normaliseDuration(Number(durationMinutes || 60));
      const end = new Date(start.getTime() + appliedDuration * 60000);

      const selectedClient = selectedClientId
        ? clients.find((client) => client.id === selectedClientId)
        : null;
      const clientName = selectedClient?.firstName || selectedClient?.name;
      const resolvedTitle = eventTitle.trim() ||
        (eventType === 'session'
          ? clientName
            ? `Session with ${clientName}`
            : 'PT Session'
          : eventType === 'studio'
            ? 'Studio Block'
            : 'Break');

      const payload = {
        title: resolvedTitle,
        type: eventType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        clientId: eventType === 'session' && selectedClientId ? selectedClientId : null,
        notes: eventNotes.trim() || null,
      };

      const endpoint = editingEvent
        ? `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/calendar/${editingEvent.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/calendar`;

      const response = await fetch(endpoint, {
        method: editingEvent ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        throw new Error('Your session has expired. Please sign out and log in again.');
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to save event');
      }

      closeEventModal();
      setEventTitle('');
      setEventNotes('');
      setSelectedClientId('');
      setDurationMinutes(60);
      setEventType('session');
      setStartTime(toTimeInputValue(new Date()));
      setEventDate(toDateInputValue(new Date()));
      setEditingEvent(null);
      await fetchCalendar();
    } catch (err: any) {
      console.error('Save calendar event error:', err);
      setError(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    setIsDeleting(true);
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/calendar/${editingEvent.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error('Your session has expired. Please sign out and log in again.');
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to delete event');
      }

      closeEventModal();
      await fetchCalendar();
    } catch (err: any) {
      console.error('Delete calendar event error:', err);
      setError(err.message || 'Failed to delete event');
    } finally {
      setSaving(false);
      setIsDeleting(false);
    }
  };

  const fetchClients = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        console.warn('Client list request returned 401. Please sign in again.');
        setClients([]);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
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
  const daysInMonth = getDaysInMonth(currentDate);

  const getThreeDayDates = () => {
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 3 }, (_, idx) => {
      const date = new Date(start);
      date.setDate(start.getDate() + idx);
      return date;
    });
  };

  const getDayEvents = () => {
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    return events.filter((event) => {
      const eventStart = new Date(event.startDate);
      return eventStart >= startOfDay && eventStart <= endOfDay;
    });
  };

  const getEventsForDay = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.startDate).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const handleDayKeyDown = (event: React.KeyboardEvent, date: Date | null) => {
     if (!date) return;
     if (event.key === 'Enter' || event.key === ' ') {
       event.preventDefault();
      openCreateEvent(date);
     }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'session': return User;
      case 'break': return Coffee;
      case 'studio': return Dumbbell;
      default: return User;
    }
  };

  const getEventAppearance = (type: string): { className: string; style?: React.CSSProperties } => {
    switch (type) {
      case 'session':
        return { className: 'border bg-accent text-accent-foreground' };
      case 'break':
        return {
          className: 'border',
          style: { backgroundColor: '#FFE8D6', color: '#7B341E', borderColor: '#FBC696' },
        };
      case 'studio':
        return {
          className: 'border',
          style: { backgroundColor: '#E6F6EC', color: '#1E6F43', borderColor: '#B9E5C8' },
        };
      default:
        return { className: 'border bg-muted text-muted-foreground' };
    }
  };

  const getSessionClientName = (event: any): string | null => {
    if (event.type !== 'session' || !event.clientId) return null;
    const client = clients.find((c) => c.id === event.clientId);
    return client?.firstName ?? client?.name ?? null;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ===== Header ===== */}
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
            onClick={() => openCreateEvent()}
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
        {/* ===== Calendar Surface ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 border border-border shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Overview</h3>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value) {
                  setViewMode(value as 'month' | 'threeDay' | 'day');
                }
              }}
            >
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="threeDay">3 Day</ToggleGroupItem>
              <ToggleGroupItem value="month">Month</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* ----- Month View Grid ----- */}
          {viewMode === 'month' && (
            <>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
                {daysInMonth.map((day: Date | null, index: number) => {
              const isToday = day && day.toDateString() === new Date().toDateString();
              const dayEvents = getEventsForDay(day);
                   const hasEvents = dayEvents.length > 0;
                  const borderClass = (() => {
                    if (!day) return 'border-transparent';
                    if (hasEvents) return 'border-accent border-2';
                    if (isCompact) return 'border-muted-foreground/30';
                    if (isToday) return 'border-accent border';
                    return 'border-border';
                  })();

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                       className={cn(
                        'aspect-square rounded-lg p-1 border transition-colors',
                        day ? 'bg-background cursor-pointer hover:bg-muted/50' : 'bg-transparent',
                        borderClass
                       )}
                       onClick={() => day && openCreateEvent(day)}
                       role={day ? 'button' : undefined}
                       tabIndex={day ? 0 : -1}
                       onKeyDown={(event) => handleDayKeyDown(event, day)}
                >
                  {day && (
                    <div className="h-full flex flex-col">
                      <div className={`text-center text-sm mb-1 ${isToday ? 'text-accent' : ''}`}>
                        {day.getDate()}
                      </div>
                          {!isCompact && (
                      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event, i) => {
                          const Icon = getEventIcon(event.type);
                                const appearance = getEventAppearance(event.type);
                          return (
                                  <button
                                    key={`${event.id ?? i}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditEvent(event);
                                    }}
                                    className={cn(
                                      'w-full flex items-center justify-between gap-1 text-left text-xs px-1 py-0.5 rounded transition-colors',
                                      appearance.className
                                    )}
                                    style={appearance.style}
                                  >
                                    <span className="flex items-center gap-1 min-w-0">
                                      <Icon className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate text-[10px]">{event.title}</span>
                                    </span>
                                    <ChevronRight className="w-3 h-3 shrink-0" />
                                  </button>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                          )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
            </>
          )}

          {/* ----- Week View Timeline ----- */}
          {viewMode === 'threeDay' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {getThreeDayDates().map((date) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dayEvents = getEventsForDay(date);
                  const hasEvents = dayEvents.length > 0;
                  const borderClass = isCompact
                    ? hasEvents
                      ? 'border-blue-500 border-2'
                      : 'border-muted-foreground/30'
                    : hasEvents
                      ? 'border-primary border-2'
                      : isToday
                        ? 'border-accent border-2'
                        : 'border-border';
 
                   return (
                     <div
                       key={date.toISOString()}
                       className={cn('border rounded-lg p-3 transition-colors', borderClass)}
                       onClick={() => openCreateEvent(date)}
                       role="button"
                       tabIndex={0}
                       onKeyDown={(event) => handleDayKeyDown(event, date)}
                     >
                      <div className="text-sm font-semibold mb-2">
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      {/* ----- Items in the day ----- */}
                      <div className="space-y-2">
                        {dayEvents.length === 0 && (
                          <p className="text-xs text-muted-foreground">No events</p>
                        )}
                        {dayEvents.map((event, idx) => {
                           const Icon = getEventIcon(event.type);
                           const appearance = getEventAppearance(event.type);
                           const clientLabel = getSessionClientName(event);
                           return (
                            <button
                              key={`${event.id}-${idx}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEvent(event);
                              }}
                              className={cn(
                                'w-full text-left text-xs px-2 py-1 rounded transition-colors flex flex-col gap-1',
                                appearance.className
                              )}
                              style={appearance.style}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">
                                  {clientLabel ? `${event.title} · ${clientLabel}` : event.title}
                                </span>
                                <ChevronRight className="w-3 h-3 shrink-0" />
                              </div>
                              <div className="text-[10px] text-left">
                                {new Date(event.startDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                {event.endDate &&
                                  ` - ${new Date(event.endDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----- Day View Column ----- */}
          {viewMode === 'day' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                 <h4 className="text-sm font-semibold">
                   {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                 </h4>
                 <div className="flex items-center gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))}
                   >
                     Previous
                   </Button>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}
                   >
                     Next
                   </Button>
                 </div>
               </div>
              <div className="space-y-3">
                {getDayEvents().length === 0 && <p className="text-sm text-muted-foreground">No events today</p>}
                {getDayEvents().map((event, idx) => {
                   const Icon = getEventIcon(event.type);
                   const appearance = getEventAppearance(event.type);
                   const clientLabel = getSessionClientName(event);
                   return (
                    <button
                      key={`${event.id}-${idx}`}
                      type="button"
                      onClick={() => openEditEvent(event)}
                      className={cn(
                        'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
                        appearance.className
                      )}
                      style={appearance.style}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold truncate">
                              {clientLabel ? `${event.title} · ${clientLabel}` : event.title}
                            </span>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                          </div>
                          <p className="text-xs mt-1">
                            {new Date(event.startDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            {event.endDate &&
                              ` - ${new Date(event.endDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                          </p>
                          {event.notes && (
                            <p className="text-xs mt-2">{event.notes}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* ===== Legend ===== */}
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

        {/* ===== Upcoming Events ===== */}
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
                 const appearance = getEventAppearance(event.type);
                 const clientLabel = getSessionClientName(event);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => openEditEvent(event)}
                    className="bg-card rounded-xl p-4 border border-border w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn('w-10 h-10 rounded-lg flex items-center justify-center', appearance.className)}
                        style={appearance.style}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="mb-1 truncate">
                            {clientLabel ? `${event.title} · ${clientLabel}` : event.title}
                          </h4>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </div>
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
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* ===== Add Event Modal ===== */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-2xl p-6 max-w-lg w-full border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editingEvent ? 'Edit calendar event' : 'Add calendar event'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={closeEventModal}
                disabled={saving}
              >
                <span className="sr-only">Close</span>
                ×
              </Button>
            </div>

            {/* ----- Event Form ----- */}
            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* --- Type Toggle --- */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <ToggleGroup
                    type="single"
                    className="flex gap-2"
                    value={eventType}
                    onValueChange={(value) => {
                      if (!value || saving) return;
                      setEventType(value as 'session' | 'break' | 'studio');
                      if (value === 'session') {
                        setEventTitle('');
                      }
                    }}
                  >
                    <ToggleGroupItem
                      value="session"
                      className={cn(eventType === 'session' && 'bg-primary text-primary-foreground shadow-md')}
                    >
                      PT Session
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="studio"
                      className={cn(eventType === 'studio' && 'bg-primary text-primary-foreground shadow-md')}
                    >
                      Studio
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="break"
                      className={cn(eventType === 'break' && 'bg-primary text-primary-foreground shadow-md')}
                    >
                      Break
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                {eventType !== 'session' && (
                   <div className="space-y-2">
                     <Label htmlFor="eventTitle">Title</Label>
                    <input
                      id="eventTitle"
                      type="text"
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                      placeholder="e.g. Studio class"
                      disabled={saving}
                      className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                   </div>
                 )}
               </div>

              {/* --- Client Selector --- */}
              {eventType === 'session' && (
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client</Label>
                  <select
                    id="clientId"
                    className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedClientId}
                    onChange={(event) => setSelectedClientId(event.target.value)}
                    disabled={saving || !clients.length}
                  >
                    <option value="">
                      {clients.length ? 'Select client' : 'No clients yet'}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.firstName ?? client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* --- Date Picker --- */}
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Date</Label>
                  <input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                    disabled={saving}
                    className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                {/* --- Start Time Picker --- */}
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start time</Label>
                  <input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    disabled={saving}
                    className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                {/* --- Duration Field --- */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <select
                    id="duration"
                    className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={String(durationMinutes)}
                    onChange={(event) => setDurationMinutes(Number(event.target.value))}
                    disabled={saving}
                  >
                    {[15, 30, 45, 60, 75, 90].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* --- Notes Textarea --- */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={eventNotes}
                  onChange={(event) => setEventNotes(event.target.value)}
                  placeholder="Optional context for this event"
                  rows={3}
                  disabled={saving}
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* --- Form Actions --- */}
              <div
                className={cn(
                  'flex items-center gap-3 pt-2',
                  editingEvent ? 'justify-between' : 'justify-end'
                )}
              >
                {editingEvent && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteEvent}
                    disabled={saving}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEventModal}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && !isDeleting
                      ? 'Saving...'
                      : editingEvent
                        ? 'Update Event'
                        : 'Save Event'}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
