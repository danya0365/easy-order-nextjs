CREATE TABLE `platform_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`billing_ui_enabled` integer DEFAULT true NOT NULL,
	`order_threshold_billing_enabled` integer DEFAULT false NOT NULL,
	`order_threshold_count` integer DEFAULT 50 NOT NULL,
	`shop_suspension_enabled` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `shops` ADD `online_ordering_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `pickup_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `delivery_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `delivery_fee_satang` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `delivery_notes` text;--> statement-breakpoint
ALTER TABLE `shops` ADD `min_order_satang` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `channel` text DEFAULT 'kiosk' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `fulfillment_type` text DEFAULT 'pickup' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_address` text;--> statement-breakpoint
-- Seed the singleton settings row so `get()` always finds the platform defaults.
INSERT OR IGNORE INTO `platform_settings` (`id`, `billing_ui_enabled`, `order_threshold_billing_enabled`, `order_threshold_count`, `shop_suspension_enabled`, `updated_at`) VALUES ('default', 1, 0, 50, 0, datetime('now'));