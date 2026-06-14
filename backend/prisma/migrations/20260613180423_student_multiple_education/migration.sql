-- AlterTable
ALTER TABLE `student_educations` ADD COLUMN `is_current` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

-- Seed existing single education rows as current records
UPDATE `student_educations` SET `is_current` = true, `sort_order` = 0;

-- DropForeignKey
ALTER TABLE `student_educations` DROP FOREIGN KEY `student_educations_student_profile_id_fkey`;

-- DropIndex
DROP INDEX `student_educations_student_profile_id_key` ON `student_educations`;

-- CreateIndex
CREATE INDEX `student_educations_student_profile_id_idx` ON `student_educations`(`student_profile_id`);

-- CreateIndex
CREATE INDEX `student_educations_student_profile_id_is_current_idx` ON `student_educations`(`student_profile_id`, `is_current`);

-- CreateIndex
CREATE INDEX `student_educations_student_profile_id_sort_order_idx` ON `student_educations`(`student_profile_id`, `sort_order`);

-- AddForeignKey
ALTER TABLE `student_educations` ADD CONSTRAINT `student_educations_student_profile_id_fkey` FOREIGN KEY (`student_profile_id`) REFERENCES `student_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
