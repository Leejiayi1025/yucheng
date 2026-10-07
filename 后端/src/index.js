const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const catRoutes = require('./routes/categories');
const voiceRoutes = require('./routes/voice');
const pool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// 托管public目录（管理后台静态资源）
app.use(express.static(require('path').join(__dirname, '..', 'public')));

// 管理后台页面，同时支持 /admin 和 /admin.html 两种路径
const adminPath = require('path').join(__dirname, '..', 'public', 'admin.html');
app.get('/admin', (req, res) => res.sendFile(adminPath));
app.get('/admin.html', (req, res) => res.sendFile(adminPath));

// 埋点接口：接收前端事件
app.post('/api/track', async (req, res) => {
  try {
    const { event_name, event_data, page } = req.body || {};
    if (!event_name) return res.json({ ok: true }); // 静默忽略
    // 从token里拿user_id
    const auth = req.headers.authorization || '';
    let userId = null;
    if (auth.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'change_this_to_a_long_random_secret');
        userId = decoded.uid;
      } catch {}
    }
    await pool.query(
      'INSERT INTO events (user_id, event_name, event_data, page) VALUES (?, ?, ?, ?)',
      [userId, event_name, event_data ? JSON.stringify(event_data) : null, page || null]
    );
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true }); // 埋点失败不影响用户
  }
});

// 数据统计接口（管理员用）
app.get('/api/admin/stats', async (req, res) => {
  try {
    // 校验管理员
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'yucheng_secret');
    const [users] = await pool.query('SELECT role FROM users WHERE id=?', [decoded.uid]);
    if (!users.length || users[0].role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });

    // 总用户数
    const [[userCount]] = await pool.query('SELECT COUNT(*) as cnt FROM users');
    // 总任务数
    const [[taskCount]] = await pool.query('SELECT COUNT(*) as cnt FROM tasks');
    // 今日新增用户
    const [[todayUsers]] = await pool.query('SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at)=CURDATE()');
    // 事件总数
    const [[eventCount]] = await pool.query('SELECT COUNT(*) as cnt FROM events');
    // 最近7天每天事件数
    const [dailyEvents] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as cnt 
      FROM events 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) 
      ORDER BY date
    `);
    // 热门事件TOP10
    const [topEvents] = await pool.query(`
      SELECT event_name, COUNT(*) as cnt 
      FROM events 
      GROUP BY event_name 
      ORDER BY cnt DESC 
      LIMIT 10
    `);
    // 语音添加成功次数
    const [[voiceAdd]] = await pool.query(`
      SELECT COUNT(*) as cnt FROM events WHERE event_name='task_add' AND JSON_EXTRACT(event_data, '$.method')='voice'
    `);
    // 已完成任务数
    const [[completedTasks]] = await pool.query(`SELECT COUNT(*) as cnt FROM tasks WHERE status='done'`);
    // 语音解析成功/失败次数
    const [[voiceSuccess]] = await pool.query(`SELECT COUNT(*) as cnt FROM events WHERE event_name='voice_parse_success'`);
    const [[voiceFail]] = await pool.query(`SELECT COUNT(*) as cnt FROM events WHERE event_name='voice_parse_fail'`);
    const voiceTotal = voiceSuccess.cnt + voiceFail.cnt;
    const voiceSuccessRate = voiceTotal ? Math.round(voiceSuccess.cnt / voiceTotal * 100) : 0;
    // 闹钟触发次数
    const [[alarmCount]] = await pool.query(`SELECT COUNT(*) as cnt FROM events WHERE event_name='alarm_ring'`);
    // 主题偏好统计
    let themeStats = [];
    try {
      const [themeRows] = await pool.query(`
        SELECT theme, COUNT(*) as cnt FROM user_themes GROUP BY theme ORDER BY cnt DESC
      `);
      themeStats = themeRows;
    } catch { /* 表不存在就用默认 */ }
    // 完成率
    const completionRate = taskCount.cnt ? Math.round(completedTasks.cnt / taskCount.cnt * 100) : 0;

    res.json({
      users: userCount.cnt,
      tasks: taskCount.cnt,
      today_new_users: todayUsers.cnt,
      total_events: eventCount.cnt,
      voice_adds: voiceAdd.cnt,
      completed_tasks: completedTasks.cnt,
      completion_rate: completionRate,
      voice_success_rate: voiceSuccessRate,
      alarm_count: alarmCount.cnt,
      theme_stats: themeStats,
      daily_events: dailyEvents,
      top_events: topEvents
    });
  } catch (e) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 用户列表接口（管理员用）
app.get('/api/admin/users', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'change_this_to_a_long_random_secret');
    const [users] = await pool.query('SELECT role FROM users WHERE id=?', [decoded.uid]);
    if (!users.length || users[0].role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });

    const [list] = await pool.query(`
      SELECT u.id, u.nickname, u.email, u.phone, u.role, u.created_at,
        (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id) as task_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', catRoutes);
app.use('/api/voice', voiceRoutes);

// 前端页面托管：优先 Vite 构建产物 frontend/app/dist（真正的前端工程），
// 其次才是旧的单文件 h5（仅作参考，已不推荐使用）
const dist = path.join(__dirname, '..', '..', 'frontend', 'app', 'dist');
const h5 = path.join(__dirname, '..', '..', 'frontend', 'h5');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  // SPA 兜底：非 /api 的请求都回 index.html
  // 注意：Express 5 的 path-to-regexp 已不支持 app.get('*') 通配写法
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
  console.log('前端构建产物已托管(frontend/dist)');
} else if (fs.existsSync(h5)) {
  app.use(express.static(h5));
  console.log('H5 单文件已托管(frontend/h5)');
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('语程后端已启动: http://localhost:' + PORT);
});
