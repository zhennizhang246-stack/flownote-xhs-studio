import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(),
  location: text("location").notNull().default(""), area: text("area").notNull().default(""),
  projectType: text("project_type").notNull().default(""), audience: text("audience").notNull().default(""),
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
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const researchReferences = sqliteTable("research_references", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
