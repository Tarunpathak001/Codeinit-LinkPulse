import { NextResponse } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, links } from "@/db/schema";
import { body, fail, sameOrigin, AppError } from "@/lib/errors";
import { campaignInput, uuid } from "@/lib/validation";
import { rateLimit } from "@/lib/security";
export async function GET() {
  try {
    const u = await requireUser();
    return NextResponse.json(
      await db()
        .select({
          id: campaigns.id,
          name: campaigns.name,
          description: campaigns.description,
          linkCount: sql<number>`count(${links.id})::int`,
          active: sql<number>`count(${links.id}) filter(where ${links.isActive} and ${links.disabledAt} is null and (${links.expiresAt} is null or ${links.expiresAt}>now()) and (${links.maxClicks} is null or ${links.acceptedRedirectCount}<${links.maxClicks}))::int`,
          accepted: sql<number>`coalesce(sum(${links.acceptedRedirectCount}),0)::int`,
        })
        .from(campaigns)
        .leftJoin(links, eq(links.campaignId, campaigns.id))
        .where(eq(campaigns.ownerId, u.id))
        .groupBy(campaigns.id)
        .orderBy(desc(campaigns.createdAt)),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const u = await requireUser();
    await rateLimit("campaign:" + u.id, 60, 3600);
    const [c] = await db()
      .insert(campaigns)
      .values({ ...campaignInput.parse(await body(r)), ownerId: u.id })
      .returning();
    return NextResponse.json(c, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(r: Request) {
  try {
    sameOrigin(r);
    const u = await requireUser();
    const b = await body(r);
    const id = uuid.parse(b.id);
    const [c] = await db()
      .update(campaigns)
      .set({ ...campaignInput.parse(b), updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), eq(campaigns.ownerId, u.id)))
      .returning();
    if (!c) throw new AppError("Campaign not found", 404);
    return NextResponse.json(c);
  } catch (e) {
    return fail(e);
  }
}
