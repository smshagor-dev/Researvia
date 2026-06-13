-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `role` ENUM('user', 'admin', 'super_admin') NOT NULL DEFAULT 'user',
    `status` ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
    `email_verified_at` DATETIME(3) NULL,
    `two_factor_secret` VARCHAR(255) NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_backup_codes` JSON NULL,
    `last_login_at` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_status_deleted_at_idx`(`status`, `deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `bio` TEXT NULL,
    `current_degree` ENUM('bachelors', 'masters', 'phd', 'postdoc', 'other') NULL,
    `gpa` DECIMAL(4, 2) NULL,
    `ielts_score` DECIMAL(3, 1) NULL,
    `toefl_score` INTEGER NULL,
    `gre_verbal` INTEGER NULL,
    `gre_quant` INTEGER NULL,
    `gre_awa` DECIMAL(3, 1) NULL,
    `research_interests` JSON NULL,
    `target_degree` ENUM('masters', 'phd', 'postdoc') NULL,
    `target_countries` JSON NULL,
    `target_start_term` VARCHAR(20) NULL,
    `linkedin_url` VARCHAR(500) NULL,
    `github_url` VARCHAR(500) NULL,
    `google_scholar_url` VARCHAR(500) NULL,
    `orcid_id` VARCHAR(50) NULL,
    `cv_file_key` VARCHAR(500) NULL,
    `sop_file_key` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_accounts` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `provider` ENUM('google', 'microsoft') NOT NULL,
    `provider_account_id` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `access_token` TEXT NULL,
    `refresh_token` TEXT NULL,
    `token_expires_at` DATETIME(3) NULL,
    `scopes` JSON NULL,
    `is_email_sending_enabled` BOOLEAN NOT NULL DEFAULT false,
    `is_inbox_sync_enabled` BOOLEAN NOT NULL DEFAULT false,
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `oauth_accounts_user_id_provider_idx`(`user_id`, `provider`),
    UNIQUE INDEX `oauth_accounts_user_id_provider_provider_account_id_key`(`user_id`, `provider`, `provider_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smtp_accounts` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `from_email` VARCHAR(255) NOT NULL,
    `from_name` VARCHAR(255) NULL,
    `host` VARCHAR(255) NOT NULL,
    `port` INTEGER NOT NULL,
    `encryption` ENUM('tls', 'ssl', 'none') NOT NULL DEFAULT 'tls',
    `username` VARCHAR(255) NOT NULL,
    `password` VARCHAR(500) NOT NULL,
    `imap_host` VARCHAR(255) NULL,
    `imap_port` INTEGER NULL,
    `imap_encryption` ENUM('tls', 'ssl', 'none') NULL,
    `imap_username` VARCHAR(255) NULL,
    `imap_password` VARCHAR(500) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `smtp_accounts_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `iso_alpha2` CHAR(2) NOT NULL,
    `iso_alpha3` CHAR(3) NOT NULL,
    `region` VARCHAR(100) NULL,
    `subregion` VARCHAR(100) NULL,
    `flag_emoji` VARCHAR(10) NULL,
    `is_popular_destination` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `countries_iso_alpha2_key`(`iso_alpha2`),
    UNIQUE INDEX `countries_iso_alpha3_key`(`iso_alpha3`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `universities` (
    `id` CHAR(36) NOT NULL,
    `ror_id` VARCHAR(50) NULL,
    `name` VARCHAR(500) NOT NULL,
    `name_aliases` JSON NULL,
    `country_id` CHAR(36) NOT NULL,
    `city` VARCHAR(200) NULL,
    `website_url` VARCHAR(500) NULL,
    `logo_url` VARCHAR(500) NULL,
    `qs_ranking` INTEGER NULL,
    `the_ranking` INTEGER NULL,
    `arwu_ranking` INTEGER NULL,
    `type` ENUM('public', 'private', 'research', 'liberal_arts', 'technical', 'other') NULL,
    `established_year` INTEGER NULL,
    `total_students` INTEGER NULL,
    `email_domains` JSON NULL,
    `openalex_id` VARCHAR(50) NULL,
    `grid_id` VARCHAR(50) NULL,
    `wikidata_id` VARCHAR(50) NULL,
    `status` ENUM('active', 'inactive', 'merged') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `universities_ror_id_key`(`ror_id`),
    INDEX `universities_country_id_idx`(`country_id`),
    INDEX `universities_status_idx`(`status`),
    FULLTEXT INDEX `universities_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` CHAR(36) NOT NULL,
    `university_id` CHAR(36) NOT NULL,
    `name` VARCHAR(300) NOT NULL,
    `slug` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `website_url` VARCHAR(500) NULL,
    `email` VARCHAR(255) NULL,
    `openalex_id` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `departments_university_id_idx`(`university_id`),
    UNIQUE INDEX `departments_university_id_slug_key`(`university_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professors` (
    `id` CHAR(36) NOT NULL,
    `university_id` CHAR(36) NOT NULL,
    `department_id` CHAR(36) NULL,
    `openalex_id` VARCHAR(50) NULL,
    `orcid_id` VARCHAR(50) NULL,
    `full_name` VARCHAR(300) NOT NULL,
    `first_name` VARCHAR(150) NULL,
    `last_name` VARCHAR(150) NULL,
    `title` VARCHAR(100) NULL,
    `position` ENUM('professor', 'associate_professor', 'assistant_professor', 'lecturer', 'researcher', 'postdoc', 'emeritus', 'adjunct') NULL,
    `bio` TEXT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `personal_website` VARCHAR(500) NULL,
    `google_scholar_url` VARCHAR(500) NULL,
    `lab_url` VARCHAR(500) NULL,
    `h_index` INTEGER NULL,
    `citations_count` INTEGER NULL,
    `publications_count` INTEGER NULL,
    `i10_index` INTEGER NULL,
    `accepting_students` ENUM('yes', 'no', 'unknown') NOT NULL DEFAULT 'unknown',
    `funding_status` ENUM('funded', 'unfunded', 'unknown') NOT NULL DEFAULT 'unknown',
    `last_publication_year` INTEGER NULL,
    `status` ENUM('active', 'inactive', 'retired', 'deceased') NOT NULL DEFAULT 'active',
    `data_source` ENUM('openalex', 'orcid', 'crossref', 'manual', 'import') NOT NULL,
    `last_enriched_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `professors_openalex_id_key`(`openalex_id`),
    UNIQUE INDEX `professors_orcid_id_key`(`orcid_id`),
    INDEX `professors_university_id_idx`(`university_id`),
    INDEX `professors_department_id_idx`(`department_id`),
    INDEX `professors_status_idx`(`status`),
    INDEX `professors_accepting_students_idx`(`accepting_students`),
    INDEX `professors_h_index_idx`(`h_index`),
    FULLTEXT INDEX `professors_full_name_idx`(`full_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professor_emails` (
    `id` CHAR(36) NOT NULL,
    `professor_id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `type` ENUM('institutional', 'personal', 'lab', 'generic') NOT NULL DEFAULT 'institutional',
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verification_status` ENUM('pending', 'verified', 'failed', 'manual_review') NOT NULL DEFAULT 'pending',
    `verification_source` ENUM('official_website', 'openalex', 'orcid', 'crossref', 'manual_review') NULL,
    `domain_match` BOOLEAN NOT NULL DEFAULT false,
    `mx_valid` BOOLEAN NULL,
    `smtp_valid` BOOLEAN NULL,
    `verified_at` DATETIME(3) NULL,
    `verified_by` CHAR(36) NULL,
    `reject_reason` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `professor_emails_professor_id_idx`(`professor_id`),
    INDEX `professor_emails_is_verified_verification_status_idx`(`is_verified`, `verification_status`),
    UNIQUE INDEX `professor_emails_professor_id_email_key`(`professor_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `research_areas` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `parent_id` CHAR(36) NULL,
    `openalex_concept_id` VARCHAR(50) NULL,
    `level` INTEGER NOT NULL DEFAULT 0,
    `professor_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `research_areas_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professor_research_areas` (
    `id` CHAR(36) NOT NULL,
    `professor_id` CHAR(36) NOT NULL,
    `research_area_id` CHAR(36) NOT NULL,
    `score` DECIMAL(5, 4) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `source` ENUM('openalex', 'orcid', 'crossref', 'manual', 'import') NOT NULL DEFAULT 'openalex',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `professor_research_areas_professor_id_idx`(`professor_id`),
    INDEX `professor_research_areas_research_area_id_idx`(`research_area_id`),
    UNIQUE INDEX `professor_research_areas_professor_id_research_area_id_key`(`professor_id`, `research_area_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publications` (
    `id` CHAR(36) NOT NULL,
    `professor_id` CHAR(36) NOT NULL,
    `openalex_id` VARCHAR(50) NULL,
    `doi` VARCHAR(200) NULL,
    `title` TEXT NOT NULL,
    `abstract` TEXT NULL,
    `venue` VARCHAR(300) NULL,
    `publication_year` INTEGER NULL,
    `publication_date` DATE NULL,
    `citation_count` INTEGER NOT NULL DEFAULT 0,
    `type` ENUM('journal_article', 'conference_paper', 'book_chapter', 'thesis', 'preprint', 'other') NULL,
    `url` VARCHAR(500) NULL,
    `pdf_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `publications_professor_id_idx`(`professor_id`),
    INDEX `publications_publication_year_idx`(`publication_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scholarships` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `slug` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `country_id` CHAR(36) NULL,
    `university_id` CHAR(36) NULL,
    `fundingType` ENUM('fully_funded', 'partially_funded', 'stipend_only', 'tuition_only', 'other') NOT NULL,
    `degree_levels` JSON NOT NULL,
    `fields_of_study` JSON NULL,
    `amount` DECIMAL(12, 2) NULL,
    `currency` CHAR(3) NULL,
    `deadline` DATE NULL,
    `start_date` DATE NULL,
    `duration_months` INTEGER NULL,
    `eligibility` TEXT NULL,
    `eligibility_countries` JSON NULL,
    `official_url` VARCHAR(1000) NOT NULL,
    `source` ENUM('manual', 'scraped', 'api', 'user_submitted') NOT NULL DEFAULT 'manual',
    `source_url` VARCHAR(1000) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_expired` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `save_count` INTEGER NOT NULL DEFAULT 0,
    `duplicate_of` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `scholarships_slug_key`(`slug`),
    INDEX `scholarships_is_active_is_expired_idx`(`is_active`, `is_expired`),
    INDEX `scholarships_deadline_idx`(`deadline`),
    INDEX `scholarships_country_id_idx`(`country_id`),
    FULLTEXT INDEX `scholarships_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorites` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `professor_id` CHAR(36) NOT NULL,
    `note` TEXT NULL,
    `status` ENUM('saved', 'contacted', 'replied', 'rejected', 'accepted') NOT NULL DEFAULT 'saved',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `favorites_user_id_idx`(`user_id`),
    UNIQUE INDEX `favorites_user_id_professor_id_key`(`user_id`, `professor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_scholarships` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `scholarship_id` CHAR(36) NOT NULL,
    `reminder_days_before` INTEGER NULL,
    `application_status` ENUM('saved', 'applied', 'accepted', 'rejected') NOT NULL DEFAULT 'saved',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `saved_scholarships_user_id_idx`(`user_id`),
    UNIQUE INDEX `saved_scholarships_user_id_scholarship_id_key`(`user_id`, `scholarship_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_threads` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `professor_id` CHAR(36) NULL,
    `subject` VARCHAR(998) NOT NULL,
    `account_type` ENUM('smtp', 'gmail', 'outlook') NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `status` ENUM('draft', 'scheduled', 'sent', 'replied', 'bounced', 'unsubscribed') NOT NULL DEFAULT 'draft',
    `last_message_at` DATETIME(3) NULL,
    `message_count` INTEGER NOT NULL DEFAULT 0,
    `unread_count` INTEGER NOT NULL DEFAULT 0,
    `gmail_thread_id` VARCHAR(50) NULL,
    `outlook_conversation_id` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `email_threads_user_id_idx`(`user_id`),
    INDEX `email_threads_professor_id_idx`(`professor_id`),
    INDEX `email_threads_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_messages` (
    `id` CHAR(36) NOT NULL,
    `thread_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `direction` ENUM('outbound', 'inbound') NOT NULL,
    `from_email` VARCHAR(255) NOT NULL,
    `from_name` VARCHAR(255) NULL,
    `to_emails` JSON NOT NULL,
    `cc_emails` JSON NULL,
    `bcc_emails` JSON NULL,
    `reply_to` VARCHAR(255) NULL,
    `subject` VARCHAR(998) NULL,
    `body_html` LONGTEXT NULL,
    `body_text` LONGTEXT NULL,
    `message_id_header` VARCHAR(500) NULL,
    `in_reply_to` VARCHAR(500) NULL,
    `status` ENUM('draft', 'scheduled', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed') NOT NULL DEFAULT 'draft',
    `scheduled_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `first_opened_at` DATETIME(3) NULL,
    `last_opened_at` DATETIME(3) NULL,
    `open_count` INTEGER NOT NULL DEFAULT 0,
    `replied_at` DATETIME(3) NULL,
    `bounced_at` DATETIME(3) NULL,
    `bounce_type` ENUM('hard', 'soft', 'complaint') NULL,
    `error_message` TEXT NULL,
    `gmail_message_id` VARCHAR(50) NULL,
    `outlook_message_id` VARCHAR(200) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `email_messages_thread_id_idx`(`thread_id`),
    INDEX `email_messages_status_idx`(`status`),
    INDEX `email_messages_scheduled_at_status_idx`(`scheduled_at`, `status`),
    INDEX `email_messages_message_id_header_idx`(`message_id_header`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_attachments` (
    `id` CHAR(36) NOT NULL,
    `message_id` CHAR(36) NOT NULL,
    `original_name` VARCHAR(500) NOT NULL,
    `file_key` VARCHAR(1000) NOT NULL,
    `content_type` VARCHAR(200) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_attachments_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `stripe_price_id_monthly` VARCHAR(100) NULL,
    `stripe_price_id_yearly` VARCHAR(100) NULL,
    `price_monthly` DECIMAL(8, 2) NOT NULL,
    `price_yearly` DECIMAL(8, 2) NOT NULL,
    `credits_per_month` INTEGER NOT NULL,
    `email_sends_per_day` INTEGER NOT NULL,
    `professor_reveals_per_month` INTEGER NOT NULL,
    `ai_generations_per_month` INTEGER NOT NULL,
    `max_saved_professors` INTEGER NOT NULL,
    `max_saved_scholarships` INTEGER NOT NULL,
    `max_smtp_accounts` INTEGER NOT NULL,
    `max_oauth_accounts` INTEGER NOT NULL,
    `has_inbox_sync` BOOLEAN NOT NULL DEFAULT false,
    `has_ai_match_score` BOOLEAN NOT NULL DEFAULT false,
    `has_bulk_email` BOOLEAN NOT NULL DEFAULT false,
    `has_analytics` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subscription_plans_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `plan_id` CHAR(36) NOT NULL,
    `stripe_subscription_id` VARCHAR(100) NULL,
    `stripe_customer_id` VARCHAR(100) NULL,
    `status` ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused') NOT NULL,
    `current_period_start` DATETIME(3) NULL,
    `current_period_end` DATETIME(3) NULL,
    `trial_start` DATETIME(3) NULL,
    `trial_end` DATETIME(3) NULL,
    `canceled_at` DATETIME(3) NULL,
    `cancel_at_period_end` BOOLEAN NOT NULL DEFAULT false,
    `ended_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_stripe_subscription_id_key`(`stripe_subscription_id`),
    INDEX `subscriptions_user_id_idx`(`user_id`),
    INDEX `subscriptions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credits` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `lifetime_earned` INTEGER NOT NULL DEFAULT 0,
    `lifetime_spent` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `credits_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` CHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL,
    `type` ENUM('subscription_grant', 'purchase', 'ai_generation', 'professor_reveal', 'email_send', 'referral', 'admin_adjustment', 'refund') NOT NULL,
    `reference_id` CHAR(36) NULL,
    `reference_type` VARCHAR(50) NULL,
    `description` VARCHAR(500) NULL,
    `balance_after` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_transactions_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `body` TEXT NULL,
    `action_url` VARCHAR(500) NULL,
    `data` JSON NULL,
    `channel` ENUM('in_app', 'email', 'push') NOT NULL DEFAULT 'in_app',
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_is_read_idx`(`user_id`, `is_read`),
    INDEX `notifications_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` CHAR(36) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `activity_logs_action_created_at_idx`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actor_id` CHAR(36) NULL,
    `actor_type` ENUM('user', 'admin', 'system') NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NULL,
    `entity_id` CHAR(36) NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_id_idx`(`actor_id`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `professor_email_id` CHAR(36) NOT NULL,
    `source` ENUM('official_website', 'openalex', 'orcid', 'crossref', 'manual_review') NOT NULL,
    `source_url` VARCHAR(1000) NULL,
    `result` VARCHAR(50) NOT NULL,
    `raw_response` JSON NULL,
    `domain_matched` BOOLEAN NOT NULL DEFAULT false,
    `mx_check_result` BOOLEAN NULL,
    `smtp_check_result` BOOLEAN NULL,
    `verified_by_admin` CHAR(36) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `verification_logs_professor_email_id_idx`(`professor_email_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_usage_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `source` ENUM('ror', 'openalex', 'crossref', 'orcid', 'gmail', 'microsoft_graph', 'stripe', 'ai') NOT NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `status_code` INTEGER NULL,
    `response_ms` INTEGER NULL,
    `error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_usage_logs_source_created_at_idx`(`source`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `imports` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `type` ENUM('professors', 'universities', 'scholarships', 'research_areas') NOT NULL,
    `file_key` VARCHAR(1000) NULL,
    `source` ENUM('csv', 'ror', 'openalex', 'crossref', 'orcid', 'manual') NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `total_rows` INTEGER NOT NULL DEFAULT 0,
    `processed_rows` INTEGER NOT NULL DEFAULT 0,
    `success_rows` INTEGER NOT NULL DEFAULT 0,
    `error_rows` INTEGER NOT NULL DEFAULT 0,
    `error_log` JSON NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `imports_user_id_idx`(`user_id`),
    INDEX `imports_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smtp_accounts` ADD CONSTRAINT `smtp_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `universities` ADD CONSTRAINT `universities_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_university_id_fkey` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professors` ADD CONSTRAINT `professors_university_id_fkey` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professors` ADD CONSTRAINT `professors_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professor_emails` ADD CONSTRAINT `professor_emails_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `research_areas` ADD CONSTRAINT `research_areas_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `research_areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professor_research_areas` ADD CONSTRAINT `professor_research_areas_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professor_research_areas` ADD CONSTRAINT `professor_research_areas_research_area_id_fkey` FOREIGN KEY (`research_area_id`) REFERENCES `research_areas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publications` ADD CONSTRAINT `publications_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scholarships` ADD CONSTRAINT `scholarships_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scholarships` ADD CONSTRAINT `scholarships_university_id_fkey` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_scholarships` ADD CONSTRAINT `saved_scholarships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_scholarships` ADD CONSTRAINT `saved_scholarships_scholarship_id_fkey` FOREIGN KEY (`scholarship_id`) REFERENCES `scholarships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_threads` ADD CONSTRAINT `email_threads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_threads` ADD CONSTRAINT `email_threads_professor_id_fkey` FOREIGN KEY (`professor_id`) REFERENCES `professors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_threads` ADD CONSTRAINT `fk_thread_smtp` FOREIGN KEY (`account_id`) REFERENCES `smtp_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_threads` ADD CONSTRAINT `fk_thread_oauth` FOREIGN KEY (`account_id`) REFERENCES `oauth_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_messages` ADD CONSTRAINT `email_messages_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `email_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_messages` ADD CONSTRAINT `email_messages_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_attachments` ADD CONSTRAINT `email_attachments_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `email_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credits` ADD CONSTRAINT `credits_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_logs` ADD CONSTRAINT `verification_logs_professor_email_id_fkey` FOREIGN KEY (`professor_email_id`) REFERENCES `professor_emails`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `imports` ADD CONSTRAINT `imports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
