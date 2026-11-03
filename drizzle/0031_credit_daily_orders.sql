ALTER TABLE `credit_daily_settlements` ADD `metric` text DEFAULT 'sales' NOT NULL;
--> statement-breakpoint
ALTER TABLE `credit_daily_settlements` ADD `threshold_orders` integer DEFAULT 0 NOT NULL;
