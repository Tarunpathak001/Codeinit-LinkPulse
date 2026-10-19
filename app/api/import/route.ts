import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns, links } from "@/db/schema";
import { body, fail, sameOrigin, AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security";
import { csvRow } from "@/lib/csv";
import { saveLink } from "@/lib/links";
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const u = await requireUser();
    const input = z
      .object({
        preview: z.boolean().default(true),
        rows: z.array(z.record(z.string(), z.string())).min(1).max(100),
      })
      .parse(await body(r));
    await rateLimit("import:" + u.id, 20, 3600);
    const owned = await db()
      .select()
      .from(campaigns)
      .where(eq(campaigns.ownerId, u.id));
    const seen = new Set<string>();
    const results = [];
    for (const [i, row] of input.rows.entries()) {
      try {
        const matches = row.campaign
          ? owned.filter((c) => c.name === row.campaign)
          : [];
        if (row.campaign && matches.length !== 1)
          throw new AppError("Campaign must match one existing campaign name");
        const data = csvRow(row, matches[0]?.id || null);
        if (data.expiresAt && new Date(data.expiresAt) <= new Date())
          throw new AppError("Expiration must be in the future");
        if (data.customAlias) {
          if (seen.has(data.customAlias))
            throw new AppError("Duplicate alias in this file");
          seen.add(data.customAlias);
          const [exists] = await db()
            .select({ id: links.id })
            .from(links)
            .where(eq(links.shortCode, data.customAlias));
          if (exists) throw new AppError("Alias already exists");
        }
        if (input.preview)
          results.push({ row: i + 2, ok: true, message: "Ready" });
        else {
          await rateLimit("create:" + u.id, 120, 3600);
          const link = await saveLink(u.id, data);
          results.push({
            row: i + 2,
            ok: true,
            message: "Created",
            code: link.shortCode,
          });
        }
      } catch (e) {
        results.push({
          row: i + 2,
          ok: false,
          message:
            e instanceof z.ZodError
              ? e.issues.map((x) => x.message).join("; ")
              : e instanceof AppError
                ? e.message
                : "Could not import this row. Retry.",
        });
      }
    }
    return NextResponse.json({ preview: input.preview, results });
  } catch (e) {
    return fail(e);
  }
}
