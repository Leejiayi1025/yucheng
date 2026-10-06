const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken, authMiddleware } = require('../middleware/auth');
const { sendCodeMail, hasMailer, mailMode } = require('../util/mailer');

const DEFAULT_CATS = ['工作', '学习', '运动', '生活', '其他'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL = 5 * 60 * 1000; // 验证码 5 分钟
const RESEND_GAP = 60 * 1000; // 同一邮箱 60 秒内不可重复发

/* 验证码存内存（单进程足够；重启后失效，用户重新获取即可） */
const codes = new Map(); // email -> { code, at, exp }

const newCode = () => String(Math.floor(100000 + Math.random() * 900000));
const normEmail = (v) => String(v || '').trim().toLowerCase();

/** 校验并消费验证码，通过返回 ''，否则返回错误文案 */
function consumeCode(email, code) {
  const rec = codes.get(email);
  if (!rec) return '请先获取验证码';
  if (Date.now() > rec.exp) {
    codes.delete(email);
    return '验证码已过期，请重新获取';
  }
  if (String(code || '').trim() !== rec.code) return '验证码不正确';
  codes.delete(email);
  return '';
}

/* ---------- 邮件配置自检（部署后用来确认邮箱是否配好） ---------- */
router.get('/mail-status', (req, res) => {
  const mode = mailMode();
  res.json({
    mode, // smtp | api | none
    ok: mode !== 'none',
    hint:
      mode === 'smtp'
        ? '已配置 SMTP，验证码会真实发到用户邮箱'
        : mode === 'api'
          ? '已配置邮件 API，验证码会真实发到用户邮箱'
          : '未配置邮件服务，验证码会直接返回给前端（仅开发用）'
  });
});

/* ---------- 发送验证码（邮箱） ---------- */
router.post('/send-code', async (req, res) => {
  try {
    const email = normEmail((req.body || {}).email);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });

    const prev = codes.get(email);
    if (prev && Date.now() - prev.at < RESEND_GAP) {
      const wait = Math.ceil((RESEND_GAP - (Date.now() - prev.at)) / 1000);
      return res.status(429).json({ error: '发送太频繁，请 ' + wait + ' 秒后再试' });
    }

    const code = newCode();
    codes.set(email, { code, at: Date.now(), exp: Date.now() + CODE_TTL });

    const r = await sendCodeMail(email, code, CODE_TTL / 60000);
    if (r.sent) return res.json({ ok: true, emailed: true, via: r.via, mode: mailMode() });

    // 还没配好邮件服务：把验证码直接给前端，保证流程能测通
    console.warn('[auth] 邮件未发出（' + (r.error || '') + '），验证码：' + code);
    res.json({
      ok: true,
      emailed: false,
      dev: true,
      code,
      mode: mailMode(),
      hint: hasMailer() ? '邮件发送失败：' + r.error : '邮件服务未配置，验证码暂直接显示'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '发送失败' });
  }
});

/* ---------- 注册（邮箱 + 验证码） ---------- */
router.post('/register', async (req, res) => {
  try {
    const body = req.body || {};
    const email = normEmail(body.email);
    const { code, password, nickname, phone } = body;

    if (email) {
      // 邮箱注册（主流程）
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
      if (!password || password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
      const err = consumeCode(email, code);
      if (err) return res.status(400).json({ error: err });
      const [dup] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
      if (dup.length) return res.status(409).json({ error: '该邮箱已注册' });

      const hash = await bcrypt.hash(password, 10);
      const [r] = await pool.query(
        'INSERT INTO users(email,phone,password_hash,nickname) VALUES(?,?,?,?)',
        [email, phone || null, hash, nickname || '语程用户']
      );
      const userId = r.insertId;
      for (const n of DEFAULT_CATS) {
        await pool.query('INSERT IGNORE INTO categories(user_id,name,color) VALUES(?,?,?)', [userId, n, null]);
      }
      const token = signToken(userId);
      return res.json({
        token,
        user: { id: userId, email, nickname: nickname || '语程用户', theme: 'sage' }
      });
    }

    // 兼容老的手机号注册
    if (!phone || !/^1\d{10}$/.test(phone)) return res.status(400).json({ error: '邮箱或手机号格式不正确' });
    if (!password || password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
    const [exists] = await pool.query('SELECT id FROM users WHERE phone=?', [phone]);
    if (exists.length) return res.status(409).json({ error: '该手机号已注册' });
    const hash = await bcrypt.hash(password, 10);
    const [r2] = await pool.query(
      'INSERT INTO users(phone,password_hash,nickname) VALUES(?,?,?)',
      [phone, hash, nickname || '语程用户']
    );
    for (const n of DEFAULT_CATS) {
      await pool.query('INSERT IGNORE INTO categories(user_id,name,color) VALUES(?,?,?)', [r2.insertId, n, null]);
    }
    res.json({
      token: signToken(r2.insertId),
      user: { id: r2.insertId, phone, nickname: nickname || '语程用户', theme: 'sage' }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '注册失败' });
  }
});

/* ---------- 登录（邮箱或手机号都行） ---------- */
router.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const acc = String(body.account || body.email || body.phone || '').trim();
    if (!acc) return res.status(400).json({ error: '请输入邮箱或手机号' });
    const [rows] = await pool.query('SELECT * FROM users WHERE email=? OR phone=? LIMIT 1', [
      acc.toLowerCase(),
      acc
    ]);
    if (!rows.length) return res.status(401).json({ error: '账号不存在' });
    const u = rows[0];
    const ok = await bcrypt.compare(body.password || '', u.password_hash);
    if (!ok) return res.status(401).json({ error: '密码错误' });
    const token = signToken(u.id);
    res.json({
      token,
      user: { id: u.id, phone: u.phone || '', email: u.email || '', nickname: u.nickname, theme: u.theme, role: u.role || 'user' }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '登录失败' });
  }
});

