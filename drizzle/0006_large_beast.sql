CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text,
	`address` text,
	`phone` text,
	`latitude` real,
	`longitude` real,
	`photo_url` text,
	`status` text DEFAULT 'new' NOT NULL,
	`lost_reason` text,
	`next_follow_up_at` text,
	`follow_up_notified_at` text,
	`notes` text,
	`converted_shop_id` text,
	`converted_at` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `shop_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`converted_shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leads_status_created_idx` ON `leads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_followup_idx` ON `leads` (`next_follow_up_at`);--> statement-breakpoint
CREATE INDEX `leads_created_id_idx` ON `leads` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `lead_visit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`reaction` text NOT NULL,
	`status_before` text,
	`status_after` text,
	`note` text,
	`performed_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_visit_logs_lead_created_idx` ON `lead_visit_logs` (`lead_id`,`created_at`);