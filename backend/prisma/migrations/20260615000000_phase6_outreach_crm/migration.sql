ALTER TABLE `email_threads`
  ADD COLUMN `current_stage` ENUM('saved','planned','contacted','followup1','followup2','followup3','replied','meeting','accepted','rejected') NOT NULL DEFAULT 'saved',
  ADD COLUMN `reply_received` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `open_count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `sent_count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `last_followup_at` DATETIME(3) NULL,
  ADD COLUMN `paused_at` DATETIME(3) NULL,
  ADD COLUMN `followup_sequence_id` CHAR(36) NULL,
  MODIFY `status` ENUM('draft','active','scheduled','sent','replied','accepted','rejected','archived','bounced','unsubscribed') NOT NULL DEFAULT 'draft';

ALTER TABLE `email_messages`
  ADD COLUMN `body` LONGTEXT NULL,
  ADD COLUMN `provider` VARCHAR(50) NULL,
  ADD COLUMN `tracking_token` VARCHAR(100) NULL,
  ADD COLUMN `provider_message_id` VARCHAR(500) NULL,
  MODIFY `status` ENUM('draft','scheduled','queued','sending','sent','delivered','opened','clicked','replied','bounced','failed') NOT NULL DEFAULT 'draft';

ALTER TABLE `email_tracking`
  MODIFY `event_type` ENUM('open','click','delivered','delivery','replied','bounce','complaint') NOT NULL;

CREATE TABLE `followup_sequences` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `followup_sequences_user_id_name_key` (`user_id`, `name`),
  INDEX `followup_sequences_user_id_enabled_idx` (`user_id`, `enabled`),
  CONSTRAINT `followup_sequences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `followup_steps` (
  `id` CHAR(36) NOT NULL,
  `sequence_id` CHAR(36) NOT NULL,
  `stage` ENUM('saved','planned','contacted','followup1','followup2','followup3','replied','meeting','accepted','rejected') NOT NULL,
  `day_offset` INTEGER NOT NULL,
  `template` TEXT NOT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `followup_steps_sequence_id_stage_key` (`sequence_id`, `stage`),
  INDEX `followup_steps_sequence_id_day_offset_idx` (`sequence_id`, `day_offset`),
  CONSTRAINT `followup_steps_sequence_id_fkey` FOREIGN KEY (`sequence_id`) REFERENCES `followup_sequences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `outreach_daily_counters` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `professor_id` CHAR(36) NULL,
  `send_date` DATE NOT NULL,
  `sent_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `outreach_daily_counters_user_id_send_date_key` (`user_id`, `send_date`),
  INDEX `outreach_daily_counters_send_date_idx` (`send_date`),
  INDEX `outreach_daily_counters_professor_id_idx` (`professor_id`),
  CONSTRAINT `outreach_daily_counters_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `email_threads_user_id_professor_id_key` ON `email_threads`(`user_id`, `professor_id`);
CREATE INDEX `email_threads_current_stage_idx` ON `email_threads`(`current_stage`);
CREATE INDEX `email_messages_tracking_token_idx` ON `email_messages`(`tracking_token`);
CREATE UNIQUE INDEX `email_messages_tracking_token_key` ON `email_messages`(`tracking_token`);

ALTER TABLE `email_threads`
  ADD CONSTRAINT `email_threads_followup_sequence_id_fkey` FOREIGN KEY (`followup_sequence_id`) REFERENCES `followup_sequences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