/* ---------- 当前用户 ---------- */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,phone,email,nickname,sign,avatar,theme,role,created_at FROM users WHERE id=?',
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: '用户不存在' });
    res.json({ user: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '查询失败' });
  }
});

/* ---------- 修改密码 ---------- */
router.post('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword, code } = req.body || {};
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
    const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: '用户不存在' });
    const ok = await bcrypt.compare(oldPassword || '', rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: '原密码不正确' });

    // 校验邮箱验证码
    const email = rows[0].email;
    if (!email) return res.status(400).json({ error: '请先绑定邮箱' });
    const err = consumeCode(email, code);
    if (err) return res.status(400).json({ error: err });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '修改失败' });
  }
});

/* ---------- 绑定 / 更换邮箱 ---------- */
router.post('/email', authMiddleware, async (req, res) => {
  try {
    const email = normEmail((req.body || {}).email);
    const code = (req.body || {}).code;
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
    const err = consumeCode(email, code);
    if (err) return res.status(400).json({ error: err });
    const [dup] = await pool.query('SELECT id FROM users WHERE email=? AND id<>?', [email, req.userId]);
    if (dup.length) return res.status(409).json({ error: '该邮箱已被其他账号使用' });
    await pool.query('UPDATE users SET email=? WHERE id=?', [email, req.userId]);
    res.json({ ok: true, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '绑定失败' });
  }
});

/* ---------- 主题列表（公开接口，不用登录也能看） ---------- */
router.get('/themes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT theme_key as key, theme_name as name, group_name as `group`, preview_bg as bg, preview_card as card, preview_text as text, preview_primary as primary FROM themes WHERE is_active=1 ORDER BY sort_order'
    );
    res.json({ themes: rows });
  } catch (e) {
    res.json({ themes: [] });
  }
});

/* ---------- 用户主题 ---------- */
// 获取当前用户主题
router.get('/theme', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT theme_name FROM user_themes WHERE user_id=?', [req.userId]);
    const theme = rows.length ? rows[0].theme_name : 'sage';
    res.json({ theme });
  } catch (e) {
    res.json({ theme: 'sage' });
  }
});

// 保存当前用户主题
router.put('/theme', authMiddleware, async (req, res) => {
  try {
    const { theme } = req.body || {};
    if (!theme) return res.status(400).json({ error: '缺少主题名' });
    await pool.query(
      'INSERT INTO user_themes (user_id, theme_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE theme_name=?',
      [req.userId, theme, theme]
    );
    res.json({ ok: true, theme });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '保存失败' });
  }
});

/* ---------- 更新个人信息（昵称/签名/头像） ---------- */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nickname, sign, avatar, theme } = req.body || {};
    const updates = [];
    const params = [];

    if (nickname !== undefined) {
      updates.push('nickname=?');
      params.push(String(nickname).slice(0, 40));
    }
    if (sign !== undefined) {
      updates.push('sign=?');
      params.push(String(sign).slice(0, 100));
    }
    if (avatar !== undefined) {
      updates.push('avatar=?');
      params.push(avatar || null); // base64字符串或null
    }
    if (theme !== undefined) {
      updates.push('theme=?');
      params.push(String(theme).slice(0, 30));
    }

    if (!updates.length) return res.json({ ok: true });

    params.push(req.userId);
    await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);

    // 返回最新用户信息
    const [rows] = await pool.query(
      'SELECT id, phone, email, nickname, sign, avatar, theme FROM users WHERE id=?',
      [req.userId]
    );
    res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '更新失败' });
  }
});

/* ---------- 绑定手机号（邮箱验证码验证） ---------- */
router.post('/phone', authMiddleware, async (req, res) => {
  try {
    const phone = String(req.body || {}).phone || ''.trim();
    const code = (req.body || {}).code;
    if (!/^1\d{10}$/.test(phone)) return res.status(400).json({ error: '请输入正确的手机号' });

    // 校验邮箱验证码
    const [rows] = await pool.query('SELECT email FROM users WHERE id=?', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: '用户不存在' });
    const email = rows[0].email;
    if (!email) return res.status(400).json({ error: '请先绑定邮箱' });
    const err = consumeCode(email, code);
    if (err) return res.status(400).json({ error: err });

    // 检查手机号是否已被占用
    const [dup] = await pool.query('SELECT id FROM users WHERE phone=? AND id<>?', [phone, req.userId]);
    if (dup.length) return res.status(409).json({ error: '该手机号已被其他账号使用' });

    await pool.query('UPDATE users SET phone=? WHERE id=?', [phone, req.userId]);
    res.json({ ok: true, phone });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '绑定失败' });
  }
});

/* ---------- 注销账号 ---------- */
router.post('/delete', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT email FROM users WHERE id=?', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: '用户不存在' });
    const email = rows[0].email;
    if (!email) return res.status(400).json({ error: '请先绑定邮箱' });

    // 校验验证码
    const code = (req.body || {}).code;
    const err = consumeCode(email, code);
    if (err) return res.status(400).json({ error: err });

    // 删除用户及其任务
    await pool.query('DELETE FROM tasks WHERE user_id=?', [req.userId]);
    await pool.query('DELETE FROM users WHERE id=?', [req.userId]);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '注销失败' });
  }
});

module.exports = router;
