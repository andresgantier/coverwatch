import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// KPI tile that links to the list explaining the number.
// "attention" adds an icon, a label and a red edge, so the state never relies on color alone.
export function KpiTile({
  label, value, hint, href, attention, icon: Icon,
}: { label: string; value: ReactNode; hint?: ReactNode; href: string; attention?: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        attention && "border-l-4 border-l-red-500",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            attention ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-secondary text-primary",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <ArrowUpRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      {(hint || attention) && (
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {attention && (
            <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
              <AlertTriangle className="size-3.5" aria-hidden /> {attention}
            </span>
          )}
          {attention && hint && " · "}
          {hint}
        </p>
      )}
    </Link>
  );
}

// Small heading above a group of tiles.
export function KpiSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
