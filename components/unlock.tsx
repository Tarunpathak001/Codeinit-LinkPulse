/* eslint-disable @next/next/no-location-assign-relative-destination -- Full document navigation refreshes auth cookies or executes the public HTTP redirect endpoint. */
"use client";
import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Brand } from "./brand";
export function Unlock({ code }: { code: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="center-page">
      <Brand />
      <div className="panel gate">
        <LockKeyhole size={32} />
        <h1>
          A little protection.
          <br />A trusted connection.
        </h1>
        <p>This link requires an access password.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const password = new FormData(e.currentTarget).get("password");
              const r = await fetch("/api/unlock/" + encodeURIComponent(code), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              window.location.assign(
                "/" +
                  encodeURIComponent(code) +
                  (new URLSearchParams(window.location.search).get("src") ===
                  "qr"
                    ? "?src=qr"
                    : ""),
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Connection failed");
              setBusy(false);
            }
          }}
        >
          <label>
            Access password
            <input
              name="password"
              type="password"
              maxLength={128}
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary">
            {busy ? "Verifying…" : "Unlock link →"}
          </button>
        </form>
      </div>
    </main>
  );
}
