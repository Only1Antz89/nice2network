import { relations, sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  age: integer("age"),
  dateOfBirth: date("date_of_birth", { mode: "date" }),
  ageBand: text("age_band").notNull().default("adult"),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  profession: text("profession"),
  headline: text("headline"),
  bio: text("bio"),
  industry: text("industry"),
  primarySkill: text("primary_skill"),
  secondarySkill: text("secondary_skill"),
  tertiarySkill: text("tertiary_skill"),
  skills: text("skills").array().notNull().default(sql`ARRAY[]::text[]`),
  interests: text("interests").array().notNull().default(sql`ARRAY[]::text[]`),
  location: text("location"),
  city: text("city"),
  country: text("country"),
  timezone: text("timezone").notNull().default("Europe/London"),
  workMode: text("work_mode").notNull().default("remote"),
  availability: text("availability").notNull().default("open"),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  mfaEnrolledAt: timestamp("mfa_enrolled_at", { withTimezone: true }),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
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
  id: uuid("id").defaultRandom().primaryKey(), ownerId: uuid("owner_id").notNull().references(() => users.id), title: text("title").notNull(), summary: text("summary").notNull(), description: text("description"), industry: text("industry").notNull(), stage: text("stage").notNull().default("idea"), status: text("status").notNull().default("active"), visibility: text("visibility").notNull().default("network"), location: text("location"), city: text("city"), country: text("country"), timezone: text("timezone").notNull().default("Europe/London"), workMode: text("work_mode").notNull().default("remote"), allowRemoteFallback: boolean("allow_remote_fallback").notNull().default(true), accent: text("accent").notNull().default("#ff6b35"), completedAt: timestamp("completed_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("projects_owner_idx").on(table.ownerId), index("projects_status_idx").on(table.status)]);

export const projectRoles = pgTable("project_roles", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), title: text("title").notNull(), department: text("department").notNull(), description: text("description"), skills: text("skills").array().notNull().default(sql`ARRAY[]::text[]`), professions: text("professions").array().notNull().default(sql`ARRAY[]::text[]`), requiredSkills: text("required_skills").array().notNull().default(sql`ARRAY[]::text[]`), usefulSkills: text("useful_skills").array().notNull().default(sql`ARRAY[]::text[]`), phase: text("phase").notNull().default("now"), criticality: text("criticality").notNull().default("important"), workMode: text("work_mode"), reason: text("reason"), blueprintId: uuid("blueprint_id"), capacity: integer("capacity").notNull().default(1), filled: integer("filled").notNull().default(0), status: text("status").notNull().default("open"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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

export const projectEyes = pgTable("project_eyes", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.userId] }), index("project_eyes_user_idx").on(table.userId)]);

export const projectComments = pgTable("project_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("project_comments_project_time_idx").on(table.projectId, table.createdAt)]);

export const projectBookmarks = pgTable("project_bookmarks", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pinned: boolean("pinned").notNull().default(false),
  starred: boolean("starred").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.userId] }), index("project_bookmarks_user_idx").on(table.userId)]);

export const careerHistory = pgTable("career_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  current: boolean("current").notNull().default(false),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("career_history_user_idx").on(table.userId, table.sortOrder)]);

export const educationHistory = pgTable("education_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  qualification: text("qualification").notNull(),
  fieldOfStudy: text("field_of_study"),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("education_history_user_idx").on(table.userId, table.sortOrder)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("notifications_user_time_idx").on(table.userId, table.createdAt), index("notifications_user_read_idx").on(table.userId, table.readAt)]);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  messages: boolean("messages").notNull().default(true),
  projects: boolean("projects").notNull().default(true),
  matches: boolean("matches").notNull().default(true),
  meets: boolean("meets").notNull().default(true),
  officialNotices: boolean("official_notices").notNull().default(true),
  emailDigest: text("email_digest").notNull().default("weekly"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const integrationAccounts = pgTable("integration_accounts", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), provider: text("provider").notNull(), providerAccountId: text("provider_account_id"), email: text("email"), accessTokenEncrypted: text("access_token_encrypted").notNull(), refreshTokenEncrypted: text("refresh_token_encrypted"), expiresAt: timestamp("expires_at", { withTimezone: true }), scopes: text("scopes").array().notNull().default(sql`ARRAY[]::text[]`), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("integration_user_provider_unique").on(table.userId, table.provider)]);

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(), projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }), createdBy: uuid("created_by").notNull().references(() => users.id), provider: text("provider").notNull(), providerEventId: text("provider_event_id"), title: text("title").notNull(), description: text("description"), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), timezone: text("timezone").notNull().default("Europe/London"), joinUrl: text("join_url"), location: text("location"), attendees: jsonb("attendees").$type<Array<{ email: string; name?: string }>>().default([]), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(), reporterId: uuid("reporter_id").notNull().references(() => users.id), targetType: text("target_type").notNull(), targetId: uuid("target_id").notNull(), reason: text("reason").notNull(), details: text("details"), status: text("status").notNull().default("open"), priority: text("priority").notNull().default("normal"), responseDueAt: timestamp("response_due_at", { withTimezone: true }), assignedTo: uuid("assigned_to").references(() => users.id), resolution: text("resolution"), resolvedAt: timestamp("resolved_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  id: uuid("id").defaultRandom().primaryKey(), actorId: uuid("actor_id").references(() => users.id), action: text("action").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id"), permission: text("permission"), reason: text("reason"), requestId: text("request_id"), severity: text("severity").notNull().default("info"), before: jsonb("before_state").$type<Record<string, unknown>>(), after: jsonb("after_state").$type<Record<string, unknown>>(), metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}), ipHash: text("ip_hash"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("audit_target_idx").on(table.targetType, table.targetId)]);

