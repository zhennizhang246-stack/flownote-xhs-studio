CREATE TABLE `customer_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_name` text DEFAULT '小红书访客' NOT NULL,
	`message` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`suggested_reply` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`replied_at` text
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `category` text DEFAULT '住宅项目' NOT NULL;