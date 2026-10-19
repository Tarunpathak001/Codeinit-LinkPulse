import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  bigserial,
} from "drizzle-orm/pg-core";
const time = (n: string) => timestamp(n, { withTimezone: true });
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
  },
  (t) => [index("campaign_owner_idx").on(t.ownerId)],
);
export const links = pgTable(
  "links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull().default(""),
    shortCode: text("short_code").notNull(),
    destinationUrl: text("destination_url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: time("expires_at"),
    maxClicks: integer("max_clicks"),
    acceptedRedirectCount: integer("accepted_redirect_count")
      .notNull()
      .default(0),
    passwordHash: text("password_hash"),
    createdAt: time("created_at").notNull().defaultNow(),
    updatedAt: time("updated_at").notNull().defaultNow(),
    disabledAt: time("disabled_at"),
    disabledReason: text("disabled_reason"),
  },
  (t) => [
    uniqueIndex("links_code_unique").on(t.shortCode),
    index("links_owner_idx").on(t.ownerId),
    index("links_campaign_idx").on(t.campaignId),
  ],
);
export const clickEvents = pgTable(
  "click_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => links.id),
    occurredAt: time("occurred_at").notNull().defaultNow(),
    accepted: boolean("accepted").notNull().default(true),
    source: text("source").notNull(),
    referrerHost: text("referrer_host"),
    deviceType: text("device_type").notNull(),
    browser: text("browser").notNull(),
    operatingSystem: text("operating_system").notNull(),
    countryCode: text("country_code"),
    isProbableBot: boolean("is_probable_bot").notNull(),
    anonymousVisitorId: text("anonymous_visitor_id"),
  },
  (t) => [index("events_link_time_idx").on(t.linkId, t.occurredAt)],
);
export const redirectAttempts = pgTable("redirect_attempts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  linkId: uuid("link_id")
    .notNull()
    .references(() => links.id),
  occurredAt: time("occurred_at").notNull().defaultNow(),
  decision: text("decision").notNull(),
  reason: text("reason").notNull(),
});
export const adminActions = pgTable("admin_actions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => profiles.id),
  linkId: uuid("link_id")
    .notNull()
    .references(() => links.id),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  createdAt: time("created_at").notNull().defaultNow(),
});
export type Link = typeof links.$inferSelect;
export type PublicLink = Omit<Link, "passwordHash"> & {
  passwordProtected: boolean;
};
export function publicLink(link: Link): PublicLink {
  const { passwordHash, ...rest } = link;
  return { ...rest, passwordProtected: !!passwordHash };
}

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: time("window_start").notNull(),
  hits: integer("hits").notNull(),
});
