const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  // 创建管理员账号
  const passwordHash = await bcrypt.hash('123456', 10);
  await conn.query(
    'INSERT INTO users(phone, password_hash) VALUES(?, ?)',
    ['19562277441', passwordHash]
  );

  console.log('管理员账号已创建：');
  const [users] = await conn.query('SELECT id, phone, email FROM users');
  console.log(users);

  await conn.end();
})();
