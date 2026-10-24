import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Page } from "@/components/page";
import { KpiTile } from "@/components/kpi-tile";
import { RenewalValueChart, SlaTrendChart } from "@/components/charts/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RENEWAL_BUCKETS, formatEur, type RenewalBucket } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Page href="/dashboard" title="Dashboard"
      description="Portfolio, renewals, service levels and preventive maintenance. Every number is calculated by the database; click a tile to see the list behind it.">
      <Dashboard />
    </Page>
  );
}

// Short axis labels so all four fit on a phone.
const SHORT_BUCKET: Record<RenewalBucket, string> = { OVERDUE: "Overdue", DUE_30: "≤30 d", DUE_60: "31–60 d", DUE_90: "61–90 d" };

const pct = (v: number | null | undefined) => (v == null ? "–" : `${v} %`);

async function Dashboard() {
  await connection();
  const supabase = await createClient();
  const since12m = monthsAgoIso(11);

  const [kpiRes, pipelineRes, slaRes, topRes, availRes, alertsRes] = await Promise.all([
    supabase.from("v_dashboard_kpis").select("*").single(),
    supabase.from("v_renewal_pipeline").select("bucket, annual_value_eur"),
    supabase.from("v_service_requests").select("reported_at, sla_status").gte("reported_at", since12m).in("sla_status", ["MET", "BREACHED"]),
    supabase.from("v_customer_summary").select("id, name, annual_value_eur, active_contracts").eq("is_active", true)
      .gt("annual_value_eur", 0).order("annual_value_eur", { ascending: false }).limit(8),
    supabase.from("v_customer_summary").select("id, name, availability_90d").not("availability_90d", "is", null)
      .order("availability_90d").limit(5),
    supabase.from("v_alerts").select("alert_type"),
  ]);
  for (const r of [kpiRes, pipelineRes, slaRes, topRes, availRes, alertsRes]) if (r.error) throw new Error(r.error.message);
  const k = kpiRes.data!;

  const buckets = (Object.keys(RENEWAL_BUCKETS) as RenewalBucket[]).map((b) => {
    const rows = pipelineRes.data!.filter((r) => r.bucket === b);
    return {
      bucket: RENEWAL_BUCKETS[b], label: SHORT_BUCKET[b], count: rows.length,
      value: rows.reduce((s, r) => s + (r.annual_value_eur ?? 0), 0),
    };
  });
  const months = slaByMonth(slaRes.data!);
  const top = topRes.data!;
  const maxValue = Math.max(1, ...top.map((c) => c.annual_value_eur ?? 0));
  const alertCount = alertsRes.data!.length;
  const openTickets = (k.open_tickets_p1 ?? 0) + (k.open_tickets_p2 ?? 0) + (k.open_tickets_p3 ?? 0);

  return (
    <div className="space-y-6">
      <section aria-label="Contracts" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Active contracts" value={k.active_contracts} href="/contracts?status=ACTIVE"
          hint={`${k.covered_equipment_count} of ${k.equipment_count} units covered today`} />
        <KpiTile label="Portfolio annual value" value={formatEur(k.portfolio_annual_value_eur)} href="/contracts?status=ACTIVE"
          hint="Sum of active contracts" />
        <KpiTile label="Renewals due in 90 days" value={k.renewals_90d_count} href="/renewals"
          hint={`${formatEur(k.renewals_90d_value_eur)} annual value at stake`} />
        <KpiTile label="Renewal decisions overdue" value={k.overdue_decisions_count} href="/renewals"
          attention={k.overdue_decisions_count ? "Decide now" : undefined}
          hint={`${formatEur(k.overdue_decisions_value_eur)} at stake`} />
      </section>

      <section aria-label="Service" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="SLA met (last 90 days)" value={pct(k.sla_met_pct_90d)} href="/service-requests?status=all&period=90d"
          hint="First response within the contract's time" />
        <KpiTile label="Open tickets" value={openTickets} href="/service-requests"
          hint={`P1 ${k.open_tickets_p1} · P2 ${k.open_tickets_p2} · P3 ${k.open_tickets_p3}`}
          attention={k.open_tickets_p1 ? `${k.open_tickets_p1} urgent` : undefined} />
        <KpiTile label="Billable tickets (90 days)" value={k.billable_tickets_90d} href="/service-requests?status=all&billable=yes&period=90d"
          hint="Units without contract: sales opportunity" />
        <KpiTile label="Equipment availability (90 days)"
          value={k.availability_90d == null ? "–" : `${(k.availability_90d * 100).toFixed(1)} %`} href="#availability"
          hint="1 − failure hours / hours in period" />
      </section>

      <section aria-label="Maintenance" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile label="Plan compliance (12 months)" value={pct(k.plan_compliance_pct_12m)} href="/visits?view=done"
          hint="Visits done within 14 days of their due date" />
        <KpiTile label="Overdue preventive visits" value={k.overdue_visits} href="/visits?view=overdue"
          attention={k.overdue_visits ? "Plan them" : undefined} />
        <KpiTile label="Alerts today" value={alertCount} href="/alerts" hint="Decisions, overdue visits, tickets out of SLA" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Renewal value at stake</CardTitle>
            <CardDescription>Annual value of active contracts by renewal decision deadline</CardDescription>
          </CardHeader>
          <CardContent>
            <RenewalValueChart data={buckets} />
            <DataTable caption="Renewal value at stake" head={["Window", "Contracts", "Annual value"]}
              rows={buckets.map((b) => [b.bucket, String(b.count), formatEur(b.value)])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SLA met per month</CardTitle>
            <CardDescription>Tickets under contract answered within the response time, last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <SlaTrendChart data={months} />
            <DataTable caption="SLA met per month" head={["Month", "Within SLA", "Tickets"]}
              rows={months.map((m) => [m.month, pct(m.pct), String(m.total)])} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top customers by annual value</CardTitle>
            <CardDescription>Active contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {top.map((c) => (
                <li key={c.id}>
                  <Link href={`/customers/${c.id}`} className="group block space-y-1">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="truncate group-hover:underline">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatEur(c.annual_value_eur)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-[var(--viz-series-1)]"
                        style={{ width: `${Math.max(2, ((c.annual_value_eur ?? 0) / maxValue) * 100)}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card id="availability">
          <CardHeader>
            <CardTitle>Lowest equipment availability</CardTitle>
            <CardDescription>Average of the customer&apos;s units, last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {availRes.data!.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/customers/${c.id}`} className="truncate hover:underline">{c.name}</Link>
                  <span className="tabular-nums">{((c.availability_90d ?? 0) * 100).toFixed(1)} %</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Accessible data table behind each chart.
function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted-foreground">Show data</summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-muted-foreground">{head.map((h) => <th key={h} className="py-1 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => <tr key={r[0]} className="border-t">{r.map((c, i) => <td key={i} className="py-1">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </details>
  );
}

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "Europe/Berlin" });
const monthKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Europe/Berlin" });

// First day of the month, n months back, as an ISO timestamp (Berlin calendar).
function monthsAgoIso(n: number) {
  const [y, m] = monthKey.format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - n, 1)).toISOString();
}

function slaByMonth(rows: { reported_at: string | null; sla_status: string | null }[]) {
  const months: { key: string; month: string; met: number; total: number }[] = [];
  for (let n = 11; n >= 0; n--) {
    const d = new Date(monthsAgoIso(n));
    d.setUTCDate(15);
    months.push({ key: monthKey.format(d), month: monthLabel.format(d), met: 0, total: 0 });
  }
  for (const r of rows) {
    const m = months.find((x) => x.key === monthKey.format(new Date(r.reported_at!)));
    if (!m) continue;
    m.total++;
    if (r.sla_status === "MET") m.met++;
  }
  return months.map((m) => ({ month: m.month, met: m.met, total: m.total, pct: m.total ? Math.round((100 * m.met) / m.total) : null }));
}
