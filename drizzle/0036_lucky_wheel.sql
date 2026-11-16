-- 0036 lucky wheel phase 1 (additive only): spin campaigns/prizes/tickets/results + platform switch.
CREATE TABLE `spin_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text DEFAULT 'หมุนวงล้อลุ้นรางวัล' NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`min_order_satang` integer DEFAULT 0 NOT NULL,
	`tickets_per_order` integer DEFAULT 1 NOT NULL,
	`monthly_free_enabled` integer DEFAULT false NOT NULL,
	`monthly_window_days` integer DEFAULT 3 NOT NULL,
	`reward_expiry_days` integer DEFAULT 30 NOT NULL,
	`rules_text` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spin_campaigns_shop_unique` ON `spin_campaigns` (`shop_id`);--> statement-breakpoint
CREATE TABLE `spin_prizes` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`stock` integer,
	`daily_cap` integer,
	`points_amount` integer,
	`menu_item_id` text,
	`cost_satang` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `spin_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `spin_prizes_shop_idx` ON `spin_prizes` (`shop_id`);--> statement-breakpoint
CREATE TABLE `spin_results` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`ticket_id` text NOT NULL,
	`prize_id` text,
	`prize_type` text NOT NULL,
	`prize_name` text NOT NULL,
	`points_awarded` integer DEFAULT 0 NOT NULL,
	`cost_satang` integer DEFAULT 0 NOT NULL,
	`day_key` text NOT NULL,
	`reward_code` text,
	`reward_status` text DEFAULT 'none' NOT NULL,
	`expires_at` text,
	`redeemed_at` text,
	`redeemed_by` text,
	`redeemed_branch_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_id`) REFERENCES `spin_tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prize_id`) REFERENCES `spin_prizes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`redeemed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`redeemed_branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `spin_results_shop_created_idx` ON `spin_results` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `spin_results_customer_idx` ON `spin_results` (`shop_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `spin_results_prize_day_idx` ON `spin_results` (`prize_id`,`day_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `spin_results_ticket_unique` ON `spin_results` (`ticket_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `spin_results_code_unique` ON `spin_results` (`reward_code`);--> statement-breakpoint
CREATE TABLE `spin_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`source` text NOT NULL,
	`source_key` text NOT NULL,
	`order_id` text,
	`status` text DEFAULT 'available' NOT NULL,
	`expires_at` text,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `spin_tickets_customer_idx` ON `spin_tickets` (`shop_id`,`customer_id`,`status`);--> statement-breakpoint
CREATE INDEX `spin_tickets_order_idx` ON `spin_tickets` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `spin_tickets_shop_source_unique` ON `spin_tickets` (`shop_id`,`source_key`);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `lucky_wheel_enabled` integer DEFAULT true NOT NULL;