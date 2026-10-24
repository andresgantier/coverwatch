// Demo data seed for CoverWatch (npm run db:seed).
// Re-runnable: deletes only demo data (customers with is_demo = true and demo users),
// then recreates ~60 customers, ~180 units, ~90 contracts and 12 months of tickets
// and visits with dates relative to today. Contracts go through the real database
// actions (activate, renew, terminate), so all rules and triggers apply.
// Runs through the linked Supabase CLI: no service_role key, no database password.

import { randomUUID, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import bcrypt from "bcryptjs";
import * as C from "./seed/catalog.mjs";

// ---------------------------------------------------------------------------
// Setup: demo password, random generator, dates
// ---------------------------------------------------------------------------
const ENV_FILE = ".env.local";

function demoPassword() {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  if (process.env.DEMO_PASSWORD) return process.env.DEMO_PASSWORD;
  const password = "Demo-" + randomBytes(12).toString("base64url");
  appendFileSync(ENV_FILE, `\n# Password of the demo accounts (server only, never NEXT_PUBLIC_)\nDEMO_PASSWORD=${password}\n`);
  console.log("Generated a demo password and saved it to .env.local (DEMO_PASSWORD).");
  return password;
}

// Seeded generator: same data shape on every run.
let seed = 20261024;
function rnd() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function poisson(lambda) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > limit);
  return k - 1;
}

const berlinDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }); // YYYY-MM-DD
const TODAY = berlinDate.format(new Date());
const T = new Date(TODAY + "T00:00:00Z");
const NOW = Date.now();
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const addMonths = (d, n) => {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
};
const iso = (d) => d.toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((a.getTime() - b.getTime()) / 86400000);

// Berlin local date + time -> UTC milliseconds.
function berlinMs(date, hour, minute) {
  const probe = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "shortOffset" })
    .formatToParts(probe).find((p) => p.type === "timeZoneName").value; // e.g. "GMT+2"
  const offsetHours = Number(tz.replace("GMT", "") || 0);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute) - offsetHours * 3600000;
}

const sql = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const tsSql = (ms) => (ms === null ? "null" : sql(new Date(ms).toISOString()));
const ascii = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/ş/g, "s").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const person = () => `${pick(C.FIRST_NAMES)} ${pick(C.LAST_NAMES)}`;
const phone = () => `+49 ${int(201, 239)} ${int(100000, 9999999)}`;
const round10 = (x) => Math.max(300, Math.round(x / 10) * 10);

// ---------------------------------------------------------------------------
// Staff (auth users + profiles)
// ---------------------------------------------------------------------------
const password = demoPassword();
const staff = C.STAFF.map((s) => ({ ...s, id: randomUUID() }));
const byKey = Object.fromEntries(staff.map((s) => [s.key, s]));
const technicians = staff.filter((s) => s.role === "technician");
// The demo technician gets a larger share of the work so the technician view is busy.
const techPool = [byKey.technician, byKey.technician, ...technicians];

// ---------------------------------------------------------------------------
// Customers, sites, equipment
// ---------------------------------------------------------------------------
const BAD_SERVER_ROOM = "Datenhaus Emscher GmbH";
const serials = new Set();

const customers = C.CUSTOMERS.map(([name, segment, city]) => {
  const contactName = person();
  return {
    id: randomUUID(), name, segment, city, contactName,
    contactEmail: `${ascii(contactName)}@example.com`, contactPhone: phone(), sites: [],
  };
});

