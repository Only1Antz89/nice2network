import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  headline: text("headline"),
  bio: text("bio"),
  industry: text("industry"),
  skills: text("skills").array().notNull().default(sql`ARRAY[]::text[]`),
  interests: text("interests").array().notNull().default(sql`ARRAY[]::text[]`),
  location: text("location"),
  availability: text("availability").notNull().default("open"),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const accounts = pgTable("accounts", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<"oauth" | "oidc" | "email" | "credentials">().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"), access_token: text("access_token"), expires_at: integer("expires_at"), token_type: text("token_type"), scope: text("scope"), id_token: text("id_token"), session_state: text("session_state"),
}, (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(), token: text("token").notNull(), expires: timestamp("expires", { mode: "date" }).notNull(),
}, (table) => [primaryKey({ columns: [table.identifier, table.token] })]);

export const authenticators = pgTable("authenticators", {
  credentialID: text("credential_id").notNull().unique(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), providerAccountId: text("provider_account_id").notNull(), credentialPublicKey: text("credential_public_key").notNull(), counter: integer("counter").notNull(), credentialDeviceType: text("credential_device_type").notNull(), credentialBackedUp: boolean("credential_backed_up").notNull(), transports: text("transports"),
}, (table) => [primaryKey({ columns: [table.userId, table.credentialID] })]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(), ownerId: uuid("owner_id").notNull().references(() => users.id), title: text("title").notNull(), summary: text("summary").notNull(), description: text("description"), industry: text("industry").notNull(), stage: text("stage").notNull().default("idea"), status: text("status").notNull().default("active"), visibility: text("visibility").notNull().default("network"), location: text("location"), accent: text("accent").notNull().default("#ff6b35"), completedAt: timestamp("completed_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("projects_owner_idx").on(table.ownerId), index("projects_status_idx").on(table.status)]);

export const projectRoles = pgTable("project_roles", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), title: text("title").notNull(), department: text("department").notNull(), description: text("description"), skills: text("skills").array().notNull().default(sql`ARRAY[]::text[]`), capacity: integer("capacity").notNull().default(1), filled: integer("filled").notNull().default(0), status: text("status").notNull().default("open"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("project_roles_project_idx").on(table.projectId)]);

export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), roleId: uuid("role_id").references(() => projectRoles.id), membershipRole: text("membership_role").notNull().default("contributor"), department: text("department"), joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.userId] })]);

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), roleId: uuid("role_id").notNull().references(() => projectRoles.id, { onDelete: "cascade" }), applicantId: uuid("applicant_id").notNull().references(() => users.id, { onDelete: "cascade" }), message: text("message"), status: text("status").notNull().default("pending"), decidedBy: uuid("decided_by").references(() => users.id), decidedAt: timestamp("decided_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("application_unique").on(table.roleId, table.applicantId)]);

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), roleId: uuid("role_id").references(() => projectRoles.id), invitedBy: uuid("invited_by").notNull().references(() => users.id), inviteeId: uuid("invitee_id").references(() => users.id), email: text("email"), tokenHash: text("token_hash").notNull().unique(), status: text("status").notNull().default("pending"), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), respondedAt: timestamp("responded_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), title: text("title").notNull(), description: text("description"), ownerId: uuid("owner_id").references(() => users.id), status: text("status").notNull().default("planned"), dueAt: timestamp("due_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), sortOrder: integer("sort_order").notNull().default(0), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("milestones_project_idx").on(table.projectId)]);

export const projectUpdates = pgTable("project_updates", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), authorId: uuid("author_id").notNull().references(() => users.id), type: text("type").notNull().default("update"), body: text("body").notNull(), metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("updates_project_idx").on(table.projectId)]);

export const integrationAccounts = pgTable("integration_accounts", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), provider: text("provider").notNull(), providerAccountId: text("provider_account_id"), email: text("email"), accessTokenEncrypted: text("access_token_encrypted").notNull(), refreshTokenEncrypted: text("refresh_token_encrypted"), expiresAt: timestamp("expires_at", { withTimezone: true }), scopes: text("scopes").array().notNull().default(sql`ARRAY[]::text[]`), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("integration_user_provider_unique").on(table.userId, table.provider)]);

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }), createdBy: uuid("created_by").notNull().references(() => users.id), provider: text("provider").notNull(), providerEventId: text("provider_event_id"), title: text("title").notNull(), description: text("description"), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), timezone: text("timezone").notNull().default("Europe/London"), joinUrl: text("join_url"), location: text("location"), attendees: jsonb("attendees").$type<Array<{ email: string; name?: string }>>().default([]), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(), reporterId: uuid("reporter_id").notNull().references(() => users.id), targetType: text("target_type").notNull(), targetId: uuid("target_id").notNull(), reason: text("reason").notNull(), details: text("details"), status: text("status").notNull().default("open"), priority: text("priority").notNull().default("normal"), assignedTo: uuid("assigned_to").references(() => users.id), resolution: text("resolution"), resolvedAt: timestamp("resolved_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("reports_status_idx").on(table.status)]);

export const blocks = pgTable("blocks", {
  blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }), blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }), reason: text("reason"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.blockerId, table.blockedId] })]);

export const privacySettings = pgTable("privacy_settings", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }), profileVisibility: text("profile_visibility").notNull().default("network"), messagePermission: text("message_permission").notNull().default("connections"), showLocation: boolean("show_location").notNull().default(true), showAvailability: boolean("show_availability").notNull().default(true), useActivityForMatching: boolean("use_activity_for_matching").notNull().default(true), allowIntroductions: boolean("allow_introductions").notNull().default(true), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const matchFeedback = pgTable("match_feedback", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }), matchedUserId: uuid("matched_user_id").references(() => users.id, { onDelete: "cascade" }), matchKey: text("match_key").notNull(), signal: text("signal").notNull(), reason: text("reason"), scoreSnapshot: integer("score_snapshot"), features: jsonb("features").$type<Record<string, number>>().default({}), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("feedback_match_idx").on(table.matchKey), index("feedback_user_idx").on(table.userId)]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(), actorId: uuid("actor_id").references(() => users.id), action: text("action").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id"), metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}), ipHash: text("ip_hash"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("audit_target_idx").on(table.targetType, table.targetId)]);

export const usersRelations = relations(users, ({ many, one }) => ({ ownedProjects: many(projects), memberships: many(projectMembers), privacy: one(privacySettings) }));
export const projectsRelations = relations(projects, ({ one, many }) => ({ owner: one(users, { fields: [projects.ownerId], references: [users.id] }), roles: many(projectRoles), members: many(projectMembers), milestones: many(milestones), updates: many(projectUpdates) }));
