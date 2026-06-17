CREATE TABLE `payment_transactions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `provider` ENUM('stripe', 'nowpayments') NOT NULL,
    `plan_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(20) NOT NULL,
    `crypto_currency` VARCHAR(50) NULL,
    `provider_payment_id` VARCHAR(100) NULL,
    `provider_invoice_id` VARCHAR(100) NULL,
    `status` ENUM('pending', 'confirmed', 'failed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_transactions_provider_payment_id_key`(`provider_payment_id`),
    UNIQUE INDEX `payment_transactions_provider_invoice_id_key`(`provider_invoice_id`),
    INDEX `payment_transactions_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `payment_transactions_provider_status_created_at_idx`(`provider`, `status`, `created_at`),
    INDEX `payment_transactions_plan_id_created_at_idx`(`plan_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_transactions`
    ADD CONSTRAINT `payment_transactions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `payment_transactions`
    ADD CONSTRAINT `payment_transactions_plan_id_fkey`
    FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
