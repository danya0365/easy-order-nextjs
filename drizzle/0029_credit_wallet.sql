CREATE TABLE `credit_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text,
	`config` text NOT NULL,
	`updated_by` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `credit_wallets` (
	`shop_id` text PRIMARY KEY NOT NULL,
	`balance_satang` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_satang` integer NOT NULL,
	`balance_after_satang` integer NOT NULL,
	`reason` text,
	`actor_user_id` text,
	`order_id` text,
	`topup_id` text,
	`idempotency_key` text,
	`meta` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `credit_ledger_idem_unique` ON `credit_ledger` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `credit_ledger_shop_created_idx` ON `credit_ledger` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_ledger_order_idx` ON `credit_ledger` (`order_id`);--> statement-breakpoint
CREATE TABLE `credit_topups` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`package_id` text,
	`amount_satang` integer NOT NULL,
	`bonus_satang` integer DEFAULT 0 NOT NULL,
	`slip_url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`submitted_by` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`reject_reason` text,
	`verify_meta` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `credit_topups_shop_created_idx` ON `credit_topups` (`shop_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_topups_status_created_idx` ON `credit_topups` (`status`,`created_at`);
