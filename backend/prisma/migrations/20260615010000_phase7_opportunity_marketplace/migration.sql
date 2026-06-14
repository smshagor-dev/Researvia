CREATE TABLE `opportunities` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `type` ENUM(
    'phd_position',
    'research_assistant',
    'teaching_assistant',
    'research_internship',
    'lab_position',
    'research_grant',
    'fellowship',
    'postdoc',
    'exchange_program'
  ) NOT NULL,
  `country_id` CHAR(36) NULL,
  `university_id` CHAR(36) NULL,
  `department_id` CHAR(36) NULL,
  `professor_id` CHAR(36) NULL,
  `funding_amount` DECIMAL(12, 2) NULL,
  `currency` VARCHAR(10) NULL,
  `is_fully_funded` BOOLEAN NOT NULL DEFAULT false,
  `description` LONGTEXT NOT NULL,
  `requirements` TEXT NULL,
  `deadline` DATETIME(3) NULL,
  `official_url` VARCHAR(1000) NULL,
  `source_url` VARCHAR(1000) NULL,
  `verification_status` ENUM('pending', 'verified', 'rejected', 'manual_review') NOT NULL DEFAULT 'pending',
  `status` ENUM('draft', 'active', 'expired', 'closed', 'archived') NOT NULL DEFAULT 'draft',
  `quality_score` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `opportunities_slug_key`(`slug`),
  INDEX `opportunities_type_idx`(`type`),
  INDEX `opportunities_country_id_idx`(`country_id`),
  INDEX `opportunities_university_id_idx`(`university_id`),
  INDEX `opportunities_department_id_idx`(`department_id`),
  INDEX `opportunities_professor_id_idx`(`professor_id`),
  INDEX `opportunities_deadline_idx`(`deadline`),
  INDEX `opportunities_status_verification_status_idx`(`status`, `verification_status`),
  INDEX `opportunities_quality_score_idx`(`quality_score`),
  FULLTEXT INDEX `opportunities_title_idx`(`title`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `applications` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `opportunity_id` CHAR(36) NOT NULL,
  `status` ENUM(
    'saved',
    'planning',
    'applied',
    'under_review',
    'interview',
    'offer_received',
    'accepted',
    'rejected',
    'withdrawn'
  ) NOT NULL DEFAULT 'saved',
  `submitted_at` DATETIME(3) NULL,
  `last_updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `applications_user_id_opportunity_id_key`(`user_id`, `opportunity_id`),
  INDEX `applications_user_id_status_idx`(`user_id`, `status`),
  INDEX `applications_opportunity_id_idx`(`opportunity_id`),
  INDEX `applications_submitted_at_idx`(`submitted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `interviews` (
  `id` CHAR(36) NOT NULL,
  `application_id` CHAR(36) NOT NULL,
  `scheduled_at` DATETIME(3) NOT NULL,
  `timezone` VARCHAR(100) NOT NULL,
  `meeting_link` VARCHAR(1000) NULL,
  `notes` TEXT NULL,
  `status` ENUM('scheduled', 'completed', 'cancelled', 'rescheduled') NOT NULL DEFAULT 'scheduled',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `interviews_application_id_idx`(`application_id`),
  INDEX `interviews_scheduled_at_status_idx`(`scheduled_at`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `opportunities`
  ADD CONSTRAINT `opportunities_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `opportunities_university_id_fkey` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `opportunities_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `opportunities_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `applications`
  ADD CONSTRAINT `applications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `applications_opportunity_id_fkey` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `interviews`
  ADD CONSTRAINT `interviews_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
