CREATE TABLE `student_academic_profiles` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `current_degree_level` ENUM('HIGH_SCHOOL', 'DIPLOMA', 'BACHELOR', 'MASTER', 'PHD', 'GRADUATED') NULL,
  `current_university` VARCHAR(255) NULL,
  `current_department` VARCHAR(255) NULL,
  `target_degree` ENUM('MASTER', 'PHD', 'RESEARCH_INTERNSHIP', 'POSTDOC') NULL,
  `target_intake` VARCHAR(100) NULL,
  `gpa` DECIMAL(4, 2) NULL,
  `grading_scale` VARCHAR(50) NULL,
  `research_summary` TEXT NULL,
  `cv_text` LONGTEXT NULL,
  `publications_count` INTEGER NOT NULL DEFAULT 0,
  `research_experience_years` DECIMAL(4, 1) NULL,
  `preferred_countries_json` JSON NULL,
  `preferred_universities_json` JSON NULL,
  `preferred_funding_types_json` JSON NULL,
  `preferred_research_areas_json` JSON NULL,
  `last_parsed_at` DATETIME(3) NULL,
  `last_confirmed_at` DATETIME(3) NULL,
  `parse_status` ENUM('pending', 'parsed', 'failed', 'confirmed') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `student_academic_profiles_user_id_key`(`user_id`),
  INDEX `student_academic_profiles_target_degree_idx`(`target_degree`),
  INDEX `student_academic_profiles_updated_at_idx`(`updated_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `match_scores` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `target_type` ENUM('professor', 'scholarship') NOT NULL,
  `target_id` CHAR(36) NOT NULL,
  `score` INTEGER NOT NULL,
  `score_band` VARCHAR(50) NULL,
  `breakdown_json` JSON NULL,
  `strengths_json` JSON NULL,
  `weaknesses_json` JSON NULL,
  `recommendations_json` JSON NULL,
  `explanation` TEXT NULL,
  `ai_summary` TEXT NULL,
  `provider` ENUM('deterministic', 'openai', 'anthropic', 'gemini', 'deepseek') NOT NULL DEFAULT 'deterministic',
  `model_name` VARCHAR(120) NULL,
  `version` VARCHAR(50) NULL,
  `calculated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `profile_snapshot_hash` VARCHAR(64) NULL,
  `target_snapshot_hash` VARCHAR(64) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `match_scores_user_id_target_type_target_id_key`(`user_id`, `target_type`, `target_id`),
  INDEX `match_scores_user_id_target_type_calculated_at_idx`(`user_id`, `target_type`, `calculated_at`),
  INDEX `match_scores_target_type_target_id_idx`(`target_type`, `target_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cv_parse_logs` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `status` ENUM('pending', 'parsed', 'failed', 'confirmed') NOT NULL DEFAULT 'pending',
  `provider` ENUM('deterministic', 'openai', 'anthropic', 'gemini', 'deepseek') NOT NULL DEFAULT 'deterministic',
  `source_file_name` VARCHAR(255) NULL,
  `raw_text` LONGTEXT NULL,
  `extracted_json` JSON NULL,
  `error_message` TEXT NULL,
  `confirmed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `cv_parse_logs_user_id_created_at_idx`(`user_id`, `created_at`),
  INDEX `cv_parse_logs_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `student_academic_profiles`
  ADD CONSTRAINT `student_academic_profiles_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `match_scores`
  ADD CONSTRAINT `match_scores_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cv_parse_logs`
  ADD CONSTRAINT `cv_parse_logs_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
