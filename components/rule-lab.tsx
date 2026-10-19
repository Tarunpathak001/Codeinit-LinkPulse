"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FlaskConical, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { useData, Heading, Notice, Loading } from "./ui";
import { evaluateRedirect, type RuleLink } from "@/lib/rules";
import type { ClientLink } from "@/lib/types";
const baseline: RuleLink = {
  isActive: true,
  expiresAt: null,
  maxClicks: 100,
  acceptedRedirectCount: 0,
  passwordProtected: false,
};
export function RuleLab() {
  const q = useSearchParams();
  const { data: links, error, loading } = useData<ClientLink[]>("/api/links");
  const [selected, setSelected] = useState(q.get("link") || "");
  const [override, setOverride] = useState<RuleLink | null>(null);
  const [satisfied, setSatisfied] = useState(false);
  const [time, setTime] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const link = override || links?.find((l) => l.id === selected) || baseline;
  const now = time ? new Date(time) : clock;
  const result = evaluateRedirect(link, { now, passwordSatisfied: satisfied });
  function patch(v: Partial<RuleLink>) {
    setOverride({ ...link, ...v });
  }
  function scenario(name: string) {
    const current = new Date();
    setClock(current);
    const base = links?.find((l) => l.id === selected) || baseline;
    setTime("");
    setSatisfied(false);
    if (name === "Saved configuration") {
      setOverride(null);
      return;
    }
    const normal = {
      ...base,
      isActive: true,
      disabledAt: null,
      expiresAt: null,
      maxClicks: 100,
      acceptedRedirectCount: 0,
      passwordProtected: false,
    };
    setOverride(
      name === "Expired link"
        ? {
            ...normal,
            expiresAt: new Date(current.getTime() - 86400000).toISOString(),
          }
        : name === "Click limit reached"
          ? { ...normal, acceptedRedirectCount: 100 }
          : name === "Password required"
            ? { ...normal, passwordProtected: true }
            : name === "Disabled link"
              ? { ...normal, isActive: false }
              : normal,
    );
  }
  return (
    <>
      <Heading
        eyebrow="TEST THE WHAT-IFS"
        title="Rules you can prove."
        description="Explore a redirect decision before a visitor ever reaches it."
        action={
          <span className="badge lab-badge">
            <FlaskConical size={14} />
            SIMULATION ONLY
          </span>
        }
      />
      <Notice error={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="notice lab-notice">
            <ShieldCheck size={18} />
            <span>
              A safe space to experiment. Simulations never change published
              links, record visits, or redirect your browser.
            </span>
          </div>
          <div className="lab-grid">
            <section className="panel lab-controls">
              <div className="section-title">
                <h2>Set the conditions</h2>
                <span className="badge">INPUT</span>
              </div>
              <label>
                Starting configuration
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setOverride(null);
                  }}
                >
                  <option value="">Unsaved example link</option>
                  {links?.map((l) => (
                    <option value={l.id} key={l.id}>
                      {l.title || l.shortCode}
                    </option>
                  ))}
                </select>
              </label>
              <label>Scenario presets</label>
              <div className="presets">
                {[
                  "Saved configuration",
                  "Normal visit",
                  "Expired link",
                  "Click limit reached",
                  "Password required",
                  "Disabled link",
                ].map((n) => (
                  <button
                    key={n}
                    className="secondary"
                    onClick={() => scenario(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <label className="switch-row">
                Link enabled
                <input
                  type="checkbox"
                  checked={link.isActive}
                  onChange={(e) =>
                    patch({ isActive: e.target.checked, disabledAt: null })
                  }
                />
              </label>
              <label>
                Hypothetical current time
                <input
                  type="datetime-local"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                <small>
                  Leave blank to use the time this simulation was opened or
                  reset.
                </small>
              </label>
              <label>
                Expiration
                <input
                  type="datetime-local"
                  value={
                    link.expiresAt ? localDate(String(link.expiresAt)) : ""
                  }
                  onChange={(e) =>
                    patch({
                      expiresAt: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Accepted visits
                  <input
                    type="number"
                    min={0}
                    max={2147483647}
                    value={link.acceptedRedirectCount}
                    onChange={(e) =>
                      patch({
                        acceptedRedirectCount: Math.max(
                          0,
                          Number(e.target.value),
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Maximum visits
                  <input
                    type="number"
                    min={1}
                    max={2147483647}
                    placeholder="Unlimited"
                    value={link.maxClicks ?? ""}
                    onChange={(e) =>
                      patch({
                        maxClicks: e.target.value
                          ? Math.max(1, Number(e.target.value))
                          : null,
                      })
                    }
                  />
                </label>
              </div>
              <label className="switch-row">
                Password required
                <input
                  type="checkbox"
                  checked={link.passwordProtected}
                  onChange={(e) =>
                    patch({ passwordProtected: e.target.checked })
                  }
                />
              </label>
              <label className="switch-row">
                Password authorization satisfied
                <input
                  type="checkbox"
                  checked={satisfied}
                  onChange={(e) => setSatisfied(e.target.checked)}
                />
              </label>
            </section>
            <section className="panel lab-result">
              <div className="section-title">
                <h2>Decision trace</h2>
                <span className="badge">OUTPUT</span>
              </div>
              <div
                className={"decision " + result.decision.toLowerCase()}
                aria-live="polite"
              >
                <span className="decision-icon">
                  {result.decision === "ALLOW" ? (
                    <Check size={32} />
                  ) : result.decision === "DENY" ? (
                    "×"
                  ) : (
                    "⌑"
                  )}
                </span>
                <div className="eyebrow">
                  {result.reason.replaceAll("_", " ")}
                </div>
                <h2>
                  {result.decision === "ALLOW"
                    ? "Ready to redirect."
                    : result.decision === "DENY"
                      ? "This visit stops here."
                      : "A password comes first."}
                </h2>
                <p>{result.explanation}</p>
              </div>
              <div className="trace">
                {[
                  "Active state",
                  "Expiration window",
                  "Visit limit",
                  "Password access",
                ].map((name, i) => {
                  const stop = [
                    "DISABLED",
                    "EXPIRED",
                    "CLICK_LIMIT_REACHED",
                    "PASSWORD_REQUIRED",
                  ].indexOf(result.reason);
                  return (
                    <div key={name} className={stop === i ? "trace-stop" : ""}>
                      <span className="step">0{i + 1}</span>
                      <strong>{name}</strong>
                      <span>
                        {stop < 0 || i < stop ? (
                          <Check size={17} />
                        ) : stop === i ? (
                          "STOP"
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="lab-bottom">
                <ArrowRight size={18} />
                <p>
                  The same evaluator powers Rule Lab and live redirects.
                  Production additionally locks the database row before
                  reserving a visit.
                </p>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
function localDate(v: string) {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
