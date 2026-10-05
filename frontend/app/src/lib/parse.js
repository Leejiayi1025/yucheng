// 本地启发式解析：仅在后端不可用时兜底
// 正式解析走后端 /api/voice/parse -> DeepSeek
import { pad, ymd, addDays } from './date';
import { CAT_NAMES } from './cats';

const DOW = { 日: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const KEYWORDS = [
  ['学习', ['学习', '复习', '看书', '作业', '上课', '考试', '背书']],
  ['工作', ['开会', '会议', '工作', '汇报', '项目', '面试', '加班']],
  ['运动', ['健身', '跑步', '游泳', '打球', '瑜伽', '训练', '锻炼']],
  ['社交', ['吃饭', '聚会', '见面', '电影', '朋友', '聚餐']],
  ['健康', ['睡觉', '休息', '体检', '吃药', '喝水']]
];

function guessCat(title) {
  for (const [cat, words] of KEYWORDS) {
    if (CAT_NAMES.includes(cat) && words.some((w) => title.includes(w))) return cat;
  }
  return '其他';
}

function cnNum(s) {
  if (/^\d+$/.test(s)) return +s;
  return CN[s] !== undefined ? CN[s] : NaN;
}

export function parseLocal(raw, base = new Date()) {
  const t = (raw || '').replace(/\s+/g, '');
  const res = { title: '', date: ymd(base), start: '', end: '', place: '', cat: '其他', remind: -1 };

  if (/大后天/.test(t)) res.date = ymd(addDays(base, 3));
  else if (/后天/.test(t)) res.date = ymd(addDays(base, 2));
  else if (/明天|明日/.test(t)) res.date = ymd(addDays(base, 1));
  else if (/周|星期/.test(t)) {
    const m = t.match(/(?:周|星期)([一二三四五六日])/);
    if (m) {
      const target = DOW[m[1]];
      let off = (target - base.getDay() + 7) % 7;
      if (off === 0) off = 7;
      res.date = ymd(addDays(base, off));
    }
  }

  const range = t.match(/(\d{1,2})[点:：.](\d{0,2})?[-~到至]+(\d{1,2})[点:：.](\d{0,2})?/);
  if (range) {
    let h1 = +range[1];
    let h2 = +range[3];
    if (/下午|傍晚|晚上|夜里/.test(t)) {
      if (h1 < 12) h1 += 12;
      if (h2 < 12) h2 += 12;
    }
    res.start = pad(h1) + ':' + pad(range[2] ? +range[2] : 0);
    res.end = pad(h2) + ':' + pad(range[4] ? +range[4] : 0);
  } else {
    const single = t.match(/(\d{1,2})[点:：.](\d{0,2})?/);
    if (single) {
      let h = +single[1];
      if (/下午|傍晚|晚上|夜里/.test(t) && h < 12) h += 12;
      res.start = pad(h) + ':' + pad(single[2] ? +single[2] : 0);
      // 只有开始时间，没有结束时间（纯提醒类任务）
      res.end = '';
    }
  }

  const p = t.match(/在([^，。、\s]{1,12})(?=开会|见面|健身|上课|吃饭|办公|集合|碰面|$)/);
  if (p) res.place = p[1];

  let title = (raw || '')
    .replace(/今天|今日|明天|明日|后天|大后天|下周[一二三四五六日]|周[一二三四五六日]|星期[一二三四五六日]/g, '')
    .replace(/\d{1,2}[点:：.]\d{0,2}\s*[-~到至]\s*\d{1,2}[点:：.]\d{0,2}/g, '')
    .replace(/\d{1,2}[点:：.]\d{0,2}/g, '')
    .replace(/(上午|早上|中午|下午|傍晚|晚上|凌晨|夜里)/g, '')
    .replace(/^(我要|我想|帮我|记得|提醒我|计划|想|要|请|麻烦)/, '')
    .replace(/[，,。.、；;]/g, '')
    .trim();
  if (!title) title = '新任务';
  res.title = title.slice(0, 30);
  res.cat = guessCat(title);
  res.type = res.start ? 'event' : 'todo';
  return res;
}

/** 按标点/连接词切分，支持一句话多任务 */
function splitSegments(text) {
  return String(text || '')
    .replace(/(然后|还有|接着|顺便|另外|之后|以及)/g, '|')
    .split(/[|，,。;；、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 多任务本地解析（后端不可用时的兜底） */
export function parseLocalMulti(text, base = new Date()) {
  const segs = splitSegments(text);
  const out = [];
  const seen = {};
  segs.forEach((seg) => {
    const t = parseLocal(seg, base);
    if (!t || !t.title || t.title === '新任务') return;
    if (!/[\u4e00-\u9fa5A-Za-z0-9]/.test(seg)) return;
    const key = [t.date, t.title, t.start].join('|');
    if (seen[key]) return;
    seen[key] = 1;
    out.push(t);
  });
  if (!out.length) out.push(parseLocal(text, base));
  out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (!!a.start !== !!b.start) return a.start ? -1 : 1;
    if (a.start && b.start) return a.start < b.start ? -1 : 1;
    return 0;
  });
  return out;
}
