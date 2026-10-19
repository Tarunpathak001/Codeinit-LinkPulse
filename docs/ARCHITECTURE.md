# Architecture and engineering decisions

## Application boundaries

- `app/`: public pages, protected workspace routes and HTTP route handlers.
- `components/`: interactive workflow components; consistent CSS tokens live in `app/globals.css`.
- `lib/auth.ts`: request-scoped Supabase SSR client, verified `getUser()` identity and admin allowlist.
- `lib/links.ts`: link creation/update service and ownership checks.
- `lib/rules.ts`: pure rule evaluator, with no database imports or effects.
- `lib/redirect.ts`: production transaction and accepted-event persistence.
- `lib/analytics.ts`: owner-filtered SQL aggregations over real events.
- `lib/security.ts`: cryptographic aliases, signed gates and PostgreSQL rate buckets.
- `db/schema.ts`: Drizzle table definitions; `db/migrations/`: authoritative versioned SQL.
- `tests/`: deterministic rules, database/service/HTTP tests and an optional multi-connection PostgreSQL suite.

## Redirect transaction

1. Validate the alias and load the link with `SELECT … FOR UPDATE`.
2. After obtaining the row lock, obtain PostgreSQL `clock_timestamp()`. This avoids using a stale transaction-start time when a request waited for a lock.
3. Call `evaluateRedirect` with the current row and verified password cookie.
4. Rule precedence: exists/enabled/admin takedown → expiration → cap → password.
5. Record denied/gated attempts separately. Never increment the accepted counter for them.
6. For ALLOW, increment the counter and insert the accepted event in the same transaction.
7. Commit before returning the HTTP 302. If event insertion fails, the increment rolls back and no redirect is returned.

All modifying requests update the same PostgreSQL row, so owners, administrators and redirect requests serialize against each other. At count 99 with a cap of 100, only the transaction that first gets the lock can reserve the final slot; a following transaction reads 100 and stops. The integration suite tests this with twenty simultaneous requests on separate physical backend connections.

The system records authorization/issuance of a redirect, not destination loading. A client disconnect or network failure after commit can still leave an accepted event. The external browser and destination cannot participate in our database transaction. `HEAD` returns 405 to avoid counting link inspectors that only request headers; prefetch requests that issue GET can count and are flagged heuristically.

## Rule Lab

The UI imports the exact same evaluator as `lib/redirect.ts`. Existing links provide initial state. All subsequent adjustments are local React state. Presets explicitly create hypothetical configurations, including a normal baseline; “Saved configuration” restores the saved rules. No simulation endpoint mutates the database, emits click events or redirects the browser. Visit time is a snapshot when opened/reset, or a manually selected hypothetical time.

## Ownership and roles

Supabase validates the session using `getUser()` server-side. No management operation accepts a client-supplied owner ID. Every read/write filters by the verified user; campaign assignment verifies ownership and has a composite database foreign key as additional protection. A confirmed email must appear in `ADMIN_EMAILS` to gain admin access. Profile metadata never assigns privileges.

Tables have RLS enabled and direct grants to `anon` and `authenticated` revoked. This implementation deliberately exposes data only through server route handlers. The server database connection must have appropriate table privileges and RLS bypass, normally the supplied Supabase Postgres connection. It is not a direct browser-to-database RLS policy design. Never expose `DATABASE_URL` in a public environment variable.

Disabling preserves links, events and attempt history. Admin `disabled_at` is evaluated independently of the owner's `is_active` setting. There is deliberately no owner control or client role setting that clears it. Permanent account deletion cascades the owned data; history preservation here applies to deactivation, not account erasure.

## Password security

bcrypt cost 12; a password must be at least 8 characters and no more than 72 UTF-8 bytes to avoid bcrypt truncation. Owners only see whether protection exists. An HMAC-SHA256 gate contains link ID, a keyed digest of the password hash, and a 15-minute expiry. It is timing-safe verified and stored HttpOnly, SameSite=Lax, Secure in production, with path scoped to that alias. Changing or removing/replacing the password invalidates old gates. No protected destination is returned by the public challenge or denied redirect response.

All password verification attempts are rate limited (10 per 15-minute window), stricter than counting only failures. On Vercel, explicitly enabled trusted proxy data gives per-link/per-address buckets. Elsewhere, a shared per-link bucket is used rather than trusting spoofable forwarding headers. This fallback is conservative and can temporarily block legitimate visitors after someone exhausts it. The bucket stores an HMAC identifier, never the raw address.

Link creation: 120/hour/user. Campaign creation: 60/hour/user. Import requests: 20/hour/user; committed rows also use the ordinary link creation limit. Limits persist in PostgreSQL across application instances. Auth attempts additionally use Supabase's configured rate limits and provider protections.

Mutation endpoints require an Origin matching the canonical application origin, reducing CSRF exposure. Cookies use SameSite protections as well. The management endpoints are intended for the first-party UI, not as a public API.

## URLs and domain safety

HTTP(S) only, no embedded credentials, maximum 2,048 characters, blocked-domain matching, and rejection of obvious private/reserved literal IPs, localhost and local/internal hostnames. This is syntax/domain screening, **not malware detection**. The server never fetches destination content. Public-looking DNS names can resolve to private addresses or change later; the validator does not implement DNS reputation or rebinding prevention. The administrator provides manual takedowns. No untrusted URL is rendered as HTML.

Aliases are lowercase ASCII, 3–48 characters, and immutable after creation. The SQL unique constraint is definitive. Random generation retries collisions; a duplicate custom alias returns 409. Reserved application route names cannot be assigned.

## Analytics definitions

- All accepted GET redirect responses, including probable bots, count toward the hard cap.
- Ordinary traffic means not flagged by basic user-agent/prefetch heuristics; it is not verified human traffic.
- The approximate visitor metric hashes a random 30-day browser cookie. Separate browsers, blocked cookies, deleted cookies and shared browsers affect the estimate.
- Full referrers, raw IPs and full user agents are not stored; only referrer host and parsed device/browser/OS metadata are saved.
- Geography is not inferred: `country_code` is null/unknown.
- Chart buckets use UTC dates; event timestamps are displayed in the browser's local timezone. Windows include the current partial UTC day.
- Growth compares persisted accepted visits with the preceding equally long elapsed window. With a zero baseline, the UI says no baseline instead of fabricating a percentage.
- Campaign association is resolved through the link's **current** campaign. Reassignment moves its historical analytics into that campaign. It is not an immutable event-time campaign attribution model.
- Campaign lifetime totals sum transactionally maintained link counters; time-filtered campaign analytics query event rows.
- Gated/blocked attempt counts include password challenges and repeated denials. They are not accepted visit totals.

## Operations and limits

Queries are appropriate for a hackathon/small deployment. Owner link lists are not paginated; the admin list is explicitly limited to the latest 200 links, with totals covering the platform. Logs and events have no automatic retention policy. Configure backups, monitoring, retention, abuse handling and availability protections before a larger public launch.

Old rate-limit buckets can be removed periodically by a trusted operator:

```sql
DELETE FROM rate_limits WHERE window_start < now() - interval '2 days';
```

The application does not include public abuse-report submission, administrator restore UI, custom domains, billing, organizations, advanced targeting, AI malware detection, or a separate public developer API.
