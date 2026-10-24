"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { initialFormState, type FormState } from "@/lib/forms";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export type FormRender = {
  errors: Record<string, string>;
  // Value to show in a field: what the user just submitted, or the saved value.
  value: (name: string, fallback?: string | number | null) => string;
};

// Dialog with a form bound to a Server Action. Shows field errors from the action
// (including those coming from the database) and closes on success.
export function FormDialog({
  trigger, title, description, action, submitLabel = "Save", children,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: Action;
  submitLabel?: string;
  children: (form: FormRender) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFormKey((k) => k + 1); // fresh form every time it opens
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogForm key={formKey} action={action} submitLabel={submitLabel} onDone={() => setOpen(false)}>
          {children}
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}

function DialogForm({
  action, submitLabel, onDone, children,
}: {
  action: Action;
  submitLabel: string;
  onDone: () => void;
  children: (form: FormRender) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const handled = useRef<FormState | null>(null);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state; // react once per result
      if (state.message) toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Rebuilt after each failed attempt: React resets forms after submitting, and
          selects would otherwise fall back to their first option. */}
      <div key={state.attempt ?? 0} className="space-y-4">
        {children({
          errors: state.fieldErrors ?? {},
          value: (name, fallback) => state.values?.[name] ?? (fallback == null ? "" : String(fallback)),
        })}
      </div>
      {state.formError && (
        <Alert variant="destructive">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
