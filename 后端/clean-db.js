const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  console.log('=== 清洗前 ===');
  const [users] = await conn.query('SELECT id, phone, email FROM users');
  console.log('用户数:', users.length);
  console.log(users);

  // 保留管理员（手机号195662277441），删除其他所有用户
  await conn.query("DELETE FROM users WHERE phone <> '195662277441' OR phone IS NULL");

  console.log('\n=== 清洗后 ===');
  const [usersAfter] = await conn.query('SELECT id, phone, email FROM users');
  console.log('用户数:', usersAfter.length);
  console.log(usersAfter);

  const [tasks] = await conn.query('SELECT COUNT(*) as cnt FROM tasks');
  console.log('任务数:', tasks[0].cnt);

  await conn.end();
})();
