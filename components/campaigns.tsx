"use client";
import Link from "next/link";
import { useState } from "react";
import { FolderOpen, Plus, ArrowUpRight, Pencil } from "lucide-react";
import { useData, Heading, Notice, Loading, Empty, api } from "./ui";
import type { Campaign } from "@/lib/types";
export function Campaigns() {
  const { data, error, loading, reload } =
    useData<Campaign[]>("/api/campaigns");
  const [editing, setEditing] = useState<Campaign | null>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Heading
        eyebrow="ORGANIZE WITH INTENT"
        title="Bring your links together."
        description="One launch. Many channels. A shared view of performance."
        action={
          <button className="primary" onClick={() => setEditing(null)}>
            <Plus size={17} />
            New campaign
          </button>
        }
      />
      <Notice error={error || message} />
      {editing !== undefined && (
        <form
          className="panel campaign-editor"
          key={editing?.id || "new"}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            const f = new FormData(e.currentTarget);
            try {
              await api("/api/campaigns", editing ? "PATCH" : "POST", {
                id: editing?.id,
                name: f.get("name"),
                description: f.get("description"),
              });
              setEditing(undefined);
              await reload();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Could not save");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>{editing ? "Edit campaign" : "Create campaign"}</h2>
          <label>
            Campaign name
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={editing?.name}
              placeholder="Innovista Registration"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              maxLength={400}
              defaultValue={editing?.description}
              placeholder="A little context for this collection…"
            />
          </label>
          <div className="row-actions">
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save campaign"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <Loading />
      ) : !data?.length ? (
        <div className="panel">
          <Empty title="Give your next launch a home">
            <p>Create a campaign, then assign links in the link editor.</p>
          </Empty>
        </div>
      ) : (
        <div className="campaign-grid">
          {data.map((c) => (
            <article className="panel campaign-card" key={c.id}>
              <div className="section-title">
                <span className="campaign-icon">
                  <FolderOpen size={22} />
                </span>
                <button
                  className="icon-button"
                  aria-label={"Edit " + c.name}
                  onClick={() => setEditing(c)}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <h2>{c.name}</h2>
              <p>
                {c.description || "A collection of connected possibilities."}
              </p>
              <div className="campaign-stats">
                <div>
                  <strong>{c.linkCount}</strong>
                  <small>Total links</small>
                </div>
                <div>
                  <strong>{c.active}</strong>
                  <small>Active</small>
                </div>
                <div>
                  <strong>{c.accepted}</strong>
                  <small>Lifetime visits</small>
                </div>
              </div>
              <Link
                className="text-link"
                href={"/dashboard/analytics?campaign=" + c.id}
              >
                Explore performance
                <ArrowUpRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
