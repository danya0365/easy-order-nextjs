ALTER TABLE `orders` ADD `delivery_lat` real;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_lng` real;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_landmark` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `last_delivery_lat` real;--> statement-breakpoint
ALTER TABLE `customers` ADD `last_delivery_lng` real;--> statement-breakpoint
ALTER TABLE `customers` ADD `last_delivery_address` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `last_delivery_landmark` text;
