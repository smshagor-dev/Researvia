ALTER TABLE `email_accounts`
  ADD COLUMN `provider` ENUM('SYSTEM', 'GMAIL', 'OUTLOOK', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM' AFTER `type`,
  ADD COLUMN `label` VARCHAR(120) NULL AFTER `provider`,
  ADD COLUMN `smtp_secure` BOOLEAN NOT NULL DEFAULT true AFTER `smtp_port`,
  CHANGE COLUMN `username` `smtp_username` VARCHAR(500) NOT NULL,
  CHANGE COLUMN `encrypted_password` `encrypted_smtp_password` VARCHAR(1000) NOT NULL,
  ADD COLUMN `imap_secure` BOOLEAN NOT NULL DEFAULT true AFTER `imap_port`,
  ADD COLUMN `imap_username` VARCHAR(500) NULL AFTER `imap_secure`,
  ADD COLUMN `encrypted_imap_password` VARCHAR(1000) NULL AFTER `imap_username`,
  ADD COLUMN `is_system_managed` BOOLEAN NOT NULL DEFAULT false AFTER `encrypted_imap_password`,
  ADD COLUMN `is_editable` BOOLEAN NOT NULL DEFAULT true AFTER `is_system_managed`,
  ADD COLUMN `last_tested_at` DATETIME(3) NULL AFTER `last_sync_at`,
  ADD COLUMN `last_test_status` VARCHAR(50) NULL AFTER `last_tested_at`,
  ADD COLUMN `last_test_error` VARCHAR(1000) NULL AFTER `last_test_status`;

UPDATE `email_accounts`
SET
  `provider` = CASE
    WHEN `type` = 'SYSTEM' THEN 'SYSTEM'
    ELSE 'CUSTOM'
  END,
  `label` = `email`,
  `smtp_secure` = CASE WHEN `smtp_port` = 465 THEN true ELSE false END,
  `imap_secure` = CASE
    WHEN `imap_port` IS NULL THEN true
    WHEN `imap_port` = 993 THEN true
    ELSE false
  END,
  `imap_username` = COALESCE(`imap_username`, `smtp_username`),
  `encrypted_imap_password` = COALESCE(`encrypted_imap_password`, `encrypted_smtp_password`),
  `is_system_managed` = CASE WHEN `type` = 'SYSTEM' THEN true ELSE false END,
  `is_editable` = CASE WHEN `type` = 'SYSTEM' THEN false ELSE true END;
