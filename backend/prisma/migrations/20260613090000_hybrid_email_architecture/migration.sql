ALTER TABLE `email_threads`
  MODIFY `account_type` ENUM('system', 'custom', 'smtp', 'gmail', 'outlook') NOT NULL;

CREATE TABLE `email_accounts` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `type` ENUM('SYSTEM', 'CUSTOM') NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `smtp_host` VARCHAR(255) NOT NULL,
  `smtp_port` INTEGER NOT NULL,
  `imap_host` VARCHAR(255) NULL,
  `imap_port` INTEGER NULL,
  `username` VARCHAR(500) NOT NULL,
  `encrypted_password` VARCHAR(1000) NOT NULL,
  `mailbox_status` ENUM('pending', 'active', 'failed', 'suspended', 'deleted') NOT NULL DEFAULT 'pending',
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT false,
  `last_sync_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `email_accounts_user_id_email_key`(`user_id`, `email`),
  INDEX `email_accounts_user_id_type_is_active_idx`(`user_id`, `type`, `is_active`),
  INDEX `email_accounts_email_idx`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `email_tracking` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `message_id` CHAR(36) NOT NULL,
  `event_type` ENUM('open', 'click', 'delivery', 'bounce', 'complaint') NOT NULL,
  `url` VARCHAR(1000) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `email_tracking_message_id_event_type_idx`(`message_id`, `event_type`),
  INDEX `email_tracking_created_at_idx`(`created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `mailbox_sync_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `email_account_id` CHAR(36) NOT NULL,
  `status` ENUM('running', 'success', 'failed') NOT NULL,
  `fetched_count` INTEGER NOT NULL DEFAULT 0,
  `new_count` INTEGER NOT NULL DEFAULT 0,
  `error_message` TEXT NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finished_at` DATETIME(3) NULL,

  INDEX `mailbox_sync_logs_email_account_id_started_at_idx`(`email_account_id`, `started_at`),
  INDEX `mailbox_sync_logs_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `email_accounts`
  ADD CONSTRAINT `email_accounts_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `email_tracking`
  ADD CONSTRAINT `email_tracking_message_id_fkey`
  FOREIGN KEY (`message_id`) REFERENCES `email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `mailbox_sync_logs`
  ADD CONSTRAINT `mailbox_sync_logs_email_account_id_fkey`
  FOREIGN KEY (`email_account_id`) REFERENCES `email_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