export const adminAssignments = pgTable("admin_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  status: text("status").notNull().default("active"),
  grantedBy: uuid("granted_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("admin_user_unique").on(table.userId), index("admin_status_idx").on(table.status)]);

export const adminMfa = pgTable("admin_mfa", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  secretEncrypted: text("secret_encrypted").notNull(),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sanctions = pgTable("sanctions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  policyCode: text("policy_code").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("active"),
  issuedBy: uuid("issued_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedBy: uuid("revoked_by").references(() => users.id),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("sanction_user_idx").on(table.userId), index("sanction_status_idx").on(table.status)]);

export const moderationEvents = pgTable("moderation_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  note: text("note"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("moderation_report_idx").on(table.reportId)]);

export const appeals = pgTable("appeals", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  sanctionId: uuid("sanction_id").references(() => sanctions.id, { onDelete: "set null" }),
  appellantId: uuid("appellant_id").notNull().references(() => users.id),
  statement: text("statement").notNull(),
  status: text("status").notNull().default("open"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("appeals_status_idx").on(table.status)]);

export const contentSnapshots = pgTable("content_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  contentHash: text("content_hash").notNull(),
  legalHold: boolean("legal_hold").notNull().default(false),
  capturedBy: uuid("captured_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("snapshot_target_idx").on(table.targetType, table.targetId)]);

export const productEvents = pgTable("product_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorHash: text("actor_hash"),
  event: text("event").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  ageBand: text("age_band"),
  properties: jsonb("properties").$type<Record<string, string | number | boolean | null>>().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("events_name_time_idx").on(table.event, table.occurredAt), index("events_entity_idx").on(table.entityType, table.entityId)]);

export const dailyMetrics = pgTable("daily_metrics", {
  day: date("day").notNull(),
  metric: text("metric").notNull(),
  dimension: text("dimension").notNull().default("all"),
  value: integer("value").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.day, table.metric, table.dimension] })]);

export const safetyRisks = pgTable("safety_risks", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectUserId: uuid("subject_user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("safety_status_idx").on(table.status, table.severity)]);

export const officialNotices = pgTable("official_notices", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("published"),
  audience: text("audience").notNull().default("all"),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("notices_status_idx").on(table.status, table.publishedAt)]);

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  initiatedBy: uuid("initiated_by").notNull().references(() => users.id),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversationMembers = pgTable("conversation_members", {
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.conversationId, table.userId] }), index("conversation_member_user_idx").on(table.userId)]);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("messages_conversation_idx").on(table.conversationId, table.createdAt)]);

export const complianceAssessments = pgTable("compliance_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull().default("draft"),
  summary: text("summary").notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
  record: jsonb("record").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("assessment_type_version_unique").on(table.type, table.version)]);

export const algorithmSettings = pgTable("algorithm_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("draft"),
  provider: text("provider").notNull().default("openai"),
  blueprintModel: text("blueprint_model").notNull(),
  embeddingModel: text("embedding_model").notNull(),
  embeddingDimensions: integer("embedding_dimensions").notNull().default(768),
  rolloutStage: integer("rollout_stage").notNull().default(1),
  weights: jsonb("weights").$type<Record<string, number>>().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("algorithm_settings_version_unique").on(table.version), index("algorithm_settings_status_idx").on(table.status)]);

