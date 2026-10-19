import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ownLink, saveLink } from "@/lib/links";
import { publicLink } from "@/db/schema";
import { body, fail, sameOrigin } from "@/lib/errors";
import { uuid } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(r: Request, c: Context) {
  try {
    const u = await requireUser();
    return NextResponse.json(
      publicLink(await ownLink(u.id, uuid.parse((await c.params).id))),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(r: Request, c: Context) {
  try {
    sameOrigin(r);
    const u = await requireUser();
    return NextResponse.json(
      await saveLink(u.id, await body(r), uuid.parse((await c.params).id)),
    );
  } catch (e) {
    return fail(e);
  }
}
