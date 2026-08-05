CREATE TABLE `account_devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
	`device_key` text NOT NULL,
	`device_name` text DEFAULT '创作电脑' NOT NULL,
	`bridge_connected` integer DEFAULT false NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_account_devices_owner_key` ON `account_devices` (`owner_email`,`device_key`);
--> statement-breakpoint
CREATE INDEX `idx_account_devices_owner_seen` ON `account_devices` (`owner_email`,`last_seen_at`);
