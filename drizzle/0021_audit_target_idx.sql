CREATE INDEX IF NOT EXISTS `audit_target_idx` ON `audit_logs` (`target_type`,`target_id`,`created_at`);
