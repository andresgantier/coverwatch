import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Label + control + error message under it.
export function Field({
  label, name, error, hint, className, children,
}: { label: string; name: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = { label: string; name: string; error?: string; hint?: string; className?: string };

export function TextField({ label, name, error, hint, className, ...props }: Common & ComponentProps<typeof Input>) {
  return (
    <Field label={label} name={name} error={error} hint={hint} className={className}>
      <Input id={name} name={name} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined} {...props} />
    </Field>
  );
}

export function TextAreaField({ label, name, error, hint, className, ...props }: Common & ComponentProps<typeof Textarea>) {
  return (
    <Field label={label} name={name} error={error} hint={hint} className={className}>
      <Textarea id={name} name={name} aria-invalid={error ? true : undefined} rows={3} {...props} />
    </Field>
  );
}

export type Option = { value: string; label: string; group?: string };

export function SelectField({
  label, name, error, hint, className, options, placeholder, ...props
}: Common & { options: Option[]; placeholder?: string } & Omit<ComponentProps<"select">, "size">) {
  const groups = [...new Set(options.map((o) => o.group))];
  return (
    <Field label={label} name={name} error={error} hint={hint} className={className}>
      <NativeSelect id={name} name={name} className="w-full" aria-invalid={error ? true : undefined} {...props}>
        {placeholder && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>
              ))}
            </optgroup>
          ) : (
            options.filter((o) => !o.group).map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>
            ))
          ),
        )}
      </NativeSelect>
    </Field>
  );
}
