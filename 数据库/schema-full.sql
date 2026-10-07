-- 语程 完整数据库结构（云端初始化用，可重复执行）
-- 导出时间: 2026/10/6 16:40:49
-- 用法: mysql -h <host> -P <port> -u <user> -p <db> < schema-full.sql
-- 幂等：重复执行不会报错（IF NOT EXISTS + INSERT IGNORE）

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `name` varchar(20) NOT NULL,
  `color` varchar(40) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_cat` (`user_id`,`name`),
  CONSTRAINT `fk_cat_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) DEFAULT NULL,
  `event_name` varchar(50) NOT NULL,
  `event_data` text,
  `page` varchar(30) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_event` (`event_name`),
  KEY `idx_time` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `date` date NOT NULL,
  `title` varchar(120) NOT NULL,
  `start` time DEFAULT NULL,
  `end` time DEFAULT NULL,
  `place` varchar(80) DEFAULT NULL,
  `cat` varchar(20) DEFAULT '其他',
  `status` tinyint(4) DEFAULT '0',
  `remind` int(11) DEFAULT '-1',
  `note` varchar(300) DEFAULT NULL,
  `repeat_days` varchar(60) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`date`),
  CONSTRAINT `fk_task_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `themes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `theme_key` varchar(30) NOT NULL,
  `theme_name` varchar(50) NOT NULL,
  `description` varchar(200) DEFAULT '',
  `group_name` varchar(20) DEFAULT 'classic',
  `preview_bg` varchar(100) DEFAULT '',
  `preview_card` varchar(20) DEFAULT '#fff',
  `preview_text` varchar(20) DEFAULT '#000',
  `preview_primary` varchar(20) DEFAULT '#6b8e7b',
  `sort_order` int(11) DEFAULT '0',
  `is_active` tinyint(4) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `theme_key` (`theme_key`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_themes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `theme_name` varchar(30) NOT NULL DEFAULT 'sage',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `password_hash` varchar(100) NOT NULL,
  `nickname` varchar(40) DEFAULT NULL,
  `theme` varchar(20) DEFAULT 'sage',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `role` varchar(20) DEFAULT 'user',
  `avatar` longtext,
  `sign` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4;


-- 主题字典初始数据（重复执行安全）
INSERT IGNORE INTO themes VALUES (1,'sage','奶油鼠尾草','','classic','#f5f1ec','#fff','#2d3a33','#6b8e7b',1,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (2,'ios-minimal','iOS黑白极简','','classic','#f5f5f7','#fff','#000','#000',2,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (3,'bento','iOS 原生风','','classic','#f2f2f7','#fff','#000','#007aff',3,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (4,'mono','线框工程风','','classic','#fafafa','#fff','#111','#111',4,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (5,'luxe','暗黑奢华黑金','','dark','#0a0a0a','#151412','#f3eadb','#d4af37',5,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (6,'film','复古胶片风','','dark','#2a2520','#3a3028','#e8d8c0','#c97b4a',6,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (7,'morandi','莫兰迪色系','','light','#e8e0d8','#f5f0ea','#5a5048','#a89a90',7,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (8,'navy','藏青商务风','','dark','#0f172a','#1e293b','#e2e8f0','#3b82f6',8,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (9,'peach','蜜桃奶油风','','light','#fff0e8','#fff8f3','#5a3a2a','#ff9a7a',9,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (10,'forest','森林墨绿风','','dark','#1a2e1f','#243b2b','#d8e8d8','#4a9a5a',10,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (11,'terminal','终端绿极客','','dark','#0a0f0a','#1a2a1a','#00ff41','#00ff41',11,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (12,'paper','手绘手账','','texture','#f4ecd8','#fefcf5','#5a4a3a','#5b9e5b',12,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (13,'clay','3D 黏土','','texture','#d4e4ed','#fdfaf3','#3a4a52','#5aa564',13,1,'2026-10-06 03:41:08');
INSERT IGNORE INTO themes VALUES (14,'midnight','午夜深蓝','深海午夜蓝：深蓝底 + 亮蓝主色','dark','#0f172a','rgba(30, 41, 59, 0.78)','#f1f5f9','#38bdf8',14,1,'2026-10-07 18:40:00');
INSERT IGNORE INTO themes VALUES (15,'ios','iOS 暗黑','iOS 高级暗黑：纯黑底 + 深灰光泽卡片 + iOS 系统蓝','dark','#000000','rgba(28, 28, 30, 0.85)','#ffffff','#0a84ff',15,1,'2026-10-07 18:40:00');
INSERT IGNORE INTO themes VALUES (16,'porcelain','青花瓷','冷白瓷底 + 钴蓝主色 + 墨黑文字，卡片一道极细的钴蓝釉线','texture','#f4f7fb','#ffffff','#17222f','#1e4d8c',16,1,'2026-10-07 18:40:00');
INSERT IGNORE INTO themes VALUES (17,'editorial','杂志编辑风','杂志编辑风：黑白大排版、无阴影、粗体大标题','light','#fafaf8','#ffffff','#1a1a1a','#1a1a1a',17,1,'2026-10-07 18:40:00');
INSERT IGNORE INTO themes VALUES (18,'mint','薄荷清新','薄荷清新：干净通透的浅绿','light','#f0faf6','#ffffff','#2d4a3e','#5ec9a8',18,1,'2026-10-07 18:40:00');
INSERT IGNORE INTO themes VALUES (19,'amber-dusk','琥珀暮色','奶油到杏色的黄昏渐变底 + 暖白卡片 + 深琥珀主色','light','linear-gradient(180deg, #fff7ee 0%, #ffe9d5 100%)','#fffdfa','#43291a','#c2410c',19,1,'2026-10-07 18:40:00');
INSERT IGNORE INTO themes VALUES (20,'black-gold','黑白金奢华','纯黑底 + 真金 3D 按钮 + 白色文字，高级奢华','dark','linear-gradient(165deg, #050505 0%, #121212 40%, #1e1e1e 70%, #2a2a2a 100%)','linear-gradient(145deg, #222222 0%, #161616 100%)','#f5f5f5','#d4af37',20,1,'2026-10-07 18:40:00');

SET FOREIGN_KEY_CHECKS = 1;
