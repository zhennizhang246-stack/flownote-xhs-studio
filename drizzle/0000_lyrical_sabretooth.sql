CREATE TABLE `project_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text DEFAULT 'image/jpeg' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`area` text DEFAULT '' NOT NULL,
	`project_type` text DEFAULT '' NOT NULL,
	`audience` text DEFAULT '' NOT NULL,
	`brief` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`draft_json` text DEFAULT '{}' NOT NULL,
	`scheduled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
