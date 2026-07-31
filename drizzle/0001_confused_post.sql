CREATE TABLE `automation_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`timezone` text DEFAULT 'Asia/Shanghai' NOT NULL,
	`publish_time` text DEFAULT '12:00' NOT NULL,
	`publish_cadence_days` integer DEFAULT 3 NOT NULL,
	`research_time` text DEFAULT '09:00' NOT NULL,
	`daily_research_enabled` integer DEFAULT true NOT NULL,
	`require_approval` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_references` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`research_date` text NOT NULL,
	`source_url` text NOT NULL,
	`title` text NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`saves` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`metrics_note` text DEFAULT '' NOT NULL,
	`metric_confidence` text DEFAULT 'estimated' NOT NULL,
	`copy_analysis` text NOT NULL,
	`cover_analysis` text NOT NULL,
	`audience_insight` text NOT NULL,
	`reusable_pattern` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_references_source_url_unique` ON `research_references` (`source_url`);