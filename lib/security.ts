import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimits } from "@/db/schema";
import { AppError } from "./errors";
function secret() {
  const s = process.env.AUTH_COOKIE_SECRET;
  if (!s || s.length < 32)
    throw new Error("AUTH_COOKIE_SECRET needs at least 32 characters");
  return s;
}
export function digest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}
export function newCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const first = chars[randomBytes(1)[0] % chars.length];
  const rest = randomBytes(6)
    .toString("base64url")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return first + rest;
}
export function issueGate(id: string, hash: string) {
  const payload = Buffer.from(
    JSON.stringify({
      id,
      version: digest(hash),
      exp: Date.now() + 15 * 60 * 1000,
    }),
  ).toString("base64url");
  return payload + "." + digest(payload);
}
export function verifyGate(
  token: string | undefined,
  id: string,
  hash: string,
) {
  try {
    if (!token) return false;
    const [payload, sig] = token.split(".");
    const expected = digest(payload);
    if (
      !sig ||
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return false;
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    return p.id === id && p.version === digest(hash) && p.exp > Date.now();
  } catch {
    return false;
  }
}
export function passwordBucket(request: Request, code: string) {
  const ip =
    process.env.TRUST_VERCEL_PROXY === "true" && process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
      : null;
  return "password:" + code + ":" + digest(ip || "shared");
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const reset = sql`${rateLimits.windowStart} < clock_timestamp()-${seconds}*interval '1 second'`;
  const rows = await db()
    .insert(rateLimits)
    .values({ key, windowStart: sql`clock_timestamp()`, hits: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        hits: sql`case when ${reset} then 1 else ${rateLimits.hits}+1 end`,
        windowStart: sql`case when ${reset} then clock_timestamp() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ hits: rateLimits.hits });
  if (rows[0].hits > limit)
    throw new AppError("Too many requests. Please try again later.", 429);
}
