import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
  integer,
  varchar,
  bigint,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const voiceVariantEnum = pgEnum("voice_variant", ["SYSTEM", "CUSTOM"]);

export const voiceCategoryEnum = pgEnum("voice_category", [
  "AUDIOBOOK", "CONVERSATIONAL", "CUSTOMER_SERVICE", "GENERAL",
  "NARRATIVE", "CHARACTERS", "MEDITATION", "MOTIVATIONAL",
  "PODCAST", "ADVERTISING", "VOICEOVER", "CORPORATE"
]);

export const voice = pgTable("voice", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: voiceCategoryEnum("category").default("GENERAL").notNull(),
  language: text("language").default("en-US").notNull(),
  variant: voiceVariantEnum("variant").notNull(),
  r2ObjectKey: text("r2_object_key"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("voice_variant_idx").on(table.variant),
  index("voice_org_id_idx").on(table.orgId),
]
);

export const generation = pgTable("generation", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orgId: text("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  voiceId: text("voice_id").references(() => voice.id, { onDelete: "set null" }),

  text: text("text").notNull(),
  voiceName: text("voice_name").notNull(),
  r2ObjectKey: text("r2_object_key"),

  temperature: doublePrecision("temperature").notNull(),
  topP: doublePrecision("top_p").notNull(),
  topK: integer("top_k").notNull(),
  repetitionPenalty: doublePrecision("repetition_penalty").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("generation_org_id_idx").on(table.orgId),
  index("generation_voice_id_idx").on(table.voiceId),
]
);

export const voiceRelations = relations(voice, ({ one, many }) => ({
  generations: many(generation),
  organization: one(organization, {
    fields: [voice.orgId],
    references: [organization.id],
  }),
}));

export const generationRelations = relations(generation, ({ one }) => ({
  voice: one(voice, {
    fields: [generation.voiceId],
    references: [voice.id],
  }),
  organization: one(organization, {
    fields: [generation.orgId],
    references: [organization.id],
  }),
}));

// From here BetterAuth generated schema

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow().notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)],
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { precision: 6, withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { precision: 6, withTimezone: true }).defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  voices: many(voice),
  generations: many(generation),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));
