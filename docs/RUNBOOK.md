# CoverWatch runbook

What to do when something fails, and how to get the data back. Written for the service team and for whoever maintains the app.

## 1. Quick reference

| Situation | What to do |
|---|---|
| The app is slow or shows "Something went wrong" | Open `/api/health`. `ok: true` = the database is reachable; check the error log (Continuity page, managers). |
| The app or the internet is down | Use the last printout of **Continuity → Paper fallback** (`/print/this-week`) and the last **Full export** (Excel). Print both every Monday. |
| Data was deleted or damaged | Restore from the nightly backup (section 4). |
| The Supabase project shows "Paused" | Free plan pauses after 7 days without use. Supabase dashboard → project → **Restore project**. Data is kept. |
| The demo data looks broken | `npm run db:seed` (only demo data is replaced). |

## 2. Continuity tools in the app

- **Export to Excel** on every list (customers, equipment, contracts, renewals, service requests, visits). Uses the filters on screen. Each file has an "Info" sheet with who exported, when and with which filters.
- **Full export** (`/export/full`, managers and viewers): one .xlsx with every table and a README sheet. Readable in Excel without technical knowledge.
- **Printable week** (`/print/this-week`): open tickets, preventive visits of the next 7 days per technician (with a column to sign), overdue visits and renewal decisions due.
- **Health check** (`/api/health`): returns `{"ok": true, ...}` after a real query to the database. Suitable for an uptime monitor.
- **Error log** (Continuity page, managers): server and browser errors with time, page and reference. Stored in `app_error_log`.

## 3. Nightly backup

- Repository: **github.com/andresgantier/coverwatch-backups** (private).
- Workflow: `.github/workflows/nightly-backup.yml`, every night at 02:30 UTC. Source of these files: `ops/backup-repo/` in this repository.
- Each run creates `backups/YYYY-MM-DD/` with:
  - `roles.sql`: custom database roles
  - `schema.sql`: tables, views, functions, triggers, RLS policies (public and private schemas)
  - `data.sql`: all data, including Supabase Auth users
  - `restore-report.md`: result of the restore drill
- **Restore drill on every run:** the dump is restored into an empty PostgreSQL 17 and the row count of every public table is compared with the live database. The commit message says `restore drill: PASS` or `FAIL`; a failed drill also marks the workflow run as failed (GitHub sends an e-mail).
- The last 30 days are kept.
- Secret: `SUPABASE_DB_URL` = Session pooler connection string (Supabase → **Connect** → Session pooler), with the database password.

### Run a backup now
GitHub → coverwatch-backups → **Actions** → **Nightly backup** → **Run workflow**.

### If the backup fails
| Error in the run log | Cause | Fix |
|---|---|---|
| `Secret SUPABASE_DB_URL is missing` | Secret not set | Add it (Settings → Secrets and variables → Actions). |
| `password authentication failed` | Database password changed | Update the secret with the new password. |
| `Tenant or user not found` / `could not translate host name` | Wrong connection string | Copy it again from Supabase → Connect → Session pooler. |
| Project paused | Free plan inactivity | Restore the project in Supabase, then run the workflow again. |

## 4. Restore procedure (real incident)

Restore into a **new** Supabase project, check it, then point the app to it. The damaged project stays untouched as evidence until the new one is confirmed.

1. **Pick the backup.** In coverwatch-backups, choose the last folder whose `restore-report.md` says **PASS** and that is from before the incident. Download the folder (or `git clone` the repository).
2. **Create the new project.** Supabase → New project, region **West EU (Ireland)**, generate and store the database password.
3. **Create the structure from the migrations** (not from `schema.sql`, so the project gets exactly the versioned schema, the storage bucket and the nightly expiry job):
   ```bash
   npx supabase link --project-ref <NEW_PROJECT_REF>
   npx supabase db push
   ```
4. **Load the data.** Connection string of the new project: Supabase → Connect → Session pooler.
   ```bash
   psql "<NEW_SESSION_POOLER_URL>" -c "set session_replication_role = replica" -f backups/<DATE>/data.sql
   ```
   `session_replication_role = replica` loads tables in any order without firing triggers (the audit log and the coverage rules are restored as they were, not recalculated). A duplicate-key error on `storage.buckets` is expected: the bucket already exists from the migrations.
5. **Check the counts.** Run `restore/count_rows.sql` (from the backup repository) against the new project and compare with the table in that night's `restore-report.md`:
   ```bash
   psql "<NEW_SESSION_POOLER_URL>" -At -F '|' -f restore/count_rows.sql
   ```
6. **Contract PDFs.** Files in Storage are not in the database dump. Download them from the old project (Storage → contract-pdfs) if it is still reachable and upload them to the new one with the same paths (`<contract id>/contract.pdf`).
7. **Point the app to the new project.**
   - `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` of the new project (Supabase → Project Settings → API Keys).
   - Vercel → Settings → Environment Variables: the same two values, then **Deployments → Redeploy** (public variables are fixed at build time).
   - GitHub coverwatch-backups → secret `SUPABASE_DB_URL` of the new project.
   - Supabase Auth of the new project → Sign In / Providers → turn **off** "Allow new users to sign up" (or `npx supabase config push`).
8. **Verify:** `/api/health` returns `ok: true`; sign in with each role; the dashboard numbers match the counts from step 5; run the backup workflow once and check it says PASS.

## 5. Tested

- **Restore drill:** automatic, every night (see the latest `restore-report.md`).
- **First run, 24 Oct 2026 22:23 UTC: PASS.** Dump of 680 KB (schema 89 KB, data 590 KB). All 10 public tables restored with identical row counts (e.g. 86 contracts, 223 service requests, 513 audit entries).
- **Expected errors in the drill** (the drill uses a plain PostgreSQL, not Supabase): `pg_cron`, `supabase_vault` and the `supabase_realtime` publication do not exist there, and the Supabase Auth tables (`auth.sessions`, `auth.identities`, …) are only stubbed. They load normally in a real restore into a Supabase project (section 4), where those objects exist.
- **Not covered by the drill:** files in Storage (contract PDFs) and Supabase Auth settings. See section 4, steps 6–7.

## 6. Security notes

- The backup repository is private. It contains the full data, including the hashed passwords of Supabase Auth users; give access only to people who may see all data.
- The database password lives only in the GitHub secret and in the team's password manager, never in code or chat.