for (const cu of customers) {
  const siteCount = cu.name === BAD_SERVER_ROOM ? 1
    : cu.segment === "SERVER_ROOM" || cu.segment === "OTHER" ? pick([1, 1, 2])
    : pick([1, 1, 2, 2, 3]);
  for (let i = 0; i < siteCount; i++) {
    const city = i === 0 || chance(0.6) ? cu.city : pick(Object.keys(C.CITIES));
    const site = {
      id: randomUUID(), name: C.SITE_NAMES[cu.segment][i % C.SITE_NAMES[cu.segment].length], city,
      street: `${pick(C.STREETS)} ${int(1, 180)}`, postal: C.CITIES[city] + String(int(0, 99)).padStart(2, "0"),
      contactName: person(), contactPhone: phone(), units: [],
    };
    const unitCount = cu.name === BAD_SERVER_ROOM ? 3 : pick([1, 1, 1, 2, 2, 3]);
    for (let u = 0; u < unitCount; u++) {
      let type = pick(C.TYPES_BY_SEGMENT[cu.segment]);
      if (cu.name === BAD_SERVER_ROOM) type = u < 2 ? "SPLIT_AC" : "CHILLER";
      const [manufacturer, model, prefix, minKw, maxKw] =
        cu.name === BAD_SERVER_ROOM ? (u < 2 ? C.MODELS.SPLIT_AC[3] : C.MODELS.CHILLER[2]) : pick(C.MODELS[type]);
      const install = addDays(T, -int(500, 2400));
      let serial;
      do serial = `${prefix}-${install.getUTCFullYear()}-${int(100000, 999999)}`; while (serials.has(serial));
      serials.add(serial);
      site.units.push({
        id: randomUUID(), type, manufacturer, model, serial, install,
        kw: minKw === maxKw ? minKw : int(minKw, maxKw),
        warrantyYears: type === "HEAT_PUMP" ? 5 : type === "CHILLER" ? 2 : pick([2, 3]),
        status: "ACTIVE", covered: true, chain: null,
      });
    }
    cu.sites.push(site);
  }
}
const allUnits = customers.flatMap((cu) => cu.sites.flatMap((s) => s.units.map((u) => ({ ...u, ref: u, cu, site: s }))));

// ---------------------------------------------------------------------------
// Contract chains (an original contract plus its renewals)
// ---------------------------------------------------------------------------
const UNIT_PRICE = { SPLIT_AC: 320, MULTI_SPLIT: 620, HEAT_PUMP: 480, VENTILATION: 520, CHILLER: 2600 };
const TYPE_FACTOR = { FULL_SERVICE: 1.6, PREVENTIVE: 1.0, ON_CALL: 0.6 };

function chainTerms(cu, type) {
  const critical = cu.segment === "SERVER_ROOM" || cu.segment === "CLINIC";
  const sla = type === "FULL_SERVICE" ? (critical ? [4, 8, 24] : [8, 24, 48])
    : type === "PREVENTIVE" ? [24, 48, 72] : [8, 24, 72];
  const visits = type === "FULL_SERVICE" ? (cu.segment === "SERVER_ROOM" ? 4 : pick([2, 2, 3]))
    : type === "PREVENTIVE" ? pick([1, 2, 2]) : pick([0, 0, 1]);
  return {
    sla, visits,
    notice: pick([30, 60, 60, 90, 90, 90, 90, 90, 90, 180]),
    autoRenew: chance(0.35),
    billing: type === "FULL_SERVICE" ? pick(["QUARTERLY", "ANNUAL"]) : pick(["ANNUAL", "ANNUAL", "SEMI_ANNUAL"]),
  };
}

const others = shuffle(customers.filter((c) => c.name !== BAD_SERVER_ROOM));
const fate = new Map();
others.forEach((c, i) => fate.set(c, i < 2 ? "none" : i < 7 ? "lost" : i < 9 ? "terminated" : "active"));
fate.set(customers.find((c) => c.name === BAD_SERVER_ROOM), "active");

