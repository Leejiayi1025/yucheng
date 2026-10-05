const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  // 加avatar字段（存base64图片）
  try {
    await conn.query("ALTER TABLE users ADD COLUMN avatar LONGTEXT DEFAULT NULL");
    console.log('已添加avatar字段');
  } catch (e) {
    console.log('avatar字段已存在');
  }

  // 加nickname、sign字段
  try {
    await conn.query("ALTER TABLE users ADD COLUMN nickname VARCHAR(40) DEFAULT NULL");
    console.log('已添加nickname字段');
  } catch (e) {
    console.log('nickname字段已存在');
  }

  try {
    await conn.query("ALTER TABLE users ADD COLUMN sign VARCHAR(100) DEFAULT NULL");
    console.log('已添加sign字段');
  } catch (e) {
    console.log('sign字段已存在');
  }

  await conn.end();
})();
