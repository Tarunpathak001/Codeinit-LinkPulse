"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowUpRight,
  Link2,
  MousePointer2,
  Users,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { useData, Heading, Notice, Loading, Empty } from "./ui";
import type { Analytics, ClientLink, Campaign } from "@/lib/types";
import { evaluateRedirect } from "@/lib/rules";
export function AnalyticsView({ overview = false }: { overview?: boolean }) {
  const q = useSearchParams();
  const [days, setDays] = useState("30");
  const [selectedLink, setSelectedLink] = useState(q.get("link") || "");
  const [campaign, setCampaign] = useState(q.get("campaign") || "");
  const { data: links, error: linkError } = useData<ClientLink[]>("/api/links");
  const { data: campaigns, error: campaignError } =
    useData<Campaign[]>("/api/campaigns");
  const {
    data: a,
    error,
    loading,
    reload,
  } = useData<Analytics>(
    `/api/analytics?days=${days}&link=${selectedLink}&campaign=${campaign}`,
  );
  const active =
    links?.filter(
      (l) =>
        evaluateRedirect(l, { now: new Date(), passwordSatisfied: true })
          .decision === "ALLOW",
    ).length || 0;
  return (
    <>
      <Heading
        eyebrow={overview ? "YOUR WORKSPACE, AT A GLANCE" : "FOLLOW THE SIGNAL"}
        title={
          overview
            ? "Good links. Great connections."
            : "Every visit tells a story."
        }
        description={
          overview
            ? "A clear view of what you share and how it performs."
            : "Real requests, meaningful context. No invented numbers."
        }
        action={
          <Link href="/dashboard/links/new" className="button primary">
            <Plus size={17} />
            Create link
          </Link>
        }
      />
      <div className="filter-bar">
        <div>
          {!overview && (
            <>
              <label className="sr-only" htmlFor="link-filter">
                Filter by link
              </label>
              <select
                id="link-filter"
                value={selectedLink}
                onChange={(e) => setSelectedLink(e.target.value)}
              >
                <option value="">All links</option>
                {links?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title || l.shortCode}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="campaign-filter">
                Filter by campaign
              </label>
              <select
                id="campaign-filter"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              >
                <option value="">All campaigns</option>
                {campaigns?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div>
          <label className="sr-only" htmlFor="days-filter">
            Time range
          </label>
          <select
            id="days-filter"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="secondary" onClick={reload}>
            Refresh
          </button>
        </div>
      </div>
      <Notice error={error || linkError || campaignError} />
      {loading ? (
        <Loading />
      ) : (
        a && (
          <>
            <div className="stats-grid">
              {[
                [
                  MousePointer2,
                  "Accepted redirects",
                  a.accepted,
                  "All authorized responses",
                ],
                [
                  Users,
                  "Approx. unique visitors",
                  a.unique,
                  "Cookie-based · probable bots excluded",
                ],
                [
                  Link2,
                  overview ? "Active links" : "Ordinary traffic",
                  overview ? active : a.ordinary,
                  overview
                    ? `${links?.length || 0} total links`
                    : "Accepted, not flagged as bots",
                ],
                [
                  ShieldCheck,
                  "Probable bot visits",
                  a.bots,
                  "Heuristic identification",
                ],
              ].map(([Icon, title, value, sub]) => (
                <article className="stat-card" key={String(title)}>
                  <div>
                    <span>{String(title)}</span>
                    {typeof Icon !== "string" && typeof Icon !== "number" && (
                      <Icon size={18} />
                    )}
                  </div>
                  <strong>{Number(value).toLocaleString()}</strong>
                  <small>{String(sub)}</small>
                </article>
              ))}
            </div>
            <div className="analytics-grid">
              <section className="panel traffic">
                <div className="section-title">
                  <div>
                    <h2>Traffic over time</h2>
                    <p>
                      Accepted redirects · UTC days ·{" "}
                      {a.growthPercent === null
                        ? "No previous traffic baseline"
                        : `${a.growthPercent > 0 ? "+" : ""}${a.growthPercent}% vs previous equal-length window`}
                    </p>
                  </div>
                  <span className="legend">
                    <i />
                    Ordinary <i className="bot-key" />
                    Probable bots
                  </span>
                </div>
                {a.accepted === 0 ? (
                  <Empty title="Your next visit starts the story">
                    <p>Share a short link to see real traffic here.</p>
                  </Empty>
                ) : (
                  <div className="chart">
                    <ResponsiveContainer width="100%" height={270}>
                      <AreaChart data={a.daily}>
                        <defs>
                          <linearGradient
                            id="traffic-fill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#52dce1"
                              stopOpacity={0.24}
                            />
                            <stop
                              offset="100%"
                              stopColor="#52dce1"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#243040" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(s) => s.slice(5)}
                          stroke="#8b9bb0"
                          tickLine={false}
                          axisLine={false}
                          minTickGap={32}
                        />
                        <YAxis
                          allowDecimals={false}
                          stroke="#8b9bb0"
                          tickLine={false}
                          axisLine={false}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#111d2c",
                            border: "1px solid #30445c",
                            borderRadius: 10,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="visits"
                          stroke="#52dce1"
                          fill="url(#traffic-fill)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="bots"
                          stroke="#8b83ef"
                          fill="transparent"
                          strokeWidth={1.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
              <section className="panel top-links">
                <div className="section-title">
                  <h2>Top connections</h2>
                  <ArrowUpRight size={18} />
                </div>
                {a.top.length ? (
                  a.top.map((l, i) => (
                    <Link
                      className="top-link"
                      href={"/dashboard/links/" + l.id}
                      key={l.id}
                    >
                      <span className="rank">0{i + 1}</span>
                      <div>
                        <strong>{l.title || l.code}</strong>
                        <small>/{l.code}</small>
                      </div>
                      <b>{l.count}</b>
                    </Link>
                  ))
                ) : (
                  <Empty title="Room for your best links">
                    <p>Your most visited links will appear here.</p>
                  </Empty>
                )}
                <Link className="text-link" href="/dashboard/links">
                  View all links <ArrowRightMini />
                </Link>
              </section>
            </div>
            <div className="breakdown-grid">
              {(["source", "device", "browser"] as const).map((dim) => (
                <section className="panel breakdown" key={dim}>
                  <h2>
                    {dim === "source"
                      ? "Traffic sources"
                      : dim === "device"
                        ? "Devices"
                        : "Browsers"}
                  </h2>
                  <p>Probable bots excluded</p>
                  {Object.entries(
                    a.dimensions.reduce<Record<string, number>>((acc, d) => {
                      acc[d[dim]] = (acc[d[dim]] || 0) + d.count;
                      return acc;
                    }, {}),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([name, count]) => (
                      <div className="bar-item" key={name}>
                        <div>
                          <span>{name}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="bar">
                          <i
                            style={{
                              width: `${a.ordinary ? (count / a.ordinary) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  {!a.dimensions.length && (
                    <p className="no-data">No visits in this period.</p>
                  )}
                </section>
              ))}
            </div>
            <section className="panel">
              <div className="section-title">
                <div>
                  <h2>Recent activity</h2>
                  <p>Latest accepted visits in this period</p>
                </div>
                <span className="badge">
                  {a.blocked} GATED / BLOCKED ATTEMPTS
                </span>
              </div>
              {!a.recent.length ? (
                <div className="simple-empty">
                  Your shared links will bring this space to life.
                </div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Short link</th>
                        <th>Source</th>
                        <th>Device / browser</th>
                        <th>Classification</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.recent.map((e) => (
                        <tr key={e.id}>
                          <td className="cyan">/{e.code}</td>
                          <td>{e.source}</td>
                          <td>
                            {e.device}{" "}
                            <span className="muted">/ {e.browser}</span>
                          </td>
                          <td>
                            <span
                              className={"badge " + (e.bot ? "quiet" : "green")}
                            >
                              {e.bot ? "Probable bot" : "Ordinary"}
                            </span>
                          </td>
                          <td className="muted">
                            {new Date(e.at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            {overview && (
              <section className="panel campaign-summary">
                <div className="section-title">
                  <h2>Campaign overview</h2>
                  <Link href="/dashboard/campaigns" className="text-link">
                    Manage campaigns ↗
                  </Link>
                </div>
                {campaigns?.length ? (
                  <div className="campaign-mini-grid">
                    {campaigns.slice(0, 4).map((c) => (
                      <Link
                        href={"/dashboard/analytics?campaign=" + c.id}
                        key={c.id}
                      >
                        <strong>{c.name}</strong>
                        <small>
                          {c.linkCount} links · {c.accepted} lifetime accepted
                          visits
                        </small>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Group related links into a campaign to see the bigger
                    picture.
                  </p>
                )}
              </section>
            )}
            <p className="method-note">
              An accepted redirect means our server authorized a redirect
              response, not that the destination loaded. Cookie identifiers
              estimate unique visitors. Bot detection is heuristic; ordinary
              traffic is not verified human traffic.
            </p>
          </>
        )
      )}
    </>
  );
}
function ArrowRightMini() {
  return <span>→</span>;
}
