CREATE TABLE `worker_heartbeats` (
  `id` CHAR(36) NOT NULL,
  `worker_name` VARCHAR(120) NOT NULL,
  `queue_name` VARCHAR(120) NOT NULL,
  `status` ENUM('starting', 'healthy', 'degraded', 'offline', 'stopped') NOT NULL,
  `process_id` INTEGER NOT NULL,
  `hostname` VARCHAR(255) NOT NULL,
  `last_heartbeat_at` DATETIME(3) NOT NULL,
  `last_job_processed_at` DATETIME(3) NULL,
  `last_error_message` TEXT NULL,
  `metadata_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `worker_heartbeats_worker_name_queue_name_hostname_key`(`worker_name`, `queue_name`, `hostname`),
  INDEX `worker_heartbeats_queue_name_status_idx`(`queue_name`, `status`),
  INDEX `worker_heartbeats_last_heartbeat_at_idx`(`last_heartbeat_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
