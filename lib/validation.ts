import { z } from "zod";
import ipaddr from "ipaddr.js";
export const reserved = new Set([
  "api",
  "auth",
  "dashboard",
  "login",
  "signup",
  "unlock",
  "not-found",
  "favicon",
  "robots",
  "sitemap",
  "_next",
  "admin",
  "health",
]);
export function safeDestination(value: string, blocked: string[] = []) {
  try {
    const u = new URL(value);
    if (
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      value.length > 2048
    )
      return false;
    const h = u.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
    if (
      h === "localhost" ||
      h.endsWith(".localhost") ||
      h.endsWith(".local") ||
      h.endsWith(".internal") ||
      (!h.includes(".") && !h.includes(":"))
    )
      return false;
    if (ipaddr.isValid(h) && ipaddr.process(h).range() !== "unicast")
      return false;
    return !blocked.some((b) => h === b || h.endsWith("." + b));
  } catch {
    return false;
  }
}
export const aliasSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(48)
  .regex(
    /^[a-z0-9][a-z0-9_-]*$/,
    "Use letters, numbers, hyphens or underscores",
  )
  .refine((v) => !reserved.has(v), "This alias is reserved");
export const linkInput = z.object({
  destinationUrl: z
    .string()
    .trim()
    .refine((v) => safeDestination(v), "Enter a public HTTP or HTTPS URL"),
  title: z.string().trim().max(120).default(""),
  customAlias: z.union([aliasSchema, z.literal("")]).optional(),
  campaignId: z.uuid().nullable().default(null),
  expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
  maxClicks: z.number().int().min(1).max(2147483647).nullable().default(null),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (v) => new TextEncoder().encode(v).length <= 72,
      "Password must be at most 72 UTF-8 bytes",
    )
    .optional(),
  removePassword: z.boolean().optional(),
  isActive: z.boolean().default(true),
});
export const campaignInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(400).default(""),
});
export const uuid = z.uuid();
