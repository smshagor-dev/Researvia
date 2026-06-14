-- AlterTable
ALTER TABLE `saved_scholarships`
    ADD COLUMN `saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `application_status` ENUM('saved', 'applied', 'interview', 'accepted', 'rejected') NOT NULL DEFAULT 'saved';

-- AlterTable
ALTER TABLE `scholarships`
    ADD COLUMN `application_close_date` DATE NULL,
    ADD COLUMN `application_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `application_open_date` DATE NULL,
    ADD COLUMN `application_url` VARCHAR(1000) NULL,
    ADD COLUMN `degree_level` ENUM('bachelor', 'master', 'phd', 'postdoc', 'mixed') NULL,
    ADD COLUMN `duplicate_key` VARCHAR(255) NULL,
    ADD COLUMN `eligibility_criteria` TEXT NULL,
    ADD COLUMN `funding_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `is_fully_funded` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `last_synced_at` DATETIME(3) NULL,
    ADD COLUMN `needs_review` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `official_source_url` VARCHAR(1000) NULL,
    ADD COLUMN `provider_name` VARCHAR(255) NULL,
    ADD COLUMN `provider_type` VARCHAR(100) NULL,
    ADD COLUMN `quality_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `required_documents` JSON NULL,
    ADD COLUMN `research_areas` JSON NULL,
    ADD COLUMN `source_external_id` VARCHAR(255) NULL,
    ADD COLUMN `source_type` ENUM('manual', 'daad', 'erasmus', 'fulbright', 'chevening', 'mext', 'commonwealth', 'university') NOT NULL DEFAULT 'manual',
    ADD COLUMN `status` ENUM('draft', 'active', 'expired', 'closed') NOT NULL DEFAULT 'draft',
    ADD COLUMN `verification_status` ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    MODIFY `fundingType` ENUM('fully_funded', 'partially_funded', 'stipend_only', 'tuition_only', 'other', 'scholarship', 'grant', 'assistantship', 'fellowship', 'internship', 'exchange') NOT NULL;

-- CreateTable
CREATE TABLE `scholarship_sources` (
    `id` CHAR(36) NOT NULL,
    `scholarship_id` CHAR(36) NOT NULL,
    `source_type` ENUM('manual', 'daad', 'erasmus', 'fulbright', 'chevening', 'mext', 'commonwealth', 'university') NOT NULL,
    `source_name` VARCHAR(100) NOT NULL,
    `source_url` VARCHAR(1000) NOT NULL,
    `external_id` VARCHAR(255) NULL,
    `raw_payload_json` JSON NULL,
    `scraped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scholarship_sources_scholarship_id_idx`(`scholarship_id`),
    INDEX `scholarship_sources_source_type_idx`(`source_type`),
    INDEX `scholarship_sources_external_id_idx`(`external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `scholarships_degree_level_idx` ON `scholarships`(`degree_level`);

-- CreateIndex
CREATE INDEX `scholarships_status_idx` ON `scholarships`(`status`);

-- CreateIndex
CREATE INDEX `scholarships_verification_status_idx` ON `scholarships`(`verification_status`);

-- AddForeignKey
ALTER TABLE `scholarship_sources`
    ADD CONSTRAINT `scholarship_sources_scholarship_id_fkey`
    FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