export const projectBlueprints = pgTable("project_blueprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  status: text("status").notNull().default("draft"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  schemaVersion: text("schema_version").notNull().default("1.0"),
  inputHash: text("input_hash").notNull(),
  outcome: text("outcome").notNull(),
  assumptions: text("assumptions").array().notNull().default(sql`ARRAY[]::text[]`),
  coveredContributions: jsonb("covered_contributions").$type<Array<{ area: string; evidence: string }>>().notNull().default([]),
  milestones: jsonb("milestones").$type<Array<{ title: string; phase: string }>>().notNull().default([]),
  gaps: text("gaps").array().notNull().default(sql`ARRAY[]::text[]`),
  risks: text("risks").array().notNull().default(sql`ARRAY[]::text[]`),
  roles: jsonb("roles").$type<Array<{ phase: string; department: string; title: string; headcount: number; professions: string[]; requiredSkills: string[]; usefulSkills: string[]; criticality: string; reason: string; workMode: string }>>().notNull().default([]),
  failureStatus: text("failure_status"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by").references(() => users.id),
}, (table) => [uniqueIndex("project_blueprint_version_unique").on(table.projectId, table.version), index("project_blueprints_status_idx").on(table.projectId, table.status)]);

export const memberEmbeddings = pgTable("member_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  contentHash: text("content_hash").notNull(),
  dimensions: integer("dimensions").notNull().default(768),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
  status: text("status").notNull().default("ready"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("member_embedding_provider_unique").on(table.userId, table.provider, table.model), index("member_embeddings_provider_idx").on(table.provider, table.status)]);

export const roleEmbeddings = pgTable("role_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  roleId: uuid("role_id").notNull().references(() => projectRoles.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  contentHash: text("content_hash").notNull(),
  dimensions: integer("dimensions").notNull().default(768),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
  status: text("status").notNull().default("ready"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("role_embedding_provider_unique").on(table.roleId, table.provider, table.model), index("role_embeddings_provider_idx").on(table.provider, table.status)]);

export const projectRecommendations = pgTable("project_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => projectRoles.id, { onDelete: "cascade" }),
  algorithmVersion: integer("algorithm_version").notNull(),
  score: integer("score").notNull(),
  tier: text("tier").notNull(),
  status: text("status").notNull().default("active"),
  componentScores: jsonb("component_scores").$type<Record<string, number>>().notNull(),
  reasons: text("reasons").array().notNull().default(sql`ARRAY[]::text[]`),
  alertedAt: timestamp("alerted_at", { withTimezone: true }),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [uniqueIndex("project_recommendation_unique").on(table.userId, table.roleId, table.algorithmVersion), index("project_recommendations_feed_idx").on(table.userId, table.status, table.score), index("project_recommendations_project_idx").on(table.projectId, table.roleId, table.score)]);

export const recommendationEvents = pgTable("recommendation_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  recommendationId: uuid("recommendation_id").notNull().references(() => projectRecommendations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  signalWeight: integer("signal_weight").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("recommendation_events_rec_idx").on(table.recommendationId, table.createdAt), index("recommendation_events_user_idx").on(table.userId, table.createdAt)]);

export const memberAffinities = pgTable("member_affinities", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dimensionType: text("dimension_type").notNull(),
  dimensionKey: text("dimension_key").notNull(),
  score: integer("score").notNull().default(0),
  evidenceCount: integer("evidence_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.dimensionType, table.dimensionKey] }), index("member_affinities_lookup_idx").on(table.dimensionType, table.dimensionKey)]);

export const recommendationJobs = pgTable("recommendation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  provider: text("provider"),
  status: text("status").notNull().default("queued"),
  processed: integer("processed").notNull().default(0),
  total: integer("total").notNull().default(0),
  error: text("error"),
  requestedBy: uuid("requested_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [index("recommendation_jobs_status_idx").on(table.status, table.createdAt)]);

export const usersRelations = relations(users, ({ many, one }) => ({ ownedProjects: many(projects), memberships: many(projectMembers), privacy: one(privacySettings), notifications: many(notifications), careerHistory: many(careerHistory), educationHistory: many(educationHistory), recommendations: many(projectRecommendations) }));
export const projectsRelations = relations(projects, ({ one, many }) => ({ owner: one(users, { fields: [projects.ownerId], references: [users.id] }), roles: many(projectRoles), members: many(projectMembers), milestones: many(milestones), updates: many(projectUpdates), comments: many(projectComments), blueprints: many(projectBlueprints), recommendations: many(projectRecommendations) }));
