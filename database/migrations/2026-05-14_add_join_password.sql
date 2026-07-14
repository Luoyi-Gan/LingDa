-- ⚠️ 此迁移已于 2026-05-14 合并到 database/schema.sql 主文件中。
--    Match_Room.join_password 现在在主 schema 里直接定义,无需单独执行此文件。
--    保留此文件仅作为版本演进历史记录。
--
-- (如果你的数据库是先按 v1.0 schema 建好的,再来想加这个字段时才需要跑下面这条;
--  从零开始的部署直接跑 database/schema.sql 即可。)

/*
ALTER TABLE `Match_Room`
  ADD COLUMN `join_password` VARCHAR(50) NULL
  COMMENT '仅 join_rule=password 时使用的加入口令'
  AFTER `join_rule`;
*/
