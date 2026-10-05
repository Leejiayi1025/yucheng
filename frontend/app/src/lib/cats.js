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
