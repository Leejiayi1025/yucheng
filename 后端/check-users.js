const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  const [rows] = await conn.query('SELECT id, phone, email, nickname, role FROM users');
  console.log('=== 所有用户 ===');
  rows.forEach(r => console.log(`  #${r.id} phone=${r.phone} email=${r.email} nick=${r.nickname} role=${r.role}`));

  await conn.end();
})();
