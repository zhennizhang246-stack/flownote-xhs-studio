import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(),
  ownerEmail: text("owner_email").notNull().default(""),
  location: text("location").notNull().default(""), area: text("area").notNull().default(""),
  projectType: text("project_type").notNull().default(""), category: text("category").notNull().default("住宅项目"),
  audience: text("audience").notNull().default(""),
  brief: text("brief").notNull().default(""), status: text("status").notNull().default("uploaded"),
  draftJson: text("draft_json").notNull().default("{}"), scheduledAt: text("scheduled_at"),
  approvedAt: text("approved_at"), publishedAt: text("published_at"),
  publishUrl: text("publish_url").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const projectImages = sqliteTable("project_images", {
  id: integer("id").primaryKey({ autoIncrement: true }), projectId: integer("project_id").notNull(),
  objectKey: text("object_key").notNull(), fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull().default("image/jpeg"), sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const automationSettings = sqliteTable("automation_settings", {
  id: integer("id").primaryKey().default(1),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  publishTime: text("publish_time").notNull().default("12:00"),
  publishCadenceDays: integer("publish_cadence_days").notNull().default(3),
  researchTime: text("research_time").notNull().default("09:00"),
  dailyResearchEnabled: integer("daily_research_enabled", { mode: "boolean" }).notNull().default(true),
  requireApproval: integer("require_approval", { mode: "boolean" }).notNull().default(true),
  publishMode: text("publish_mode").notNull().default("manual"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accountAutomationSettings = sqliteTable("account_automation_settings", {
  ownerEmail: text("owner_email").primaryKey(),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  publishTime: text("publish_time").notNull().default("12:00"),
  publishCadenceDays: integer("publish_cadence_days").notNull().default(3),
  researchTime: text("research_time").notNull().default("09:00"),
  dailyResearchEnabled: integer("daily_research_enabled", { mode: "boolean" }).notNull().default(true),
  requireApproval: integer("require_approval", { mode: "boolean" }).notNull().default(true),
  publishMode: text("publish_mode").notNull().default("manual"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accountDevices = sqliteTable("account_devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull(),
  deviceKey: text("device_key").notNull(),
  deviceName: text("device_name").notNull().default("创作电脑"),
  bridgeConnected: integer("bridge_connected", { mode: "boolean" }).notNull().default(false),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_account_devices_owner_key").on(table.ownerEmail, table.deviceKey),
  index("idx_account_devices_owner_seen").on(table.ownerEmail, table.lastSeenAt),
]);

export const researchReferences = sqliteTable("research_references", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull().default(""),
  researchDate: text("research_date").notNull(),
  sourceUrl: text("source_url").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  likes: integer("likes").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  metricsNote: text("metrics_note").notNull().default(""),
  metricConfidence: text("metric_confidence").notNull().default("estimated"),
  copyAnalysis: text("copy_analysis").notNull(),
  coverAnalysis: text("cover_analysis").notNull(),
  audienceInsight: text("audience_insight").notNull(),
  reusablePattern: text("reusable_pattern").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customerMessages = sqliteTable("customer_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerEmail: text("owner_email").notNull().default(""),
  senderName: text("sender_name").notNull().default("小红书访客"),
  message: text("message").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  suggestedReply: text("suggested_reply").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  repliedAt: text("replied_at"),
});
