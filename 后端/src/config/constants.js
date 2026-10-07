// 全局常量：只有一处定义，避免各处复制后改漏。
//
// 【重要 · 跨包同步】前端有一份等价的分类色板：
//   frontend/app/src/lib/cats.js 的 CAT
// 两个包各自独立构建，没法直接共享模块；改动这里的分类名时，
// 必须同步改前端那份，否则会出现「AI 产出前端不认识的分类」这类问题。
const CATS = ['学习', '工作', '运动', '社交', '健康', '其他'];

const DEFAULT_CAT = '其他';

module.exports = { CATS, DEFAULT_CAT };
