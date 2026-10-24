"use client";

import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Shared chart styling: one series in --viz-series-1, recessive grid and axes,
// tooltips in text tokens (never the series color).
const AXIS = { stroke: "var(--viz-axis)", tick: { fill: "var(--viz-muted)", fontSize: 12 }, tickLine: false } as const;

function TooltipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{title}</p>
      {lines.map((l) => <p key={l} className="text-muted-foreground">{l}</p>)}
    </div>
  );
}

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// ---------------------------------------------------------------------------
// Annual value at stake per renewal bucket
// ---------------------------------------------------------------------------
// label = short window name for the axis; bucket = full name for the tooltip.
export type RenewalBucketDatum = { bucket: string; label: string; value: number; count: number };

export function RenewalValueChart({ data }: { data: RenewalBucketDatum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Annual contract value per renewal decision window">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 28, right: 8, bottom: 0, left: 8 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="label" {...AXIS} interval={0} />
          <YAxis {...AXIS} axisLine={false} width={56} domain={[0, (max: number) => Math.ceil((max * 1.2) / 1000) * 1000]}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k €`} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TooltipBox title={String(payload[0].payload.bucket)}
                  lines={[`${eur.format(payload[0].payload.value)} annual value`, `${payload[0].payload.count} contracts`]} />
              ) : null}
          />
          <Bar dataKey="value" fill="var(--viz-series-1)" radius={[4, 4, 0, 0]} maxBarSize={56}>
            <LabelList dataKey="value" position="top" fill="var(--muted-foreground)" fontSize={12}
              formatter={(v) => `${Math.round(Number(v) / 100) / 10}k`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLA met (%) per month
// ---------------------------------------------------------------------------
export type SlaMonthDatum = { month: string; pct: number | null; met: number; total: number };

export function SlaTrendChart({ data }: { data: SlaMonthDatum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Share of tickets answered within SLA per month">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis dataKey="month" {...AXIS} interval="preserveStartEnd" />
          <YAxis {...AXIS} axisLine={false} width={52} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v} %`} />
          <Tooltip
            cursor={{ stroke: "var(--viz-axis)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TooltipBox title={String(payload[0].payload.month)}
                  lines={[
                    payload[0].payload.pct == null ? "No tickets with SLA" : `${payload[0].payload.pct} % within SLA`,
                    `${payload[0].payload.met} of ${payload[0].payload.total} answered in time`,
                  ]} />
              ) : null}
          />
          <Line type="monotone" dataKey="pct" stroke="var(--viz-series-1)" strokeWidth={2} connectNulls
            dot={{ r: 4, fill: "var(--viz-series-1)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
