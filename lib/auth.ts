import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "./errors";
import { db } from "./db";
import { profiles } from "@/db/schema";
export async function supabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (all) => {
          try {
            all.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components rely on proxy refresh. */
          }
        },
      },
    },
  );
}
export function adminEmail(email?: string, confirmed?: string) {
  return (
    !!confirmed &&
    !!email &&
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
      .includes(email.toLowerCase())
  );
}
export async function requireUser() {
  const {
    data: { user },
    error,
  } = await (await supabase()).auth.getUser();
  if (error || !user) throw new AppError("Please sign in", 401);
  await db()
    .insert(profiles)
    .values({
      id: user.id,
      displayName: user.user_metadata?.display_name || "",
    })
    .onConflictDoNothing();
  return { ...user, isAdmin: adminEmail(user.email, user.email_confirmed_at) };
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new AppError("Administrator access required", 403);
  return user;
}
