-- AlterTable
ALTER TABLE `billing_invoices` ADD COLUMN `credit_grant_applied_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `coupon_redemptions` ADD COLUMN `stripe_checkout_session_id` VARCHAR(100) NULL,
    ADD COLUMN `stripe_invoice_id` VARCHAR(100) NULL,
    ADD COLUMN `subscription_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `last_credit_reset_key` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `scholarship_unlocks` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `scholarship_id` CHAR(36) NOT NULL,
    `usage_metric_id` CHAR(36) NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scholarship_unlocks_user_id_unlocked_at_idx`(`user_id`, `unlocked_at`),
    INDEX `scholarship_unlocks_scholarship_id_unlocked_at_idx`(`scholarship_id`, `unlocked_at`),
    UNIQUE INDEX `scholarship_unlocks_user_id_scholarship_id_key`(`user_id`, `scholarship_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opportunity_unlocks` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `opportunity_id` CHAR(36) NOT NULL,
    `usage_metric_id` CHAR(36) NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `opportunity_unlocks_user_id_unlocked_at_idx`(`user_id`, `unlocked_at`),
    INDEX `opportunity_unlocks_opportunity_id_unlocked_at_idx`(`opportunity_id`, `unlocked_at`),
    UNIQUE INDEX `opportunity_unlocks_user_id_opportunity_id_key`(`user_id`, `opportunity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `coupon_redemptions_subscription_id_idx` ON `coupon_redemptions`(`subscription_id`);

-- CreateIndex
CREATE INDEX `coupon_redemptions_stripe_invoice_id_idx` ON `coupon_redemptions`(`stripe_invoice_id`);

-- CreateIndex
CREATE UNIQUE INDEX `coupon_redemptions_coupon_id_user_id_key` ON `coupon_redemptions`(`coupon_id`, `user_id`);

-- AddForeignKey
ALTER TABLE `scholarship_unlocks` ADD CONSTRAINT `scholarship_unlocks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scholarship_unlocks` ADD CONSTRAINT `scholarship_unlocks_scholarship_id_fkey` FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunity_unlocks` ADD CONSTRAINT `opportunity_unlocks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opportunity_unlocks` ADD CONSTRAINT `opportunity_unlocks_opportunity_id_fkey` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

