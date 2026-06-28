CREATE TABLE `shop_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`owner_reply` text,
	`owner_replied_at` text,
	`is_hidden` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shop_reviews_shop_created_idx` ON `shop_reviews` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `shop_reviews_created_id_idx` ON `shop_reviews` (`created_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shop_reviews_shop_customer_unique` ON `shop_reviews` (`shop_id`,`customer_id`);