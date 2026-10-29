ALTER TABLE `customers` ADD `online_order_status` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `online_order_requested_at` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `online_order_reviewed_at` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `online_order_reviewed_by` text;--> statement-breakpoint
ALTER TABLE `shops` ADD `member_otp_enabled` integer DEFAULT false NOT NULL;