const chains = [];
let secondChains = 0;
for (const cu of customers) {
  const f = fate.get(cu);
  if (f === "none") {
    cu.sites.forEach((s) => s.units.forEach((u) => (u.covered = false)));
    continue;
  }
  const groups = [cu.sites];
  if (f === "active" && cu.sites.length >= 2 && secondChains < 5 && chance(0.5)) {
    groups[0] = cu.sites.slice(0, -1);
    groups.push(cu.sites.slice(-1));
    secondChains++;
  }
  groups.forEach((sites, gi) => {
    const units = sites.flatMap((s) => s.units);
    const type = cu.name === BAD_SERVER_ROOM ? "FULL_SERVICE"
      : gi === 1 ? "ON_CALL"
      : cu.segment === "SERVER_ROOM" || cu.segment === "CLINIC" ? (chance(0.7) ? "FULL_SERVICE" : "PREVENTIVE")
      : pick(["FULL_SERVICE", "FULL_SERVICE", "PREVENTIVE", "PREVENTIVE", "PREVENTIVE", "ON_CALL"]);
    const chain = { cu, type, fate: f, ...chainTerms(cu, type), units: [] };
    if (cu.name === BAD_SERVER_ROOM) chain.sla = [4, 8, 24];
    for (const u of units) {
      // A few units were installed recently and are not under contract yet (billable work).
      if (cu.name !== BAD_SERVER_ROOM && f === "active" && chance(0.06)) {
        u.covered = false;
        u.install = addDays(T, -int(30, 200));
        continue;
      }
      chain.units.push(u);
      u.chain = chain;
    }
    if (chain.units.length > 0) chains.push(chain);
  });
}

// Current contract end dates are chosen so the renewal pipeline has every bucket.
const activeChains = shuffle(chains.filter((c) => c.fate === "active"));
const bad = activeChains.findIndex((c) => c.cu.name === BAD_SERVER_ROOM);
activeChains.push(...activeChains.splice(bad, 1)); // keep the server room out of the overdue bucket
activeChains.forEach((c, i) => {
  let deadline;
  if (i < 4) deadline = int(-25, -3); // decision overdue
  else if (i < 9) deadline = int(3, 27);
  else if (i < 14) deadline = int(33, 57);
  else if (i < 20) deadline = int(63, 87);
  else {
    if (360 - c.notice < 100) c.notice = 90;
    deadline = int(95, 360 - c.notice - 5);
  }
  c.end = addDays(T, deadline + c.notice);
});
for (const c of chains.filter((x) => x.fate === "terminated")) {
  c.notice = 90;
  c.end = addDays(T, int(60, 200));
}
for (const c of chains.filter((x) => x.fate === "lost")) c.end = addDays(T, -int(40, 300));

for (const c of chains) {
  // Keep start days <= 28 so "start + 12 months" never lands on a month end.
  let start = addMonths(addDays(c.end, 1), -12);
  if (start.getUTCDate() > 28) {
    c.end = addDays(c.end, -(start.getUTCDate() - 28));
    start = addMonths(addDays(c.end, 1), -12);
  }
  const previous = chance(0.05) ? 2 : chance(0.3) ? 1 : 0; // renewals already done
  c.versions = [];
  for (let k = previous; k >= 0; k--) {
    const s = addMonths(start, -12 * k);
    c.versions.push({ start: s, end: addDays(addMonths(s, 12), -1) });
  }
  if (c.fate === "terminated") {
    const cur = c.versions.at(-1);
    c.terminatedOn = addDays(T, -int(20, Math.min(120, daysBetween(T, cur.start) - 10)));
    c.reason = pick(C.TERMINATION_REASONS);
  }
  const base = c.units.reduce((sum, u) => sum + UNIT_PRICE[u.type], 0) * TYPE_FACTOR[c.type];
  let value = round10(base);
  c.values = c.versions.map((_, k) => (k === 0 ? value : (value = round10(value * 1.03))));
  // Units in a contract were installed before it started.
  const first = c.versions[0].start;
  for (const u of c.units) if (u.install >= first) u.install = addDays(first, -int(10, 300));
}

chains.sort((a, b) => a.versions[0].start - b.versions[0].start);
chains.forEach((c, i) => {
  c.number = `VK-${c.versions[0].start.getUTCFullYear()}-${String(i + 1).padStart(3, "0")}`;
  c.numbers = c.versions.map((_, k) => (k === 0 ? c.number : `${c.number}-R${k}`));
});

// A few units of former customers have been taken out of service.
shuffle(allUnits.filter((x) => !x.ref.covered || x.ref.chain?.fate === "lost")).slice(0, 3)
  .forEach((x) => (x.ref.status = "DECOMMISSIONED"));

