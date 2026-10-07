const express = require('express');

/* Express 4 不会捕获 async 处理函数里抛出的 Promise rejection。
 *
 * 【为什么需要这个】路由写成 `async (req,res) => { await pool.query(...) }` 时，
 * 只要 await 抛错（比如 MySQL 连接被重置的 ECONNRESET），这个 rejection 就会
 * 变成 unhandledRejection —— 而 Node 15+ 默认直接终止进程。
 * 现象是「一个用户的一次请求失败，整个后端下线」，所有用户一起 502。
 * 线上实测踩过：tasks.js 的 /range 查询遇到 ECONNRESET，服务直接退出。
 *
 * 这里把错误显式转交给 Express 的错误处理中间件，变成一次 500 响应。
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* 等同 express.Router()，但注册处理函数时自动套上 asyncHandler，
   省得每个 await 外面都写一遍 try/catch。
   4 参数的函数是错误处理中间件，保持原样不包装。
   用法：把路由文件里的 `express.Router()` 换成这个即可。 */
function asyncRouter() {
  const router = express.Router();
  ['get', 'post', 'put', 'patch', 'delete'].forEach((method) => {
    const raw = router[method].bind(router);
    router[method] = (path, ...handlers) =>
      raw(path, ...handlers.map((h) => (h.length === 4 ? h : asyncHandler(h))));
  });
  return router;
}

module.exports = { asyncHandler, asyncRouter };
