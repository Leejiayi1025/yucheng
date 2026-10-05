const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  // 创建用户主题表
  await conn.query(`
    CREATE TABLE IF NOT EXISTS user_themes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      theme_name VARCHAR(30) NOT NULL DEFAULT 'sage',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('user_themes表创建成功');

  // 把现有users.theme数据迁移过来
  const [users] = await conn.query('SELECT id, theme FROM users WHERE theme IS NOT NULL');
  for (const u of users) {
    await conn.query(
      'INSERT IGNORE INTO user_themes (user_id, theme_name) VALUES (?, ?)',
      [u.id, u.theme]
    );
  }
  console.log(`已迁移${users.length}个用户的主题数据`);

  await conn.end();
})();
