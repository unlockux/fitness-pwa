import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Plus, LogOut, Calendar, Users, Dumbbell, Edit2, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { AddClientDialog } from './AddClientDialog';
import { EditClientDialog } from './EditClientDialog';
import { AddHealthLogDialog } from './AddHealthLogDialog';
import { Badge } from '../ui/badge';
import { projectId } from '../../utils/supabase/info';

interface PTDashboardProps {
  user: any;
  token: string;
  onCreateRoutine: (clientId?: string) => void;
  onEditRoutine: (routineId: string) => void;
  onViewCalendar: () => void;
  onLogout: () => void;
}

export function PTDashboard({ user, token, onCreateRoutine, onEditRoutine, onViewCalendar, onLogout }: PTDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<{ id: string; name: string; email: string } | null>(null);
  const [healthLogClient, setHealthLogClient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/dashboard`,
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
      console.error('Error fetching PT dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status?: string | null) =>
    status ? status.charAt(0) + status.slice(1).toLowerCase() : '';

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-primary-foreground mb-1">PT Dashboard</h1>
            <p className="text-primary-foreground/80">Welcome back, {user?.name}</p>
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

        {data?.clients && data.clients.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onCreateRoutine}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Routine
            </Button>
            <Button
              onClick={onViewCalendar}
              variant="secondary"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowAddClient(true)}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Client
          </Button>
        )}
      </div>

      <div className="px-6 py-6 space-y-6">
        {data?.alerts && data.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/40 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Safety alerts</h3>
                <p className="text-sm text-destructive/80">
                  Clients with acute or lingering issues scheduled in the next 15 minutes.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {data.alerts.map((alert: any, index: number) => (
                <motion.div
                  key={alert.eventId}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-background/60 border border-destructive/30 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{alert.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        Session at {formatDateTime(alert.sessionStart)}
                      </p>
                    </div>
                    <Badge variant="destructive">{formatStatus(alert.status)}</Badge>
                  </div>
                  <p className="text-sm text-destructive mt-1">{alert.injuryTitle}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Client List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2>Active Clients ({data?.clients?.length || 0})</h2>
            {data?.clients && data.clients.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddClient(true)}
                className="h-8"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            ) : (
              <Users className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

          {data?.clients && data.clients.length > 0 ? (
            <div className="space-y-3">
              {data.clients.map((client: any, index: number) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-2xl p-5 border border-border shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center">
                        <span className="text-xl text-white">
                          {client.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="mb-1">{client.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHealthLogClient({ id: client.id, name: client.name })}
                        className="h-8 w-8 p-0 text-warning hover:text-warning hover:bg-warning/10"
                        title="Record health note"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                      {client.streak?.currentStreak > 0 && (
                        <div className="flex items-center gap-1 bg-warning/10 px-3 py-1.5 rounded-full">
                          <span className="text-sm">🔥</span>
                          <span className="text-sm">{client.streak.currentStreak}</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingClient({ id: client.id, name: client.name, email: client.email })}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">This Week</p>
                      <p className="text-xl">
                        {client.weeklyGoal?.completed || 0}/{client.routines?.length || 0}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Total</p>
                      <p className="text-xl">{client.streak?.totalWorkouts || 0}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Streak</p>
                      <p className="text-xl">{client.streak?.longestStreak || 0}</p>
                    </div>
                  </div>

                  {client.activeHealthIssue ? (
                    <div className="mt-4 border border-destructive/30 bg-destructive/10 rounded-xl px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-destructive">
                          Current issue: {client.activeHealthIssue.injuryTitle}
                        </p>
                        <Badge variant="destructive">{formatStatus(client.activeHealthIssue.status)}</Badge>
                      </div>
                      <p className="text-xs text-destructive/80">
                        Logged {formatDateTime(client.activeHealthIssue.loggedAt)} — check-in before the next session.
                      </p>
                    </div>
                  ) : client.mostRecentHealthLog ? (
                    <div className="mt-4 border border-border rounded-xl px-3 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Last note: {client.mostRecentHealthLog.injuryTitle}</p>
                        <Badge variant="outline">{formatStatus(client.mostRecentHealthLog.status)}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Updated {formatDateTime(client.mostRecentHealthLog.loggedAt)}
                      </p>
                    </div>
                  ) : null}

                  {/* Routines */}
                  {client.routines && client.routines.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Routines ({client.routines.length})</p>
                      </div>
                      <div className="space-y-2">
                        {client.routines.map((routine: any, idx: number) => (
                          <div
                            key={routine.id}
                            onClick={() => onEditRoutine(routine.id)}
                            className="bg-muted/30 rounded-lg p-3 border border-border cursor-pointer hover:bg-muted/50 hover:border-accent/50 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm">{routine.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {routine.exercises?.length || 0} exercises
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHealthLogClient({ id: client.id, name: client.name })}
                      className="w-full"
                    >
                      Record Health Note
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCreateRoutine(client.id)}
                      className="w-full"
                    >
                      Create Routine
                    </Button>
                  </div>
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
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2">Get Started</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create client accounts and start building personalized workout routines
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
                <p className="text-xs mb-2">Quick Start:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click "Add Your First Client" above</li>
                  <li>Enter their name and email</li>
                  <li>Share the login credentials with them</li>
                  <li>Create custom workout routines</li>
                </ol>
              </div>
              <Button onClick={() => setShowAddClient(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            </motion.div>
          )}
        </div>

        {/* Quick Stats */}
        {data?.clients && data.clients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <p className="text-sm text-muted-foreground">Active This Week</p>
              </div>
              <p className="text-3xl">
                {data.clients.filter((c: any) => c.weeklyGoal?.completed > 0).length}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <p className="text-sm text-muted-foreground">Need Attention</p>
              </div>
              <p className="text-3xl">{data.alerts?.length || 0}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Client Dialog */}
      {showAddClient && (
        <AddClientDialog
          token={token}
          onClose={() => setShowAddClient(false)}
          onSuccess={() => {
            setShowAddClient(false);
            fetchDashboardData();
          }}
        />
      )}

      {editingClient && (
        <EditClientDialog
          token={token}
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSuccess={() => {
            setEditingClient(null);
            fetchDashboardData();
          }}
        />
      )}

      {healthLogClient && (
        <AddHealthLogDialog
          token={token}
          client={healthLogClient}
          onClose={() => setHealthLogClient(null)}
          onSuccess={() => {
            fetchDashboardData();
            setHealthLogClient(null);
          }}
        />
      )}
    </div>
  );
}
