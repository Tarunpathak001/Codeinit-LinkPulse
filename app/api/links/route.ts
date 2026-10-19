import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listLinks, saveLink } from "@/lib/links";
import { body, fail, sameOrigin } from "@/lib/errors";
import { rateLimit } from "@/lib/security";
export async function GET() {
  try {
    const u = await requireUser();
    return NextResponse.json(await listLinks(u.id));
  } catch (e) {
    return fail(e);
  }
}
export async function POST(r: Request) {
  try {
    sameOrigin(r);
    const u = await requireUser();
    await rateLimit("create:" + u.id, 120, 3600);
    return NextResponse.json(await saveLink(u.id, await body(r)), {
      status: 201,
    });
  } catch (e) {
    return fail(e);
  }
}
