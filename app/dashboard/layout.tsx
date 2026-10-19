import { redirect } from "next/navigation";
import { supabase, adminEmail } from "@/lib/auth";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    return (
      <main className="center-page">
        <h1>Connect your workspace</h1>
        <p>
          Add Supabase credentials to .env.local and apply the database
          migration. See README.md.
        </p>
      </main>
    );
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect("/login");
  return (
    <Shell
      email={user.email || ""}
      admin={adminEmail(user.email, user.email_confirmed_at)}
    >
      {children}
    </Shell>
  );
}
