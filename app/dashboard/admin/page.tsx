import { requireAdmin } from "@/lib/auth";
import { Admin } from "@/components/admin";
export default async function Page() {
  try {
    await requireAdmin();
  } catch {
    return <div className="notice error">Administrator access required.</div>;
  }
  return <Admin />;
}
