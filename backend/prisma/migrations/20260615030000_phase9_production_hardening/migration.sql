-- AlterTable
ALTER TABLE `billing_invoices` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `coupons` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `credit_transactions` MODIFY `type` ENUM('subscription_grant', 'purchase', 'ai_generation', 'professor_reveal', 'email_send', 'scholarship_unlock', 'opportunity_unlock', 'referral', 'admin_adjustment', 'refund', 'bonus') NOT NULL;

-- AlterTable
ALTER TABLE `cv_parse_logs` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `interviews` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `match_scores` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `opportunities` MODIFY `title` VARCHAR(500) NOT NULL,
    MODIFY `slug` VARCHAR(600) NOT NULL,
    MODIFY `currency` CHAR(3) NULL,
    MODIFY `description` LONGTEXT NOT NULL,
    MODIFY `requirements` LONGTEXT NULL,
    MODIFY `deadline` DATE NULL,
    ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `professor_research_areas` MODIFY `source` ENUM('openalex', 'orcid', 'crossref', 'ror', 'manual', 'import') NOT NULL DEFAULT 'openalex';

-- AlterTable
ALTER TABLE `saved_scholarships` MODIFY `application_status` ENUM('saved', 'planning', 'applied', 'under_review', 'interview', 'offer_received', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'saved';

-- AlterTable
ALTER TABLE `student_academic_profiles` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `teams` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `usage_metrics` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `locked_until` DATETIME(3) NULL,
    ADD COLUMN `password_changed_at` DATETIME(3) NULL,
    ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `worker_heartbeats` ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateTable
CREATE TABLE `active_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `refresh_token_hash` VARCHAR(255) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoke_reason` VARCHAR(255) NULL,
    `rotation_counter` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `active_sessions_user_id_revoked_at_idx`(`user_id`, `revoked_at`),
    INDEX `active_sessions_expires_at_idx`(`expires_at`),
    INDEX `active_sessions_last_activity_at_idx`(`last_activity_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ip_reputations` (
    `id` CHAR(36) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `reputation_score` INTEGER NOT NULL DEFAULT 0,
    `failed_attempts` INTEGER NOT NULL DEFAULT 0,
    `successful_attempts` INTEGER NOT NULL DEFAULT 0,
    `suspicious_events` INTEGER NOT NULL DEFAULT 0,
    `blocked_until` DATETIME(3) NULL,
    `last_user_agent` VARCHAR(500) NULL,
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ip_reputations_ip_address_key`(`ip_address`),
    INDEX `ip_reputations_blocked_until_idx`(`blocked_until`),
    INDEX `ip_reputations_reputation_score_idx`(`reputation_score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_jobs` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('database', 'storage', 'configuration', 'full_snapshot') NOT NULL,
    `status` ENUM('pending', 'running', 'completed', 'failed', 'restoring', 'restored') NOT NULL DEFAULT 'pending',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `location` VARCHAR(1000) NULL,
    `size` BIGINT NULL,
    `checksum` VARCHAR(255) NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `backup_jobs_type_started_at_idx`(`type`, `started_at`),
    INDEX `backup_jobs_status_started_at_idx`(`status`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `active_sessions` ADD CONSTRAINT `active_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `scholarships` RENAME INDEX `scholarships_university_id_fkey` TO `scholarships_university_id_idx`;
