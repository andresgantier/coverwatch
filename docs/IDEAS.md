# Ideas (outside the current scope)

Improvements noticed while building. Not planned; noted so they are not lost.

- **Nightly demo reset.** The public demo lets visitors edit data as manager or coordinator. A scheduled job (GitHub Actions) could run `npm run db:seed` every night so the demo always starts clean.
- **Leaked password protection.** Supabase can reject passwords found in data breaches (HaveIBeenPwned). It is a paid-plan feature; worth enabling for real use (see `docs/PRODUCTION.md`).
