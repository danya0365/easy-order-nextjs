CREATE TABLE `shop_profiles` (
	`shop_id` text PRIMARY KEY NOT NULL,
	`description` text,
	`opening_hours` text,
	`phone` text,
	`line_url` text,
	`facebook_url` text,
	`instagram_url` text,
	`website_url` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
