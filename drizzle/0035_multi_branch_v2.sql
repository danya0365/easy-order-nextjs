-- 0035 multi-branch v2 (additive only): kiosk device → branch, branch-staff cancel switches (default ON).
ALTER TABLE `shops` ADD `branch_staff_can_cancel` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD `branch_staff_cancel_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `kiosk_sessions` ADD `branch_id` text REFERENCES branches(id);