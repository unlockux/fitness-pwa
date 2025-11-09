import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Dumbbell } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface SignupProps {
  onBack: () => void;
  onSuccess: (user: any, token: string) => void;
}

export function Signup({ onBack, onSuccess }: SignupProps) {
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<'client' | 'pt'>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (selectedRole: 'client' | 'pt') => {
    setRole(selectedRole);
    setStep('details');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password, name, role }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Now sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (signInData.session) {
        const userResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/auth/user`,
          {
            headers: {
              Authorization: `Bearer ${signInData.session.access_token}`,
            },
          }
        );

        if (userResponse.ok) {
          const { user } = await userResponse.json();
          onSuccess(user, signInData.session.access_token);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-accent/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="bg-card rounded-3xl p-8 shadow-2xl border border-border/50">
            <div className="text-center mb-8">
              <h1 className="text-card-foreground mb-2">Join FitFlow</h1>
              <p className="text-muted-foreground">Choose your role to get started</p>
            </div>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect('client')}
                className="w-full bg-gradient-to-r from-accent to-accent/90 text-white p-6 rounded-2xl text-left shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="mb-1">I'm a Client</h3>
                    <p className="text-sm opacity-90">Track workouts and reach your goals</p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect('pt')}
                className="w-full bg-gradient-to-r from-primary to-primary/90 text-white p-6 rounded-2xl text-left shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="mb-1">I'm a Personal Trainer</h3>
                    <p className="text-sm opacity-90">Manage clients and create routines</p>
                  </div>
                </div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-accent/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Button
          variant="ghost"
          onClick={() => setStep('role')}
          className="mb-4 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="bg-card rounded-3xl p-8 shadow-2xl border border-border/50">
          <div className="text-center mb-8">
            <h1 className="text-card-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">
              {role === 'client' ? 'Start your fitness journey' : 'Manage your clients'}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-card-foreground">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-card-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-card-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="mt-1.5"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
