"use client";

import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// Filter bar as a plain GET form: filters live in the URL, so a filtered list can be
// bookmarked or shared, and the Excel export (Phase 10) can reuse the same filters.
export function FilterBar({ action, children, clearHref }: { action: string; children: ReactNode; clearHref?: string }) {
  return (
    <Form action={action} className="flex flex-wrap items-center gap-2">
      {children}
      {clearHref && (
        <Link href={clearHref} className="inline-flex items-center gap-1 px-2 text-sm text-muted-foreground hover:text-foreground">
          <X className="size-4" aria-hidden /> Clear
        </Link>
      )}
    </Form>
  );
}

export function SearchInput({ defaultValue, placeholder }: { defaultValue?: string; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} className="pl-8" aria-label="Search" />
    </div>
  );
}

// Select that applies the filter as soon as it changes.
export function FilterSelect({
  name, label, value, options,
}: { name: string; label: string; value?: string; options: { value: string; label: string }[] }) {
  return (
    <NativeSelect
      name={name}
      defaultValue={value ?? ""}
      aria-label={label}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
