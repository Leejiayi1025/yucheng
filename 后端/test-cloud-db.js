require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
    });
    const [[userCnt]] = await pool.query('SELECT COUNT(*) as cnt FROM users');
    const [[taskCnt]] = await pool.query('SELECT COUNT(*) as cnt FROM tasks');
    console.log('✅ 云数据库连接成功！');
    console.log(`数据库：${process.env.DB_NAME}`);
    console.log(`用户总数：${userCnt.cnt}`);
    console.log(`任务总数：${taskCnt.cnt}`);
    process.exit(0);
  } catch (e) {
    console.log('❌ 云数据库连接失败：', e.message);
    process.exit(1);
  }
})();
