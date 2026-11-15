-- 0034 multi-branch (additive). Backfill is idempotent: only rows with branch_id NULL,
-- each set to the shop's main branch (oldest branch, tie-break by id). Shops with no
-- branch keep NULL (code treats NULL as the main branch). Safe to re-run the UPDATE.
CREATE TABLE IF NOT EXISTS `branch_menu_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`menu_item_id` text NOT NULL,
	`sold_out` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `branch_menu_overrides_branch_item_unique` ON `branch_menu_overrides` (`branch_id`,`menu_item_id`);--> statement-breakpoint
ALTER TABLE `branches` ADD `accepting_orders` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `branch_staff_queue_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `branch_id` text REFERENCES branches(id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `orders_shop_branch_created_idx` ON `orders` (`shop_id`,`branch_id`,`created_at`);--> statement-breakpoint
UPDATE `orders` SET `branch_id` = (
	SELECT `b`.`id` FROM `branches` `b` WHERE `b`.`shop_id` = `orders`.`shop_id` ORDER BY `b`.`created_at`, `b`.`id` LIMIT 1
) WHERE `branch_id` IS NULL;
