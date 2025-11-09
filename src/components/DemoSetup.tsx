import React, { useState } from 'react';
import { Button } from './ui/button';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function DemoSetup() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const setupDemo = async () => {
    setLoading(true);
    setMessage('Setting up demo data...');

    try {
      // Create demo PT
      const ptResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: 'trainer@demo.com',
            password: 'demo123',
            name: 'Alex Trainer',
            role: 'pt',
          }),
        }
      );

      // Create demo client
      const clientResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: 'client@demo.com',
            password: 'demo123',
            name: 'Jordan Smith',
            role: 'client',
          }),
        }
      );

      setMessage('Demo accounts created!\n\nPT: trainer@demo.com / demo123\nClient: client@demo.com / demo123');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-card p-4 rounded-lg border border-border shadow-lg max-w-sm">
      <h4 className="mb-2">Demo Setup</h4>
      <p className="text-sm text-muted-foreground mb-3">
        Create demo accounts for testing
      </p>
      <Button onClick={setupDemo} disabled={loading} className="w-full mb-2">
        {loading ? 'Creating...' : 'Setup Demo'}
      </Button>
      {message && (
        <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
          {message}
        </pre>
      )}
    </div>
  );
}
