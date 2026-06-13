-- CreateTable
CREATE TABLE `student_profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `preferred_name` VARCHAR(255) NULL,
    `profile_photo_url` VARCHAR(500) NULL,
    `gender` VARCHAR(50) NULL,
    `date_of_birth` DATE NULL,
    `nationality` VARCHAR(100) NOT NULL,
    `current_country` VARCHAR(100) NOT NULL,
    `city` VARCHAR(120) NULL,
    `phone` VARCHAR(50) NULL,
    `whatsapp` VARCHAR(50) NULL,
    `linkedin` VARCHAR(500) NULL,
    `github` VARCHAR(500) NULL,
    `website` VARCHAR(500) NULL,
    `short_bio` TEXT NULL,
    `career_goal` TEXT NULL,
    `why_interested_in_research` TEXT NULL,
    `profile_completeness` INTEGER NOT NULL DEFAULT 0,
    `onboarding_completed` BOOLEAN NOT NULL DEFAULT false,
    `onboarding_step` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_profiles_user_id_key`(`user_id`),
    INDEX `student_profiles_nationality_idx`(`nationality`),
    INDEX `student_profiles_current_country_idx`(`current_country`),
    INDEX `student_profiles_onboarding_completed_idx`(`onboarding_completed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_educations` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `degree_level` ENUM('HIGH_SCHOOL', 'DIPLOMA', 'BACHELOR', 'MASTER', 'PHD', 'GRADUATED') NOT NULL,
    `university` VARCHAR(255) NOT NULL,
    `department` VARCHAR(255) NOT NULL,
    `major_subject` VARCHAR(255) NOT NULL,
    `faculty` VARCHAR(255) NULL,
    `current_year` VARCHAR(50) NULL,
    `expected_graduation_year` INTEGER NOT NULL,
    `cgpa` DECIMAL(4, 2) NULL,
    `grading_scale` VARCHAR(50) NULL,
    `thesis_title` VARCHAR(500) NULL,
    `supervisor_name` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_educations_student_profile_id_key`(`student_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_research_interests` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `primary_area` VARCHAR(255) NOT NULL,
    `secondary_areas` JSON NULL,
    `keywords` JSON NULL,
    `preferred_topics` JSON NULL,
    `interested_degree` ENUM('MASTER', 'PHD', 'RESEARCH_INTERNSHIP', 'POSTDOC') NOT NULL,
    `preferred_countries` JSON NOT NULL,
    `preferred_universities` JSON NULL,
    `preferred_intake` VARCHAR(100) NULL,
    `funding_need` ENUM('FULLY_FUNDED', 'PARTIAL_FUNDED', 'SELF_FUNDED', 'ANY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_research_interests_student_profile_id_key`(`student_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_skills` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `category` ENUM('PROGRAMMING_LANGUAGE', 'FRAMEWORK', 'TOOL', 'LABORATORY', 'RESEARCH', 'LANGUAGE', 'OTHER') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `level` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `student_skills_student_profile_id_category_idx`(`student_profile_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_experiences` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `type` ENUM('WORK', 'RESEARCH', 'PUBLICATION', 'PROJECT', 'INTERNSHIP', 'ACHIEVEMENT', 'CERTIFICATION') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `organization` VARCHAR(255) NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `student_experiences_student_profile_id_type_idx`(`student_profile_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_projects` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `technologies` JSON NULL,
    `link` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `student_projects_student_profile_id_idx`(`student_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_publications` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `journal_or_conference` VARCHAR(255) NULL,
    `year` INTEGER NULL,
    `doi` VARCHAR(255) NULL,
    `url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `student_publications_student_profile_id_idx`(`student_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_documents` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `type` ENUM('CV', 'TRANSCRIPT', 'PASSPORT', 'SOP', 'RESEARCH_PROPOSAL', 'RECOMMENDATION_LETTER', 'CERTIFICATE', 'OTHER') NOT NULL,
    `file_key` VARCHAR(1000) NOT NULL,
    `original_name` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `status` ENUM('uploaded', 'verified', 'rejected') NOT NULL DEFAULT 'uploaded',
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `student_documents_student_profile_id_type_idx`(`student_profile_id`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_test_scores` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `test_type` ENUM('IELTS', 'TOEFL', 'DUOLINGO', 'NONE') NOT NULL,
    `score` DECIMAL(5, 2) NULL,
    `test_date` DATE NULL,
    `expiry_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `student_test_scores_student_profile_id_test_type_idx`(`student_profile_id`, `test_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_preferences` (
    `id` CHAR(36) NOT NULL,
    `student_profile_id` CHAR(36) NOT NULL,
    `preferred_email_tone` ENUM('PROFESSIONAL', 'FRIENDLY', 'FORMAL') NULL,
    `email_signature` TEXT NULL,
    `default_sending_email_account_id` CHAR(36) NULL,
    `target_degree` ENUM('MASTER', 'PHD', 'RESEARCH_INTERNSHIP', 'POSTDOC') NULL,
    `target_countries` JSON NULL,
    `target_intake` VARCHAR(100) NULL,
    `budget_range` VARCHAR(100) NULL,
    `english_test` ENUM('IELTS', 'TOEFL', 'DUOLINGO', 'NONE') NULL,
    `english_score` DECIMAL(5, 2) NULL,
    `gre_score` DECIMAL(6, 2) NULL,
    `gmat_score` DECIMAL(6, 2) NULL,
    `publication_count` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_preferences_student_profile_id_key`(`student_profile_id`),
    INDEX `student_preferences_default_sending_email_account_id_idx`(`default_sending_email_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_profiles` ADD CONSTRAINT `student_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_educations` ADD CONSTRAINT `student_educations_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_research_interests` ADD CONSTRAINT `student_research_interests_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_skills` ADD CONSTRAINT `student_skills_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_experiences` ADD CONSTRAINT `student_experiences_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_projects` ADD CONSTRAINT `student_projects_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_publications` ADD CONSTRAINT `student_publications_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_documents` ADD CONSTRAINT `student_documents_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_test_scores` ADD CONSTRAINT `student_test_scores_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_preferences` ADD CONSTRAINT `student_preferences_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_preferences` ADD CONSTRAINT `student_preferences_default_sending_email_account_id_fkey` FOREIGN KEY (`default_sending_email_account_id`) REFERENCES `email_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
