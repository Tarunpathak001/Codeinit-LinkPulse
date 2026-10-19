import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolveRedirect } from "@/lib/redirect";
import { aliasSchema } from "@/lib/validation";
import { shortUrl } from "@/lib/metadata";
import { digest } from "@/lib/security";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};
function unavailable(message: string, status: number) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LinkPulse · Link unavailable</title><style>body{margin:0;background:#0a1019;color:#edf5fc;font:18px system-ui;display:grid;min-height:100vh;place-items:center}main{padding:40px;max-width:480px}p{color:#9eafc4;line-height:1.7}a{color:#62e4e4}small{color:#62e4e4;letter-spacing:3px}</style><main><small>LINKPULSE</small><h1>That journey stops here.</h1><p>${message}</p><a href="/">Back to LinkPulse →</a></main></html>`,
    {
      status,
      headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
export async function GET(
  r: NextRequest,
  c: { params: Promise<{ code: string }> },
) {
  try {
    const raw = (await c.params).code;
    const code = aliasSchema.safeParse(raw);
    if (!code.success || code.data !== raw)
      return unavailable("This short link does not exist.", 404);
    const existing = r.cookies.get("lp_visitor")?.value;
    const visitor =
      existing && /^[a-f0-9-]{36}$/.test(existing) ? existing : randomUUID();
    const result = await resolveRedirect(
      code.data,
      r,
      digest(visitor),
      r.cookies.get("lp_gate_" + code.data)?.value,
    );
    if (result.decision === "PASSWORD_REQUIRED") {
      const target = new URL("/unlock/" + code.data, shortUrl(code.data));
      if (r.nextUrl.searchParams.get("src") === "qr")
        target.searchParams.set("src", "qr");
      return NextResponse.redirect(target, { status: 302, headers });
    }
    if (result.decision === "DENY")
      return unavailable(
        result.explanation,
        result.reason === "NOT_FOUND" ? 404 : 410,
      );
    const response = NextResponse.redirect(result.destination!, {
      status: 302,
      headers,
    });
    response.cookies.set("lp_visitor", visitor, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400 * 30,
    });
    return response;
  } catch {
    return unavailable(
      "We could not resolve this link. Please try again shortly.",
      503,
    );
  }
}
// Next otherwise executes GET for HEAD, which would incorrectly consume a visit.
export async function HEAD() {
  return new Response(null, {
    status: 405,
    headers: { ...headers, Allow: "GET" },
  });
}
