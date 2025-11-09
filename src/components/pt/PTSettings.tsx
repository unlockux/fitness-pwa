import React from "react";
import { ChevronRight, LogOut, Settings, User, Dumbbell } from "lucide-react";
import { Button } from "../ui/button";

interface PTSettingsProps {
  user: any;
  onViewAccount: () => void;
  onViewExercises: () => void;
  onLogout: () => void;
}

export function PTSettings({ user, onViewAccount, onViewExercises, onLogout }: PTSettingsProps) {
  const firstName = user?.firstName ?? user?.name ?? "";

  const items = [
    {
      label: "PT Details",
      description: "Update your name, contact info, and preferences.",
      icon: User,
      action: onViewAccount,
    },
    {
      label: "Exercise Library",
      description: "Manage exercises shared across all of your clients.",
      icon: Dumbbell,
      action: onViewExercises,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-wide opacity-75">
              <Settings className="w-4 h-4" />
              Settings
            </div>
            <h1 className="text-primary-foreground text-2xl mt-2">
              Keep things running smooth, {firstName ? firstName.split(" ")[0] : "Coach"}
            </h1>
            <p className="text-sm text-primary-foreground/80 mt-2 max-w-lg">
              Tune your account and shared resources in one place. Updates here apply across
              your PT workspace instantly.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-primary-foreground hover:bg-white/10">
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3">Manage</h2>
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-left shadow-sm hover:border-accent transition-colors flex items-center justify-between p-2"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-base text-card-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
