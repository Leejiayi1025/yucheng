export const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function pad(n) {
  return String(n).padStart(2, '0');
}
export function ymd(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function parseDS(ds) {
  return new Date(ds + 'T00:00:00');
}
export function dateShort(ds, todayDs) {
  if (ds === todayDs) return '今日';
  const d = parseDS(ds);
  return d.getMonth() + 1 + '月' + d.getDate() + '日';
}
export function dateLabel(ds) {
  const d = parseDS(ds);
  return d.getMonth() + 1 + '月' + d.getDate() + '日 周' + WEEK[d.getDay()];
}
/** 周一为一周起点 */
export function weekStart(ds) {
  const d = parseDS(ds);
  const off = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return addDays(d, -off);
}
export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

export function repeatText(days) {
  if (!days || !days.length) return '';
  const s = [...days].sort((a, b) => (a + 6) % 7 - (b + 6) % 7);
  if (s.length === 7) return '每天';
  if (s.length === 5 && [1, 2, 3, 4, 5].every((d) => s.includes(d))) return '工作日';
  return '每周' + s.map((d) => WEEK[d]).join('、');
}

/** remind: -1 不提醒 / 0 准时 / >0 提前 N 分钟 */
export function remindText(min) {
  if (min === -1 || min == null) return '不提醒';
  if (min === 0) return '准时';
  if (min % 60 === 0) return '提前' + min / 60 + '小时';
  return '提前' + min + '分钟';
}
export function remindAt(t) {
  if (!t.start || !(t.remind >= 0)) return null;
  const [h, m] = t.start.split(':').map(Number);
  const d = parseDS(t.date);
  d.setHours(h, m, 0, 0);
  return new Date(d.getTime() - t.remind * 60000);
}

export function overlap(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !bStart) return false;
  const e1 = aEnd || aStart;
  const e2 = bEnd || bStart;
  return aStart < e2 && bStart < e1;
}

/** 找同一天里与 t 时间重叠的另一条（用于冲突提醒） */
export function findConflict(t, tasks, ignoreId) {
  if (!t.start) return null;
  return (
    tasks.find(
      (x) =>
        x.id !== ignoreId &&
        x.id !== t.id &&
        x.date === t.date &&
        x.start &&
        x.status !== 'done' &&
        overlap(t.start, t.end, x.start, x.end)
    ) || null
  );
}
