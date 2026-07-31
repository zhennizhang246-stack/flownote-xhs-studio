CREATE TABLE `account_automation_settings` (
	`owner_email` text PRIMARY KEY NOT NULL,
	`timezone` text DEFAULT 'Asia/Shanghai' NOT NULL,
	`publish_time` text DEFAULT '12:00' NOT NULL,
	`publish_cadence_days` integer DEFAULT 3 NOT NULL,
	`research_time` text DEFAULT '09:00' NOT NULL,
	`daily_research_enabled` integer DEFAULT true NOT NULL,
	`require_approval` integer DEFAULT true NOT NULL,
	`publish_mode` text DEFAULT 'manual' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `customer_messages` ADD `owner_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `owner_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `research_references` ADD `owner_email` text DEFAULT '' NOT NULL;