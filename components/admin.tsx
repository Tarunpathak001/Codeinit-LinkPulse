"use client";
import { useState } from "react";
import { useData, Heading, Notice, Loading, api } from "./ui";
type AdminData = {
  metrics: { links: number; disabled: number; redirects: number };
  links: {
    id: string;
    code: string;
    destination: string;
    owner: string;
    disabledAt: string | null;
    reason: string | null;
  }[];
  actions: { id: number; linkId: string; reason: string; createdAt: string }[];
};
export function Admin() {
  const { data, error, loading, reload } = useData<AdminData>("/api/admin");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  return (
    <>
      <Heading
        eyebrow="PLATFORM STEWARDSHIP"
        title="Keep connections trustworthy."
        description="Review links and apply audited abuse takedowns. Historical analytics remain intact."
      />
      <Notice error={error || message} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="stats-grid three">
              {Object.entries(data.metrics).map(([key, value]) => (
                <div className="stat-card" key={key}>
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {target && (
              <form
                className="panel campaign-editor"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await api("/api/admin", "POST", {
                      id: target,
                      reason: new FormData(e.currentTarget).get("reason"),
                    });
                    setTarget("");
                    await reload();
                  } catch (e) {
                    setMessage(
                      e instanceof Error ? e.message : "Could not disable",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2>
                  Disable /{data.links.find((l) => l.id === target)?.code}
                </h2>
                <label>
                  Reason for takedown
                  <textarea
                    name="reason"
                    required
                    minLength={5}
                    maxLength={500}
                  />
                </label>
                <div className="row-actions">
                  <button className="danger" disabled={busy}>
                    Confirm takedown
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setTarget("")}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <section className="panel">
              <div className="table-toolbar">
                <input
                  aria-label="Search recent platform links"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search latest 200 links…"
                />
                <button className="secondary" onClick={reload}>
                  Refresh
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Link</th>
                      <th>Destination</th>
                      <th>Status / reason</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.links
                      .filter((l) =>
                        (l.code + " " + l.destination)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((l) => (
                        <tr key={l.id}>
                          <td>/{l.code}</td>
                          <td>
                            <span className="destination">{l.destination}</span>
                          </td>
                          <td>{l.disabledAt ? l.reason : "Available"}</td>
                          <td>
                            <button
                              className="secondary"
                              disabled={!!l.disabledAt}
                              onClick={() => setTarget(l.id)}
                            >
                              Disable
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel audit-log">
              <h2>Recent takedown log</h2>
              {data.actions.length ? (
                data.actions.map((a) => (
                  <div key={a.id}>
                    <strong>{a.reason}</strong>
                    <small>
                      {new Date(a.createdAt).toLocaleString()} · {a.linkId}
                    </small>
                  </div>
                ))
              ) : (
                <p className="muted">No takedowns recorded.</p>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
