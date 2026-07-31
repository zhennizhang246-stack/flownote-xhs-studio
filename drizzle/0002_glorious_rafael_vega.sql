ALTER TABLE `projects` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `published_at` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `publish_url` text DEFAULT '' NOT NULL;