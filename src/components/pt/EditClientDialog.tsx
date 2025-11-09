import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, UserCog, Save, KeyRound, CheckCircle2, Copy, Share2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { projectId } from '../../utils/supabase/info';

interface EditClientDialogProps {
  token: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditClientDialog({ token, client, onClose, onSuccess }: EditClientDialogProps) {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/update-client`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            clientId: client.id,
            name: name.trim(),
            email: email.trim() 
          }),
        }
      );

      if (response.ok) {
        setSaved(true);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update client');
      }
    } catch (err) {
      console.error('Error updating client:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/reset-client-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ clientId: client.id }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const getCredentialsText = () => {
    if (!credentials) return '';
    const appUrl = window.location.origin;
    return `Your fitness app password has been reset! 🔐\n\nYour fitness app login:\n${appUrl}\n\nEmail: ${credentials.email}\nNew Password: ${credentials.password}\n\nLog in and start training!`;
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    
    const text = getCredentialsText();
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback to textarea selection method
        if (textareaRef.current) {
          textareaRef.current.select();
          textareaRef.current.setSelectionRange(0, 99999);
          
          try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch (err) {
            console.error('Fallback copy failed:', err);
          }
        }
      }
    } catch (err) {
      console.error('Copy failed:', err);
      if (textareaRef.current) {
        textareaRef.current.select();
      }
    }
  };

  const shareCredentials = async () => {
    if (!credentials) return;
    
    const text = getCredentialsText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Password Reset - Fitness App',
          text: text,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
        copyCredentials();
      }
    } else {
      copyCredentials();
    }
  };

  const hasChanges = name !== client.name || email !== client.email;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background rounded-2xl p-6 max-w-md w-full border border-border max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
              <UserCog className="w-5 h-5 text-accent-foreground" />
            </div>
            <h2>Edit Client</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!credentials ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="editClientName">Client Name</Label>
              <Input
                id="editClientName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="editClientEmail">Client Email</Label>
              <Input
                id="editClientEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="mt-1.5"
              />
            </div>

            {saved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-success" />
                <p className="text-sm text-success">Changes saved successfully!</p>
              </motion.div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <div className="flex items-start gap-3 mb-3">
                <KeyRound className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm mb-1">Reset Password</h3>
                  <p className="text-xs text-muted-foreground">
                    Generate a new temporary password for this client
                  </p>
                </div>
              </div>
              <Button
                onClick={handleResetPassword}
                variant="outline"
                className="w-full"
                disabled={resetLoading}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {resetLoading ? 'Generating...' : 'Reset Password'}
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={!hasChanges || !name.trim() || !email.trim() || loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="text-sm">
                Password reset successfully!
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Login Email</Label>
                <p className="text-sm mt-1">{credentials.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <p className="text-sm mt-1 font-mono bg-muted px-3 py-2 rounded">
                  {credentials.password}
                </p>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                ⚠️ Share the new password securely with your client. The old password will no longer work.
              </p>
            </div>

            {/* Hidden textarea for fallback copy */}
            <Textarea
              ref={textareaRef}
              value={getCredentialsText()}
              readOnly
              className="sr-only"
              aria-hidden="true"
            />

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Message to share:
              </Label>
              <Textarea
                value={getCredentialsText()}
                readOnly
                className="text-sm font-mono resize-none"
                rows={8}
                onClick={(e) => {
                  e.currentTarget.select();
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tap to select all, then manually copy if needed
              </p>
            </div>

            <div className="space-y-2">
              {navigator.share && (
                <Button
                  onClick={shareCredentials}
                  className="w-full"
                  variant="default"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share New Password
                </Button>
              )}
              
              <Button
                onClick={copyCredentials}
                variant={navigator.share ? "outline" : "default"}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>

              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm text-success"
                >
                  ✓ Copied to clipboard!
                </motion.div>
              )}

              <Button
                onClick={() => {
                  setCredentials(null);
                  onSuccess();
                }}
                variant="secondary"
                className="w-full"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
