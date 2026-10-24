import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/lib/database.types";
import { formatDateTime } from "@/lib/labels";

type AuditRow = Database["public"]["Views"]["v_audit_log"]["Row"];

const HIDDEN_FIELDS = new Set(["activated_at", "updated_at", "coverage", "is_binding"]);

// Change history written by the audit trigger (contracts and service requests).
export function AuditHistory({ entries }: { entries: AuditRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change history</CardTitle>
        <CardDescription>Written by a database trigger on every change. Nobody can edit it.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3 text-sm">
          {entries.map((a) => (
            <li key={a.id} className="border-l-2 pl-3">
              <div className="text-muted-foreground">
                {formatDateTime(a.changed_at)} · {a.changed_by_name ?? "System"} ·{" "}
                {a.action === "INSERT" ? "created" : a.action === "UPDATE" ? "changed" : "deleted"}
              </div>
              {a.action === "UPDATE" && <div className="break-words">{describeChanges(a.old_data, a.new_data)}</div>}
            </li>
          ))}
          {entries.length === 0 && <li className="text-muted-foreground">No changes recorded.</li>}
        </ol>
      </CardContent>
    </Card>
  );
}

function describeChanges(oldData: unknown, newData: unknown) {
  const before = (oldData ?? {}) as Record<string, unknown>;
  const after = (newData ?? {}) as Record<string, unknown>;
  const parts = Object.keys(after)
    .filter((k) => !HIDDEN_FIELDS.has(k))
    .map((k) => `${k.replace(/_/g, " ")}: ${show(before[k])} → ${show(after[k])}`);
  return parts.length ? parts.join(" · ") : "technical fields updated";
}

// Timestamps are shown in Berlin time; other values as stored.
function show(v: unknown) {
  if (v == null || v === "") return "–";
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) ? formatDateTime(s) : s;
}
