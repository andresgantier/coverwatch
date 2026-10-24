# coverwatch-backups (private)

Nightly backups of the CoverWatch database, made by the workflow in `.github/workflows/nightly-backup.yml`.

```
backups/
  YYYY-MM-DD/
    roles.sql            custom database roles
    schema.sql           tables, views, functions, triggers, RLS policies
    data.sql             all data (COPY format)
    restore-report.md    result of tonight's restore drill
```

- Runs every night at 02:30 UTC, and on demand (Actions → Nightly backup → Run workflow).
- Every run restores the dump into an empty PostgreSQL and compares the row count of every table with the live database. The result is in `restore-report.md` and in the commit message.
- The last 30 days are kept.
- The connection string is stored as the repository secret `SUPABASE_DB_URL`.

How to restore: see `docs/RUNBOOK.md` in the main CoverWatch repository.

The workflow and the restore files are maintained in the main repository under `ops/backup-repo/` and copied here.
