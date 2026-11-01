CREATE TABLE `demo_data_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`kind` text NOT NULL,
	`row_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `demo_data_rows_shop_idx` ON `demo_data_rows` (`shop_id`,`kind`);
