# From portfolio demo to production

CoverWatch runs on free tiers with synthetic data and public demo accounts. This document lists what would change before a real company relies on it, ordered by priority.

## 1. Before go-live (must have)

| Topic | Demo today | Production |
|---|---|---|
| **Hosting plans** | Supabase Free (pauses after 7 days without use), Vercel Hobby (non-commercial use only) | **Supabase Pro** (no pausing, daily backups, more connections) and **Vercel Pro** (commercial use allowed) |
| **Demo access** | One-click demo accounts with a shared password | Remove the demo buttons, delete the demo accounts and `DEMO_PASSWORD`, run `db:seed` never again |
| **Real data** | Synthetic seed | Import from the existing Excel through a validated import (template + database constraints as the check); keep the Excel read-only as reference for one season |
| **User accounts** | Created by the seed script; public sign-up disabled | Managers **invite** users by e-mail (Supabase Auth invite, run from a server-side function); deactivation already exists |
| **Sign-in security** | E-mail and password | Multi-factor authentication for managers and coordinators (Supabase Auth MFA), leaked-password protection (Pro feature), password policy |
| **Data protection (GDPR)** | No personal data | Data processing agreements with Supabase and Vercel (EU regions are already used), privacy notice for staff and customer contacts, retention rules for the audit and error logs |

## 2. Backups and recovery

| Today | Production |
|---|---|
| Nightly dump to a private GitHub repository, restore drill against plain PostgreSQL, 30 days kept | Keep the nightly dump **and** use Supabase's own daily backups / point-in-time recovery (Pro add-on) |
| Dumps stored unencrypted in a private repository | Encrypt dumps before upload (e.g. `age`) and store them with a second provider with versioning and deletion lock (3-2-1 rule) |
| Contract PDFs only in Supabase Storage | Nightly copy of the `contract-pdfs` bucket to the same backup location |
| Restore drill covers tables and row counts | Quarterly full restore into a spare Supabase project (including Auth users and Storage), following `RUNBOOK.md`, with the time it took recorded |
| Recovery targets not defined | Agree targets with the business, e.g. **RPO 24 h** (nightly) or **minutes** with point-in-time recovery; **RTO 4 h** |

## 3. Operations and monitoring

- **Uptime monitor** on `/api/health` every minute, alerting the service manager by e-mail/SMS.
- **Error tracking:** keep `app_error_log` for the team, add an alert when new errors appear (or forward to a service such as Sentry).
- **Scheduled jobs:** alert if the nightly contract expiry job (`pg_cron`) or the backup workflow fails (the backup workflow already fails visibly).
- **Supabase advisors** (security and performance checks) run on every migration in CI.
- **Log retention:** Vercel and Supabase logs exported to a log drain for 90 days.

## 4. Quality process

- **Staging environment:** a second Supabase project (or Supabase branching) and Vercel preview deployments; migrations run on staging first.
- **Automated tests in CI:** the SQL verification scripts (`supabase/verification/`) and a small browser test per role on every pull request.
- **Change control:** protected `main` branch, pull requests with review, Dependabot for dependency updates.
- **Security headers:** Content Security Policy and strict transport security configured in Next.js.

## 5. Features the business would likely ask for next

Deliberately out of scope for the portfolio version, but typical next steps:

- E-mail reminders for renewal decisions and overdue visits (today: in-app alerts).
- Invoicing hand-off: export of billable tickets to the accounting system.
- Customer portal to report breakdowns.
- Offline mode for technicians in basements and plant rooms.

## 6. Ownership and support

| Item | Proposal |
|---|---|
| Product owner | Service manager: priorities, user access, data quality |
| Technical owner | One developer or external partner: deployments, monitoring, restores |
| Support | Business hours, response within one working day; critical (system down) within 2 hours |
| Training | 1 h per role; the RUNBOOK printed and kept with the paper fallback |

## 7. Approximate running cost

| Item | Monthly (approx., check current prices) |
|---|---|
| Supabase Pro | ~25 USD (+ point-in-time recovery add-on if chosen) |
| Vercel Pro | ~20 USD per member |
| Custom domain | ~1–2 EUR |
| Uptime monitoring, GitHub | Free tiers are enough at this size |
| **Total** | **roughly 50–100 EUR per month** |

For comparison: enterprise field-service systems are licensed per user, usually with an implementation project on top.
