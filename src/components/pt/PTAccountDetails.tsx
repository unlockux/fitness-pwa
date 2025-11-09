import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ChevronLeft, Save } from "lucide-react";
import { projectId } from "../../utils/supabase/info";

interface PTAccountDetailsProps {
  token: string;
  onBack: () => void;
  onProfileUpdated?: (profile: any) => void;
}

interface PTProfileResponse {
  profile: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    motivationStyle: string | null;
    trainingFrequencyGoal: number | null;
    prefersMetricUnits: boolean;
  };
}

export function PTAccountDetails({ token, onBack, onProfileUpdated }: PTAccountDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [motivationStyle, setMotivationStyle] = useState("");
  const [trainingGoal, setTrainingGoal] = useState<number | "">("");
  const [prefersMetric, setPrefersMetric] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 401) {
          throw new Error("Your session has expired. Please sign out and log in again.");
        }

        if (!response.ok) {
          throw new Error("Failed to load PT details");
        }

        const data: PTProfileResponse = await response.json();
        const profile = data.profile;
        setFirstName(profile.firstName ?? "");
        setLastName(profile.lastName ?? "");
        setEmail(profile.email ?? "");
        setMotivationStyle(profile.motivationStyle ?? "");
        setTrainingGoal(profile.trainingFrequencyGoal ?? "");
        setPrefersMetric(profile.prefersMetricUnits);
      } catch (err: any) {
        console.error("Load PT profile error", err);
        setError(err.message || "Unable to load PT details");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadProfile();
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim() || null,
      motivationStyle: motivationStyle.trim() || null,
      trainingFrequencyGoal: typeof trainingGoal === "number" ? trainingGoal : null,
      prefersMetricUnits: prefersMetric,
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d58ce8ef/pt/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.status === 401) {
        throw new Error("Your session has expired. Please sign out and log in again.");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update PT details");
      }

      setSuccess("Your details have been updated.");
      if (onProfileUpdated) {
        onProfileUpdated(data.profile);
      }
    } catch (err: any) {
      console.error("Update PT profile error", err);
      setError(err.message || "Unable to update PT details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-semibold mt-4">PT Account Details</h1>
        <p className="text-sm text-primary-foreground/80 mt-2 max-w-xl">
          Update how you appear to clients and manage your preferred training defaults.
        </p>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Loading your details...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6"
          >
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Jordan"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Smith"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  autoComplete="family-name"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="coach@yourstudio.com"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  autoComplete="email"
                />
                <p className="text-xs text-muted-foreground">
                  Updating your email will change how you sign in to both the PT and client apps.
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
              <div className="space-y-2">
                <Label htmlFor="motivationStyle">Motivation style</Label>
                <input
                  id="motivationStyle"
                  type="text"
                  value={motivationStyle}
                  onChange={(event) => setMotivationStyle(event.target.value)}
                  placeholder="Positive reinforcement, data-driven, etc."
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainingGoal">Target sessions per week</Label>
                <input
                  id="trainingGoal"
                  type="number"
                  min={1}
                  max={14}
                  value={trainingGoal === "" ? "" : trainingGoal}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "") {
                      setTrainingGoal("");
                    } else {
                      setTrainingGoal(Number(value));
                    }
                  }}
                  placeholder="3"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="prefersMetric">Unit preference</Label>
                <select
                  id="prefersMetric"
                  value={prefersMetric ? "metric" : "imperial"}
                  onChange={(event) => setPrefersMetric(event.target.value === "metric")}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  <option value="metric">Metric (kg, km)</option>
                  <option value="imperial">Imperial (lb, miles)</option>
                </select>
              </div>
            </section>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
                {success}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="min-w-[110px]"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="min-w-[150px]">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
