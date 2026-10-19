"use client";
import { useEffect, useState, useCallback } from "react";
export async function api<T>(
  url: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || "Request failed");
  return result;
}
export function useData<T>(url: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadedUrl, setLoadedUrl] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(url));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network request failed");
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    let active = true;
    api<T>(url)
      .then((v) => {
        if (active) {
          setData(v);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) {
          setLoadedUrl(url);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [url]);
  return { data, error, loading: loading || loadedUrl !== url, reload };
}
export function Notice({ error }: { error: string }) {
  return error ? (
    <div className="notice error" role="alert">
      {error}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-orbit">↗</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
