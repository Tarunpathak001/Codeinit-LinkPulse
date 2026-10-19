import { describe, it, expect, vi, afterEach } from "vitest";
import { evaluateRedirect, type RuleLink } from "@/lib/rules";
import { aliasSchema, safeDestination, linkInput } from "@/lib/validation";
import { csvRow } from "@/lib/csv";
import { requestMetadata, shortUrl } from "@/lib/metadata";
import { issueGate, verifyGate } from "@/lib/security";
import QRCode from "qrcode";
const now = new Date("2026-10-20T10:00:00Z");
const base: RuleLink = {
  isActive: true,
  expiresAt: null,
  maxClicks: 100,
  acceptedRedirectCount: 2,
  passwordProtected: false,
};
const check = (patch: Partial<RuleLink>, passwordSatisfied = false) =>
  evaluateRedirect({ ...base, ...patch }, { now, passwordSatisfied });
afterEach(() => vi.unstubAllEnvs());
describe("shared redirect evaluator", () => {
  it("allows active, unexpired links below their cap", () =>
    expect(check({}).decision).toBe("ALLOW"));
  it("denies unknown links", () =>
    expect(
      evaluateRedirect(null, { now, passwordSatisfied: false }).reason,
    ).toBe("NOT_FOUND"));
  it("denies disabled links before all other conditions", () =>
    expect(
      check({
        isActive: false,
        expiresAt: "2020-01-01",
        acceptedRedirectCount: 100,
        passwordProtected: true,
      }).reason,
    ).toBe("DISABLED"));
  it("respects admin disable even if owner enables", () =>
    expect(check({ disabledAt: now, isActive: true }).reason).toBe("DISABLED"));
  it("expires exactly at the boundary", () =>
    expect(check({ expiresAt: now }).reason).toBe("EXPIRED"));
  it("denies expired links before the click limit", () =>
    expect(
      check({ expiresAt: "2020-01-01", acceptedRedirectCount: 100 }).reason,
    ).toBe("EXPIRED"));
  it("denies at exactly the click cap", () =>
    expect(check({ acceptedRedirectCount: 100 }).reason).toBe(
      "CLICK_LIMIT_REACHED",
    ));
  it("allows unlimited links", () =>
    expect(
      check({ maxClicks: null, acceptedRedirectCount: 999 }).decision,
    ).toBe("ALLOW"));
  it("requires a password without authorization", () =>
    expect(check({ passwordProtected: true }).decision).toBe(
      "PASSWORD_REQUIRED",
    ));
  it("allows an authorized password gate", () =>
    expect(check({ passwordProtected: true }, true).decision).toBe("ALLOW"));
  it("a password cannot bypass expiry", () =>
    expect(
      check({ passwordProtected: true, expiresAt: "2020-01-01" }, true).reason,
    ).toBe("EXPIRED"));
  it("a password cannot bypass cap", () =>
    expect(
      check({ passwordProtected: true, acceptedRedirectCount: 100 }, true)
        .reason,
    ).toBe("CLICK_LIMIT_REACHED"));
  it("Rule Lab never mutates its input", () => {
    const input = Object.freeze({ ...base });
    for (let i = 0; i < 10; i++)
      evaluateRedirect(input, { now, passwordSatisfied: true });
    expect(input.acceptedRedirectCount).toBe(2);
  });
});
describe("public destinations and aliases", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "file:///tmp/test",
    "ftp://example.com",
    "https://localhost/a",
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://10.0.0.1",
    "http://192.168.1.2",
    "http://169.254.169.254",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://[fc00::1]",
    "http://user:pass@example.com",
    "https://printer.local",
    "not a URL",
  ])("rejects unsafe destination %s", (v) =>
    expect(safeDestination(v)).toBe(false),
  );
  it.each([
    "https://example.com/path?q=1",
    "http://example.org",
    "https://8.8.8.8",
    "https://[2606:4700:4700::1111]",
  ])("accepts public destination %s", (v) =>
    expect(safeDestination(v)).toBe(true),
  );
  it("blocks exact domain and its subdomains", () => {
    expect(
      safeDestination("https://x.blocked.example", ["blocked.example"]),
    ).toBe(false);
    expect(
      safeDestination("https://unblocked.example", ["blocked.example"]),
    ).toBe(true);
  });
  it("normalizes aliases", () =>
    expect(aliasSchema.parse("  FEST26  ")).toBe("fest26"));
  it.each(["api", "dashboard", "xy", "has space", "../secret", "_next"])(
    "rejects invalid/reserved alias %s",
    (v) => expect(aliasSchema.safeParse(v).success).toBe(false),
  );
  it("rejects nonpositive limits", () =>
    expect(
      linkInput.safeParse({
        destinationUrl: "https://example.com",
        maxClicks: 0,
      }).success,
    ).toBe(false));
  it("reports bad CSV fields", () =>
    expect(() =>
      csvRow(
        { destination_url: "javascript:alert(1)", max_clicks: "abc" },
        null,
      ),
    ).toThrow());
  it("accepts a valid CSV row", () =>
    expect(
      csvRow(
        {
          destination_url: "https://example.com",
          custom_alias: "fest26",
          max_clicks: "10",
        },
        null,
      ).maxClicks,
    ).toBe(10));
});
describe("visitor metadata, QR and signed gates", () => {
  it("marks curl and prefetch as probable bots", () => {
    expect(
      requestMetadata(
        new Request("https://links.example/abc", {
          headers: { "user-agent": "curl/8" },
        }),
        "anon",
      ).isProbableBot,
    ).toBe(true);
    expect(
      requestMetadata(
        new Request("https://links.example/abc", {
          headers: { "sec-purpose": "prefetch" },
        }),
        "anon",
      ).isProbableBot,
    ).toBe(true);
  });
  it("records QR without raw IP or full referer", () => {
    const data = requestMetadata(
      new Request("https://links.example/abc?src=qr", {
        headers: {
          referer: "https://example.org/private?secret=123",
          "x-forwarded-for": "1.2.3.4",
        },
      }),
      "anon",
    );
    expect(data.source).toBe("QR");
    expect(data.referrerHost).toBe("example.org");
    expect(JSON.stringify(data)).not.toContain("1.2.3.4");
    expect(JSON.stringify(data)).not.toContain("secret");
  });
  it("generates a PNG of the canonical short URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://links.example");
    expect(shortUrl("fest26", true)).toBe(
      "https://links.example/fest26?src=qr",
    );
    const png = await QRCode.toBuffer(shortUrl("fest26", true));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
  });
  it("binds a signed gate to link and password version", () => {
    vi.stubEnv("AUTH_COOKIE_SECRET", "x".repeat(64));
    const token = issueGate("link-a", "hash-a");
    expect(verifyGate(token, "link-a", "hash-a")).toBe(true);
    expect(verifyGate(token, "link-b", "hash-a")).toBe(false);
    expect(verifyGate(token, "link-a", "new-hash")).toBe(false);
    expect(verifyGate(token + "x", "link-a", "hash-a")).toBe(false);
  });
  it("expires a gate after 15 minutes", () => {
    vi.stubEnv("AUTH_COOKIE_SECRET", "x".repeat(64));
    vi.useFakeTimers();
    try {
      const token = issueGate("a", "h");
      vi.advanceTimersByTime(901000);
      expect(verifyGate(token, "a", "h")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
