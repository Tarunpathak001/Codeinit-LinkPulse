import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { AppError } from "@/lib/errors";
const state = vi.hoisted(() => ({
  database: undefined as unknown,
  admin: true,
}));
vi.mock("@/lib/db", () => ({ db: () => state.database }));
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({ id: "00000000-0000-4000-8000-000000000001" }),
  requireAdmin: async () => {
    if (!state.admin) throw new AppError("Administrator access required", 403);
    return { id: "00000000-0000-4000-8000-000000000001" };
  },
}));
import { saveLink, ownLink, listLinks } from "@/lib/links";
import { resolveRedirect } from "@/lib/redirect";
import { analytics } from "@/lib/analytics";
import { rateLimit, issueGate } from "@/lib/security";
import { POST as takedown } from "@/app/api/admin/route";
import { POST as importCSV } from "@/app/api/import/route";
import { NextRequest } from "next/server";
import { GET as publicRedirect, HEAD as publicHead } from "@/app/[code]/route";
import { POST as unlock } from "@/app/api/unlock/[code]/route";
const pg = new PGlite();
const database = drizzle(pg, { schema });
state.database = database;
const request = () =>
  new Request("https://links.example/sample", {
    headers: { "user-agent": "Mozilla/5.0 Chrome/130.0 Safari/537.36" },
  });
