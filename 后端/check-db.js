const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  // 查所有表
  const [tables] = await conn.query('SHOW TABLES');
  console.log('=== 所有表 ===');
  tables.forEach(t => console.log(' -', Object.values(t)[0]));

  // 查每个表的字段
  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [cols] = await conn.query(`DESCRIBE ${tableName}`);
    console.log(`\n=== ${tableName} 字段 ===`);
    cols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${c.Key || ''}`));
  }

  // 查themes表内容
  console.log('\n=== themes表数据 ===');
  const [themes] = await conn.query('SELECT * FROM themes ORDER BY sort_order');
  themes.forEach(t => console.log(`  ${t.theme_key} - ${t.theme_name} (${t.group_name})`));

  // 查user_themes表数据
  console.log('\n=== user_themes表数据 ===');
  const [userThemes] = await conn.query('SELECT * FROM user_themes');
  userThemes.forEach(t => console.log(`  user_id=${t.user_id} → ${t.theme_name}`));

  await conn.end();
})();
