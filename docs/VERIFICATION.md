# Engineering handoff and verification

Verification date: 16 October 2026.

## Executed successfully

| Check                                     | Result                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dependency installation                   | Successful; exact installed versions and npm lockfile included                                      |
| `npm test`                                | **67 passed**, across 50 unit/security/utility cases and 17 embedded PostgreSQL service/route cases |
| `npm run typecheck`                       | Passed; strict TypeScript, no errors                                                                |
| `npm run lint`                            | Passed; no lint errors or warnings                                                                  |
| `npm run build`                           | Passed; Next.js production compilation, type validation and static page generation                  |
| `npm audit --omit=dev --audit-level=high` | **0 reported production dependency vulnerabilities** at verification time                           |

Runtime used: Node.js 24.19.0, npm 11.9.0, Next.js 16.4.2. Dependencies are pinned in package.json and package-lock.json. Source code is formatted for continued development.

The embedded database suite executes the migration, real Drizzle queries, link services and route handlers. It verifies alias conflicts, ownership filtering, campaign isolation, accepted counters, separate denials, rollback on event failure, password hashes and cookies, immutable admin takedowns, analytics persistence, CSV outcomes, rate limits, no-store HTTP 302 responses, non-counting HEAD requests and protected-destination privacy.

## Implemented but not externally verified

- Supabase real-account signup, email delivery, email-confirmation callback, sign-in, session refresh and sign-out.
- The migration and application using your specific Supabase connection and hosting environment.
- Vercel deployment and mobile QR scans against a live public URL.
- Responsive browser rendering, chart interactions and keyboard/screen-reader behavior. The managed environment did not provide the required browser testing surface; no browser pass is claimed.
- **Real multi-connection PostgreSQL race tests.** The local environment prevented starting a standalone PostgreSQL server because it could not switch to the database's required non-root operating-system identity. The separate suite includes three tests and was invoked without credentials: **3 skipped**, not passed. Run the documented Docker/disposable-database test before presenting multi-session validation as complete.

No Supabase or Vercel credentials were supplied. No production URL, account, deployment or email-delivery verification is claimed. Automated service tests substitute only the external identity boundary; they do not substitute an in-memory fake database for persistence.

## Scope and remaining limits

All core code workflows requested for the hackathon are implemented: links, ownership, campaign assignment, mutable redirect rules, password gates, atomic accounting, analytics, QR, CSV, Rule Lab and audited admin disable.

The following are intentionally absent or limited:

- No hosted deployment is included. Set credentials, migrate and deploy using README and DEPLOYMENT.md.
- No automated browser/Playwright suite; a manual acceptance checklist is included.
- Manual abuse takedown is implemented; there is no public abuse-report submission form or admin restore UI.
- Admin inspection lists the most recent 200 links. Owner lists are unpaginated; large installations need pagination.
- No advanced malware detection, DNS reputation, geo targeting, custom domains, billing or organizations.
- Bot flags are heuristics. Unique visitors are cookie-based approximations. Geography is unknown, not invented.
- Event retention/cleanup, monitoring, operational backups and large-scale abuse throttling must be configured for public operation.
- Outside a trusted Vercel proxy, password rate limiting uses a conservative shared per-link bucket.
- Reassigning a link changes its historical campaign grouping, because campaign association is resolved from the current link.

See ARCHITECTURE.md for the precise security model and data semantics. The source includes no live secrets, fabricated traffic or demonstration-only authentication bypasses.
