import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(),
  location: text("location").notNull().default(""), area: text("area").notNull().default(""),
  projectType: text("project_type").notNull().default(""), audience: text("audience").notNull().default(""),
  brief: text("brief").notNull().default(""), status: text("status").notNull().default("uploaded"),
  draftJson: text("draft_json").notNull().default("{}"), scheduledAt: text("scheduled_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export const projectImages = sqliteTable("project_images", {
  id: integer("id").primaryKey({ autoIncrement: true }), projectId: integer("project_id").notNull(),
  objectKey: text("object_key").notNull(), fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull().default("image/jpeg"), sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
