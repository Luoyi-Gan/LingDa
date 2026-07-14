-- 持久化会话已读游标，避免后端重启/热更新后已读消息重新出现红点。
CREATE TABLE IF NOT EXISTS `Conversation_Read` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL,
  `conv_id` VARCHAR(64) NOT NULL,
  `last_read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_conv_read` (`user_id`, `conv_id`),
  INDEX `idx_conv_read_user` (`user_id`),
  INDEX `idx_conv_read_user_conv` (`user_id`, `conv_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
