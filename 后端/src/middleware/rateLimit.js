// 极简内存限流：固定窗口计数，无外部依赖。
//
// 【为什么自己写】项目只需要「防刷」这一个诉求，为此引一个依赖不划算。
// 【已知限制】计数存在进程内存里：
//   - 多实例部署时各实例独立计数，实际额度会被放大到「实例数 × max」；
//   - 重启即清零。
// 本项目当前是单实例，够用。若将来真正需要精确限流，换成 Redis 计数即可，
// 接口（中间件工厂）不用变。
function rateLimit({ windowMs, max, message = '操作太频繁，请稍后再试', keyFn }) {
  const hits = new Map(); // key -> { count, resetAt }

  // 定期清扫过期 key，否则 Map 会随访问过的 IP/用户数无限增长
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, windowMs);
  if (sweeper.unref) sweeper.unref();

  return function rateLimitMiddleware(req, res, next) {
    // keyFn 返回空值时放行：宁可少限流，也不要因为拿不到 key 把正常用户挡在外面
    const key = keyFn ? keyFn(req) : req.ip;
    if (!key) return next();

    const now = Date.now();
    let rec = hits.get(key);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(key, rec);
    }
    rec.count += 1;

    if (rec.count > max) {
      res.set('Retry-After', String(Math.ceil((rec.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { rateLimit };
