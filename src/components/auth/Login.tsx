import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { DemoSetup } from '../DemoSetup';

interface LoginProps {
  onLogin: (user: any, token: string) => void;
  onSignup: () => void;
}

export function Login({ onLogin, onSignup }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Get user data from server
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/auth/user`,
          {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const { user } = await response.json();
          onLogin(user, data.session.access_token);
        } else {
          setError('Failed to fetch user data');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-accent/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl p-8 shadow-2xl border border-border/50">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-3xl">💪</span>
            </motion.div>
            <h1 className="text-card-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your fitness journey</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Don't have an account?
            </p>
            <Button variant="outline" onClick={onSignup} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
          </div>
        </div>
      </motion.div>
      
      <DemoSetup />
    </div>
  );
}
