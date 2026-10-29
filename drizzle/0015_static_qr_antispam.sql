ALTER TABLE `shops` ADD `static_join_token` text;--> statement-breakpoint
ALTER TABLE `shops` ADD `static_join_token_rotated_at` text;--> statement-breakpoint
ALTER TABLE `shops` ADD `member_signup_paused` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `shops` SET `static_join_token` = lower(hex(randomblob(24))) WHERE `static_join_token` IS NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `online_order_rejected_at` text;--> statement-breakpoint
UPDATE `customers` SET `online_order_rejected_at` = `online_order_reviewed_at` WHERE `online_order_status` = 'rejected';--> statement-breakpoint
CREATE TABLE `member_signup_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text,
	`ip_hash` text,
	`device_id` text,
	`phone` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `msa_shop_created_idx` ON `member_signup_attempts` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `msa_shop_ip_idx` ON `member_signup_attempts` (`shop_id`,`ip_hash`);--> statement-breakpoint
CREATE INDEX `msa_shop_device_idx` ON `member_signup_attempts` (`shop_id`,`device_id`);--> statement-breakpoint
CREATE TABLE `shop_blocked_phones` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`phone` text NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shop_blocked_phones_shop_phone_unique` ON `shop_blocked_phones` (`shop_id`,`phone`);
