# Demo data

`npm run db:seed` (script: `scripts/seed.mjs`, catalog: `scripts/seed/catalog.mjs`) fills the linked Supabase project with synthetic data for Velden Klimatechnik GmbH.

## How it works
- **Re-runnable.** It first deletes only demo data: customers with `is_demo = true`, everything linked to them, and auth users marked as demo. Real data is never touched.
- **Dates relative to today.** Every run produces the same shape: renewals due in 30/60/90 days, overdue visits, open tickets, all counted from the day it runs.
- **Through the real rules.** Contracts are created as drafts, then activated, renewed and terminated with the same database functions the app uses. Coverage, SLA, visit plans and the audit log are produced by the database, not by the script.
- **One transaction.** If anything fails, nothing is changed.
- **No secrets.** It runs through the linked Supabase CLI (no `service_role` key, no database password). The demo password is generated once and stored as `DEMO_PASSWORD` in `.env.local`; only its bcrypt hash is sent to the database.

## What it creates
| Item | Approx. |
|---|---|
| Customers / sites / units | 60 / 110 / 190 |
| Contracts (incl. renewal versions) | ~86 |
| Tickets (last 12 months) | ~220 |
| Preventive visits | ~130 |

Deliberate mix for the dashboard: renewal decisions overdue and due in 30/60/90 days, ~10 % of tickets out of SLA, overdue preventive visits, billable tickets on units without contract, two terminated and five expired contracts, and one server room (Datenhaus Emscher GmbH) with repeated breakdowns and ~86 % availability.

## Accounts
| Email | Role |
|---|---|
| manager.demo@example.com | manager |
| coordinator.demo@example.com | coordinator |
| technician.demo@example.com | technician |
| viewer.demo@example.com | viewer |

All four use `DEMO_PASSWORD`. Other staff (second coordinator, five more technicians, sales) exist so work can be assigned, but their passwords are random and unknown.