// Coverage lookup (mirrors the database rule: every non-draft version covers its period).
function coverage(unit, date) {
  const c = unit.chain;
  if (!c) return null;
  for (const v of c.versions) {
    const isLast = v === c.versions.at(-1);
    const end = isLast && c.terminatedOn ? c.terminatedOn : v.end;
    if (date >= v.start && date <= end) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Service requests (12 months)
// ---------------------------------------------------------------------------
const RATE = { SPLIT_AC: 0.9, MULTI_SPLIT: 1.3, HEAT_PUMP: 1.0, VENTILATION: 0.9, CHILLER: 2.0 };
const tickets = [];

function makeTicket(x, { reportedMs, priority, respHours = null, durationMin = null, forceOpen = false, tech = null }) {
  const unit = x.ref;
  const date = new Date(berlinDate.format(new Date(reportedMs)) + "T00:00:00Z");
  const chain = coverage(unit, date);
  const sla = chain ? chain.sla[["P1", "P2", "P3"].indexOf(priority)] : null;
  if (respHours === null) {
    respHours = sla === null ? 2 + rnd() * 46
      : chance(0.1) ? sla * (1.15 + rnd() * 1.35) // plus the server room and today's alerts: ~10 % out of SLA
      : sla * (0.15 + rnd() * 0.7);
  }
  if (durationMin === null) {
    durationMin = priority === "P1" ? int(60, 600) : priority === "P2" ? int(120, 1800) : int(240, 4320);
  }
  const responseMs = reportedMs + Math.round(respHours * 60) * 60000;
  const resolvedMs = responseMs + durationMin * 60000;
  const hasFailure = !(priority === "P3" && chance(0.3));
  const cancelled = !forceOpen && priority === "P3" && chance(0.03);
  const responded = !forceOpen && responseMs < NOW - 15 * 60000;
  const resolved = !forceOpen && !cancelled && resolvedMs < NOW - 15 * 60000;

  tickets.push({
    unitId: unit.id, reportedMs, priority,
    by: x.site.contactName,
    description: pick(C.TICKET_ISSUES[unit.type]),
    status: cancelled ? "CANCELLED" : resolved ? "RESOLVED" : "OPEN",
    tech: (tech ?? pick(techPool)).id,
    responseMs: responded ? responseMs : null,
    resolvedMs: resolved ? resolvedMs : null,
    notes: resolved ? pick(C.RESOLUTIONS) : cancelled ? "Cancelled: customer solved it (power supply was switched off)." : null,
    failureStart: hasFailure && !cancelled ? reportedMs - int(0, 180) * 60000 : null,
    failureEnd: hasFailure && resolved ? resolvedMs : null,
  });
}

const critical = (x) => x.cu.segment === "SERVER_ROOM" || x.cu.segment === "CLINIC";
const randomPriority = (x) => {
  const r = rnd();
  const p1 = critical(x) ? 0.35 : 0.12;
  return r < p1 ? "P1" : r < p1 + 0.4 ? "P2" : "P3";
};

for (const x of allUnits) {
  if (x.ref.status !== "ACTIVE") continue;
  const isBad = x.cu.name === BAD_SERVER_ROOM && x.ref.type === "SPLIT_AC";
  const n = poisson(RATE[x.ref.type]);
  // Tickets start when the unit was installed or, for contract customers, when they became customers.
  const since = x.ref.chain ? x.ref.chain.versions[0].start : x.ref.install;
  const earliest = Math.max(-365, daysBetween(x.ref.install, T) + 1, daysBetween(since, T));
  for (let i = 0; i < n; i++) {
    const day = addDays(T, int(earliest, isBad ? -100 : -1));
    makeTicket(x, { reportedMs: berlinMs(day, int(6, 19), int(0, 59)), priority: randomPriority(x) });
  }
  if (isBad) {
    // The server room cooling keeps failing: 7 long breakdowns in the last 90 days.
    for (let i = 0; i < 7; i++) {
      const day = addDays(T, -85 + i * 12 + int(0, 3));
      makeTicket(x, {
        reportedMs: berlinMs(day, int(0, 23), int(0, 59)), priority: "P1",
        respHours: chance(0.4) ? 5 + rnd() * 6 : 1 + rnd() * 2.5, durationMin: int(1500, 3600),
      });
    }
  }
}

// Alerts for today: open P1 tickets past their SLA and fresh tickets still within it.
const coveredNow = shuffle(allUnits.filter((x) => x.ref.status === "ACTIVE" && coverage(x.ref, T)));
const p1Units = coveredNow.filter((x) => x.ref.chain.sla[0] <= 8);
makeTicket(p1Units[0], { reportedMs: NOW - 10 * 3600000, priority: "P1", forceOpen: true, tech: byKey.technician });
makeTicket(p1Units[1], { reportedMs: NOW - 12 * 3600000, priority: "P1", forceOpen: true });
for (let i = 2; i < 5; i++) {
  makeTicket(coveredNow[i], {
    reportedMs: NOW - int(40, 90) * 60000, priority: "P2", forceOpen: true,
    tech: i === 2 ? byKey.technician : null,
  });
}
tickets.sort((a, b) => a.reportedMs - b.reportedMs);

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------
const out = [];
const emit = (s) => out.push(s);
const staffIdArray = `array[${technicians.map((t) => sql(t.id) + "::uuid").join(", ")}]`;

emit("begin;");
emit("set local timezone = 'Europe/Berlin';");

// 1. Remove previous demo data (only rows linked to demo customers and demo users).
emit(`
create temp table demo_customers on commit drop as select id from public.customers where is_demo;
create temp table demo_contracts on commit drop as
  select id from public.contracts where customer_id in (select id from demo_customers);
create temp table demo_tickets on commit drop as
  select sr.id from public.service_requests sr
  join public.equipment e on e.id = sr.equipment_id
  join public.sites s on s.id = e.site_id
  where s.customer_id in (select id from demo_customers);
delete from public.service_requests where id in (select id from demo_tickets);
delete from public.preventive_visits where contract_id in (select id from demo_contracts);
delete from public.contract_equipment where contract_id in (select id from demo_contracts);
update public.contracts set previous_contract_id = null where id in (select id from demo_contracts);
delete from public.contracts where id in (select id from demo_contracts);
delete from public.equipment where site_id in (select id from public.sites where customer_id in (select id from demo_customers));
delete from public.sites where customer_id in (select id from demo_customers);
delete from public.customers where id in (select id from demo_customers);
delete from public.audit_log where record_id in (select id from demo_contracts union all select id from demo_tickets);
delete from public.profiles where id in (select id from auth.users where raw_app_meta_data ->> 'demo' = 'true');
delete from auth.users where raw_app_meta_data ->> 'demo' = 'true';
-- Restart numbering after the highest remaining number.
select setval('public.customer_number_seq',
  coalesce((select max(substring(customer_number from 3)::int) from public.customers where customer_number ~ '^C-\\d+$'), 0) + 1, false);
select setval('public.service_request_number_seq',
  coalesce((select max(substring(ticket_number from 4)::int) from public.service_requests where ticket_number ~ '^SR-\\d+$'), 0) + 1, false);
`);

// 2. Staff accounts. Demo accounts share DEMO_PASSWORD; other staff get an unusable random password.
for (const s of staff) {
  const hash = bcrypt.hashSync(s.demo ? password : randomBytes(24).toString("base64url"), 10);
  emit(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', ${sql(s.id)}, 'authenticated', 'authenticated', ${sql(s.email)}, ${sql(hash)}, now(),
  ${sql(JSON.stringify({ provider: "email", providers: ["email"], demo: true, demo_login: Boolean(s.demo) }))}, ${sql(JSON.stringify({ full_name: s.name }))}, now(), now(), '', '', '', '');
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (${sql(s.id)}, ${sql(s.id)}, ${sql(JSON.stringify({ sub: s.id, email: s.email, email_verified: true }))}, 'email', now(), now(), now());
update public.profiles set role = '${s.role}', phone = ${sql(phone())} where id = ${sql(s.id)};`);
}

// 3. Customers, sites, equipment.
for (const cu of customers) {
  emit(`insert into public.customers (id, name, segment, contact_name, contact_email, contact_phone, is_demo)
values (${sql(cu.id)}, ${sql(cu.name)}, '${cu.segment}', ${sql(cu.contactName)}, ${sql(cu.contactEmail)}, ${sql(cu.contactPhone)}, true);`);
  for (const s of cu.sites) {
    emit(`insert into public.sites (id, customer_id, name, street, postal_code, city, contact_name, contact_phone)
values (${sql(s.id)}, ${sql(cu.id)}, ${sql(s.name)}, ${sql(s.street)}, '${s.postal}', ${sql(s.city)}, ${sql(s.contactName)}, ${sql(s.contactPhone)});`);
    const rows = s.units.map((u) => `(${sql(u.id)}, ${sql(s.id)}, ${sql(u.serial)}, ${sql(u.manufacturer)}, ${sql(u.model)}, '${u.type}', ${u.kw}, '${iso(u.install)}', '${iso(addMonths(u.install, 12 * u.warrantyYears))}', '${u.status}')`);
    emit(`insert into public.equipment (id, site_id, serial_number, manufacturer, model, equipment_type, cooling_capacity_kw, install_date, warranty_end_date, status)
values ${rows.join(",\n  ")};`);
  }
}

// 4. Contracts through the real lifecycle: draft -> activate -> renew -> expire/terminate.
for (const c of chains) {
  const v0 = c.versions[0];
  emit(`insert into public.contracts (contract_number, customer_id, contract_type, start_date, end_date, notice_period_days,
  auto_renew, annual_value_eur, billing_frequency, sla_p1_hours, sla_p2_hours, sla_p3_hours, preventive_visits_per_year)
values (${sql(c.number)}, ${sql(c.cu.id)}, '${c.type}', '${iso(v0.start)}', '${iso(v0.end)}', ${c.notice},
  ${c.autoRenew}, ${c.values[0]}, '${c.billing}', ${c.sla.join(", ")}, ${c.visits});
insert into public.contract_equipment (contract_id, equipment_id)
select (select id from public.contracts where contract_number = ${sql(c.number)}), unnest(array[${c.units.map((u) => sql(u.id) + "::uuid").join(", ")}]);
select public.activate_contract((select id from public.contracts where contract_number = ${sql(c.number)}));`);
  for (let k = 1; k < c.versions.length; k++) {
    emit(`select public.renew_contract((select id from public.contracts where contract_number = ${sql(c.numbers[k - 1])}), ${sql(c.numbers[k])}, ${c.values[k]}, 12);`);
  }
  const last = sql(c.numbers.at(-1));
  if (c.fate === "lost") {
    emit(`update public.contracts set status = 'EXPIRED' where contract_number = ${last};`);
  } else if (c.fate === "terminated") {
    emit(`select public.terminate_contract((select id from public.contracts where contract_number = ${last}), '${iso(c.terminatedOn)}', ${sql(c.reason)});`);
  }
}
emit(`update public.contracts set activated_at = (start_date + time '08:00') at time zone 'Europe/Berlin'
where customer_id in (select id from public.customers where is_demo) and status <> 'DRAFT';`);

// 5. Preventive visits: technicians, outcomes of past visits, some overdue, upcoming schedule.
emit(`
select setseed(0.42);
create temp table demo_visits on commit drop as
select v.id, v.contract_id, v.due_date, c.status as contract_status, random() as r1, random() as r2, random() as r3,
       -- 7 past visits of active contracts stay undone (overdue)
       (c.status = 'ACTIVE' and v.due_date < current_date
        and row_number() over (partition by c.status = 'ACTIVE' and v.due_date < current_date order by random()) <= 7) as keep_overdue
from public.preventive_visits v
join public.contracts c on c.id = v.contract_id
join public.customers cu on cu.id = c.customer_id
where cu.is_demo and v.status = 'PLANNED';

update public.preventive_visits v
   set assigned_technician_id = (${staffIdArray})[1 + (abs(hashtext(v.contract_id::text)) % ${technicians.length})]
 where v.id in (select id from demo_visits);

-- Past visits: done (about 12 % late), except the few kept overdue.
update public.preventive_visits v
   set status = 'DONE',
       actual_date = least(current_date - 1,
                           d.due_date + case when d.r2 < 0.12 then 15 + floor(d.r3 * 25)::int
                                             else floor(d.r3 * 20)::int - 10 end),
       result = case when d.r2 < 0.75 then 'OK' when d.r2 < 0.93 then 'ISSUES_FOUND' else 'FOLLOW_UP_REQUIRED' end::public.visit_result
  from demo_visits d
 where v.id = d.id and d.due_date + 14 < current_date
   and not d.keep_overdue;

-- Due in the last two weeks: done recently.
update public.preventive_visits v
   set status = 'DONE', actual_date = greatest(d.due_date - 5, current_date - 14) + floor(d.r3 * 5)::int,
       result = 'OK'
  from demo_visits d
 where v.id = d.id and d.due_date + 14 >= current_date and d.due_date < current_date and not d.keep_overdue;
update public.preventive_visits set actual_date = current_date - 1
 where id in (select id from demo_visits) and actual_date >= current_date;

-- Observations from a fixed list per result.
update public.preventive_visits v
   set observations = case v.result
         when 'OK' then (array[${C.VISIT_NOTES.OK.map(sql).join(", ")}])[1 + floor(d.r1 * ${C.VISIT_NOTES.OK.length})::int]
         when 'ISSUES_FOUND' then (array[${C.VISIT_NOTES.ISSUES_FOUND.map(sql).join(", ")}])[1 + floor(d.r1 * ${C.VISIT_NOTES.ISSUES_FOUND.length})::int]
         else (array[${C.VISIT_NOTES.FOLLOW_UP_REQUIRED.map(sql).join(", ")}])[1 + floor(d.r1 * ${C.VISIT_NOTES.FOLLOW_UP_REQUIRED.length})::int]
       end
  from demo_visits d
 where v.id = d.id and v.status = 'DONE';

-- Next 30 days: scheduled by the coordinators.
update public.preventive_visits v
   set scheduled_date = greatest(current_date, d.due_date + floor(d.r2 * 7)::int - 3)
  from demo_visits d
 where v.id = d.id and v.status = 'PLANNED' and d.due_date between current_date and current_date + 30;

-- Make sure the demo technician has overdue and upcoming visits.
update public.preventive_visits set assigned_technician_id = ${sql(byKey.technician.id)}
 where id in (select v.id from public.preventive_visits v join demo_visits d on d.id = v.id
              where v.status = 'PLANNED' and coalesce(v.scheduled_date, v.due_date) < current_date
              order by d.r3 limit 2);
update public.preventive_visits set assigned_technician_id = ${sql(byKey.technician.id)}
 where id in (select v.id from public.preventive_visits v join demo_visits d on d.id = v.id
              where v.status = 'PLANNED' and v.scheduled_date is not null
              order by d.r3 limit 3);
`);

// 6. Service requests (coverage and SLA are set by the database trigger).
for (let i = 0; i < tickets.length; i += 100) {
  const rows = tickets.slice(i, i + 100).map((t) =>
    `(${sql(t.unitId)}, ${tsSql(t.reportedMs)}, ${sql(t.by)}, '${t.priority}', ${sql(t.description)}, '${t.status}', ${sql(t.tech)}, ${tsSql(t.responseMs)}, ${tsSql(t.resolvedMs)}, ${sql(t.notes)}, ${tsSql(t.failureStart)}, ${tsSql(t.failureEnd)})`);
  emit(`insert into public.service_requests (equipment_id, reported_at, reported_by_name, priority, description, status,
  assigned_technician_id, first_response_at, resolved_at, resolution_notes, failure_start, failure_end)
values ${rows.join(",\n  ")};`);
}

emit("select public.expire_contracts();");
emit("commit;");

// ---------------------------------------------------------------------------
// Run and summarise
// ---------------------------------------------------------------------------
function runSql(text) {
  const file = join(tmpdir(), `coverwatch-seed-${process.pid}-${Date.now()}.sql`);
  writeFileSync(file, text, "utf8");
  try {
    const cli = join("node_modules", "supabase", "dist", "supabase.js");
    const res = spawnSync(process.execPath, [cli, "db", "query", "--linked", "--output-format", "json", "-f", file], {
      encoding: "utf8", maxBuffer: 50 * 1024 * 1024,
    });
    const stdout = res.stdout || "";
    let parsed = null;
    try {
      parsed = JSON.parse(stdout.slice(stdout.indexOf("{")));
    } catch {
      // handled below
    }
    if (res.status !== 0 || !parsed || parsed._tag === "Error" || parsed.error) {
      console.error(stdout + (res.stderr || ""));
      throw new Error("Database query failed");
    }
    return parsed.rows ?? [];
  } finally {
    unlinkSync(file);
  }
}

console.log(`Seeding demo data relative to ${TODAY} (${customers.length} customers, ${chains.length} contract chains, ${tickets.length} tickets)...`);
runSql(out.join("\n"));

const summary = runSql(`
with demo as (select id from public.customers where is_demo),
     dc as (select c.* from public.contracts c where c.customer_id in (select id from demo)),
     de as (select e.* from public.equipment e join public.sites s on s.id = e.site_id where s.customer_id in (select id from demo)),
     dt as (select t.* from public.v_service_requests t where t.customer_id in (select id from demo)),
     dv as (select v.* from public.v_preventive_visits v where v.customer_id in (select id from demo)),
     av as (select customer_name, avg(availability_90d) a from public.v_equipment_availability
            where customer_id in (select id from demo) group by customer_name order by a limit 1),
     k as (select * from public.v_dashboard_kpis)
select 'Customers' as item, count(*)::text as value from demo
union all select 'Sites', count(*)::text from public.sites where customer_id in (select id from demo)
union all select 'Equipment (active / decommissioned)', count(*) filter (where status = 'ACTIVE') || ' / ' || count(*) filter (where status = 'DECOMMISSIONED') from de
union all select 'Contracts (total)', count(*)::text from dc
union all select 'Contracts by status', string_agg(status || ' ' || n, ', ' order by status) from (select status::text, count(*) n from dc group by status) x
union all select 'Renewal versions (linked to a previous contract)', count(*)::text from dc where previous_contract_id is not null
union all select 'Renewal pipeline OVERDUE / 30 / 60 / 90 days', (select string_agg(bucket || ' ' || n || ' (EUR ' || v || ')', ', ' order by bucket) from (select bucket, count(*) n, sum(annual_value_eur) v from public.v_renewal_pipeline group by bucket) x)
union all select 'Portfolio annual value (EUR)', portfolio_annual_value_eur::text from k
union all select 'Tickets (12 months)', count(*)::text from dt
union all select 'Tickets out of SLA (% of tickets with SLA)', round(100.0 * count(*) filter (where sla_status = 'BREACHED') / nullif(count(*) filter (where sla_status in ('MET', 'BREACHED')), 0), 1) || ' %' from dt
union all select 'Billable tickets on units without contract', count(*) filter (where is_billable)::text from dt
union all select 'Open tickets P1 / P2 / P3', open_tickets_p1 || ' / ' || open_tickets_p2 || ' / ' || open_tickets_p3 from k
union all select 'Preventive visits (total / overdue)', count(*) || ' / ' || count(*) filter (where is_overdue) from dv
union all select 'Plan compliance 12 months', plan_compliance_pct_12m || ' %' from k
union all select 'SLA met 90 days', sla_met_pct_90d || ' %' from k
union all select 'Lowest availability (90 days)', customer_name || ': ' || round(a * 100, 1) || ' %' from av
union all select 'Average availability (90 days)', round(availability_90d * 100, 2) || ' %' from k
union all select 'Alerts today', (select string_agg(alert_type || ' ' || n, ', ') from (select alert_type, count(*) n from public.v_alerts group by alert_type) x)
union all select 'Demo accounts', (select string_agg(p.email || ' (' || p.role || ')', ', ' order by p.role) from public.profiles p join auth.users u on u.id = p.id where u.email like '%.demo@example.com');
`);

console.log("\nDemo data summary");
const width = Math.max(...summary.map((r) => r.item.length));
for (const r of summary) console.log(`  ${r.item.padEnd(width)}  ${r.value ?? "-"}`);
console.log("\nDemo password: see DEMO_PASSWORD in .env.local");
