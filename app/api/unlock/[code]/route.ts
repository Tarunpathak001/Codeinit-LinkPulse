import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { links } from "@/db/schema";
import { body, fail, sameOrigin, AppError } from "@/lib/errors";
import { aliasSchema } from "@/lib/validation";
import { issueGate, passwordBucket, rateLimit } from "@/lib/security";
import { evaluateRedirect } from "@/lib/rules";
export async function POST(
  r: Request,
  c: { params: Promise<{ code: string }> },
) {
  try {
    sameOrigin(r);
    const code = aliasSchema.parse((await c.params).code);
    await rateLimit(passwordBucket(r, code), 10, 900);
    const { password } = z
      .object({
        password: z
          .string()
          .min(1)
          .max(72)
          .refine((v) => new TextEncoder().encode(v).length <= 72),
      })
      .parse(await body(r));
    const [link] = await db()
      .select()
      .from(links)
      .where(eq(links.shortCode, code));
    const decision = evaluateRedirect(
      link ? { ...link, passwordProtected: !!link.passwordHash } : null,
      { now: new Date(), passwordSatisfied: true },
    );
    if (decision.decision !== "ALLOW")
      throw new AppError(decision.explanation, 410);
    if (!link.passwordHash || !(await compare(password, link.passwordHash)))
      throw new AppError("Incorrect password", 403);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      "lp_gate_" + code,
      issueGate(link.id, link.passwordHash),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 900,
        path: "/" + code,
      },
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    return fail(e);
  }
}
