# Supabase + Vercel deployment

## 1. Prepare Supabase

Use a new Supabase project, or inspect table-name conflicts before migrating an existing project. Tables are `profiles`, `campaigns`, `links`, `click_events`, `redirect_attempts`, `admin_actions`, `rate_limits` and `linkpulse_migrations` in the public schema.

Copy the project URL and publishable/anon key. Copy the Postgres transaction-pooler connection string for runtime and direct/session-pooler connection string for migrations. Use connection values from your project's Connect panel rather than reconstructing hostnames. Drizzle's postgres-js client uses `prepare: false`, compatible with transaction pooling, and a small pool of five connections per runtime instance.

Populate `.env.local` as documented in README. Never paste real credentials into this archive, source control or a public issue. The app has no need for a Supabase service-role API key.

## 2. Apply the migration

```bash
npm ci
npm run db:migrate
```

The runner loads `.env.local`, uses a transaction and advisory lock, applies `db/migrations/0001_initial.sql`, then records its name in `linkpulse_migrations`. Re-running an applied version is a no-op. An error rolls back the migration. Do not edit an already-applied version; add a new ordered migration and extend the migration runner for future schema changes.

The migration depends on Supabase's existing `auth.users` table and its `anon`/`authenticated` roles. It is not a standalone authentication schema for plain PostgreSQL. Unit/service tests create an isolated minimal substitute solely for verification.

## 3. Configure auth

Enable email/password. Keep email confirmation enabled and configure SMTP suitable for your demo audience if the default email restrictions prevent deliveries. Set the development and production redirect allowlists to the exact `/auth/callback` URLs. Keep the standard confirmation URL template unless you also implement the matching token-hash verification callback.

Set `ADMIN_EMAILS` only to trusted verified addresses. Redeploy/restart after changing the allowlist.

## 4. Deploy to Vercel

1. Put this `linkpulse` project into your own Git repository, preserving `.gitignore`.
2. Import that repository into Vercel. If the repo contains a parent folder, set Root Directory to `linkpulse`.
3. Select Next.js, Node.js 24.x (or supported Node.js 22.12+), install command `npm ci`, build command `npm run build`.
4. Add the environment variables from `.env.example`. Use your final HTTPS origin for `NEXT_PUBLIC_APP_URL`.
5. Set `TRUST_VERCEL_PROXY=true` only when deploying on Vercel. Vercel supplies its own `VERCEL` marker; the application checks both before trusting the proxy header.
6. Deploy and set the exact production Site URL and `/auth/callback` URL in Supabase.
7. If the initial Vercel URL was not known, update `NEXT_PUBLIC_APP_URL` and redeploy. Public variables are embedded at build time.

Do not use `next export`, a static hosting target, or an Edge runtime for database routes. These handlers use Node.js and PostgreSQL TCP connections. Build success does not verify your external credentials; run the acceptance flow below.

## 5. Deployment acceptance

- Register a real account, confirm email, sign in, reload the protected dashboard, then sign out/in.
- Create a campaign and a public HTTPS link with a unique alias.
- Open the short URL in a private window. Verify a 302 and increased persisted analytics.
- Create a cap-1 link; visit twice. One succeeds, one is denied.
- Create a password link; wrong password fails, correct password redirects, direct access without the cookie stays gated.
- Generate a QR and scan it from another device. Verify source `QR` after refreshing analytics.
- Try a second user against the first user's link-management API. It must return 404 or 401, with no data.
- Verify a confirmed admin can disable the link and the owner cannot restore it.
- Import the example CSV; change aliases if already used. Reimport to show conflict errors.
- Run the multi-connection concurrency test against a separate disposable database.

See [TESTING.md](TESTING.md) and [DEMO.md](../DEMO.md). No live deployment is included or claimed in this delivery.

## Official references

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase connection strings and pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Vercel Next.js deployment](https://vercel.com/docs/frameworks/nextjs)
