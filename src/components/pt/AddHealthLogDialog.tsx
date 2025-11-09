import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { projectId } from "../../utils/supabase/info";

interface AddHealthLogDialogProps {
  token: string;
  client: {
    id: string;
    name: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

type HealthStatus = "ACUTE" | "LINGERING" | "RESOLVED";

interface HealthLog {
  id: string;
  injury_title: string;
  details: string | null;
  status: HealthStatus;
  logged_at: string;
}

const STATUS_LABELS: Record<HealthStatus, string> = {
  ACUTE: "Acute",
  LINGERING: "Lingering",
  RESOLVED: "Resolved",
};

export function AddHealthLogDialog({ token, client, onClose, onSuccess }: AddHealthLogDialogProps) {
  const [injuryTitle, setInjuryTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<HealthStatus>("ACUTE");
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let isMounted = true;

    async function fetchLogs() {
      setLoading(true);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/health-logs?clientId=${client.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        if (isMounted) {
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Error fetching health logs:", err);
        if (isMounted) {
          setError("Failed to load health logs");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [client, token]);

  const resetForm = () => {
    setInjuryTitle("");
    setDetails("");
    setStatus("ACUTE");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    if (!injuryTitle.trim()) {
      setError("Please provide a short description");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/health-logs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientId: client.id,
            injuryTitle: injuryTitle.trim(),
            details: details.trim() || null,
            status,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setLogs((prev) => [data.log, ...prev]);
      resetForm();
      onSuccess();
    } catch (err) {
      console.error("Error creating health log:", err);
      setError("Failed to create health log");
    } finally {
      setSubmitting(false);
    }
  };

  if (!client) {
    return null;
  }

  return (
    <Dialog open={!!client} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Health Log</DialogTitle>
          <DialogDescription>
            Record a health note for {client.name}. Acute or lingering issues will trigger pre-session
            safety alerts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="injuryTitle">Issue</Label>
            <Input
              id="injuryTitle"
              placeholder="e.g., Left knee pain"
              value={injuryTitle}
              onChange={(e) => setInjuryTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as HealthStatus)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACUTE">Acute (do not ignore)</SelectItem>
                <SelectItem value="LINGERING">Lingering (monitor)</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Notes</Label>
            <Textarea
              id="details"
              placeholder="Optional context, movement restrictions, etc."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex items-center gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Health Log"}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Recent logs</h4>
            {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
              No health logs recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-border rounded-lg px-3 py-2 text-sm space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.injury_title}</span>
                    <span
                      className={`text-xs font-medium ${
                        log.status === "ACUTE"
                          ? "text-destructive"
                          : log.status === "LINGERING"
                          ? "text-warning"
                          : "text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[log.status]}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground">{log.details}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(log.logged_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