const post = (path: string, data: unknown) =>
  new Request("https://links.example" + path, {
    method: "POST",
    headers: {
      origin: "https://links.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://links.example");
  vi.stubEnv("AUTH_COOKIE_SECRET", "test-secret-".repeat(8));
  await pg.exec(
    "CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated;",
  );
  await pg.exec(await readFile("db/migrations/0001_initial.sql", "utf8"));
  await pg.exec(`INSERT INTO auth.users VALUES ('${owner}'),('${other}');`);
  await database.insert(schema.profiles).values([{ id: owner }, { id: other }]);
});
beforeEach(async () => {
  state.admin = true;
  await pg.exec(
    "TRUNCATE campaigns,links,click_events,redirect_attempts,admin_actions,rate_limits RESTART IDENTITY CASCADE",
  );
});
afterAll(async () => {
  await pg.close();
  vi.unstubAllEnvs();
});
describe("database-backed application services (embedded PostgreSQL)", () => {
  it("creates real unique aliases and rejects duplicates", async () => {
    const a = await saveLink(owner, {
      destinationUrl: "https://example.com",
      customAlias: "fest26",
    });
    expect(a.shortCode).toBe("fest26");
    expect(a).not.toHaveProperty("passwordHash");
    await expect(
      saveLink(other, {
        destinationUrl: "https://example.org",
        customAlias: "FEST26",
      }),
    ).rejects.toThrow("Alias is already taken");
    const b = await saveLink(owner, { destinationUrl: "https://example.org" });
    expect(b.shortCode).not.toBe(a.shortCode);
  });
  it("isolates owner reads and edits", async () => {
    const l = await saveLink(other, { destinationUrl: "https://example.com" });
    await expect(ownLink(owner, l.id)).rejects.toThrow("Link not found");
    await expect(
      saveLink(owner, { destinationUrl: "https://example.org" }, l.id),
    ).rejects.toThrow("Link not found");
    expect(await listLinks(owner)).toEqual([]);
  });
  it("prevents cross-owner campaign assignment", async () => {
    const [c] = await database
      .insert(schema.campaigns)
      .values({ ownerId: other, name: "Other" })
      .returning();
    await expect(
      saveLink(owner, {
        destinationUrl: "https://example.com",
        campaignId: c.id,
      }),
    ).rejects.toThrow("Campaign not found");
  });
  it("persists one event per accepted redirect and separate denied attempts", async () => {
    const l = await saveLink(owner, {
      destinationUrl: "https://example.com",
      maxClicks: 1,
    });
    expect(
      (await resolveRedirect(l.shortCode, request(), "visitor")).decision,
    ).toBe("ALLOW");
    expect(
      (await resolveRedirect(l.shortCode, request(), "visitor")).reason,
    ).toBe("CLICK_LIMIT_REACHED");
    expect((await ownLink(owner, l.id)).acceptedRedirectCount).toBe(1);
    expect(await database.select().from(schema.clickEvents)).toHaveLength(1);
    expect(await database.select().from(schema.redirectAttempts)).toHaveLength(
      1,
    );
  });
  it("does not exceed a cap under concurrent queued transactions", async () => {
    const l = await saveLink(owner, {
      destinationUrl: "https://example.com",
      maxClicks: 3,
    });
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        resolveRedirect(l.shortCode, request(), "visitor"),
      ),
    );
    expect(results.filter((r) => r.decision === "ALLOW")).toHaveLength(3);
    expect((await ownLink(owner, l.id)).acceptedRedirectCount).toBe(3);
    expect(await database.select().from(schema.clickEvents)).toHaveLength(3);
  });
  it("rolls back counter reservation when event persistence fails", async () => {
    const l = await saveLink(owner, { destinationUrl: "https://example.com" });
    await pg.exec(
      "ALTER TABLE click_events ADD CONSTRAINT reject_test CHECK(source != 'Direct')",
    );
    try {
      await expect(
        resolveRedirect(l.shortCode, request(), "v"),
      ).rejects.toThrow();
      expect((await ownLink(owner, l.id)).acceptedRedirectCount).toBe(0);
    } finally {
      await pg.exec("ALTER TABLE click_events DROP CONSTRAINT reject_test");
    }
  });
  it("hashes passwords and preserves all rules after authorization", async () => {
    const l = await saveLink(owner, {
      destinationUrl: "https://example.com",
      password: "strong-password",
    });
    const raw = await ownLink(owner, l.id);
    expect(raw.passwordHash).not.toBe("strong-password");
    expect(
      (await resolveRedirect(l.shortCode, request(), "v")).destination,
    ).toBeNull();
    const token = issueGate(l.id, raw.passwordHash!);
    expect(
      (await resolveRedirect(l.shortCode, request(), "v", token)).decision,
    ).toBe("ALLOW");
    await database
      .update(schema.links)
      .set({ expiresAt: new Date("2020-01-01") })
      .where(eq(schema.links.id, l.id));
    expect(
      (await resolveRedirect(l.shortCode, request(), "v", token)).reason,
    ).toBe("EXPIRED");
  });
  it("password endpoint rejects failures and issues a scoped HttpOnly gate", async () => {
    const l = await saveLink(owner, {
      destinationUrl: "https://example.com",
      customAlias: "protected",
      password: "strong-password",
    });
    const context = { params: Promise.resolve({ code: l.shortCode }) };
    const bad = await unlock(
      post("/api/unlock/protected", { password: "incorrect" }),
      context,
    );
    expect(bad.status).toBe(403);
    const good = await unlock(
      post("/api/unlock/protected", { password: "strong-password" }),
      context,
    );
    expect(good.status).toBe(200);
    expect(good.headers.get("set-cookie")).toContain("HttpOnly");
    expect(good.headers.get("set-cookie")).toContain("Path=/protected");
    expect(await good.text()).not.toContain("https://example.com");
    expect((await ownLink(owner, l.id)).acceptedRedirectCount).toBe(0);
  });
  it("admin takedown retains history and cannot be undone by the owner", async () => {
    const l = await saveLink(other, { destinationUrl: "https://example.com" });
    await resolveRedirect(l.shortCode, request(), "v");
    const response = await takedown(
      post("/api/admin", { id: l.id, reason: "Confirmed abuse report" }),
    );
    expect(response.status).toBe(200);
    await saveLink(
      other,
      { destinationUrl: "https://example.com", isActive: true },
      l.id,
    );
    expect((await resolveRedirect(l.shortCode, request(), "v")).reason).toBe(
      "DISABLED",
    );
    expect(await database.select().from(schema.clickEvents)).toHaveLength(1);
    expect(await database.select().from(schema.adminActions)).toHaveLength(1);
  });
  it("rejects non-admin and cross-origin takedowns", async () => {
    state.admin = false;
    const l = await saveLink(owner, { destinationUrl: "https://example.com" });
    expect(
      (await takedown(post("/api/admin", { id: l.id, reason: "Not allowed" })))
        .status,
    ).toBe(403);
    expect(
      (
        await takedown(
          new Request("https://links.example/api/admin", {
            method: "POST",
            headers: { origin: "https://evil.example" },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("aggregates campaign data from persisted events and excludes other owners", async () => {
    const [c] = await database
      .insert(schema.campaigns)
      .values({ ownerId: owner, name: "Launch" })
      .returning();
    const l = await saveLink(owner, {
      destinationUrl: "https://example.com",
      campaignId: c.id,
    });
    await resolveRedirect(l.shortCode, request(), "v");
    await resolveRedirect(
      l.shortCode,
      new Request("https://links.example/x?src=qr", {
        headers: { "user-agent": "curl/8" },
      }),
      "bot",
    );
    const a = await analytics(owner, 7, undefined, c.id);
    expect(a.accepted).toBe(2);
    expect(a.ordinary).toBe(1);
    expect(a.bots).toBe(1);
    expect(a.unique).toBe(1);
    expect(a.daily.reduce((s, r) => s + r.visits + r.bots, 0)).toBe(2);
    expect((await analytics(other, 7, undefined, c.id)).accepted).toBe(0);
  });
  it("CSV preview writes nothing; import reports duplicates and errors row by row", async () => {
    const rows = [
      { destination_url: "https://example.com", custom_alias: "alpha" },
      { destination_url: "javascript:alert(1)", custom_alias: "beta" },
      { destination_url: "https://example.org", custom_alias: "alpha" },
    ];
    const preview = await importCSV(
      post("/api/import", { preview: true, rows }),
    );
    const p = await preview.json();
    expect(p.results.map((r: { ok: boolean }) => r.ok)).toEqual([
      true,
      false,
      false,
    ]);
    expect(await listLinks(owner)).toHaveLength(0);
    const imported = await importCSV(
      post("/api/import", { preview: false, rows }),
    );
    const result = await imported.json();
    expect(result.results.filter((r: { ok: boolean }) => r.ok)).toHaveLength(1);
    expect(await listLinks(owner)).toHaveLength(1);
  });
  it("enforces database-backed rate limits", async () => {
    await rateLimit("test", 2, 60);
    await rateLimit("test", 2, 60);
    await expect(rateLimit("test", 2, 60)).rejects.toThrow("Too many requests");
  });
  it("allows disabling a link whose saved expiration is already past", async () => {
    const l = await saveLink(owner, { destinationUrl: "https://example.com" });
    const expiry = new Date("2020-01-01");
    await database
      .update(schema.links)
      .set({ expiresAt: expiry })
      .where(eq(schema.links.id, l.id));
    const updated = await saveLink(
      owner,
      {
        destinationUrl: "https://example.com",
        expiresAt: expiry.toISOString(),
        isActive: false,
      },
      l.id,
    );
    expect(updated.isActive).toBe(false);
  });
  it("public route returns a no-store 302 and HEAD never consumes a visit", async () => {
    const l = await saveLink(owner, {
      destinationUrl: "https://example.com/welcome",
      customAlias: "public-test",
    });
    const response = await publicRedirect(
      new NextRequest("https://links.example/public-test"),
      { params: Promise.resolve({ code: l.shortCode }) },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.com/welcome",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await publicHead()).status).toBe(405);
    expect((await ownLink(owner, l.id)).acceptedRedirectCount).toBe(1);
  });
  it("public password gate never leaks the protected destination", async () => {
    const l = await saveLink(owner, {
      destinationUrl: "https://example.com/secret-path",
      customAlias: "hidden-test",
      password: "strong-password",
    });
    const response = await publicRedirect(
      new NextRequest("https://links.example/hidden-test?src=qr"),
      { params: Promise.resolve({ code: l.shortCode }) },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://links.example/unlock/hidden-test?src=qr",
    );
    expect(await response.text()).not.toContain("secret-path");
    expect((await ownLink(owner, l.id)).acceptedRedirectCount).toBe(0);
  });
  it("public unknown or malformed aliases return 404 without exposing errors", async () => {
    for (const code of ["missing-code", "%%%"]) {
      const response = await publicRedirect(
        new NextRequest("https://links.example/" + code),
        { params: Promise.resolve({ code }) },
      );
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("This short link does not exist");
    }
  });
});
