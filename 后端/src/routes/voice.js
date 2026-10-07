const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { parseVoice, parseVoiceMulti } = require('../util/parse');
const { parseTasksWithDeepSeek, parseVoiceAction, hasDeepSeek } = require('../util/deepseek');
const { rateLimit } = require('../middleware/rateLimit');

router.use(authMiddleware);

/* 每次解析都会调 DeepSeek（按 token 计费），必须限制单人调用频率。
   额度按「人」而不是按 IP —— 一个用户可能在多个网络下用，
   但计费是按账号走的。正常语速下一分钟说不了几次。 */
const parseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: '语音解析太频繁了，请稍等一会儿再试',
  keyFn: (req) => req.userId
});

const p2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
/** 'YYYY-MM-DD' 前后偏移天数 */
function shiftDate(ds, days) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return ymd(d);
}
/** 从任意日期表示里取出 YYYY-MM-DD */
function toYmd(v) {
  const m = String(v == null ? '' : v).match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

// 前端可查询「语义解析引擎」是否可用（不返回任何密钥信息）
router.get('/engine', (req, res) => {
  res.json({ engine: hasDeepSeek() ? 'deepseek' : 'local' });
});

/**
 * 语音文本 → 解析结果（**支持新建，也支持修改/删除已有任务**）
 * 返回：
 *   { intent:'create', tasks:[...] }
 *   { intent:'update', changes:[{id,title,desc,patch}] }
 *   { intent:'delete', changes:[{id,title,desc}] }
 * ASR 由前端浏览器原生完成，这里只收文字。
 */
router.post('/parse', parseLimiter, async (req, res) => {
  const { text, baseDate } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: '缺少文本' });
  }
  const base = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || '')) ? baseDate : ymd(new Date());

  /* 取用户近期的任务当上下文：模型据此判断「是在改哪一条」 */
  let existing = [];
  try {
    const [rows] = await pool.query(
      'SELECT id,title,date,start,end,cat FROM tasks WHERE user_id=? AND date BETWEEN ? AND ? ' +
        'ORDER BY date ASC, (start IS NULL), start ASC LIMIT 60',
      [req.userId, shiftDate(base, -30), shiftDate(base, 60)]
    );
    existing = rows
      .map((r) => ({
        id: r.id,
        title: r.title,
        date: toYmd(r.date),
        start: r.start ? String(r.start).slice(0, 5) : '',
        end: r.end ? String(r.end).slice(0, 5) : '',
        cat: r.cat || ''
      }))
      .filter((t) => t.date);
  } catch (e) {
    console.error('[voice] 读取任务上下文失败:', e && e.message);
  }

  // ① 意图解析（新建 / 修改 / 删除）
  const act = await parseVoiceAction(text, base, existing);
  if (act && ((act.tasks && act.tasks.length) || (act.changes && act.changes.length))) {
    return res.json(Object.assign({}, act, { source: 'deepseek' }));
  }

  // ② 回落到「纯新建」解析
  const list = await parseTasksWithDeepSeek(text, base);
  if (list && list.length) {
    return res.json({ intent: 'create', tasks: list, source: 'deepseek' });
  }

  // ③ 最后回落本地启发式（只支持新建）
  const tasks = parseVoiceMulti(text, new Date(base + 'T00:00:00'));
  res.json({ intent: 'create', tasks, source: 'local' });
});

// 兼容旧接口：只返回单条草稿
router.post('/parse-one', async (req, res) => {
  const { text, baseDate } = req.body || {};
  if (!text) return res.status(400).json({ error: '缺少文本' });
  const base = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || ''))
    ? new Date(baseDate + 'T00:00:00')
    : new Date();
  res.json({ draft: parseVoice(text, base) });
});

module.exports = router;
