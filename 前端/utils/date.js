// 日期与时间工具（移植自原型 helpers，适配小程序）
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const DOW_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 解析 "HH:MM:SS" / "HH:MM" -> "HH:MM"（无则 null）
function trimTime(t) {
  if (t == null || t === '') return null;
  const s = String(t);
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

// 给定日期字符串 "YYYY-MM-DD" 的展示
function dateSub(ds) {
  const d = new Date(ds + 'T00:00');
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + WEEK[d.getDay()];
}
function dateShort(ds, today) {
  if (ds === today) return '今日';
  const d = new Date(ds + 'T00:00');
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}
function isTodayStr(ds, today) { return ds === today; }

// 重复天数数组 -> 文案（与后端 repeatDays 0-6 对齐）
function repeatText(days) {
  if (!days || !days.length) return '不重复';
  if (days.length === 7) return '每天';
  const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // 周一→周日
  if (sorted.join(',') === '1,2,3,4,5') return '工作日';
  return '每周' + sorted.map(d => DOW_NAMES[d].slice(1)).join('、');
}

// 提醒分钟 -> 文案
function remindText(min) {
  if (min == null || min < 0) return '不提醒';
  if (min === 0) return '准时';
  if (min % 60 === 0) return '提前' + (min / 60) + '小时';
  return '提前' + min + '分钟';
}

// 生成本周/本月等工具
function startOfWeek(d) { // 周一为一周开始
  const x = new Date(d);
  const wd = (x.getDay() + 6) % 7; // 0=周一
  x.setDate(x.getDate() - wd);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

module.exports = {
  pad, ymd, addDays, WEEK, DOW_NAMES, MONTHS,
  trimTime, dateSub, dateShort, isTodayStr, repeatText, remindText,
  startOfWeek, startOfMonth, daysInMonth
};
