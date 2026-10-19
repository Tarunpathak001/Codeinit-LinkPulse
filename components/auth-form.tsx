/* eslint-disable @next/next/no-location-assign-relative-destination -- Full document navigation refreshes auth cookies or executes the public HTTP redirect endpoint. */
"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-shell">
      <aside>
        <Brand />
        <h1>
          Your next great
          <br />
          connection
          <br />
          <em>starts here.</em>
        </h1>
        <p>
          One workspace for every link.
          <br />
          Clear rules. Meaningful insights.
        </p>
        <div className="auth-promise">
          <ShieldCheck /> Short links you can trust.
        </div>
      </aside>
      <section>
        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const f = new FormData(e.currentTarget);
              const r = await fetch(
                "/api/auth/" + (signup ? "signup" : "login"),
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(Object.fromEntries(f)),
                },
              );
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              if (data.confirm)
                setMessage(
                  "Check your email to confirm your account, then sign in.",
                );
              else window.location.assign("/dashboard");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not connect");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="eyebrow">WELCOME TO LINKPULSE</div>
          <h2>{signup ? "Create your workspace" : "Welcome back"}</h2>
          <p>
            {signup
              ? "Make your links work smarter."
              : "Your links, campaigns and insights are waiting."}
          </p>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
              placeholder="At least 8 characters"
              required
            />
          </label>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
          <p className="auth-switch">
            {signup ? "Already have an account?" : "New to LinkPulse?"}{" "}
            <Link href={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
