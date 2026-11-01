ALTER TABLE `platform_settings` ADD `daily_fee_billing_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `daily_order_threshold` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `daily_fee_satang` integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `default_cutoff_time` text DEFAULT '04:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `billing_cutoff_time` text;--> statement-breakpoint
CREATE TABLE `daily_fee_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text,
	`effective_at` text NOT NULL,
	`enabled` integer NOT NULL,
	`threshold` integer NOT NULL,
	`fee_satang` integer NOT NULL,
	`cutoff_time` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `daily_fee_terms_shop_idx` ON `daily_fee_terms` (`shop_id`,`effective_at`);--> statement-breakpoint
CREATE TABLE `daily_fee_charges` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`business_date` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`order_count` integer NOT NULL,
	`enabled` integer NOT NULL,
	`threshold` integer NOT NULL,
	`fee_satang` integer NOT NULL,
	`cutoff_time` text NOT NULL,
	`amount_satang` integer NOT NULL,
	`status` text NOT NULL,
	`paid_at` text,
	`paid_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `daily_fee_charges_shop_date_unique` ON `daily_fee_charges` (`shop_id`,`business_date`);--> statement-breakpoint
CREATE INDEX `daily_fee_charges_shop_end_idx` ON `daily_fee_charges` (`shop_id`,`period_end`);
