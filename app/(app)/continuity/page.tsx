import type { Metadata } from "next";
import { connection } from "next/server";
import { Activity, DatabaseBackup, FileSpreadsheet, Printer } from "lucide-react";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Continuity" };

const RUNBOOK_URL = "https://github.com/andresgantier/coverwatch/blob/main/docs/RUNBOOK.md";

export default function ContinuityPage() {
  return (
    <Page href="/continuity" title="Continuity"
      description="How to keep working if something fails: paper view, full export, nightly backups and the error log.">
      <Continuity />
    </Page>
  );
}

async function Continuity() {
  await connection();
  const user = await getCurrentUser();
  const canExportAll = user.role === "manager" || user.role === "viewer";
  const isManager = user.role === "manager";

  const errors = isManager
    ? await (await createClient()).from("app_error_log").select("*").order("occurred_at", { ascending: false }).limit(30)
    : null;
  if (errors?.error) throw new Error(errors.error.message);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Printer className="size-5" aria-hidden /> Paper fallback</CardTitle>
            <CardDescription>This week&apos;s visits per technician, open tickets and renewal decisions, ready to print.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href="/print/this-week" target="_blank" rel="noopener">Open printable week</a></Button>
          </CardContent>
        </Card>

        {canExportAll && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5" aria-hidden /> Full export</CardTitle>
              <CardDescription>
                All data in one Excel file, one sheet per table, with a README sheet. Readable without technical knowledge.
                Every list also has its own &quot;Export to Excel&quot; button.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><a href="/export/full" download>Download full export (.xlsx)</a></Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DatabaseBackup className="size-5" aria-hidden /> Nightly backup</CardTitle>
            <CardDescription>
              Every night a GitHub Action dumps the database (structure and data) into the private repository
              coverwatch-backups, restores it into an empty PostgreSQL and checks that the row counts match.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <a href={RUNBOOK_URL} target="_blank" rel="noopener noreferrer" className="underline">Restore procedure (RUNBOOK)</a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="size-5" aria-hidden /> System health</CardTitle>
            <CardDescription>Checks that the app reaches the database. Useful for monitoring tools.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <a href="/api/health" target="_blank" rel="noopener" className="underline">/api/health</a>
          </CardContent>
        </Card>
      </div>

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Error log</CardTitle>
            <CardDescription>Latest 30 errors reported by the app (server and browser). Only managers see this.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {errors!.data!.map((e) => (
                <li key={e.id} className="space-y-0.5 py-2">
                  <div className="text-muted-foreground">
                    {formatDateTime(e.occurred_at)} · {e.source} · {e.path ?? "–"}{e.digest && <> · ref {e.digest}</>}
                  </div>
                  <div className="break-words">{e.message}</div>
                </li>
              ))}
              {errors!.data!.length === 0 && <li className="py-6 text-center text-muted-foreground">No errors recorded.</li>}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
