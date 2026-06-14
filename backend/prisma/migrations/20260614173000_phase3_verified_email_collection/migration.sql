-- Drop old indexes before reshaping the professor email model.
DROP INDEX `professor_emails_is_verified_verification_status_idx` ON `professor_emails`;
DROP INDEX `professor_emails_professor_id_email_key` ON `professor_emails`;

-- Expand professor metadata for faculty scraping.
ALTER TABLE `professors`
  ADD COLUMN `faculty_page_url` VARCHAR(1000) NULL,
  ADD COLUMN `last_scraped_at` DATETIME(3) NULL;

-- Add new professor email columns in a backward-compatible order.
ALTER TABLE `professor_emails`
  ADD COLUMN `email_hash` CHAR(64) NULL,
  ADD COLUMN `source_url` VARCHAR(1000) NULL,
  ADD COLUMN `source_domain` VARCHAR(255) NULL,
  ADD COLUMN `source_type` ENUM('faculty_page', 'department_page', 'lab_page', 'directory_page', 'manual') NOT NULL DEFAULT 'manual',
  ADD COLUMN `domain_matched` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `confidence_score` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `verified_by_admin_id` CHAR(36) NULL;

-- Backfill new columns from legacy data before altering constraints.
UPDATE `professor_emails`
SET
  `email_hash` = SHA2(LOWER(`email`), 256),
  `domain_matched` = `domain_match`,
  `source_domain` = SUBSTRING_INDEX(LOWER(`email`), '@', -1);

UPDATE `professor_emails`
SET `verification_status` = 'rejected'
WHERE `verification_status` = 'failed';

-- Finalize new schema shape.
ALTER TABLE `professor_emails`
  DROP COLUMN `domain_match`,
  DROP COLUMN `verified_by`,
  MODIFY `email_hash` CHAR(64) NOT NULL,
  MODIFY `verification_status` ENUM('pending', 'verified', 'rejected', 'manual_review') NOT NULL DEFAULT 'pending';

-- Add reveal logging table.
CREATE TABLE `email_reveal_logs` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `professor_id` CHAR(36) NOT NULL,
  `email_id` CHAR(36) NOT NULL,
  `credits_used` INTEGER NOT NULL DEFAULT 0,
  `revealed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `email_reveal_logs_email_id_idx`(`email_id`),
  INDEX `email_reveal_logs_revealed_at_idx`(`revealed_at`),
  UNIQUE INDEX `email_reveal_logs_user_id_professor_id_key`(`user_id`, `professor_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Recreate indexes aligned to the new verification model.
CREATE UNIQUE INDEX `professor_emails_email_key` ON `professor_emails`(`email`);
CREATE INDEX `professor_emails_verification_status_idx` ON `professor_emails`(`verification_status`);
CREATE INDEX `professor_emails_source_domain_idx` ON `professor_emails`(`source_domain`);

ALTER TABLE `email_reveal_logs`
  ADD CONSTRAINT `email_reveal_logs_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `email_reveal_logs_professor_id_fkey`
    FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `email_reveal_logs_email_id_fkey`
    FOREIGN KEY (`email_id`) REFERENCES `professor_emails`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
