import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Page } from "@/components/page";
import {
  Activity, AlertTriangle, Bell, CalendarCheck, CalendarX, Euro, FileText, Receipt, RefreshCw, Timer, Wrench,
} from "lucide-react";
import { KpiSection, KpiTile } from "@/components/kpi-tile";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { RenewalValueChart, SlaTrendChart } from "@/components/charts/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RENEWAL_BUCKETS, formatEur, type RenewalBucket } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Page href="/dashboard">
      <Dashboard />
    </Page>
  );
}

// Short axis labels so all four fit on a phone.
const SHORT_BUCKET: Record<RenewalBucket, string> = { OVERDUE: "Overdue", DUE_30: "≤30 d", DUE_60: "31–60 d", DUE_90: "61–90 d" };

const pct = (v: number | null | undefined) => (v == null ? "–" : `${v} %`);

async function Dashboard() {
  await connection();
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b3431] via-[#0f766e] to-[#14b8a6] p-6 text-white shadow-md md:p-8">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 right-32 size-40 rounded-full bg-white/5" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-white/70">{today()} · Velden Klimatechnik GmbH</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greeting()}, {user.fullName.split(" ")[0]}</h1>
            <p className="max-w-xl text-white/80">
              {alertCount ? <>{alertCount} things need attention today: {k.overdue_decisions_count} renewal decisions, {k.open_tickets_p1} urgent tickets and {k.overdue_visits} overdue visits.</>
                : "Nothing needs attention today."}
            </p>
          </div>
          <Button asChild variant="secondary" className="bg-white text-[#0b3431] hover:bg-white/90">
            <Link href="/alerts"><Bell className="size-4" aria-hidden /> View alerts</Link>
          </Button>
        </div>
      </section>

      <KpiSection title="Contracts and renewals">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile icon={FileText} label="Active contracts" value={k.active_contracts} href="/contracts?status=ACTIVE"
            hint={`${k.covered_equipment_count} of ${k.equipment_count} units covered today`} />
          <KpiTile icon={Euro} label="Portfolio annual value" value={formatEur(k.portfolio_annual_value_eur)} href="/contracts?status=ACTIVE"
            hint="Sum of active contracts" />
          <KpiTile icon={RefreshCw} label="Renewals due in 90 days" value={k.renewals_90d_count} href="/renewals"
            hint={`${formatEur(k.renewals_90d_value_eur)} annual value at stake`} />
          <KpiTile icon={AlertTriangle} label="Renewal decisions overdue" value={k.overdue_decisions_count} href="/renewals"
            attention={k.overdue_decisions_count ? "Decide now" : undefined}
            hint={`${formatEur(k.overdue_decisions_value_eur)} at stake`} />
        </div>
      </KpiSection>

      <KpiSection title="Service">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile icon={Timer} label="SLA met (last 90 days)" value={pct(k.sla_met_pct_90d)} href="/service-requests?status=all&period=90d"
            hint="First response within the contract's time" />
          <KpiTile icon={Wrench} label="Open tickets" value={openTickets} href="/service-requests"
            hint={`P1 ${k.open_tickets_p1} · P2 ${k.open_tickets_p2} · P3 ${k.open_tickets_p3}`}
            attention={k.open_tickets_p1 ? `${k.open_tickets_p1} urgent` : undefined} />
          <KpiTile icon={Receipt} label="Billable tickets (90 days)" value={k.billable_tickets_90d} href="/service-requests?status=all&billable=yes&period=90d"
            hint="Units without contract: sales opportunity" />
          <KpiTile icon={Activity} label="Equipment availability (90 days)"
            value={k.availability_90d == null ? "–" : `${(k.availability_90d * 100).toFixed(1)} %`} href="#availability"
            hint="1 − failure hours / hours in period" />
        </div>
      </KpiSection>

      <KpiSection title="Preventive maintenance">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile icon={CalendarCheck} label="Plan compliance (12 months)" value={pct(k.plan_compliance_pct_12m)} href="/visits?view=done"
            hint="Visits done within 14 days of their due date" />
          <KpiTile icon={CalendarX} label="Overdue preventive visits" value={k.overdue_visits} href="/visits?view=overdue"
            attention={k.overdue_visits ? "Plan them" : undefined} hint="Planned date passed, not done" />
          <KpiTile icon={Bell} label="Alerts today" value={alertCount} href="/alerts" hint="Decisions, overdue visits, tickets out of SLA" />
        </div>
      </KpiSection>

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

// Greeting and date in the company's time zone.
function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Berlin" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function today() {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date());
}
