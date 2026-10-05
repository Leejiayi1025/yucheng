const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_a_long_random_secret';

function signToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
}

// Express 中间件：校验 Authorization: Bearer <token>
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: '未登录' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }

  /* 再确认用户仍然存在。
     token 签名有效但账号已被删除时（例如清库/删号），如果直接放行，
     后续写入会以「外键约束失败」的 500 报错结束 —— 前端只会看到一句
     莫名其妙的报错，也不会触发重新登录。这里直接回 401，让前端走登出流程。 */
  pool
    .query('SELECT id FROM users WHERE id=?', [payload.uid])
    .then(([rows]) => {
      if (!rows.length) return res.status(401).json({ error: '账号不存在，请重新登录' });
      req.userId = payload.uid;
      next();
    })
    .catch((e) => {
      console.error('[auth] 校验用户失败:', e && e.message);
      res.status(503).json({ error: '服务暂不可用，请稍后再试' });
    });
}

module.exports = { signToken, authMiddleware };
