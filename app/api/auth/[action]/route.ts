import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/auth";
import { body, fail, sameOrigin, AppError } from "@/lib/errors";
export async function POST(
  r: Request,
  c: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(r);
    const client = await supabase();
    const { action } = await c.params;
    if (action === "logout") {
      const { error } = await client.auth.signOut();
      if (error) throw new AppError("Could not sign out");
      return NextResponse.json({ ok: true });
    }
    const input = z
      .object({ email: z.email(), password: z.string().min(8).max(128) })
      .parse(await body(r));
    if (action === "signup") {
      const requestOrigin =
        r.headers.get("origin") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";
      const { data, error } = await client.auth.signUp({
        ...input,
        options: {
          emailRedirectTo: new URL(
            "/auth/callback",
            requestOrigin,
          ).toString(),
        },
      });
      if (error) throw new AppError(error.message);
      return NextResponse.json({ confirm: !data.session });
    }
    if (action === "login") {
      const { error } = await client.auth.signInWithPassword(input);
      if (error)
        throw new AppError(
          "Sign-in failed. Check your email, password and email confirmation.",
          401,
        );
      return NextResponse.json({ ok: true });
    }
    throw new AppError("Not found", 404);
  } catch (e) {
    return fail(e);
  }
}
