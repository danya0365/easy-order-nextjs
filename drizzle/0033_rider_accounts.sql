-- Rider multi-shop: global rider identity + per-shop membership.
-- Additive only. The backfill is idempotent (deterministic ids 'ra_' || riders.id,
-- guarded by NOT EXISTS / IS NULL) and never merges riders by phone.
CREATE TABLE IF NOT EXISTS `rider_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`phone_key` text,
	`avatar_url` text,
	`available` integer DEFAULT true NOT NULL,
	`available_updated_at` text,
	`session_epoch` integer DEFAULT 0 NOT NULL,
	`merged_into_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `rider_accounts_phone_key_unique` ON `rider_accounts` (`phone_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rider_accounts_phone_idx` ON `rider_accounts` (`phone`);--> statement-breakpoint
ALTER TABLE `riders` ADD `account_id` text REFERENCES rider_accounts(id);--> statement-breakpoint
ALTER TABLE `riders` ADD `status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `rider_availability_mode` text DEFAULT 'global' NOT NULL;--> statement-breakpoint
-- Backfill: exactly one account per existing membership row (no merge by phone).
-- phone_key (canonical "add by phone" target) only when the phone is unique across riders.
INSERT INTO `rider_accounts` (`id`, `name`, `phone`, `phone_key`, `avatar_url`, `available`, `available_updated_at`, `session_epoch`, `merged_into_id`, `created_at`, `updated_at`)
SELECT 'ra_' || r.`id`, r.`name`, r.`phone`,
	CASE WHEN (SELECT count(*) FROM `riders` r2 WHERE r2.`phone` = r.`phone`) = 1
		AND NOT EXISTS (SELECT 1 FROM `rider_accounts` a2 WHERE a2.`phone_key` = r.`phone`)
	THEN r.`phone` ELSE NULL END,
	r.`avatar_url`, r.`available`, r.`available_updated_at`, 0, NULL, r.`created_at`, r.`updated_at`
FROM `riders` r
WHERE r.`account_id` IS NULL
	AND NOT EXISTS (SELECT 1 FROM `rider_accounts` a WHERE a.`id` = 'ra_' || r.`id`);--> statement-breakpoint
UPDATE `riders` SET `account_id` = 'ra_' || `id` WHERE `account_id` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `riders_shop_account_unique` ON `riders` (`shop_id`,`account_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `riders_account_idx` ON `riders` (`account_id`);
