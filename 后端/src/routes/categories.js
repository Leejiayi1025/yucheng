const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// 列出当前用户的分类
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT name,color FROM categories WHERE user_id=? ORDER BY id ASC', [req.userId]
  );
  res.json({ categories: rows });
});

// 新增分类
router.post('/', async (req, res) => {
  const { name, color } = req.body || {};
  if (!name) return res.status(400).json({ error: '缺少分类名' });
  try {
    await pool.query('INSERT INTO categories(user_id,name,color) VALUES(?,?,?)', [req.userId, name, color || null]);
    res.json({ category: { name, color: color || null } });
  } catch (e) {
    return res.status(409).json({ error: '分类已存在' });
  }
});

// 删除分类（其下任务归为「其他」）
router.delete('/:name', async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  await pool.query('DELETE FROM categories WHERE user_id=? AND name=?', [req.userId, name]);
  await pool.query("UPDATE tasks SET cat='其他' WHERE user_id=? AND cat=?", [req.userId, name]);
  res.json({ ok: true });
});

module.exports = router;
