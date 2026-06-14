ALTER TABLE `professors`
    MODIFY `data_source` ENUM('openalex', 'orcid', 'crossref', 'ror', 'manual', 'import') NOT NULL,
    MODIFY `source_type` ENUM('openalex', 'orcid', 'crossref', 'ror', 'manual', 'import') NOT NULL DEFAULT 'manual',
    MODIFY `is_public` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `professor_sources` (
    `id` CHAR(36) NOT NULL,
    `professor_id` CHAR(36) NOT NULL,
    `source_type` ENUM('openalex', 'orcid', 'crossref', 'ror', 'manual', 'import') NOT NULL,
    `source_name` VARCHAR(100) NOT NULL,
    `external_id` VARCHAR(120) NULL,
    `source_url` VARCHAR(750) NULL,
    `raw_payload_json` JSON NULL,
    `scraped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `professor_sources_professor_id_idx`(`professor_id`),
    INDEX `professor_sources_source_type_idx`(`source_type`),
    INDEX `professor_sources_external_id_idx`(`external_id`),
    INDEX `professor_sources_source_url_idx`(`source_url`),
    UNIQUE INDEX `professor_sources_professor_id_source_type_external_id_key`(`professor_id`, `source_type`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sync_logs` (
    `id` CHAR(36) NOT NULL,
    `job_id` VARCHAR(100) NULL,
    `queue_name` VARCHAR(100) NOT NULL,
    `job_name` VARCHAR(100) NOT NULL,
    `status` ENUM('queued', 'running', 'completed', 'failed', 'partial') NOT NULL,
    `source_type` ENUM('openalex', 'orcid', 'crossref', 'ror', 'manual', 'import') NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `error_message` TEXT NULL,
    `processed_count` INTEGER NOT NULL DEFAULT 0,
    `created_count` INTEGER NOT NULL DEFAULT 0,
    `updated_count` INTEGER NOT NULL DEFAULT 0,
    `skipped_count` INTEGER NOT NULL DEFAULT 0,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sync_logs_job_id_idx`(`job_id`),
    INDEX `sync_logs_queue_name_status_idx`(`queue_name`, `status`),
    INDEX `sync_logs_source_type_idx`(`source_type`),
    INDEX `sync_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `professor_sources`
    ADD CONSTRAINT `professor_sources_professor_id_fkey`
    FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
