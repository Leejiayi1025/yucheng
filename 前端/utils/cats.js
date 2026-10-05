// 分类配色（移植原型 CAT，并兼容后端默认分类 工作/学习/运动/生活/其他）
const CAT = {
  '学习': { bg: '#F5E0D5', fg: '#A67C6B' },
  '工作': { bg: '#C5E8E0', fg: '#4E8C7A' },
  '运动': { bg: '#E1F0F8', fg: '#5A8EAB' },
  '生活': { bg: '#E8F0D5', fg: '#6B7A4E' },
  '社交': { bg: '#EDE4F5', fg: '#7E6B9A' },
  '健康': { bg: '#F5E6B8', fg: '#9A7B2E' },
  '其他': { bg: '#F0EBE5', fg: '#7D7065' }
};

// 未知分类：由名字稳定生成一个柔和 pastel
function autoColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const bg = `hsl(${h},45%,92%)`;
  const fg = `hsl(${h},40%,42%)`;
  return { bg, fg };
}

function catColor(name) {
  return CAT[name] || autoColor(name || '其他');
}

module.exports = { CAT, catColor, autoColor };
