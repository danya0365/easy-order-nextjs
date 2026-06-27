CREATE TABLE `shop_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shop_categories_slug_unique` ON `shop_categories` (`slug`);--> statement-breakpoint
ALTER TABLE `shops` ADD `category_id` text REFERENCES shop_categories(id);--> statement-breakpoint
CREATE INDEX `shops_category_idx` ON `shops` (`category_id`);