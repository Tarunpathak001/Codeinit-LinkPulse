"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Plus,
  Search,
  Copy as CopyIcon,
  ArrowUpRight,
  LockKeyhole,
  FlaskConical,
  Check,
} from "lucide-react";
import { useData, Heading, Notice, Loading, Empty, api } from "./ui";
import { evaluateRedirect } from "@/lib/rules";
import type { ClientLink } from "@/lib/types";
import { LinkForm } from "./link-form";
export function Status({ link }: { link: ClientLink }) {
  const r = evaluateRedirect(link, {
    now: new Date(),
    passwordSatisfied: true,
  });
  return (
    <span className={"badge " + (r.decision === "ALLOW" ? "green" : "quiet")}>
      {r.decision === "ALLOW"
        ? "Active"
        : r.reason === "CLICK_LIMIT_REACHED"
          ? "At limit"
          : r.reason === "EXPIRED"
            ? "Expired"
            : "Disabled"}
    </span>
  );
}
export function Copy({ code }: { code: string }) {
  const [status, setStatus] = useState("");
  return (
    <button
      className="icon-button"
      title={status || "Copy short URL"}
      aria-label={status || "Copy short URL"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(
            new URL(
              "/" + code,
              process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
            ).toString(),
          );
          setStatus("Copied");
          setTimeout(() => setStatus(""), 2000);
        } catch {
          setStatus("Copy failed — use the displayed URL");
        }
      }}
    >
      {status === "Copied" ? <Check size={16} /> : <CopyIcon size={16} />}
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </button>
  );
}
export function Links() {
  const { data, error, loading, reload } = useData<ClientLink[]>("/api/links");
  const [query, setQuery] = useState("");
  return (
    <>
      <Heading
        eyebrow="YOUR CONNECTIONS"
        title="Every link. One place."
        description="Create, organize and keep control of every connection."
        action={
          <Link className="button primary" href="/dashboard/links/new">
            <Plus size={17} />
            Create link
          </Link>
        }
      />
      <div className="panel">
        <div className="table-toolbar">
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Search links"
              placeholder="Search by title, alias or destination…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="secondary" onClick={reload}>
            Refresh
          </button>
        </div>
        <Notice error={error} />
        {loading ? (
          <Loading />
        ) : !data?.length ? (
          <Empty title="Your first connection starts here">
            <p>Create a short link, share it, then watch real visits arrive.</p>
            <Link href="/dashboard/links/new" className="button primary">
              Create a link <ArrowUpRight size={16} />
            </Link>
          </Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Link / destination</th>
                  <th>Status</th>
                  <th>Accepted visits</th>
                  <th>Created</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data
                  .filter((l) =>
                    [l.title, l.shortCode, l.destinationUrl]
                      .join(" ")
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link
                          className="link-title"
                          href={"/dashboard/links/" + l.id}
                        >
                          {l.title || l.shortCode}
                          {l.passwordProtected && <LockKeyhole size={13} />}
                        </Link>
                        <div className="link-sub">
                          <span>/{l.shortCode}</span>
                          <span className="destination">
                            {l.destinationUrl}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Status link={l} />
                      </td>
                      <td className="numeric">
                        {l.acceptedRedirectCount.toLocaleString()}
                        <small>{l.maxClicks ? " / " + l.maxClicks : ""}</small>
                      </td>
                      <td className="muted">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Copy code={l.shortCode} />
                          <Link
                            className="icon-button"
                            title="Open details"
                            href={"/dashboard/links/" + l.id}
                          >
                            <ArrowUpRight size={17} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
export function LinkDetail({
  id,
  edit = false,
}: {
  id: string;
  edit?: boolean;
}) {
  const {
    data: l,
    error,
    loading,
    reload,
  } = useData<ClientLink>("/api/links/" + id);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (!l) return <Notice error={error || "Link not found"} />;
  if (edit)
    return (
      <>
        <Heading
          eyebrow="LINK SETTINGS"
          title="Fine-tune your connection."
          description="Updates apply to future visits immediately."
        />
        <LinkForm link={l} />
      </>
    );
  return (
    <>
      <Heading
        eyebrow="LINK DETAILS"
        title={l.title || "/" + l.shortCode}
        description={l.destinationUrl}
        action={
          <Link
            className="button secondary"
            href={"/dashboard/links/" + id + "/edit"}
          >
            Edit link
          </Link>
        }
      />
      <Notice error={error || actionError} />
      <div className="detail-grid">
        <div className="panel detail-main">
          <div className="section-title">
            <h2>Your short link</h2>
            <Status link={l} />
          </div>
          <div className="short-display">
            <span>
              {(typeof window !== "undefined"
                ? window.location.origin
                : process.env.NEXT_PUBLIC_APP_URL || "")}
              /{l.shortCode}
            </span>
            <Copy code={l.shortCode} />
          </div>
          <p className="muted">
            Opening or scanning this URL records a real accepted visit when
            rules pass.
          </p>
          <div className="detail-stats">
            <div>
              <small>ACCEPTED VISITS</small>
              <strong>{l.acceptedRedirectCount}</strong>
            </div>
            <div>
              <small>VISIT LIMIT</small>
              <strong>{l.maxClicks || "∞"}</strong>
            </div>
            <div>
              <small>ACCESS</small>
              <strong>{l.passwordProtected ? "Protected" : "Open"}</strong>
            </div>
          </div>
          <dl>
            <dt>Expiration</dt>
            <dd>
              {l.expiresAt ? new Date(l.expiresAt).toLocaleString() : "Never"}
            </dd>
            <dt>Created</dt>
            <dd>{new Date(l.createdAt).toLocaleString()}</dd>
            {l.disabledAt && (
              <>
                <dt>Admin takedown</dt>
                <dd>{l.disabledReason}</dd>
              </>
            )}
          </dl>
          <div className="row-actions wrap">
            <Link
              className="button secondary"
              href={"/dashboard/rule-lab?link=" + id}
            >
              <FlaskConical size={16} />
              Test in Rule Lab
            </Link>
            <Link
              className="button secondary"
              href={"/dashboard/analytics?link=" + id}
            >
              View analytics
            </Link>
            <button
              className="secondary"
              disabled={busy || !!l.disabledAt}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/links/" + id, "PATCH", {
                    ...l,
                    isActive: !l.isActive,
                  });
                  await reload();
                } catch (e) {
                  setActionError(
                    e instanceof Error ? e.message : "Update failed",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : l.isActive ? "Disable link" : "Enable link"}
            </button>
          </div>
        </div>
        <aside className="panel qr-panel">
          <div className="eyebrow">BRIDGE THE OFFLINE</div>
          <h2>Scan. Connect.</h2>
          <Image
            unoptimized
            src={"/api/links/" + id + "/qr"}
            alt={"QR code for /" + l.shortCode}
            width={240}
            height={240}
          />
          <a
            className="button primary"
            href={"/api/links/" + id + "/qr"}
            download={"linkpulse-" + l.shortCode + ".png"}
          >
            Download QR code
          </a>
          <p>
            PNG · 640 × 640
            <br />
            QR visits are attributed separately.
          </p>
        </aside>
      </div>
    </>
  );
}
