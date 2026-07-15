-- grade 字段名为兼容旧版保留，业务含义改为“入学届别”。
-- 以 2025-2026 学年为基准，将已有年级文本归一化为入学届别。
UPDATE `User`
SET `grade` = CASE `grade`
  WHEN '大一' THEN '2025届'
  WHEN '大二' THEN '2024届'
  WHEN '大三' THEN '2023届'
  WHEN '大四' THEN '2022届'
  ELSE `grade`
END
WHERE `grade` IN ('大一', '大二', '大三', '大四');
