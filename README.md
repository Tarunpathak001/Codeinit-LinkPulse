# LinkPulse

**Short links you can trust. Rules you can prove.**

A full-stack URL shortener and analytics workspace for Innovista 2026. Built with Next.js App Router, React, TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL and Drizzle. This archive contains the actual frontend, backend, migrations and tests. It is not a static dashboard or a hosted deployment.


**Important:** You have to only use your valid email for login / sign in / sign up. LinkPulse does not apply any application-level rate limiter to login or sign-up endpoints; authentication is handled via Supabase, which requires real email verification and triggers email delivery limits if invalid or repeated addresses are attempted.



## Start here

You need **Node.js 24 LTS (or 22.12+)**, npm, and a **Supabase project**. Use Node.js 24 LTS if available. The landing page can build without credentials; authentication and persistent workflows require your configuration.

```bash
npm ci
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Fill these values in `.env.local`:

| Variable                        | Value                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | `http://localhost:3000` locally; your HTTPS origin in production, without a path                                                        |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                                                                                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase publishable key or legacy anon key; **not** a service-role key                                                            |
| `DATABASE_URL`                  | Supabase Postgres transaction-pooler connection string, copied from the project's Connect panel; URL-encode special password characters |
| `MIGRATION_DATABASE_URL`        | Direct or session-pooler connection string for migrations; falls back to `DATABASE_URL`                                                 |
| `AUTH_COOKIE_SECRET`            | Random secret of at least 32 characters; generate with the command below                                                                |
| `ADMIN_EMAILS`                  | Optional comma-separated, verified administrator email addresses                                                                        |
| `BLOCKED_DOMAINS`               | Optional comma-separated domains to block, without protocols or paths                                                                   |
| `TRUST_VERCEL_PROXY`            | Leave `false` locally. Set `true` only on Vercel to use its trusted proxy IP header for password rate limiting                          |

Generate a cookie secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

1. In Supabase, enable the **Email** auth provider. Keep email confirmation enabled, especially for admin accounts.
2. Configure **Authentication → URL Configuration**. Set Site URL to your app origin and allow `http://localhost:3000/auth/callback` for local development. Add your production `/auth/callback` URL when deploying.
3. Keep the standard Supabase confirmation email template using `{{ .ConfirmationURL }}`; the app exchanges the PKCE code at `/auth/callback`. Confirmation should be completed in the same browser that initiated sign-up.
4. Apply the migration and start the app:

```bash
npm run db:migrate
npm run dev
```

5. Open `http://localhost:3000`, create an account, confirm the email, and sign in.
6. Create a campaign and a link. Open the displayed short URL in another tab, then refresh analytics to observe the persisted visit.

There are no fabricated accounts, seeded traffic, dummy sessions, or hardcoded credentials. **You do not need a Supabase service-role key**: database access uses the server-only `DATABASE_URL`, while Supabase Auth verifies identities.

## Included functionality

- Public landing page, registration, sign-in, email-confirmation callback, session refresh and sign-out.
- Protected dashboard and server-enforced owner checks on all management APIs.
- Link creation, searchable table, details, editing, enable/disable, copy actions and PNG QR downloads.
- Random aliases, normalized custom aliases, reserved names and a database unique constraint.
- Real `GET /:code` temporary redirects, no-store responses, friendly unavailable pages and non-counting `HEAD` handling.
- Expiration, click caps, password protection, a short-lived signed HttpOnly access gate, and database-backed rate limiting.
- A pure shared rule evaluator used by both Rule Lab and the production redirect transaction.
- Campaign creation, editing, link assignment and campaign-scoped performance views.
- Persisted click metadata, time-series charts, source/device/browser breakdowns, approximate cookie-based unique visitors, probable bot separation, traffic change and recent activity.
- CSV parsing, server-side preview, up to 100 rows, per-row validation and accurate partial import outcomes.
- Administrator allowlist, manual takedowns, platform totals and reason audit log. Owners cannot undo admin takedowns.
- Responsive charcoal/cyan interface, loading indicators, empty states, keyboard focus, reduced-motion support and error messages.

## Commands

| Command                    | Purpose                                                                           |
| -------------------------- | --------------------------------------------------------------------------------- |
| `npm run dev`              | Local development                                                                 |
| `npm run build`            | Production build                                                                  |
| `npm start`                | Serve the production build                                                        |
| `npm run db:migrate`       | Apply versioned SQL migration once                                                |
| `npm run typecheck`        | Strict TypeScript checks                                                          |
| `npm run lint`             | Next.js and TypeScript ESLint checks                                              |
| `npm test`                 | Unit, service, route-handler and embedded PostgreSQL tests, no credentials needed |
| `npm run test:integration` | Separate real PostgreSQL concurrency suite; requires `TEST_DATABASE_URL`          |
| `npm run format:check`     | Check source formatting                                                           |

## Deployment

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Supabase and Vercel setup. Never deploy this as a static export: redirects, auth and analytics require a server runtime. Vercel detects Next.js automatically.

A QR code only works on another device when its canonical app URL is reachable from that device. `localhost` on a phone points to the phone itself. Use a deployed HTTPS domain for the hackathon demo.

## Read next

- [DEMO.md](DEMO.md): five-minute judging walkthrough.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): ownership, data model, redirect transaction and security decisions.
- [docs/TESTING.md](docs/TESTING.md): reproducible test instructions and browser acceptance checklist.
- [docs/VERIFICATION.md](docs/VERIFICATION.md): exact verification status and known limits.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): migration and deployment steps.

## Delivery status

Implemented locally; **not deployed**. Supabase email delivery, real account sessions, production connections and browser interactions require a configured environment and have not been verified against your accounts. See the verification report for test results and limits.
