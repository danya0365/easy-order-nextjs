CREATE TABLE `shop_promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`image_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shop_promotions_shop_idx` ON `shop_promotions` (`shop_id`);--> statement-breakpoint
ALTER TABLE `shops` ADD `promotions_allowed_by_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `promotions_enabled` integer DEFAULT false NOT NULL;