import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { analytics } from "@/lib/analytics";
import { fail } from "@/lib/errors";
import { uuid } from "@/lib/validation";
export async function GET(r: Request) {
  try {
    const u = await requireUser();
    const q = new URL(r.url).searchParams;
    const days = Number(q.get("days") || 30);
    return NextResponse.json(
      await analytics(
        u.id,
        [7, 30, 90].includes(days) ? days : 30,
        q.get("link") ? uuid.parse(q.get("link")) : undefined,
        q.get("campaign") ? uuid.parse(q.get("campaign")) : undefined,
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
