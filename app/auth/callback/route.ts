import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth";
export async function GET(r: Request) {
  const code = new URL(r.url).searchParams.get("code");
  const host =
    r.headers.get("x-forwarded-host") || r.headers.get("host");
  const proto = r.headers.get("x-forwarded-proto") || "https";
  const baseUrl = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || r.url;

  if (code) {
    const { error } = await (
      await supabase()
    ).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }
  return NextResponse.redirect(
    new URL("/login?confirmation=failed", baseUrl),
  );
}
