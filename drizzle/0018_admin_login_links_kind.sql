PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_admin_login_links` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'shop' NOT NULL,
	`shop_id` text,
	`token_hash` text NOT NULL,
	`created_by` text NOT NULL,
	`target_user_id` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`used_by_user_id` text,
	`revoked_at` text,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_admin_login_links`("id", "kind", "shop_id", "token_hash", "created_by", "target_user_id", "created_at", "expires_at", "used_at", "used_by_user_id", "revoked_at") SELECT "id", 'shop', "shop_id", "token_hash", "created_by", "target_user_id", "created_at", "expires_at", "used_at", "used_by_user_id", "revoked_at" FROM `admin_login_links`;--> statement-breakpoint
DROP TABLE `admin_login_links`;--> statement-breakpoint
ALTER TABLE `__new_admin_login_links` RENAME TO `admin_login_links`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `admin_login_links_token_hash_unique` ON `admin_login_links` (`token_hash`);--> statement-breakpoint
CREATE INDEX `all_shop_idx` ON `admin_login_links` (`shop_id`,`expires_at`);
