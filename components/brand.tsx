import Link from "next/link";
import { Activity } from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span>
        <Activity size={23} />
      </span>
      LinkPulse<span className="brand-dot">.</span>
    </Link>
  );
}
