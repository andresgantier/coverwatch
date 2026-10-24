import { Badge } from "@/components/ui/badge";
import { CONTRACT_STATUSES, type ContractStatus } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STYLES: Record<ContractStatus, string> = {
  DRAFT: "border-dashed text-muted-foreground",
  ACTIVE: "border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  EXPIRING_SOON: "border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  RENEWED: "border-sky-600/40 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  EXPIRED: "text-muted-foreground",
  TERMINATED: "border-red-600/40 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function ContractStatusBadge({ status, className }: { status: string | null; className?: string }) {
  const s = (status ?? "DRAFT") as ContractStatus;
  return (
    <Badge variant="outline" className={cn(STYLES[s], className)}>
      {CONTRACT_STATUSES[s]}
    </Badge>
  );
}
