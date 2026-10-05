const mysql = require('mysql2/promise');
(async () => {
  const p = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });
  const [rows] = await p.query('SELECT user_id, COUNT(*) as cnt FROM tasks GROUP BY user_id');
  console.log('Tasks by user:');
  rows.forEach(r => console.log(`  user_id=${r.user_id}: ${r.cnt} tasks`));
  await p.end();
})();
