import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { links, adminActions } from "@/db/schema";
import { body, fail, sameOrigin, AppError } from "@/lib/errors";
export async function GET() {
  try {
    await requireAdmin();
    const [metrics] = await db()
      .select({
        links: sql<number>`count(*)::int`,
        disabled: sql<number>`count(*) filter(where ${links.disabledAt} is not null)::int`,
        redirects: sql<number>`coalesce(sum(${links.acceptedRedirectCount}),0)::int`,
      })
      .from(links);
    return NextResponse.json({
      metrics,
      links: await db()
        .select({
          id: links.id,
          code: links.shortCode,
          destination: links.destinationUrl,
          owner: links.ownerId,
          disabledAt: links.disabledAt,
          reason: links.disabledReason,
        })
        .from(links)
        .orderBy(desc(links.createdAt))
        .limit(200),
      actions: await db()
        .select()
        .from(adminActions)
        .orderBy(desc(adminActions.createdAt))
        .limit(30),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const u = await requireAdmin();
    const b = z
      .object({ id: z.uuid(), reason: z.string().trim().min(5).max(500) })
      .parse(await body(r));
    await db().transaction(async (tx) => {
      const [link] = await tx
        .update(links)
        .set({
          isActive: false,
          disabledAt: new Date(),
          disabledReason: b.reason,
          updatedAt: new Date(),
        })
        .where(eq(links.id, b.id))
        .returning();
      if (!link) throw new AppError("Link not found", 404);
      await tx.insert(adminActions).values({
        adminId: u.id,
        linkId: b.id,
        action: "DISABLE",
        reason: b.reason,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
