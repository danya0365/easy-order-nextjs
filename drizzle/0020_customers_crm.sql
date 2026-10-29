ALTER TABLE `customers` ADD `note` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `blocked_at` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `blocked_by` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `new_member_cleared_at` text;--> statement-breakpoint
CREATE INDEX `orders_shop_customer_idx` ON `orders` (`shop_id`,`customer_id`,`created_at`);
