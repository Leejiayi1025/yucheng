// AssemblyAI 实时语音识别（Universal-3.5 Pro Streaming）—— 后端只负责签发「临时令牌」。
// 永久密钥 ASSEMBLYAI_API_KEY 只存在于服务端环境变量，绝不返回给前端、绝不写进日志。
// 前端拿到一次性、短期有效的临时令牌后，直连 wss://streaming.assemblyai.com/v3/ws。
const { authMiddleware } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { asyncRouter } = require('../middleware/asyncHandler');

const router = asyncRouter();
router.use(authMiddleware);

const TOKEN_URL = 'https://streaming.assemblyai.com/v3/token';
const WS_ENDPOINT = 'wss://streaming.assemblyai.com/v3/ws';
const MODEL = 'universal-3-5-pro';

// 临时令牌有效期（AssemblyAI 要求 1~600 秒）；录一句话通常 30 秒内，给 120 秒足够
const EXPIRES_IN = 120;

// 令牌只在「开始录音」前申请一次，限频防止接口被刷（每次请求都会向上游建会话配额）
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: '语音启动太频繁了，请稍等一会儿再试',
  keyFn: (req) => req.userId
});

/**
 * GET /api/voice/asr/token
 * 返回：{ token, expiresInSeconds, endpoint, model, languageCodes }
 * token 为一次性临时令牌，仅用于建立单个 WebSocket 会话，计费归属本服务账号。
 */
router.get('/token', tokenLimiter, async (req, res) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: '语音识别服务未配置' });
  }

  const url = TOKEN_URL + '?expires_in_seconds=' + EXPIRES_IN;
  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'GET',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // 只记录错误本身，绝不记录请求头（其中含密钥）
    console.error('[asr] 令牌服务网络失败:', e && e.message);
    return res.status(502).json({ error: '语音识别服务暂时不可用，请稍后重试' });
  }

  if (!upstream.ok) {
    console.error('[asr] 令牌接口返回 HTTP', upstream.status);
    return res.status(502).json({ error: '语音识别服务暂时不可用，请稍后重试' });
  }

  const data = await upstream.json().catch(() => null);
  if (!data || !data.token) {
    console.error('[asr] 令牌响应缺少 token 字段');
    return res.status(502).json({ error: '语音识别服务暂时不可用，请稍后重试' });
  }

  res.json({
    token: data.token,
    expiresInSeconds: EXPIRES_IN,
    endpoint: WS_ENDPOINT,
    model: MODEL,
    // 单语（普通话）会话：单元素列表锁定中文，避免中文被按英语识别
    languageCodes: ['zh']
  });
});

module.exports = router;
