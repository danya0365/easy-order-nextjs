CREATE TABLE `riders` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`commission_type` text DEFAULT 'per_trip' NOT NULL,
	`commission_value` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`access_token_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `riders_shop_idx` ON `riders` (`shop_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `riders_token_hash_unique` ON `riders` (`access_token_hash`);--> statement-breakpoint
ALTER TABLE `orders` ADD `rider_id` text REFERENCES riders(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_status` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `assigned_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `picked_up_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivered_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `cod_collected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `rider_commission_satang` integer;--> statement-breakpoint
CREATE INDEX `orders_shop_rider_idx` ON `orders` (`shop_id`,`rider_id`,`delivery_status`);
