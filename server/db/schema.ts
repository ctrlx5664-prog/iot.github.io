import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Email verification codes for 2FA
export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  type: text("type").notNull(), // "email_verify", "login_2fa"
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userOrganizations = pgTable("user_organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner, admin, member
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationInvites = pgTable("organization_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  invitedByUserId: uuid("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  invitedEmail: text("invited_email"), // optional: for email-based invites
  inviteCode: text("invite_code").notNull().unique(),
  role: text("role").notNull().default("member"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
});

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
});

export const lights = pgTable("lights", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isOn: boolean("is_on").notNull().default(false),
  brightness: integer("brightness").notNull().default(100),
  color: text("color").notNull().default("#ffffff"),
  status: text("status").notNull().default("online"),
});

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  duration: integer("duration"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tvs = pgTable("tvs", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currentVideoId: uuid("current_video_id").references(() => videos.id, { onDelete: "set null" }),
  isLooping: boolean("is_looping").notNull().default(true),
  status: text("status").notNull().default("online"),
});

// User-Store permissions - controls which stores a user can access
export const userStorePermissions = pgTable("user_store_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  canView: boolean("can_view").notNull().default(true),
  canEdit: boolean("can_edit").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Activity logs - tracks all user actions
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "light_on", "light_off", "schedule_created", "schedule_deleted", etc.
  entityType: text("entity_type").notNull(), // "light", "tv", "schedule", "location", etc.
  entityId: text("entity_id"), // ID of the affected entity
  entityName: text("entity_name"), // Name of the affected entity for display
  details: text("details"), // JSON string with additional details
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Energy usage data (mock for now, will be real data later)
export const energyUsage = pgTable("energy_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationId: uuid("location_id")
    .references(() => locations.id, { onDelete: "cascade" }),
  lightId: uuid("light_id")
    .references(() => lights.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  kwh: integer("kwh").notNull().default(0), // kilowatt-hours * 1000 for precision
  brightness: integer("brightness"), // brightness level at the time
  isOn: boolean("is_on"), // whether light was on
});

// Schedules for lights/devices
export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .references(() => locations.id, { onDelete: "cascade" }),
  lightId: uuid("light_id")
    .references(() => lights.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  action: text("action").notNull(), // "turn_on", "turn_off", "set_brightness"
  actionValue: text("action_value"), // e.g., brightness level
  cronExpression: text("cron_expression"), // for recurring schedules
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }), // for one-time schedules
  isActive: boolean("is_active").notNull().default(true),
  createdById: uuid("created_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


