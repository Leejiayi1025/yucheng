const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'yucheng'
  });

  // 创建主题字典表
  await conn.query(`
    CREATE TABLE IF NOT EXISTS themes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      theme_key VARCHAR(30) NOT NULL UNIQUE,
      theme_name VARCHAR(50) NOT NULL,
      description VARCHAR(200) DEFAULT '',
      group_name VARCHAR(20) DEFAULT 'classic',
      preview_bg VARCHAR(100) DEFAULT '',
      preview_card VARCHAR(20) DEFAULT '#fff',
      preview_text VARCHAR(20) DEFAULT '#000',
      preview_primary VARCHAR(20) DEFAULT '#6b8e7b',
      sort_order INT DEFAULT 0,
      is_active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('themes表创建成功');

  // 插入默认主题数据
  const themes = [
    { key: 'sage', name: '奶油鼠尾草', group: 'classic', bg: '#f5f1ec', card: '#fff', text: '#2d3a33', primary: '#6b8e7b', sort: 1 },
    { key: 'ios-minimal', name: 'iOS黑白极简', group: 'classic', bg: '#f5f5f7', card: '#fff', text: '#000', primary: '#000', sort: 2 },
    { key: 'bento', name: 'iOS 原生风', group: 'classic', bg: '#f2f2f7', card: '#fff', text: '#000', primary: '#007aff', sort: 3 },
    { key: 'mono', name: '线框工程风', group: 'classic', bg: '#fafafa', card: '#fff', text: '#111', primary: '#111', sort: 4 },
    { key: 'luxe', name: '暗黑奢华黑金', group: 'dark', bg: '#0a0a0a', card: '#151412', text: '#f3eadb', primary: '#d4af37', sort: 5 },
    { key: 'film', name: '复古胶片风', group: 'dark', bg: '#2a2520', card: '#3a3028', text: '#e8d8c0', primary: '#c97b4a', sort: 6 },
    { key: 'morandi', name: '莫兰迪色系', group: 'light', bg: '#e8e0d8', card: '#f5f0ea', text: '#5a5048', primary: '#a89a90', sort: 7 },
    { key: 'navy', name: '藏青商务风', group: 'dark', bg: '#0f172a', card: '#1e293b', text: '#e2e8f0', primary: '#3b82f6', sort: 8 },
    { key: 'peach', name: '蜜桃奶油风', group: 'light', bg: '#fff0e8', card: '#fff8f3', text: '#5a3a2a', primary: '#ff9a7a', sort: 9 },
    { key: 'forest', name: '森林墨绿风', group: 'dark', bg: '#1a2e1f', card: '#243b2b', text: '#d8e8d8', primary: '#4a9a5a', sort: 10 },
    { key: 'terminal', name: '终端绿极客', group: 'dark', bg: '#0a0f0a', card: '#1a2a1a', text: '#00ff41', primary: '#00ff41', sort: 11 },
    { key: 'paper', name: '手绘手账', group: 'texture', bg: '#f4ecd8', card: '#fefcf5', text: '#5a4a3a', primary: '#5b9e5b', sort: 12 },
    { key: 'clay', name: '3D 黏土', group: 'texture', bg: '#d4e4ed', card: '#fdfaf3', text: '#3a4a52', primary: '#5aa564', sort: 13 },
  ];

  for (const t of themes) {
    await conn.query(
      'INSERT IGNORE INTO themes (theme_key, theme_name, group_name, preview_bg, preview_card, preview_text, preview_primary, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [t.key, t.name, t.group, t.bg, t.card, t.text, t.primary, t.sort]
    );
  }
  console.log(`已插入${themes.length}个主题`);

  await conn.end();
})();
