import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { resolveRedirect } from "@/lib/redirect";
// A real multi-connection PostgreSQL test. Uses an isolated random schema.
// No app credentials, auth service, or public tables are used/modified.
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const namespace = "lp_test_" + randomUUID().replaceAll("-", "");
const owner = randomUUID();
const admin = url ? postgres(url, { max: 1, prepare: false }) : null;
const client = url
  ? postgres(url, {
      max: 12,
      prepare: false,
      connection: { search_path: namespace },
    })
  : null;
const database = client ? drizzle(client, { schema }) : null;
const req = new Request("https://links.example/test", {
  headers: { "user-agent": "integration-test" },
});
suite("real PostgreSQL concurrent redirect enforcement", () => {
  beforeAll(async () => {
    await admin!.unsafe(`CREATE SCHEMA ${namespace}`);
    await client!.unsafe("CREATE TABLE test_users(id uuid PRIMARY KEY)");
    // RLS/grants are covered by the main migration; avoid global role changes here.
    const migration = (await readFile("db/migrations/0001_initial.sql", "utf8"))
      .replaceAll("auth.users", "test_users")
      .replace(/^REVOKE .*;$/gm, "");
    await client!.unsafe(migration);
    await client!`insert into test_users(id) values(${owner})`;
    await database!.insert(schema.profiles).values({ id: owner });
  });
  afterAll(async () => {
    await client?.end();
    if (admin) {
      await admin.unsafe(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`);
      await admin.end();
    }
  });
  it("uses multiple physical backend connections", async () => {
    const sessions = await Promise.all(
      Array.from(
        { length: 8 },
        () => client!`select pg_backend_pid() as pid,pg_sleep(0.1)`,
      ),
    );
    expect(new Set(sessions.map((s) => s[0].pid)).size).toBeGreaterThan(1);
  });
  it("allows exactly one of twenty requests to consume the final slot", async () => {
    const [link] = await database!
      .insert(schema.links)
      .values({
        ownerId: owner,
        shortCode: "race-test",
        destinationUrl: "https://example.com",
        maxClicks: 100,
        acceptedRedirectCount: 99,
      })
      .returning();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        resolveRedirect(
          link.shortCode,
          req,
          "test-visitor",
          undefined,
          database!,
        ),
      ),
    );
    expect(results.filter((r) => r.decision === "ALLOW")).toHaveLength(1);
    expect(
      results.filter((r) => r.reason === "CLICK_LIMIT_REACHED"),
    ).toHaveLength(19);
    const [saved] = await database!
      .select()
      .from(schema.links)
      .where(eq(schema.links.id, link.id));
    expect(saved.acceptedRedirectCount).toBe(100);
    expect(
      await database!
        .select()
        .from(schema.clickEvents)
        .where(eq(schema.clickEvents.linkId, link.id)),
    ).toHaveLength(1);
  });
  it("rechecks expiry after waiting for a row lock", async () => {
    const [link] = await database!
      .insert(schema.links)
      .values({
        ownerId: owner,
        shortCode: "expiry-race",
        destinationUrl: "https://example.com",
        expiresAt: new Date(Date.now() + 700),
      })
      .returning();
    let locked!: () => void;
    const acquired = new Promise<void>((r) => {
      locked = r;
    });
    const blocker = client!.begin(async (tx) => {
      await tx`select id from links where id=${link.id} for update`;
      locked();
      await tx`select pg_sleep(1.1)`;
    });
    await acquired;
    const result = await resolveRedirect(
      link.shortCode,
      req,
      "v",
      undefined,
      database!,
    );
    await blocker;
    expect(result.reason).toBe("EXPIRED");
    const [saved] = await database!
      .select()
      .from(schema.links)
      .where(eq(schema.links.id, link.id));
    expect(saved.acceptedRedirectCount).toBe(0);
  });
});
