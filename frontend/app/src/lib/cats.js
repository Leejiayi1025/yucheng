/* 分类名必须与后端保持一致（后端是 后端/src/config/constants.js 的 CATS）。
   两边各自独立构建、无法直接共享模块，改这里时务必同步改后端那份，
   否则 AI 会产出前端不认识的分类、或注册默认分类与色板对不上。 */
export const CAT = {
  学习: { bg: '#F5E0D5', fg: '#A67C6B' },
  工作: { bg: '#C5E8E0', fg: '#4E8C7A' },
  运动: { bg: '#E1F0F8', fg: '#5A8EAB' },
  社交: { bg: '#EDE4F5', fg: '#7E6B9A' },
  健康: { bg: '#F5E6B8', fg: '#9A7B2E' },
  其他: { bg: '#F0EBE5', fg: '#7D7065' }
};

export const CAT_NAMES = Object.keys(CAT);

/** 未收录的分类：用名称哈希生成稳定的柔和色 */
export function autoColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { bg: `hsl(${h}, 42%, 90%)`, fg: `hsl(${h}, 38%, 42%)` };
}

export function catColor(name) {
  return CAT[name] || autoColor(name || '其他');
}
