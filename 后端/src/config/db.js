require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yuecheng',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // 关键：DATE/TIME 直接返回字符串，否则 mysql2 会解析成 Date 对象，
  // String(r.date) 会变成英文长格式，前端拿到就废了
  dateStrings: true
});

module.exports = pool;
