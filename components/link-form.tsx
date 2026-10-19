"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, SlidersHorizontal } from "lucide-react";
import { api, Notice, useData } from "./ui";
import type { ClientLink, Campaign } from "@/lib/types";
export function LinkForm({ link }: { link?: ClientLink }) {
  const router = useRouter();
  const { data: campaigns, error: campaignError } =
    useData<Campaign[]>("/api/campaigns");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel link-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const data = {
            destinationUrl: f.get("destinationUrl"),
            title: f.get("title"),
            customAlias: link ? undefined : f.get("customAlias"),
            campaignId: f.get("campaignId") || null,
            expiresAt: f.get("expiresAt")
              ? link?.expiresAt &&
                String(f.get("expiresAt")) === localDate(link.expiresAt)
                ? link.expiresAt
                : new Date(String(f.get("expiresAt"))).toISOString()
              : null,
            maxClicks: f.get("maxClicks") ? Number(f.get("maxClicks")) : null,
            password: f.get("password") || undefined,
            removePassword: f.get("removePassword") === "on",
            isActive: f.get("isActive") === "on",
          };
          const saved = await api<ClientLink>(
            "/api/links" + (link ? "/" + link.id : ""),
            link ? "PATCH" : "POST",
            data,
          );
          router.push("/dashboard/links/" + saved.id);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="section-title">
        <h2>The connection</h2>
        <span className="badge">STEP 01</span>
      </div>
      <label>
        Destination URL
        <input
          type="url"
          name="destinationUrl"
          defaultValue={link?.destinationUrl}
          placeholder="https://example.com/something-great"
          required
          maxLength={2048}
        />
        <small>
          The public HTTP or HTTPS address your visitors will reach.
        </small>
      </label>
      <div className="form-grid">
        <label>
          Link title <span className="muted">optional</span>
          <input
            name="title"
            defaultValue={link?.title}
            placeholder="e.g. Event registrations"
            maxLength={120}
          />
        </label>
        <label>
          Custom alias <span className="muted">optional</span>
          <input
            name="customAlias"
            disabled={!!link}
            defaultValue={link?.shortCode}
            placeholder="e.g. fest26"
            pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,47}"
            maxLength={48}
          />
          <small>
            {link
              ? "Aliases remain stable after creation."
              : "Leave empty for a secure random alias."}
          </small>
        </label>
      </div>
      <label>
        Campaign
        <select name="campaignId" defaultValue={link?.campaignId || ""}>
          <option value="">No campaign</option>
          {campaigns?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <Notice error={campaignError} />
      <div className="section-title divided">
        <h2>
          <SlidersHorizontal size={18} /> Redirect rules
        </h2>
        <span className="badge">STEP 02</span>
      </div>
      <div className="form-grid">
        <label>
          Expires at <span className="muted">local time</span>
          <input
            type="datetime-local"
            name="expiresAt"
            defaultValue={link?.expiresAt ? localDate(link.expiresAt) : ""}
          />
          <small>Leave blank for no expiration.</small>
        </label>
        <label>
          Maximum accepted visits
          <input
            type="number"
            name="maxClicks"
            min={1}
            max={2147483647}
            defaultValue={link?.maxClicks || ""}
            placeholder="Unlimited"
          />
          <small>All accepted redirects, including probable bots.</small>
        </label>
      </div>
      <label>
        <span>
          <LockKeyhole size={15} />{" "}
          {link?.passwordProtected
            ? "Replace access password"
            : "Access password"}{" "}
          <span className="muted">optional</span>
        </span>
        <input
          name="password"
          type="password"
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          placeholder={
            link?.passwordProtected
              ? "Leave blank to keep current password"
              : "At least 8 characters"
          }
        />
      </label>
      {link?.passwordProtected && (
        <label className="check">
          <input name="removePassword" type="checkbox" />
          Remove existing password protection
        </label>
      )}
      <label className="check">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={link?.isActive ?? true}
        />
        Enable this link
      </label>
      {link?.disabledAt && (
        <div className="notice error">
          An administrator disabled this link: {link.disabledReason}. Owner
          changes cannot override the takedown.
        </div>
      )}
      <Notice error={error} />
      <div className="form-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </button>
        <button disabled={busy} className="primary">
          {busy ? "Saving…" : link ? "Save changes" : "Create short link"}
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}
function localDate(v: string) {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
