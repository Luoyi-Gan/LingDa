ALTER TABLE `Post_Comment`
  ADD COLUMN `moderation_mode` VARCHAR(20) NOT NULL DEFAULT 'automatic' AFTER `status`,
  ADD COLUMN `risk_level` VARCHAR(20) NOT NULL DEFAULT 'low' AFTER `moderation_mode`,
  ADD COLUMN `review_reason` VARCHAR(500) NULL AFTER `risk_level`,
  ADD COLUMN `reviewer_id` VARCHAR(50) NULL AFTER `review_reason`,
  ADD COLUMN `reviewed_at` DATETIME NULL AFTER `reviewer_id`,
  ADD INDEX `idx_comment_moderation` (`status`, `risk_level`);
