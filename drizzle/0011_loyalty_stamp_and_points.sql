CREATE TABLE `loyalty_stamp_types` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`threshold` integer DEFAULT 10 NOT NULL,
	`reward_text` text DEFAULT '' NOT NULL,
	`price_satang` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `loyalty_stamp_types_shop_idx` ON `loyalty_stamp_types` (`shop_id`);--> statement-breakpoint
CREATE TABLE `loyalty_stamp_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loyalty_stamp_cards_shop_customer_unique` ON `loyalty_stamp_cards` (`shop_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `loyalty_stamp_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`stamp_type_id` text NOT NULL,
	`current_stamps` integer DEFAULT 0 NOT NULL,
	`lifetime_stamps` integer DEFAULT 0 NOT NULL,
	`rewards_earned` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `loyalty_stamp_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stamp_type_id`) REFERENCES `loyalty_stamp_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loyalty_stamp_balances_card_type_unique` ON `loyalty_stamp_balances` (`card_id`,`stamp_type_id`);--> statement-breakpoint
CREATE TABLE `loyalty_stamp_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`branch_id` text,
	`customer_id` text NOT NULL,
	`card_id` text NOT NULL,
	`stamp_type_id` text,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`performed_by` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `loyalty_stamp_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stamp_type_id`) REFERENCES `loyalty_stamp_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `loyalty_stamp_tx_shop_customer_idx` ON `loyalty_stamp_transactions` (`shop_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `loyalty_stamp_tx_card_idx` ON `loyalty_stamp_transactions` (`card_id`);--> statement-breakpoint
CREATE INDEX `loyalty_stamp_tx_shop_created_idx` ON `loyalty_stamp_transactions` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `loyalty_stamp_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`branch_id` text,
	`customer_id` text NOT NULL,
	`card_id` text NOT NULL,
	`stamp_type_id` text,
	`reward_text_snapshot` text NOT NULL,
	`stamps_spent` integer NOT NULL,
	`performed_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `loyalty_stamp_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stamp_type_id`) REFERENCES `loyalty_stamp_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `loyalty_stamp_redemptions_shop_customer_idx` ON `loyalty_stamp_redemptions` (`shop_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `loyalty_stamp_redemptions_shop_created_idx` ON `loyalty_stamp_redemptions` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `loyalty_points_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`satang_per_point` integer DEFAULT 10000 NOT NULL,
	`min_redeem_points` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loyalty_points_settings_shopId_unique` ON `loyalty_points_settings` (`shop_id`);--> statement-breakpoint
CREATE TABLE `loyalty_points_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`current_points` integer DEFAULT 0 NOT NULL,
	`lifetime_earned` integer DEFAULT 0 NOT NULL,
	`lifetime_redeemed` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `loyalty_points_balances_shop_idx` ON `loyalty_points_balances` (`shop_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `loyalty_points_balances_shop_customer_unique` ON `loyalty_points_balances` (`shop_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `loyalty_points_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`points_cost` integer NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `loyalty_points_rewards_shop_idx` ON `loyalty_points_rewards` (`shop_id`);--> statement-breakpoint
CREATE TABLE `loyalty_points_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`performed_by` text,
	`order_id` text,
	`reward_id` text,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reward_id`) REFERENCES `loyalty_points_rewards`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `loyalty_points_tx_shop_customer_idx` ON `loyalty_points_transactions` (`shop_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `loyalty_points_tx_shop_created_idx` ON `loyalty_points_transactions` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `loyalty_points_tx_order_idx` ON `loyalty_points_transactions` (`order_id`);--> statement-breakpoint
ALTER TABLE `shops` ADD `loyalty_allowed_by_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `loyalty_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `stamp_card_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `spend_points_enabled` integer DEFAULT false NOT NULL;