const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  const [rows] = await conn.query('SELECT * FROM events ORDER BY id DESC LIMIT 5');
  console.log('=== 最近5条埋点数据 ===');
  rows.forEach(r => console.log(`  #${r.id} [${r.event_name}] user=${r.user_id} page=${r.page} data=${r.event_data} time=${r.created_at}`));

  await conn.end();
})();
