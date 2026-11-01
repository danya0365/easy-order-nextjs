ALTER TABLE `platform_settings` ADD `menu_options_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `item_detail_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shops` ADD `menu_options_allowed_by_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD `options_json` text;--> statement-breakpoint
CREATE TABLE `menu_option_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`menu_item_id` text NOT NULL,
	`name` text NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`min_select` integer DEFAULT 0 NOT NULL,
	`max_select` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `menu_option_groups_item_idx` ON `menu_option_groups` (`menu_item_id`);--> statement-breakpoint
CREATE TABLE `menu_option_choices` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`price_delta_satang` integer DEFAULT 0 NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `menu_option_groups`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `menu_option_choices_group_idx` ON `menu_option_choices` (`group_id`);
