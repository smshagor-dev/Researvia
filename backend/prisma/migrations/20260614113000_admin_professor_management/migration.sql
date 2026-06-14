ALTER TABLE `professors`
  ADD COLUMN `verification_status` ENUM('pending', 'verified', 'failed', 'manual_review') NOT NULL DEFAULT 'pending',
  ADD COLUMN `is_public` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `source_type` ENUM('openalex', 'orcid', 'crossref', 'manual', 'import') NOT NULL DEFAULT 'manual',
  ADD COLUMN `last_synced_at` DATETIME(3) NULL,
  ADD COLUMN `last_verified_at` DATETIME(3) NULL,
  ADD COLUMN `data_quality_score` INTEGER NULL;

UPDATE `professors`
SET `source_type` = `data_source`
WHERE `source_type` = 'manual' AND `data_source` IS NOT NULL;

CREATE INDEX `professors_verification_status_idx` ON `professors`(`verification_status`);
CREATE INDEX `professors_is_public_idx` ON `professors`(`is_public`);
CREATE INDEX `professors_source_type_idx` ON `professors`(`source_type`);
