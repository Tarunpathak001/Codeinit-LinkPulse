import { eq, sql } from "drizzle-orm";
import { links, clickEvents, redirectAttempts } from "@/db/schema";
import { db, type Database } from "./db";
import { evaluateRedirect } from "./rules";
import { verifyGate } from "./security";
import { requestMetadata } from "./metadata";
// Lock, evaluate, reserve and record on the same connection/transaction.
export async function resolveRedirect(
  code: string,
  request: Request,
  visitor: string,
  gate?: string,
  database: Database = db(),
) {
  return database.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(links)
      .where(eq(links.shortCode, code))
      .for("update");
    const clock = await tx
      .select({ now: sql<string>`clock_timestamp()` })
      .from(links)
      .where(eq(links.shortCode, code));
    const result = evaluateRedirect(
      link ? { ...link, passwordProtected: !!link.passwordHash } : null,
      {
        now: clock[0] ? new Date(clock[0].now) : new Date(),
        passwordSatisfied:
          !!link &&
          (!link.passwordHash || verifyGate(gate, link.id, link.passwordHash)),
      },
    );
    if (!link) return { ...result, destination: null };
    if (result.decision !== "ALLOW") {
      await tx.insert(redirectAttempts).values({
        linkId: link.id,
        decision: result.decision,
        reason: result.reason,
      });
      return { ...result, destination: null };
    }
    await tx
      .update(links)
      .set({ acceptedRedirectCount: sql`${links.acceptedRedirectCount}+1` })
      .where(eq(links.id, link.id));
    await tx
      .insert(clickEvents)
      .values({ linkId: link.id, ...requestMetadata(request, visitor) });
    return { ...result, destination: link.destinationUrl };
  });
}
