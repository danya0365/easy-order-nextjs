CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`phone` text NOT NULL,
	`display_name` text,
	`public_code` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_publicCode_unique` ON `customers` (`public_code`);--> statement-breakpoint
CREATE INDEX `customers_shop_idx` ON `customers` (`shop_id`);--> statement-breakpoint
CREATE INDEX `customers_shop_created_idx` ON `customers` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_shop_phone_unique` ON `customers` (`shop_id`,`phone`);--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_id` text REFERENCES customers(id);--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_name` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_phone` text;