CREATE TABLE `xhs_workspace_links` (
	`user_email` text PRIMARY KEY NOT NULL,
	`workspace_key` text NOT NULL,
	`profile_url` text NOT NULL,
	`linked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_xhs_workspace_links_workspace` ON `xhs_workspace_links` (`workspace_key`);
