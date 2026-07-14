-- ============================================================
-- 校园搭子 · 数据库 Schema
-- 维护:DBA
-- ============================================================
-- 注:本文件 2026-05-14 应用了 2 处兼容性修复:
--   (1) MySQL 8.0.0~8.0.31 限制:CHECK 不能引用带 CASCADE/SET NULL
--       referential action 的 FK 列。共移除 5 处 CHECK,改由应用层 Service 层做:
--         · Friendship.chk_friendship_not_self
--         · Blacklist.chk_blacklist_not_self
--         · Message.chk_message_target
--         · Message.chk_message_not_self
--         · Match_Evaluate.chk_not_self_evaluate
--   (2) Match_Room 加 `join_password` 字段(joinRule=password 模式专用)。
--
-- 原始 DBA 版本归档于 backup/2026-05-14_v1.1-db-aligned/docs/schema.sql。
-- ============================================================

-- ============================================================
-- 起步:从干净库开始(可选,首次部署或 reset 时打开下面三行)
-- ============================================================
-- DROP DATABASE IF EXISTS dazi;
-- CREATE DATABASE dazi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE dazi;


CREATE TABLE `User` (
  `user_id` varchar(50) PRIMARY KEY COMMENT '学号, PK',
  `username` varchar(100) NOT NULL COMMENT '用户名',
  `real_name` varchar(100) NOT NULL COMMENT '实名',
  `tags` varchar(255) COMMENT '个人偏好标签，如: 打车达人, 安静, 学霸',
  `is_searchable` boolean NOT NULL DEFAULT true COMMENT '隐私: 是否允许被通过ID搜索',
  `msg_permission` varchar(20) NOT NULL DEFAULT 'all' COMMENT '私聊权限: all/friends/none',
  `gender` varchar(20),
  `college` varchar(100) NOT NULL,
  `major` varchar(100),
  `phone` varchar(30) NOT NULL,
  `password_hash` varchar(255) NOT NULL COMMENT '加密后的密码',
  `credit_score` numeric(3,2) NOT NULL DEFAULT 5.00 COMMENT '用户信用评分',
  `account_status` varchar(20) NOT NULL DEFAULT 'normal' COMMENT '账号状态: normal/restricted/banned',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `uk_user_username` UNIQUE (`username`),
  CONSTRAINT `uk_user_phone` UNIQUE (`phone`),

  CONSTRAINT `chk_msg_permission`
    CHECK (`msg_permission` IN ('all', 'friends', 'none')),

  CONSTRAINT `chk_credit_score`
    CHECK (`credit_score` >= 0 AND `credit_score` <= 5),

  CONSTRAINT `chk_account_status`
    CHECK (`account_status` IN ('normal', 'restricted', 'banned'))
) COMMENT = '学生实体';


