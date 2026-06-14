ALTER TABLE `subscription_plans`
  ADD COLUMN `opportunity_unlocks_per_month` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `scholarship_unlocks_per_month` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `has_team_access` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `subscriptions`
  ADD COLUMN `billing_cycle` ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly';

ALTER TABLE `credits`
  ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `credit_transactions`
  ADD COLUMN `wallet_id` CHAR(36) NULL,
  ADD COLUMN `reason` VARCHAR(255) NULL,
  ADD COLUMN `metadata_json` JSON NULL;

ALTER TABLE `credit_transactions`
  ADD INDEX `credit_transactions_wallet_id_created_at_idx`(`wallet_id`, `created_at`);

CREATE TABLE `usage_metrics` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `metric_type` ENUM('professor_reveal', 'ai_generation', 'email_send', 'scholarship_unlock', 'opportunity_unlock') NOT NULL,
  `count` INTEGER NOT NULL DEFAULT 0,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `usage_metrics_user_id_metric_type_period_start_period_end_key`(`user_id`, `metric_type`, `period_start`, `period_end`),
  INDEX `usage_metrics_user_id_period_start_idx`(`user_id`, `period_start`),
  INDEX `usage_metrics_metric_type_period_start_idx`(`metric_type`, `period_start`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `billing_invoices` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `subscription_id` CHAR(36) NULL,
  `stripe_invoice_id` VARCHAR(100) NULL,
  `stripe_customer_id` VARCHAR(100) NULL,
  `invoice_number` VARCHAR(100) NULL,
  `hosted_invoice_url` VARCHAR(1000) NULL,
  `invoice_pdf_url` VARCHAR(1000) NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'usd',
  `subtotal_amount` DECIMAL(10,2) NULL,
  `total_amount` DECIMAL(10,2) NULL,
  `amount_paid` DECIMAL(10,2) NULL,
  `status` ENUM('draft', 'open', 'paid', 'uncollectible', 'void') NOT NULL DEFAULT 'open',
  `billed_at` DATETIME(3) NULL,
  `paid_at` DATETIME(3) NULL,
  `metadata_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `billing_invoices_stripe_invoice_id_key`(`stripe_invoice_id`),
  INDEX `billing_invoices_user_id_created_at_idx`(`user_id`, `created_at`),
  INDEX `billing_invoices_subscription_id_created_at_idx`(`subscription_id`, `created_at`),
  INDEX `billing_invoices_status_created_at_idx`(`status`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `coupons` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL,
  `discount_value` DECIMAL(10,2) NOT NULL,
  `stripe_coupon_id` VARCHAR(100) NULL,
  `stripe_promotion_code_id` VARCHAR(100) NULL,
  `expires_at` DATETIME(3) NULL,
  `max_uses` INTEGER NULL,
  `used_count` INTEGER NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `coupons_code_key`(`code`),
  INDEX `coupons_is_active_expires_at_idx`(`is_active`, `expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `coupon_redemptions` (
  `id` CHAR(36) NOT NULL,
  `coupon_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `coupon_redemptions_coupon_id_created_at_idx`(`coupon_id`, `created_at`),
  INDEX `coupon_redemptions_user_id_created_at_idx`(`user_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `teams` (
  `id` CHAR(36) NOT NULL,
  `owner_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `plan_id` CHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `teams_owner_id_idx`(`owner_id`),
  INDEX `teams_plan_id_idx`(`plan_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `team_members` (
  `id` CHAR(36) NOT NULL,
  `team_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `role` ENUM('owner', 'admin', 'member') NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `team_members_team_id_user_id_key`(`team_id`, `user_id`),
  INDEX `team_members_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `credit_transactions`
  ADD CONSTRAINT `credit_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `credits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `usage_metrics`
  ADD CONSTRAINT `usage_metrics_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `billing_invoices`
  ADD CONSTRAINT `billing_invoices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `billing_invoices_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `coupon_redemptions`
  ADD CONSTRAINT `coupon_redemptions_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `coupon_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `teams`
  ADD CONSTRAINT `teams_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `teams_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `team_members`
  ADD CONSTRAINT `team_members_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `team_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
