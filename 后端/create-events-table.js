const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  // 创建埋点事件表
  await conn.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT,
      event_name VARCHAR(50) NOT NULL,
      event_data TEXT,
      page VARCHAR(30),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_event (event_name),
      INDEX idx_time (created_at)
    )
  `);
  console.log('events埋点表创建成功');

  await conn.end();
})();
