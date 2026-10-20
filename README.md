> ### Instant Judge / Evaluator Access
> Skip sign-up and test the live workspace immediately with pre-configured access:
> - **Email:** `judgesexclusive@gmail.com`
> - **Password:** `Testing1234`


# LinkPulse

> **Short links you can trust. Rules you can prove before you publish.**

A production URL shortener and real-time link intelligence platform built for Innovista 2026. Powered by Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL, and Drizzle ORM.

---

**Important on Sign-up & Email Verification:** 
To prevent spam, disposable/temporary email abuse, and automated bot registrations, LinkPulse enforces strict real email verification through Supabase Auth.
## Gist

If you're short on time, here is why LinkPulse isn't just another basic URL shortener:

| Feature | Why It Matters & What We Built |
| :--- | :--- |
|  **The Rule Lab (Interactive Sandbox)** | Ever wondered if an expired or click-capped link will behave properly before you share it with 10,000 people? Rule Lab runs mock visitor scenarios through our **exact same production redirect engine** and prints an ordered decision trace without touching your live database. |
|  **Atomic Concurrency (No Over-Clicks)** | If a link is capped at 100 clicks and 100 people click at the exact same millisecond, standard shorteners blow past the cap. We lock the row (`SELECT ... FOR UPDATE`) in an ACID transaction so click caps are strict, absolute guarantees. |
|  **Cryptographic Access Gates** | Password-protected links don't just ask for a password—they enforce database-backed brute-force rate limiting and mint short-lived, HMAC-signed HttpOnly cookies. Opening the password challenge does not count as a valid visit. |
|  **Honest Privacy-First Analytics** | No third-party tracking scripts (no Google Analytics, no Meta pixels). We collect anonymized visitor metadata directly on our server: device types, operating systems, referrer hosts, QR vs. direct attribution, and separate probable bots from human visitors. |
|  **Bulk CSV Pipeline** | Import up to 100 custom links at once. Includes pre-commit validation, collision detection for custom aliases, and row-by-row error reporting so good rows succeed even if others fail. |
|  **Enforced Admin Governance** | Verified admins can apply reasoned takedowns from a dedicated moderation panel. Once disabled by an admin, the original link owner cannot override or bypass the suspension. |

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 16.4 (App Router, Turbopack, Server Components & Server Actions)
- **Language**: TypeScript 6 (strict type safety end-to-end)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth & Session**: Supabase Auth (PKCE exchange, SSR cookie handling)
- **Testing**: Vitest with embedded PGlite (isolated in-memory Postgres test suite, 67/67 tests passing)
- **Styling**: Vanilla modern CSS tokens & Tailwind CSS

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js 24 LTS** (or 22.12+)
- A free **Supabase** project (for PostgreSQL & Auth)

### 1. Clone & Install
```bash
git clone https://github.com/Tarunpathak001/LinkPulse.git
cd LinkPulse
npm ci
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# macOS / Linux
cp .env.example .env.local
```

Fill in your Supabase connection strings and credentials in `.env.local`:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally, or your production HTTPS domain |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (`https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase publishable / anon public key |
| `DATABASE_URL` | Supabase Postgres transaction pooler URL (port 6543) |
| `MIGRATION_DATABASE_URL` | Direct or session pooler URL for migrations (port 5432) |
| `AUTH_COOKIE_SECRET` | 32-byte random hex string used for signing access cookies |
| `TRUST_VERCEL_PROXY` | Set to `false` locally; set to `true` when deployed on Vercel |

> **Tip:** You can generate a fresh `AUTH_COOKIE_SECRET` with:
> `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`

### 3. Run Migrations & Start Server
```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Important Auth Note:** Authentication is handled securely via Supabase and requires real email confirmation to protect the platform against fake or temporary disposable emails. Since the default mailer limits dispatches to **3 to 4 confirmation emails per hour**, please use a valid, accessible email address when testing.

---

## 🧪 Testing & Code Quality

We wrote 67 tests covering our redirect evaluator, database integrity, access gates, and concurrency limits using an embedded Postgres engine (`PGlite`)—meaning you can run our entire test suite without needing an active internet connection or cloud credentials:

```bash
# Run unit & embedded database tests (67/67 passing)
npm test

# Run strict TypeScript type checks
npm run typecheck

# Run linter
npm run lint

# Production build verification
npm run build
```

---

## 📖 Deep Dives & Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — How the redirect transaction, concurrency locks, and security boundaries work under the hood.
- [docs/TESTING.md](docs/TESTING.md) — Verification suite and browser checklist.
- [docs/VERIFICATION.md](docs/VERIFICATION.md) — Exact test status and known runtime limits.
