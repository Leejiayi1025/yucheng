require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  multipleStatements: true
};
const DB = process.env.DB_NAME || 'yuecheng';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  email VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  password_hash VARCHAR(100) NOT NULL,
  nickname VARCHAR(40) DEFAULT NULL,
  avatar_url VARCHAR(255) DEFAULT NULL,
  theme VARCHAR(20) DEFAULT 'sage',
  role VARCHAR(20) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email (email),
  UNIQUE KEY uk_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(20) NOT NULL,
  color VARCHAR(40) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_cat (user_id, name),
  CONSTRAINT fk_cat_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  date DATE NOT NULL,
  title VARCHAR(120) NOT NULL,
  start TIME DEFAULT NULL,
  end TIME DEFAULT NULL,
  place VARCHAR(80) DEFAULT NULL,
  cat VARCHAR(20) DEFAULT '其他',
  status TINYINT DEFAULT 0,
  remind INT DEFAULT -1,
  note VARCHAR(300) DEFAULT NULL,
  repeat_days VARCHAR(60) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

async function run() {
  const conn = await mysql.createConnection(cfg);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
  await conn.query(`USE \`${DB}\``);
  await conn.query(SCHEMA);

  // ---- 种子数据 ----
  const phone = '13800138000';
  const [exists] = await conn.query('SELECT id FROM users WHERE phone=?', [phone]);
  if (!exists.length) {
    const hash = await bcrypt.hash('123456', 10);
    const [u] = await conn.query(
      'INSERT INTO users(phone,password_hash,nickname,theme) VALUES(?,?,?,?)',
      [phone, hash, '语程用户', 'sage']
    );
    const uid = u.insertId;
    const defs = [
      ['工作', 'hsl(210,45%,90%)'], ['学习', 'hsl(150,40%,90%)'],
      ['运动', 'hsl(20,55%,90%)'], ['生活', 'hsl(280,35%,92%)'], ['其他', 'hsl(0,0%,92%)']
    ];
    for (const [n, c] of defs) {
      await conn.query('INSERT IGNORE INTO categories(user_id,name,color) VALUES(?,?,?)', [uid, n, c]);
    }
    const today = new Date();
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    const samples = [
      [uid, ymd(today), '写作业', '19:00:00', '21:00:00', '图书馆', '学习', 0, 0, '完成数学和英语作业', null],
      [uid, ymd(today), '健身', '07:30:00', '08:30:00', '健身房', '运动', 0, 30, null, null],
      [uid, ymd(today), '团队周会', '14:00:00', '15:00:00', '会议室A', '工作', 0, 15, null, '[1,3,5]'],
      [uid, ymd(tmr), '去看电影', '20:00:00', '22:00:00', '万达影城', '生活', 0, -1, null, null]
    ];
    for (const s of samples) {
      await conn.query(
        'INSERT INTO tasks(user_id,date,title,start,end,place,cat,status,remind,note,repeat_days) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        s
      );
    }
    console.log('已写入演示用户(13800138000 / 123456)与示例任务');
  } else {
    console.log('演示数据已存在，跳过种子');
  }

  await conn.end();
  console.log('✅ 数据库初始化完成（库：' + DB + '）');
}

run().catch(e => { console.error(e); process.exit(1); });