CREATE TABLE `Friendship` (
  `friend_id` int PRIMARY KEY AUTO_INCREMENT,
  `user_id_1` varchar(50) NOT NULL COMMENT '发起方',
  `user_id_2` varchar(50) NOT NULL COMMENT '接收方',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/accepted/rejected',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `uk_friendship_pair`
    UNIQUE (`user_id_1`, `user_id_2`),

  CONSTRAINT `chk_friendship_status`
    CHECK (`status` IN ('pending', 'accepted', 'rejected')),

  -- [REMOVED for MySQL 8 compat] chk_friendship_not_self —— 改由应用层 Service 校验

  CONSTRAINT `fk_friendship_user1`
    FOREIGN KEY (`user_id_1`) REFERENCES `User` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_friendship_user2`
    FOREIGN KEY (`user_id_2`) REFERENCES `User` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '好友关系';

CREATE TABLE `Blacklist` (
  `block_id` int PRIMARY KEY AUTO_INCREMENT,
  `blocker_id` varchar(50) NOT NULL COMMENT '拉黑方',
  `blocked_id` varchar(50) NOT NULL COMMENT '被拉黑方',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `uk_blacklist_pair`
    UNIQUE (`blocker_id`, `blocked_id`),

  -- [REMOVED for MySQL 8 compat] chk_blacklist_not_self —— 改由应用层 Service 校验

  CONSTRAINT `fk_blacklist_blocker`
    FOREIGN KEY (`blocker_id`) REFERENCES `User` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_blacklist_blocked`
    FOREIGN KEY (`blocked_id`) REFERENCES `User` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '黑名单系统';

CREATE TABLE `Match_Room` (
  `room_id` int PRIMARY KEY AUTO_INCREMENT,
  `creator_id` varchar(50) NOT NULL COMMENT '房主',
  `room_type` varchar(30) NOT NULL COMMENT 'carpool/entertainment/group',
  `join_rule` varchar(30) NOT NULL DEFAULT 'direct' COMMENT 'direct/audit/password',
  `join_password` varchar(50) DEFAULT NULL COMMENT '仅 join_rule=password 时使用的加入口令',
  `tags` varchar(255) COMMENT '房间标签，如: 安静, 准时优先',
  `title` varchar(255) NOT NULL,
  `content` varchar(1000),
  `total_num` int NOT NULL COMMENT '房间总人数',
  `current_num` int NOT NULL DEFAULT 0 COMMENT '当前已加入人数',
  `meet_time` datetime,
  `meet_location` varchar(255),
  `status` varchar(30) NOT NULL DEFAULT 'open' COMMENT 'open/full/finished/cancelled',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `chk_room_type`
    CHECK (`room_type` IN ('carpool', 'entertainment', 'group')),

  CONSTRAINT `chk_join_rule`
    CHECK (`join_rule` IN ('direct', 'audit', 'password')),

  CONSTRAINT `chk_room_status`
    CHECK (`status` IN ('open', 'full', 'finished', 'cancelled')),

  CONSTRAINT `chk_total_num`
    CHECK (`total_num` >= 2),

  CONSTRAINT `chk_current_num`
    CHECK (`current_num` >= 0 AND `current_num` <= `total_num`),

  CONSTRAINT `chk_meet_time`
    CHECK (`meet_time` IS NULL OR `meet_time` >= `create_time`),

  CONSTRAINT `fk_room_creator`
    FOREIGN KEY (`creator_id`) REFERENCES `User` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) COMMENT = '搭子房间，ISA超类';

CREATE TABLE `Carpool_Room` (
  `room_id` int PRIMARY KEY COMMENT '共享主键，同时也是外键',
  `start_location` varchar(255) NOT NULL,
  `end_location` varchar(255) NOT NULL,
  `car_type` varchar(100),
  `cost_split` numeric(10,2) COMMENT '人均费用',

  CONSTRAINT `chk_cost_split`
    CHECK (`cost_split` IS NULL OR `cost_split` >= 0),

  CONSTRAINT `fk_carpool_room`
    FOREIGN KEY (`room_id`) REFERENCES `Match_Room` (`room_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '拼车详情，ISA子类';

CREATE TABLE `Entertainment_Room` (
  `room_id` int PRIMARY KEY COMMENT '共享主键，同时也是外键',
  `ent_type` varchar(100) NOT NULL COMMENT '娱乐类型',
  `cost` numeric(10,2) COMMENT '活动费用',
  `equipment` varchar(255) COMMENT '所需设备',

  CONSTRAINT `chk_entertainment_cost`
    CHECK (`cost` IS NULL OR `cost` >= 0),

  CONSTRAINT `fk_entertainment_room`
    FOREIGN KEY (`room_id`) REFERENCES `Match_Room` (`room_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '娱乐详情，ISA子类';

CREATE TABLE `Group_Room` (
  `room_id` int PRIMARY KEY COMMENT '共享主键，同时也是外键',
  `course_name` varchar(100),
  `group_target` varchar(255) NOT NULL COMMENT '小组目标',
  `require_skill` varchar(255) COMMENT '所需能力',

  CONSTRAINT `fk_group_room`
    FOREIGN KEY (`room_id`) REFERENCES `Match_Room` (`room_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '学习小组详情，ISA子类';

CREATE TABLE `Match_Member` (
  `member_id` int PRIMARY KEY AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'approved' COMMENT 'pending/approved/rejected/left',
  `join_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `uk_room_user`
    UNIQUE (`room_id`, `user_id`),

  CONSTRAINT `chk_member_status`
    CHECK (`status` IN ('pending', 'approved', 'rejected', 'left')),

  CONSTRAINT `fk_member_room`
    FOREIGN KEY (`room_id`) REFERENCES `Match_Room` (`room_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_member_user`
    FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '搭子成员，多对多关联实体';

CREATE TABLE `Message` (
  `msg_id` int PRIMARY KEY AUTO_INCREMENT,
  `sender_id` varchar(50) NOT NULL COMMENT '消息发送者',
  `receiver_id` varchar(50) COMMENT '私聊接收者，群聊时为空',
  `room_id` int COMMENT '房间号，私聊时为空',
  `content` varchar(1000) NOT NULL COMMENT '消息内容',
  `send_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- [REMOVED for MySQL 8 compat] chk_message_target —— 改由应用层 Service 校验
  -- [REMOVED for MySQL 8 compat] chk_message_not_self —— 改由应用层 Service 校验

  CONSTRAINT `fk_message_sender`
    FOREIGN KEY (`sender_id`) REFERENCES `User` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_message_receiver`
    FOREIGN KEY (`receiver_id`) REFERENCES `User` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_message_room`
    FOREIGN KEY (`room_id`) REFERENCES `Match_Room` (`room_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '聊天记录，兼容私聊与房间群聊';

CREATE TABLE `Match_Evaluate` (
  `evaluate_id` int PRIMARY KEY AUTO_INCREMENT,
  `from_member_id` int NOT NULL COMMENT '评价方',
  `to_member_id` int NOT NULL COMMENT '被评价方',
  `score` int NOT NULL COMMENT '评分1-5',
  `content` varchar(1000),
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `uk_evaluate_pair`
    UNIQUE (`from_member_id`, `to_member_id`),

  CONSTRAINT `chk_score`
    CHECK (`score` BETWEEN 1 AND 5),

  -- [REMOVED for MySQL 8 compat] chk_not_self_evaluate —— 改由应用层 Service 校验

  CONSTRAINT `fk_evaluate_from_member`
    FOREIGN KEY (`from_member_id`) REFERENCES `Match_Member` (`member_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_evaluate_to_member`
    FOREIGN KEY (`to_member_id`) REFERENCES `Match_Member` (`member_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) COMMENT = '搭子评价，仅限同房间成员互相评价';

CREATE INDEX `idx_room_type_status_time`
ON `Match_Room` (`room_type`, `status`, `meet_time`);

CREATE INDEX `idx_room_creator`
ON `Match_Room` (`creator_id`);

CREATE INDEX `idx_member_user`
ON `Match_Member` (`user_id`);

CREATE INDEX `idx_member_room_status`
ON `Match_Member` (`room_id`, `status`);

CREATE INDEX `idx_message_room_time`
ON `Message` (`room_id`, `send_time`);

CREATE INDEX `idx_message_private_time`
ON `Message` (`sender_id`, `receiver_id`, `send_time`);

CREATE INDEX `idx_friendship_user1`
ON `Friendship` (`user_id_1`);

CREATE INDEX `idx_friendship_user2`
ON `Friendship` (`user_id_2`);

CREATE INDEX `idx_blacklist_blocker`
ON `Blacklist` (`blocker_id`);

CREATE INDEX `idx_carpool_route`
ON `Carpool_Room` (`start_location`, `end_location`);

CREATE INDEX `idx_group_course`
ON `Group_Room` (`course_name`);

DELIMITER //

CREATE TRIGGER `trg_check_evaluation_same_room`
BEFORE INSERT ON `Match_Evaluate`
FOR EACH ROW
BEGIN
  DECLARE from_room int;
  DECLARE to_room int;

  SELECT `room_id`
  INTO from_room
  FROM `Match_Member`
  WHERE `member_id` = NEW.`from_member_id`;

  SELECT `room_id`
  INTO to_room
  FROM `Match_Member`
  WHERE `member_id` = NEW.`to_member_id`;

  IF from_room <> to_room THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Evaluation is only allowed between members in the same room.';
  END IF;
END//

DELIMITER ;
