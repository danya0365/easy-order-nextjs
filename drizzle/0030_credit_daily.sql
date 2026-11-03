CREATE TABLE `credit_daily_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`business_date` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`cutoff_time` text NOT NULL,
	`sales_satang` integer NOT NULL,
	`order_count` integer NOT NULL,
	`threshold_satang` integer NOT NULL,
	`fee_satang` integer NOT NULL,
	`charged_satang` integer NOT NULL,
	`ledger_entry_id` text,
	`settled_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_daily_shop_date_unique` ON `credit_daily_settlements` (`shop_id`,`business_date`);
--> statement-breakpoint
CREATE INDEX `credit_daily_date_idx` ON `credit_daily_settlements` (`business_date`);
