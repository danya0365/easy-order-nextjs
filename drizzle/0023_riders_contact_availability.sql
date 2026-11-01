ALTER TABLE `riders` ADD `line_id` text;--> statement-breakpoint
ALTER TABLE `riders` ADD `available` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `riders` ADD `available_updated_at` text;
