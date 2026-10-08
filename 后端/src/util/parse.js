// 本地启发式解析（后端兜底）：语音/自然语言 → 任务清单（支持一句话多任务）
// 正式解析由 DeepSeek 完成，只有在模型不可用时才走这里。
// 所有时间/日期均按北京时间（UTC+8）计算，见 util/timecn.js，不依赖容器时区。
const { cnNow, cnYmd } = require('./timecn');

function pad(n) { return String(n).padStart(2, '0'); }

const DOW = { '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };

// 口语噪声：句首语气词 / 口头禅
const NOISE = /^(嗯|呃|啊|哦|唉|那个|这个|就是说|然后|还有|接着|顺便|对了|另外|反正|大概|差不多|我要|我想|我打算|帮我|给我|记得|别忘了|提醒我|安排一下|搞一下|弄一下)+/;

function cleanText(s) {
  let t = String(s || '').trim();
  let prev;
  do {
    prev = t;
    t = t.replace(NOISE, '').trim();
  } while (t !== prev && t);
  return t;
}

/** 中文数字 → 阿拉伯数字（用于「提前十分钟」这类） */
function cnToNum(s) {
  if (/^\d+$/.test(s)) return +s;
  const map = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (s === '半') return 30;
  if (map[s] !== undefined) return map[s];
  const m = s.match(/^十([一二三四五六七八九])$/);
  if (m) return 10 + map[m[1]];
  return NaN;
}

/** 中文数字 → 阿拉伯数字（支持 一~十、十一~十九、二十、两；用于「十一点」「三点半」） */
function cnToNumFull(s) {
  if (/^\d+$/.test(s)) return +s;
  if (s === '两') return 2;
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (map[s] !== undefined) return map[s];
  if (s === '十') return 10;
  let m = s.match(/^十([一二三四五六七八九])$/);
  if (m) return 10 + map[m[1]];
  m = s.match(/^二?十([一二三四五六七八九])?$/);
  if (m) return 20 + (m[1] ? map[m[1]] : 0);
  m = s.match(/^两([一二三四五六七八九])$/);
  if (m) return 2 * 10 + (m[1] ? map[m[1]] : 0);
  return NaN;
}

function addMinutes(hms, mins) {
  let [h, m] = hms.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}:00`;
}

const CAT_WORDS = [
  ['学习', ['学习', '复习', '看书', '作业', '上课', '考试', '背书', '自习']],
  ['工作', ['开会', '会议', '工作', '汇报', '项目', '面试', '加班', '排期', '对接']],
  ['运动', ['健身', '跑步', '游泳', '打球', '瑜伽', '训练', '锻炼', '散步']],
  ['社交', ['吃饭', '聚会', '见面', '电影', '朋友', '聚餐', '约会']],
  ['健康', ['睡觉', '休息', '体检', '吃药', '喝水', '看医生']]
];
function guessCat(title) {
  for (const [cat, words] of CAT_WORDS) {
    if (words.some((w) => title.includes(w))) return cat;
  }
  return '其他';
}

function parseOne(raw, base) {
  const t = String(raw || '').replace(/\s+/g, '');
  if (!t) return null;
  // base 契约：真实时刻的普通 Date；转为北京时间 Date（用 getUTC* 读取）
  const baseCn = cnNow(base instanceof Date ? base.getTime() : undefined);
  // 真实当前时刻（北京时间），用于「已过时间 → +12」推断
  const now = cnNow();
  const res = { title: '', date: cnYmd(baseCn), start: '', end: '', place: '', cat: '其他', remind: -1 };

  /** 基准日偏移 n 天的北京日期 */
  const shift = (n) => {
    const d = new Date(baseCn.getTime());
    d.setUTCDate(d.getUTCDate() + n);
    return cnYmd(d);
  };

  if (/大后天/.test(t)) res.date = shift(3);
  else if (/后天/.test(t)) res.date = shift(2);
  else if (/明天|明日/.test(t)) res.date = shift(1);
  else if (/周|星期/.test(t)) {
    const m = t.match(/(?:周|星期)([一二三四五六日])/);
    if (m) {
      const target = DOW[m[1]];
      let diff = (target - baseCn.getUTCDay() + 7) % 7;
      if (diff === 0) diff = 7;
      res.date = shift(diff);
    }
  }

  const range = t.match(/(\d{1,2})[点:：.](\d{0,2})?[-~到至]+(\d{1,2})[点:：.](\d{0,2})?/);
  if (range) {
    let h1 = +range[1], h2 = +range[3];
    if (/下午|傍晚|晚上|夜里/.test(t)) { if (h1 < 12) h1 += 12; if (h2 < 12) h2 += 12; }
    if (/中午/.test(t)) { if (h1 < 12) h1 = 12; if (h2 < 12) h2 = 12; }
    res.start = `${pad(h1)}:${pad(range[2] ? +range[2] : 0)}:00`;
    res.end = `${pad(h2)}:${pad(range[4] ? +range[4] : 0)}:00`;
  } else {
    // 时间提取：先阿拉伯数字，再中文数字（三点半/十一点/八点半）
    let hm = null; // {h, m}
    const single = t.match(/(\d{1,2})[点:：.](\d{0,2})?/);
    if (single) {
      hm = { h: +single[1], m: single[2] ? +single[2] : 0 };
    } else {
      const cn = t.match(/([一二两三四五六七八九十]+)点(半|[一二三四五六七八九十]+)?/);
      if (cn) {
        hm = { h: cnToNumFull(cn[1]), m: cn[2] ? (cn[2] === '半' ? 30 : cnToNumFull(cn[2])) : 0 };
      }
    }
    if (hm) {
      let h = hm.h;
      // 时段限定词
      if (/凌晨|深夜|半夜/.test(t) && h <= 12) { /* 保持原小时（23点睡觉除外，见下） */ }
      else if (/早上|上午/.test(t)) { /* 原小时 */ }
      else if (/中午/.test(t) && h < 12) h = 12;
      else if (/下午|傍晚|晚上|夜里|今晚/.test(t) && h < 12) h += 12;
      else if (/睡觉|睡|起床|入睡|就寝/.test(t) && h <= 11 && h <= now.getUTCHours() - 3) h += 12; // 「十一点睡觉」深夜→23点
      else if (!/凌晨|深夜|半夜|早上|上午|中午|下午|傍晚|晚上|夜里|今晚/.test(t)) {
        // 无时段限定：数字+动作，按"已明显过去→加12"规则推断
        if (h <= now.getUTCHours() - 3) h += 12;
      }
      if (h > 23) h -= 24; // 如「凌晨」语境但加了 12（24 点 → 0 点）
      res.start = `${pad(h)}:${pad(hm.m)}:00`;
      // 只有开始时间，结束时间留空
      res.end = '';
    }
  }

  const pm = t.match(/(?:在|到)([^，。、\s]{1,12})(?:开会|见面|健身|上课|吃饭|办公|集合|碰面)/);
  if (pm) res.place = pm[1];

  let title = cleanText(String(raw || ''));
  title = title
    .replace(/(今天|明天|后天|大后天|周[一二三四五六日]|星期[一二三四五六日])/g, '')
    .replace(/\d{1,2}[点:：.]\d{0,2}\s*[-~到至]\s*\d{1,2}[点:：.]\d{0,2}/g, '')
    .replace(/\d{1,2}[点:：.]\d{0,2}/g, '')
    .replace(/(上午|早上|中午|下午|傍晚|晚上|凌晨|夜里)/g, '')
    .replace(/(?:在|到)[^，。、\s]{1,12}(?:开会|见面|健身|上课|吃饭|办公|集合|碰面)/g, '')
    .replace(/[，。、\s]+/g, ' ')
    .trim();
  title = cleanText(title);
  if (!title) return null;

  res.title = title.slice(0, 30);
  res.cat = guessCat(res.title);

  /* 重复：每天 / 工作日 / 每周一三五 / 每周三 */
  let repeatDays = null;
  if (/每天|天天/.test(t)) repeatDays = [0, 1, 2, 3, 4, 5, 6];
  else if (/工作日/.test(t)) repeatDays = [1, 2, 3, 4, 5];
  else if (/每(周|星期)|每周/.test(t)) {
    const days = [];
    const re = /(?:周|星期)([一二三四五六日天])/g;
    let m;
    while ((m = re.exec(t))) days.push(DOW[m[1]]);
    if (days.length) repeatDays = [...new Set(days)].sort((a, b) => a - b);
  }
  res.repeatDays = repeatDays;

  /* 提醒：提前 N 分钟/小时；准时提醒；提醒我 */
  let remind = -1;
  const rm = t.match(/提前\s*(\d+|[一二两三四五六七八九十]+)\s*(分钟|分|小时|个小时)/);
  if (rm) {
    const n = cnToNum(rm[1]);
    if (!isNaN(n)) remind = /小时/.test(rm[2]) ? n * 60 : n;
  } else if (/准时提醒|准点提醒/.test(t)) remind = 0;
  else if (/提醒我|提醒一下|记得提醒/.test(t)) remind = 0;
  res.remind = res.start ? remind : -1;

  res.note = '';
  res.type = res.start ? 'event' : 'todo';
  return res;
}

/** 按标点/连接词切成多段 */
function splitSegments(text) {
  return String(text || '')
    .replace(/(然后|还有|接着|顺便|另外|之后|再|以及)/g, '|')
    .split(/[|，,。;；、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 单条解析（旧接口） */
function parseVoice(text, base = new Date()) {
  const one = parseOne(text, base);
  if (one) return one;
  return { title: '新任务', date: cnYmd(cnNow(base instanceof Date ? base.getTime() : undefined)), start: '', end: '', place: '', cat: '其他', remind: -1 };
}

/** 多任务解析：一句话拆成多条 */
function parseVoiceMulti(text, base = new Date()) {
  const segs = splitSegments(text);
  const out = [];
  const seen = {};
  segs.forEach((seg) => {
    const t = parseOne(seg, base);
    if (!t) return;
    const key = [t.date, t.title, t.start].join('|');
    if (seen[key]) return;
    seen[key] = 1;
    out.push(t);
  });
  if (!out.length) out.push(parseVoice(text, base));
  out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (!!a.start !== !!b.start) return a.start ? -1 : 1;
    if (a.start && b.start) return a.start < b.start ? -1 : 1;
    return 0;
  });
  return out;
}

module.exports = { parseVoice, parseVoiceMulti };
