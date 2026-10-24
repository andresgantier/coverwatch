"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { updateUserAccess } from "@/app/actions/users";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

// Role and active switch for one user. Changes are saved at once; if the
// database refuses (own account, demo login), the control goes back and the reason is shown.
export function UserAccess({ id, name, role, isActive }: { id: string; name: string; role: Role; isActive: boolean }) {
  const [current, setCurrent] = useState({ role, isActive });
  const [pending, startTransition] = useTransition();

  function save(next: { role: Role; isActive: boolean }) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await updateUserAccess(id, next.role, next.isActive);
      if (result.ok) toast.success(`${name}: ${result.message}`);
      else {
        setCurrent(previous);
        toast.error(result.formError ?? "The change could not be saved.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <NativeSelect
        size="sm"
        value={current.role}
        disabled={pending}
        aria-label={`Role of ${name}`}
        onChange={(e) => save({ ...current, role: e.target.value as Role })}
      >
        {ROLES.map((r) => (
          <NativeSelectOption key={r} value={r}>{ROLE_LABELS[r]}</NativeSelectOption>
        ))}
      </NativeSelect>
      <Switch
        checked={current.isActive}
        disabled={pending}
        aria-label={`${name} is active`}
        onCheckedChange={(checked) => save({ ...current, isActive: checked })}
      />
    </div>
  );
}
