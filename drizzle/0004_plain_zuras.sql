CREATE TABLE `shop_images` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`kind` text NOT NULL,
	`storage_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shop_images_shop_idx` ON `shop_images` (`shop_id`);