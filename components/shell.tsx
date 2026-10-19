/* eslint-disable @next/next/no-location-assign-relative-destination -- Full document navigation refreshes auth cookies or executes the public HTTP redirect endpoint. */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Link2,
  FolderOpen,
  ChartNoAxesCombined,
  FlaskConical,
  Upload,
  ShieldCheck,
  LogOut,
  ArrowUpRight,
  Menu,
} from "lucide-react";
import { Brand } from "./brand";
const items = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/dashboard/links", "Your links", Link2],
  ["/dashboard/campaigns", "Campaigns", FolderOpen],
  ["/dashboard/analytics", "Analytics", ChartNoAxesCombined],
  ["/dashboard/rule-lab", "Rule Lab", FlaskConical],
  ["/dashboard/import", "Bulk import", Upload],
] as const;
export function Shell({
  children,
  email,
  admin,
}: {
  children: React.ReactNode;
  email: string;
  admin: boolean;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="app-shell">
      <button
        className="mobile-menu secondary"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        <Menu />
      </button>
      <aside className={"sidebar " + (open ? "is-open" : "")}>
        <Brand />
        <div className="workspace-label">
          WORKSPACE <span className="badge">PERSONAL</span>
        </div>
        <nav>
          {items.map(([href, label, Icon]) => (
            <Link
              onClick={() => setOpen(false)}
              className={path === href ? "selected" : ""}
              href={href}
              key={href}
            >
              <Icon size={18} />
              {label}
              {label === "Rule Lab" && <span className="tiny-badge">LAB</span>}
            </Link>
          ))}
          {admin && (
            <Link
              href="/dashboard/admin"
              className={path === "/dashboard/admin" ? "selected" : ""}
            >
              <ShieldCheck size={18} />
              Administration
            </Link>
          )}
        </nav>
        <div className="sidebar-note">
          <FlaskConical size={20} />
          <strong>Test the what-ifs.</strong>
          <p>Know exactly why your next visit will pass or stop.</p>
          <Link href="/dashboard/rule-lab">
            Open Rule Lab <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="account">
          <span className="avatar">{email.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>My workspace</strong>
            <small>{email}</small>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              try {
                const r = await fetch("/api/auth/logout", { method: "POST" });
                if (!r.ok) throw Error();
                window.location.assign("/login");
              } catch {
                setError("Sign out failed. Try again.");
              }
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <strong>
              {items.find((i) => i[0] === path)?.[1] || "Link details"}
            </strong>
          </span>
          <span className="topbar-note">
            <span className="live-dot" /> Your connection command center
          </span>
        </header>
        <main className="workspace-main">{children}</main>
        <footer className="app-footer">
          Short links you can trust.<span>Rules you can prove.</span>
        </footer>
      </div>
    </div>
  );
}
