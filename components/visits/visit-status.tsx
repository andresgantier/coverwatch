import { Badge } from "@/components/ui/badge";
import { VISIT_RESULTS, formatDate } from "@/lib/labels";

type VisitLike = {
  status: string | null;
  is_overdue: boolean | null;
  done_on_time: boolean | null;
  actual_date: string | null;
  result: string | null;
};

// Planned / overdue / done (on time or late) / cancelled.
export function VisitStatus({ visit }: { visit: VisitLike }) {
  if (visit.status === "DONE") {
    return (
      <span className="text-sm">
        Done {formatDate(visit.actual_date)} · {VISIT_RESULTS[visit.result as keyof typeof VISIT_RESULTS]}
        {!visit.done_on_time && <Badge variant="outline" className="ml-1">late</Badge>}
      </span>
    );
  }
  if (visit.status === "CANCELLED") return <span className="text-sm text-muted-foreground">Cancelled</span>;
  if (visit.is_overdue) {
    return <Badge variant="outline" className="border-red-600/40 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300">Overdue</Badge>;
  }
  return <Badge variant="secondary">Planned</Badge>;
}
