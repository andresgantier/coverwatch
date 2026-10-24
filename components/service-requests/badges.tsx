import { Badge } from "@/components/ui/badge";
import { SLA_STATUSES, TICKET_STATUSES, type SlaStatus, type TicketStatus } from "@/lib/labels";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE: Record<string, string> = {
  P1: "border-red-600/40 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
  P2: "border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  P3: "text-muted-foreground",
};

export function PriorityBadge({ priority }: { priority: string | null }) {
  return <Badge variant="outline" className={PRIORITY_STYLE[priority ?? "P3"]}>{priority}</Badge>;
}

const SLA_STYLE: Record<SlaStatus, string> = {
  MET: "border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  BREACHED: "border-red-600/40 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
  PENDING: "border-sky-600/40 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  NO_SLA: "border-amber-500/50 text-amber-800 dark:text-amber-300",
};

export function SlaBadge({ status, className }: { status: string | null; className?: string }) {
  const s = (status ?? "NO_SLA") as SlaStatus;
  return <Badge variant="outline" className={cn(SLA_STYLE[s], className)}>{SLA_STATUSES[s]}</Badge>;
}

export function TicketStatusBadge({ status }: { status: string | null }) {
  const s = (status ?? "OPEN") as TicketStatus;
  return <Badge variant={s === "OPEN" ? "default" : "secondary"}>{TICKET_STATUSES[s]}</Badge>;
}
