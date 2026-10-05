-- ============================================================
-- 语程 (YueCheng) 数据库 Schema
-- 技术栈：MySQL 8.x（兼容 5.7+）
-- 字符集：utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS `yuecheng`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `yuecheng`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `phone`         VARCHAR(20)  NOT NULL,
  `password_hash` VARCHAR(100) NOT NULL,
  `nickname`      VARCHAR(40)  DEFAULT NULL,
  `theme`         VARCHAR(20)  DEFAULT 'sage' COMMENT '外观主题 key',
  `created_at`    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 自定义分类表（每个用户独立）
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         BIGINT      NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT      NOT NULL,
  `name`       VARCHAR(20) NOT NULL,
  `color`      VARCHAR(40) DEFAULT NULL COMMENT 'hsl 颜色，如 hsl(210,45%,90%)',
  `created_at` DATETIME    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_cat` (`user_id`, `name`),
  CONSTRAINT `fk_cat_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 任务表
CREATE TABLE IF NOT EXISTS `tasks` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT       NOT NULL,
  `date`         DATE         NOT NULL COMMENT '任务日期 YYYY-MM-DD',
  `title`        VARCHAR(120) NOT NULL,
  `start`        TIME         DEFAULT NULL COMMENT '开始时间 HH:MM:SS',
  `end`          TIME         DEFAULT NULL COMMENT '结束时间',
  `place`        VARCHAR(80)  DEFAULT NULL,
  `cat`          VARCHAR(20)  DEFAULT '其他' COMMENT '分类名',
  `status`       TINYINT      DEFAULT 0 COMMENT '0 待办 1 已完成',
  `remind`       INT          DEFAULT -1 COMMENT '提前提醒分钟数，-1 表示不提醒',
  `note`         VARCHAR(300) DEFAULT NULL COMMENT '备注',
  `repeat_days`  VARCHAR(60)  DEFAULT NULL COMMENT 'JSON 数组，0=周日..6=周六；NULL 不重复',
  `created_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_task_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_user_date` (`user_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
