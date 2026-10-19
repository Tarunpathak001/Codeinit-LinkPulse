import { and, eq, gte, lt, sql, desc } from "drizzle-orm";
import { links, clickEvents, redirectAttempts } from "@/db/schema";
import { db } from "./db";
export async function analytics(
  ownerId: string,
  days: number,
  linkId?: string,
  campaignId?: string,
) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const where = and(
    eq(links.ownerId, ownerId),
    gte(clickEvents.occurredAt, since),
    linkId ? eq(links.id, linkId) : undefined,
    campaignId ? eq(links.campaignId, campaignId) : undefined,
  );
  const totals = await db()
    .select({
      accepted: sql<number>`count(*)::int`,
      ordinary: sql<number>`count(*) filter(where not ${clickEvents.isProbableBot})::int`,
      bots: sql<number>`count(*) filter(where ${clickEvents.isProbableBot})::int`,
      unique: sql<number>`count(distinct ${clickEvents.anonymousVisitorId}) filter(where not ${clickEvents.isProbableBot})::int`,
    })
    .from(clickEvents)
    .innerJoin(links, eq(links.id, clickEvents.linkId))
    .where(where);
  const previousFrom = new Date(since.getTime() - days * 86400000);
  const previousUntil = new Date(Date.now() - days * 86400000);
  const [previous] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(clickEvents)
    .innerJoin(links, eq(links.id, clickEvents.linkId))
    .where(
      and(
        eq(links.ownerId, ownerId),
        gte(clickEvents.occurredAt, previousFrom),
        lt(clickEvents.occurredAt, previousUntil),
        linkId ? eq(links.id, linkId) : undefined,
        campaignId ? eq(links.campaignId, campaignId) : undefined,
      ),
    );
  const growthPercent =
    previous.count > 0
      ? Math.round(
          ((totals[0].accepted - previous.count) / previous.count) * 100,
        )
      : null;
  const daily = await db()
    .select({
      date: sql<string>`to_char(${clickEvents.occurredAt} at time zone 'UTC','YYYY-MM-DD')`,
      visits: sql<number>`count(*) filter(where not ${clickEvents.isProbableBot})::int`,
      bots: sql<number>`count(*) filter(where ${clickEvents.isProbableBot})::int`,
    })
    .from(clickEvents)
    .innerJoin(links, eq(links.id, clickEvents.linkId))
    .where(where)
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  const dimensions = await db()
    .select({
      source: clickEvents.source,
      device: clickEvents.deviceType,
      browser: clickEvents.browser,
      count: sql<number>`count(*)::int`,
    })
    .from(clickEvents)
    .innerJoin(links, eq(links.id, clickEvents.linkId))
    .where(and(where, eq(clickEvents.isProbableBot, false)))
    .groupBy(clickEvents.source, clickEvents.deviceType, clickEvents.browser);
  const recent = await db()
    .select({
      id: clickEvents.id,
      code: links.shortCode,
      at: clickEvents.occurredAt,
      source: clickEvents.source,
      device: clickEvents.deviceType,
      browser: clickEvents.browser,
      bot: clickEvents.isProbableBot,
    })
    .from(clickEvents)
    .innerJoin(links, eq(links.id, clickEvents.linkId))
    .where(where)
    .orderBy(desc(clickEvents.occurredAt))
    .limit(12);
  const top = await db()
    .select({
      id: links.id,
      code: links.shortCode,
      title: links.title,
      count: sql<number>`count(*)::int`,
    })
    .from(clickEvents)
    .innerJoin(links, eq(links.id, clickEvents.linkId))
    .where(where)
    .groupBy(links.id)
    .orderBy(sql`count(*) desc`)
    .limit(5);
  const [blocked] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(redirectAttempts)
    .innerJoin(links, eq(links.id, redirectAttempts.linkId))
    .where(
      and(
        eq(links.ownerId, ownerId),
        gte(redirectAttempts.occurredAt, since),
        linkId ? eq(links.id, linkId) : undefined,
        campaignId ? eq(links.campaignId, campaignId) : undefined,
      ),
    );
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push(
      daily.find((r) => r.date === date) || { date, visits: 0, bots: 0 },
    );
  }
  return {
    ...totals[0],
    previousAccepted: previous.count,
    growthPercent,
    blocked: blocked.count,
    daily: series,
    dimensions,
    recent,
    top,
  };
}
