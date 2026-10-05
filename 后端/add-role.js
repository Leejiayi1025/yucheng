const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  // 加role字段（如果不存在）
  try {
    await conn.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
    console.log('已添加role字段');
  } catch (e) {
    console.log('role字段已存在');
  }

  // 设置管理员账号
  await conn.query("UPDATE users SET role='admin' WHERE phone='19562277441'");

  // 查看结果
  const [users] = await conn.query('SELECT id, phone, role FROM users');
  console.log('用户列表:', users);

  await conn.end();
})();
