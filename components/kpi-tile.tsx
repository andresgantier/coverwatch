import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// KPI tile that links to the list explaining the number.
// "attention" adds an icon and label, so the state never relies on color alone.
export function KpiTile({
  label, value, hint, href, attention,
}: { label: string; value: ReactNode; hint?: ReactNode; href: string; attention?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent",
        attention && "border-red-600/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {(hint || attention) && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
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
