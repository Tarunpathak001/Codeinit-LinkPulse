import { and, eq, desc } from "drizzle-orm";
import { hash } from "bcryptjs";
import { links, campaigns, publicLink } from "@/db/schema";
import { db } from "./db";
import { linkInput, safeDestination } from "./validation";
import { AppError } from "./errors";
import { newCode } from "./security";
export async function ownLink(ownerId: string, id: string) {
  const [link] = await db()
    .select()
    .from(links)
    .where(and(eq(links.id, id), eq(links.ownerId, ownerId)));
  if (!link) throw new AppError("Link not found", 404);
  return link;
}
export async function listLinks(ownerId: string) {
  return (
    await db()
      .select()
      .from(links)
      .where(eq(links.ownerId, ownerId))
      .orderBy(desc(links.createdAt))
  ).map(publicLink);
}
function conflict(e: unknown): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    (("code" in e && e.code === "23505") || ("cause" in e && conflict(e.cause)))
  );
}
export async function saveLink(ownerId: string, input: unknown, id?: string) {
  const data = linkInput.parse(input);
  if (
    !safeDestination(
      data.destinationUrl,
      (process.env.BLOCKED_DOMAINS || "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    )
  )
    throw new AppError("This destination is blocked");
  const existing = id ? await ownLink(ownerId, id) : null;
  if (
    data.expiresAt &&
    new Date(data.expiresAt).getTime() <= Date.now() &&
    (!existing?.expiresAt ||
      new Date(data.expiresAt).getTime() !== existing.expiresAt.getTime())
  )
    throw new AppError("Expiration must be in the future");
  if (data.campaignId) {
    const [c] = await db()
      .select()
      .from(campaigns)
      .where(
        and(eq(campaigns.id, data.campaignId), eq(campaigns.ownerId, ownerId)),
      );
    if (!c) throw new AppError("Campaign not found", 404);
  }
  const passwordHash = data.password
    ? await hash(data.password, 12)
    : data.removePassword
      ? null
      : existing?.passwordHash || null;
  const values = {
    ownerId,
    campaignId: data.campaignId,
    title: data.title,
    destinationUrl: data.destinationUrl,
    isActive: data.isActive,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    maxClicks: data.maxClicks,
    passwordHash,
    updatedAt: new Date(),
  };
  if (id) {
    try {
      const [updated] = await db()
        .update(links)
        .set(values)
        .where(and(eq(links.id, id), eq(links.ownerId, ownerId)))
        .returning();
      return publicLink(updated);
    } catch (e) {
      if (conflict(e)) throw new AppError("Alias is already taken", 409);
      throw e;
    }
  }
  for (let i = 0; i < 5; i++) {
    try {
      const [created] = await db()
        .insert(links)
        .values({ ...values, shortCode: data.customAlias || newCode() })
        .returning();
      return publicLink(created);
    } catch (e) {
      if (!conflict(e)) throw e;
      if (data.customAlias) throw new AppError("Alias is already taken", 409);
    }
  }
  throw new AppError("Could not allocate an alias. Retry.", 503);
}
