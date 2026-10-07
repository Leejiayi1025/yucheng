const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { asyncRouter } = require('../middleware/asyncHandler');

// 用 asyncRouter：本文件的路由都是 async，await 抛错必须转成 500 而不是杀掉进程
const router = asyncRouter();

function fmtTime(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v.slice(0, 5);
  // mysql2 偶会把 TIME 解析成对象
  try { return String(v).slice(0, 5); } catch (e) { return null; }
}

function rowToTask(r) {
  return {
    id: r.id,
    date: String(r.date),
    title: r.title,
    start: fmtTime(r.start),
    end: fmtTime(r.end),
    place: r.place,
    cat: r.cat,
    status: r.status,
    remind: r.remind,
    note: r.note,
    repeatDays: r.repeat_days ? JSON.parse(r.repeat_days) : null
  };
}

router.use(authMiddleware);

// 按日期查任务
router.get('/', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: '缺少 date' });
  const [rows] = await pool.query(
    'SELECT * FROM tasks WHERE user_id=? AND date=? ORDER BY (start IS NULL), start ASC, id ASC',
    [req.userId, date]
  );
  res.json({ tasks: rows.map(rowToTask) });
});

// 区间查任务（日历用）
router.get('/range', async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: '缺少 start/end' });
  const [rows] = await pool.query(
    'SELECT * FROM tasks WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY date ASC, (start IS NULL), start ASC',
    [req.userId, start, end]
  );
  res.json({ tasks: rows.map(rowToTask) });
});

// 新建
router.post('/', async (req, res) => {
  const t = req.body || {};
  if (!t.title) return res.status(400).json({ error: '缺少标题' });
  if (!t.date) return res.status(400).json({ error: '缺少日期' });
  const rd = t.repeatDays ? JSON.stringify(t.repeatDays) : null;
  const [r] = await pool.query(
    'INSERT INTO tasks(user_id,date,title,start,end,place,cat,status,remind,note,repeat_days) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    [req.userId, t.date, t.title, t.start || null, t.end || null, t.place || null, t.cat || '其他', t.status ?? 0, t.remind ?? -1, t.note || null, rd]
  );
  const [rows] = await pool.query('SELECT * FROM tasks WHERE id=?', [r.insertId]);
  res.json({ task: rowToTask(rows[0]) });
});

// 更新
router.put('/:id', async (req, res) => {
  const t = req.body || {};
  const [own] = await pool.query('SELECT id FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.userId]);
  if (!own.length) return res.status(404).json({ error: '任务不存在' });
  const sets = [], vals = [];
  const map = {
    date: t.date, title: t.title, start: t.start, end: t.end,
    place: t.place, cat: t.cat, status: t.status, remind: t.remind, note: t.note
  };
  for (const k in map) {
    if (map[k] !== undefined) { sets.push(`${k}=?`); vals.push(map[k]); }
  }
  if (t.repeatDays !== undefined) {
    sets.push('repeat_days=?');
    vals.push(t.repeatDays ? JSON.stringify(t.repeatDays) : null);
  }
  if (!sets.length) { const [cur] = await pool.query('SELECT * FROM tasks WHERE id=?', [req.params.id]); return res.json({ task: rowToTask(cur[0]) }); }
  vals.push(req.params.id);
  await pool.query('UPDATE tasks SET ' + sets.join(',') + ' WHERE id=?', vals);
  const [rows] = await pool.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
  res.json({ task: rowToTask(rows[0]) });
});

// 删除
router.delete('/:id', async (req, res) => {
  const [own] = await pool.query('SELECT id FROM tasks WHERE id=? AND user_id=?', [req.params.id, req.userId]);
  if (!own.length) return res.status(404).json({ error: '任务不存在' });
  await pool.query('DELETE FROM tasks WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
