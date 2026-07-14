-- LingDa 学生开放社区（纯增量迁移，不修改现有搭子表和字段）

ALTER TABLE `User`
  ADD COLUMN `account_role` varchar(20) NOT NULL DEFAULT 'student' AFTER `account_status`,
  ADD COLUMN `verification_status` varchar(20) NOT NULL DEFAULT 'unverified' AFTER `account_role`,
  ADD COLUMN `grade` varchar(30) NULL AFTER `verification_status`,
  ADD COLUMN `bio` varchar(500) NULL AFTER `grade`,
  ADD COLUMN `avatar_url` varchar(500) NULL AFTER `bio`,
  ADD COLUMN `show_profile` boolean NOT NULL DEFAULT true AFTER `avatar_url`,
  ADD COLUMN `notify_enabled` boolean NOT NULL DEFAULT true AFTER `show_profile`;

-- 老系统用户已通过学号注册，迁移时视为已认证学生，避免既有功能被锁住。
UPDATE `User`
SET `verification_status` = 'verified'
WHERE `verification_status` = 'unverified';

CREATE TABLE IF NOT EXISTS `Community_Post` (
  `post_id` int PRIMARY KEY AUTO_INCREMENT,
  `author_id` varchar(50) NOT NULL,
  `category` varchar(30) NOT NULL,
  `title` varchar(150) NOT NULL,
  `content` text NOT NULL,
  `images` json NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `moderation_mode` varchar(20) NOT NULL DEFAULT 'automatic',
  `risk_level` varchar(20) NOT NULL DEFAULT 'low',
  `review_reason` varchar(500) NULL,
  `reviewer_id` varchar(50) NULL,
  `reviewed_at` datetime NULL,
  `published_at` datetime NULL,
  `view_count` int NOT NULL DEFAULT 0,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_post_feed` (`status`, `category`, `published_at`),
  INDEX `idx_post_author` (`author_id`, `create_time`),
  CONSTRAINT `fk_post_author` FOREIGN KEY (`author_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_post_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `User` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Post_Comment` (
  `comment_id` int PRIMARY KEY AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `author_id` varchar(50) NOT NULL,
  `content` varchar(1000) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_comment_post` (`post_id`, `create_time`),
  INDEX `idx_comment_author` (`author_id`),
  CONSTRAINT `fk_comment_post` FOREIGN KEY (`post_id`) REFERENCES `Community_Post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comment_author` FOREIGN KEY (`author_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Post_Like` (
  `like_id` int PRIMARY KEY AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_post_like` (`post_id`, `user_id`),
  INDEX `idx_like_user` (`user_id`),
  CONSTRAINT `fk_like_post` FOREIGN KEY (`post_id`) REFERENCES `Community_Post` (`post_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_like_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Favorite` (
  `favorite_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL,
  `target_type` varchar(20) NOT NULL,
  `target_id` int NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_favorite_target` (`user_id`, `target_type`, `target_id`),
  INDEX `idx_favorite_list` (`user_id`, `target_type`, `create_time`),
  CONSTRAINT `fk_favorite_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Announcement` (
  `announcement_id` int PRIMARY KEY AUTO_INCREMENT,
  `author_id` varchar(50) NOT NULL,
  `category` varchar(30) NOT NULL DEFAULT 'platform',
  `title` varchar(150) NOT NULL,
  `summary` varchar(300) NULL,
  `content` text NOT NULL,
  `cover_url` varchar(500) NULL,
  `status` varchar(20) NOT NULL DEFAULT 'published',
  `is_pinned` boolean NOT NULL DEFAULT false,
  `reviewer_id` varchar(50) NULL,
  `review_reason` varchar(500) NULL,
  `published_at` datetime NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_announcement_feed` (`status`, `is_pinned`, `published_at`),
  INDEX `idx_announcement_author` (`author_id`),
  CONSTRAINT `fk_announcement_author` FOREIGN KEY (`author_id`) REFERENCES `User` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_announcement_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `User` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `Verification_Request` (
  `request_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL,
  `type` varchar(20) NOT NULL,
  `organization_name` varchar(150) NULL,
  `applicant_name` varchar(100) NOT NULL,
  `student_id` varchar(50) NULL,
  `material_urls` json NOT NULL,
  `statement` varchar(1000) NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `reviewer_id` varchar(50) NULL,
  `review_note` varchar(500) NULL,
  `reviewed_at` datetime NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_verification_user` (`user_id`, `create_time`),
  INDEX `idx_verification_review` (`status`, `create_time`),
  CONSTRAINT `fk_verification_applicant` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_verification_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `User` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
