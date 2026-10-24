"use client";

import { useActionState } from "react";
import { ClipboardList, Users, Wrench, Loader2 } from "lucide-react";
import { signInDemo, type AuthState } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: AuthState = { error: null };

const ROLES = [
  { role: "manager", label: "Service manager", text: "Contracts, renewals, KPIs and users", icon: ClipboardList },
  { role: "coordinator", label: "Coordinator", text: "Customers, equipment, tickets and visit planning", icon: Users },
  { role: "technician", label: "Technician", text: "Only their own visits and tickets", icon: Wrench },
] as const;

export function DemoPicker() {
  const [state, formAction, pending] = useActionState(signInDemo, initialState);

  return (
    <form action={formAction} className="space-y-2">
      {ROLES.map(({ role, label, text, icon: Icon }) => (
        <button
          key={role}
          type="submit"
          name="role"
          value={role}
          disabled={pending}
          className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{label}</span>
            <span className="block text-sm text-muted-foreground">{text}</span>
          </span>
        </button>
      ))}
      {pending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Opening the demo…
        </p>
      )}
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
