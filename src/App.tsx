import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/client';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { ClientDashboard } from './components/client/ClientDashboard';
import { SessionLogging } from './components/client/SessionLogging';
import { ClientOnboarding } from './components/client/ClientOnboarding';
import { PTDashboard } from './components/pt/PTDashboard';
import { RoutineBuilder } from './components/pt/RoutineBuilder';
import { PTCalendar } from './components/pt/PTCalendar';
import { PTOnboarding } from './components/pt/PTOnboarding';
import { PTActivity } from './components/pt/PTActivity';
import { ClientProgress } from './components/client/ClientProgress';
import { ClientActivity } from './components/client/ClientActivity';
import { BottomNav } from './components/shared/BottomNav';
import { projectId } from './utils/supabase/info';
import { PTSettings } from './components/pt/PTSettings';
import { PTAccountDetails } from './components/pt/PTAccountDetails';
import { PTExerciseLibrary } from './components/pt/PTExerciseLibrary';
import { PTExerciseDetail } from './components/pt/PTExerciseDetail';

type Screen =
  | 'login'
  | 'signup'
  | 'client-onboarding'
  | 'client-dashboard'
  | 'client-session'
  | 'client-activity'
  | 'client-progress'
  | 'pt-onboarding'
  | 'pt-dashboard'
  | 'pt-routine-builder'
  | 'pt-calendar'
  | 'pt-activity'
  | 'pt-settings'
  | 'pt-settings-details'
  | 'pt-settings-exercises'
  | 'pt-settings-exercise-detail';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [activeRoutine, setActiveRoutine] = useState<any>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const initialise = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await loadSession(session);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await loadSession(session);
      } else {
        setUser(null);
        setToken('');
        setScreen('login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSession = async (session: { access_token: string }) => {
    const accessToken = session.access_token;
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/auth/user`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unable to load session (${response.status})`);
      }

      const { user: userData } = await response.json();
      setUser(userData);
      setToken(accessToken);

      if (userData.role === 'client') {
        setScreen('client-dashboard');
      } else if (userData.role === 'pt') {
        setScreen('pt-dashboard');
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setUser(null);
      setToken('');
      setScreen('login');
    }
  };

  const handleLogin = (userData: any, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    
    // Check if user needs onboarding (simplified check)
    if (userData.role === 'client') {
      setScreen('client-dashboard');
    } else if (userData.role === 'pt') {
      setScreen('pt-dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    setUser(null);
    setToken('');
    setScreen('login');
    setSelectedExerciseId(null);
  };

  const handleStartWorkout = (routine: any) => {
    setActiveRoutine(routine);
    setScreen('client-session');
  };

  const handleWorkoutComplete = () => {
    setActiveRoutine(null);
    setScreen('client-dashboard');
  };

  const handleCreateRoutine = (clientId?: string) => {
    setEditingRoutineId(null);
    setSelectedClientId(clientId || null);
    setScreen('pt-routine-builder');
  };

  const handleEditRoutine = (routineId: string) => {
    setEditingRoutineId(routineId);
    setScreen('pt-routine-builder');
  };

  const handleRoutineSuccess = () => {
    setEditingRoutineId(null);
    setSelectedClientId(null);
    setScreen('pt-dashboard');
  };

  const handleNavigate = (targetScreen: string) => {
    setSelectedExerciseId(null);
    setScreen(targetScreen as Screen);
  };

  // Render appropriate screen
  if (screen === 'login') {
    return (
      <Login
        onLogin={handleLogin}
        onSignup={() => setScreen('signup')}
      />
    );
  }

  if (screen === 'signup') {
    return (
      <Signup
        onBack={() => setScreen('login')}
        onSuccess={(userData, accessToken) => {
          setUser(userData);
          setToken(accessToken);
          
          // Show onboarding for new users
          if (userData.role === 'client') {
            setScreen('client-onboarding');
          } else if (userData.role === 'pt') {
            setScreen('pt-onboarding');
          }
        }}
      />
    );
  }

  if (screen === 'client-onboarding') {
    return (
      <ClientOnboarding
        onComplete={() => setScreen('client-dashboard')}
      />
    );
  }

  if (screen === 'client-dashboard') {
    return (
      <>
        <ClientDashboard
          user={user}
          token={token}
          onStartWorkout={handleStartWorkout}
          onLogout={handleLogout}
        />
        <BottomNav
          role="client"
          activeScreen={screen}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  if (screen === 'client-session') {
    return (
      <SessionLogging
        routine={activeRoutine}
        token={token}
        onBack={() => setScreen('client-dashboard')}
        onComplete={handleWorkoutComplete}
      />
    );
  }

  if (screen === 'pt-onboarding') {
    return (
      <PTOnboarding
        onComplete={() => setScreen('pt-dashboard')}
      />
    );
  }

  if (screen === 'pt-dashboard') {
    return (
      <>
        <PTDashboard
          user={user}
          token={token}
          onCreateRoutine={handleCreateRoutine}
          onEditRoutine={handleEditRoutine}
          onViewCalendar={() => setScreen('pt-calendar')}
          onLogout={handleLogout}
        />
        <BottomNav
          role="pt"
          activeScreen={screen}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  if (screen === 'pt-routine-builder') {
    return (
      <RoutineBuilder
        token={token}
        routineId={editingRoutineId}
        initialClientId={selectedClientId}
        onBack={() => {
          setEditingRoutineId(null);
          setSelectedClientId(null);
          setScreen('pt-dashboard');
        }}
        onSuccess={handleRoutineSuccess}
      />
    );
  }

  if (screen === 'pt-calendar') {
    return (
      <>
        <PTCalendar
          token={token}
          onBack={() => setScreen('pt-dashboard')}
        />
        <BottomNav
          role="pt"
          activeScreen={screen}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  if (screen === 'pt-activity') {
    return (
      <>
        <PTActivity token={token} />
        <BottomNav
          role="pt"
          activeScreen={screen}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  if (screen === 'pt-settings') {
    return (
      <>
        <PTSettings
          user={user}
          onViewAccount={() => setScreen('pt-settings-details')}
          onViewExercises={() => setScreen('pt-settings-exercises')}
          onLogout={handleLogout}
        />
        <BottomNav
          role="pt"
          activeScreen={screen}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  if (screen === 'pt-settings-details') {
    return (
      <PTAccountDetails
        token={token}
        onBack={() => setScreen('pt-settings')}
        onProfileUpdated={(profile) => {
          setUser((current: any) => ({ ...current, ...profile }));
        }}
      />
    );
  }

  if (screen === 'pt-settings-exercises') {
    return (
      <PTExerciseLibrary
        token={token}
        onBack={() => setScreen('pt-settings')}
        onSelectExercise={(exerciseId) => {
          setSelectedExerciseId(exerciseId);
          setScreen('pt-settings-exercise-detail');
        }}
      />
    );
  }

  if (screen === 'pt-settings-exercise-detail') {
    if (!selectedExerciseId) {
      setScreen('pt-settings-exercises');
      return null;
    }

    return (
      <PTExerciseDetail
        token={token}
        exerciseId={selectedExerciseId}
        onBack={() => {
          setScreen('pt-settings-exercises');
        }}
      />
    );
  }

  if (screen === 'client-activity') {
    return (
      <>
        <ClientActivity token={token} />
        <BottomNav
          role="client"
          activeScreen={screen}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  if (screen === 'client-progress') {
    return (
      <>
        <ClientProgress token={token} />
        <BottomNav
          role="client"
          activeScreen={screen}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  return null;
}
