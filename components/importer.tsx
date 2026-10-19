"use client";
import { useState } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
import { api, Heading, Notice } from "./ui";
type Result = { row: number; ok: boolean; message: string; code?: string };
export function Importer() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);
  const [filename, setFilename] = useState("");
  async function submit(preview: boolean) {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ results: Result[] }>("/api/import", "POST", {
        rows,
        preview,
      });
      setResults(d.results);
      if (!preview) setImported(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="LESS REPETITION. MORE CONNECTION."
        title="A hundred links. One upload."
        description="Preview your CSV, fix any issues, and import valid rows."
        action={
          <a className="button secondary" href="/example-links.csv" download>
            <Download size={16} />
            CSV template
          </a>
        }
      />
      <Notice error={error} />
      <section className="panel import-panel">
        <label className="upload-zone">
          <span className="upload-icon">
            <Upload size={30} />
          </span>
          <strong>Choose a CSV file</strong>
          <span>Up to 100 rows · 100 KB maximum</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setError("");
              setRows([]);
              setResults([]);
              setImported(false);
              if (!file) return;
              if (file.size > 100000) {
                setError("File must be smaller than 100 KB");
                return;
              }
              setFilename(file.name);
              Papa.parse<Record<string, string>>(file, {
                header: true,
                skipEmptyLines: "greedy",
                complete: (parsed) => {
                  if (parsed.errors.length) {
                    setError(parsed.errors.map((e) => e.message).join("; "));
                    return;
                  }
                  if (!parsed.meta.fields?.includes("destination_url")) {
                    setError("Missing destination_url column");
                    return;
                  }
                  if (!parsed.data.length || parsed.data.length > 100) {
                    setError("Include 1–100 rows");
                    return;
                  }
                  setRows(parsed.data);
                },
                error: (e) => setError(e.message),
              });
            }}
          />
        </label>
        <div className="import-help">
          <FileSpreadsheet size={21} />
          <p>
            <strong>Supported columns</strong>
            <br />
            <code>
              destination_url, custom_alias, title, campaign, expires_at,
              max_clicks
            </code>
            <br />
            Campaign names must match an existing campaign. Dates use ISO 8601
            with a timezone.
          </p>
        </div>
      </section>
      {rows.length > 0 && (
        <section className="panel">
          <div className="section-title">
            <div>
              <h2>{filename}</h2>
              <p>
                {rows.length} rows loaded
                {results.length
                  ? ` · ${results.filter((r) => r.ok).length} ${imported ? "created" : "valid"} · ${results.filter((r) => !r.ok).length} rejected`
                  : ""}
              </p>
            </div>
            <div className="row-actions">
              <button
                className="secondary"
                disabled={busy || imported}
                onClick={() => submit(true)}
              >
                Validate preview
              </button>
              <button
                className="primary"
                disabled={busy || imported || !results.some((r) => r.ok)}
                onClick={() => submit(false)}
              >
                {busy
                  ? "Processing…"
                  : imported
                    ? "Import complete"
                    : "Import valid rows"}
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CSV row</th>
                  <th>Destination / alias</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const result = results.find((r) => r.row === i + 2);
                  return (
                    <tr key={i}>
                      <td>{i + 2}</td>
                      <td>
                        <span className="destination wide">
                          {row.destination_url}
                        </span>
                        <small>{row.custom_alias || "Automatic alias"}</small>
                      </td>
                      <td>
                        <span
                          className={
                            result
                              ? result.ok
                                ? "cyan"
                                : "error-text"
                              : "muted"
                          }
                        >
                          {result
                            ? result.message +
                              (result.code ? " /" + result.code : "")
                            : "Not validated"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="method-note">
        Imports use the same validation, ownership checks, rate limits and
        unique alias constraints as individual links. Partial success is
        reported for each row.
      </p>
    </>
  );
}
