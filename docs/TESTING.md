# Testing

## Credential-free suite

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

`tests/rules.test.ts` covers precedence, boundaries, aliases, public URL screening, CSV field validation, bot heuristics, QR PNG output and signed password gates.

`tests/database.test.ts` runs the **actual SQL migration and application services** using PGlite, an embedded PostgreSQL engine. Auth identity is mocked at the external boundary; database operations, counters, event rows, constraints, password hashing and HTTP handlers are real. It exercises persistence, row-level outcomes, ownership, rollback, password verification, takedown logging, imports, rate buckets and public response behavior. This is not verification of the external Supabase Auth service.

The embedded engine serializes transaction access; its concurrent Promise test is a useful regression, but is **not proof of multi-connection row-lock contention**. Use the next suite for that.

## Real PostgreSQL concurrency suite

Bring a disposable PostgreSQL server, for example:

```bash
docker run --rm --name linkpulse-test-db -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55438:5432 postgres:17
```

In another terminal on macOS/Linux:

```bash
TEST_DATABASE_URL=postgresql://postgres:local-test-only@127.0.0.1:55438/postgres npm run test:integration
```

PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:local-test-only@127.0.0.1:55438/postgres'
npm run test:integration
```

This suite creates a randomly named schema, applies the application DDL there (using an isolated `test_users` identity table), uses 12 possible physical connections, then drops only that schema. Use a disposable database, not production. The credential needs schema/table creation privileges. `TEST_DATABASE_URL` is read from the process environment; export it as shown rather than relying on `.env.local`.

It verifies:

1. The requests really use multiple PostgreSQL backend sessions.
2. Twenty simultaneous requests with count 99/cap 100 permit exactly one redirect and produce one accepted event.
3. A request waiting behind a row lock rechecks the clock after acquiring it and rejects a link that expired while waiting.

Without `TEST_DATABASE_URL`, these three tests are explicitly skipped. A skipped suite is not a passing concurrency verification.

## Browser acceptance checklist

Run against your configured local or deployed app:

- Landing, signup, sign-in, confirmation and sign-out; protected routes cannot load user data while signed out.
- Create/edit/copy/disable a link; alias remains stable and counters are not editable.
- Verify 400 errors for bad schemes/limits; 409 for alias collision; clear errors on network failure.
- Create/edit campaign; assign link; inspect campaign time filters and real recent activity.
- Scan/download QR and confirm real short URL and QR attribution.
- Password challenge: wrong password, successful authorization, repeated-attempt limit, expiry/cap/admin takedown still enforced.
- Rule Lab: normal/expired/capped/password/disabled presets; compare saved counter before and after simulations.
- CSV: malformed header, bad URL, duplicate rows, existing alias, unknown campaign, >100 rows, successful subset.
- Admin: ordinary user denied; trusted confirmed admin sees totals; takedown writes reason and preserves history.
- Narrow mobile, tablet and desktop viewports; sidebar toggle, tables, forms, chart and keyboard focus.
- Reduced-motion setting, readable contrast, visible input labels and announced error/loading states.

Browser automation is not included. No Playwright/browser pass is claimed for this archive. The checklist is intended for final integration on your configured deployment.
