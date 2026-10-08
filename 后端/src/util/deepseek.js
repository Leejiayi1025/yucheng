// DeepSeek 大模型：把一段口语解析成「任务清单」
//
// 【安全约定 · 重要】
// DEEPSEEK_API_KEY 只存在于服务端 .env，**绝不下发给前端**。
// 前端只能通过本后端 /api/voice/parse 间接用到大模型。
require('dotenv').config();

const { cnNow, cnYmd, cnHM } = require('./timecn');

const BASE = (process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const ENDPOINT = BASE + '/chat/completions';
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
// DeepSeek 的模型名只有 deepseek-chat / deepseek-reasoner，
// 之前的兜底值 'deepseek-flash' 并不存在，漏配环境变量时会直接 404。
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 30000);

// 分类：与前端 CAT、注册时的默认分类同源，见 config/constants.js
const { CATS } = require('../config/constants');

function hasDeepSeek() {
  return Boolean(API_KEY);
}
function pad(n) {
  return String(n).padStart(2, '0');
}
function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** 'H:MM' / 'HH:MM' → 'HH:MM'；非法返回 '' */
function hhmm(v) {
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mi = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return pad(h) + ':' + pad(mi);
}

/* title / note 的润色规范。
 *
 * 提示词有两套（纯新建 systemPrompt、意图解析 parseVoiceAction），
 * 如果各写各的，改了一处必然漏另一处 —— 所以抽成一份共用。
 *
 * 要解决的是：模型倾向把用户口述**整句照搬**成任务名，
 * 于是卡片上出现「我明天上午得去跟产品经理开个会讨论一下下个季度的排期」这种长句。
 * 规范里用「对照」而不是抽象描述，是因为模型对例子的服从度远高于对形容词的。
 */
const TITLE_RULES = [
  '  title : string，**润色后的任务名**，不是用户口述原文。规则：',
  '          ① 固定写成「动词 + 对象」或「动词 + 修饰 + 对象」，一般 2~10 个字；',
  '          ② 不带人称、时间、地点、情绪、原因、语气词（时间归 date/start，地点归 place）；',
  '          ③ 结尾不带标点，不出现「我要 / 帮我 / 记得 / 一下 / 那个」这类词；',
  '          ④ 口述里的背景说明、清单、注意事项**不进 title**，归到 note；',
  '          ⑤ 也别缩成看不出对象的空泛词：有对象的要写上（「开会」→「跟产品经理开会」）；',
  '          ⑥ 就算用户说了一整句，也要提炼成短句，禁止整句照搬。',
  '          对照（口语原文 → title，其余信息的分流）：',
  '            「我明天上午得去跟产品经理开个会讨论下个季度的排期」→「跟产品经理讨论排期」',
  '            「提醒我晚上八点去健身房锻炼一个半小时」→「健身」（end 由「一个半小时」推算）',
  '            「下午把数学作业和英语作业都写完」→「写作业」，note「数学和英语作业」',
  '            「明天下午三点和小王他们去环球中心看新上映的电影」→「看电影」，place「环球中心」',
  '            「你记得带上简历和作品集啊，九点半面试」→「面试」，note「带上简历和作品集」'
];

const NOTE_RULES = [
  '  note  : string，口述里除了「做什么」之外的**补充信息**，没有给 ""。收录：',
  '          ① 要带的东西（「带简历和作品集」）② 清单明细（「数学和英语作业」）',
  '          ③ 对象或范围补充（「跟小王他们」「讨论下季度排期」）④ 注意事项（「别迟到」）',
  '          写成短语，不要整句照搬，一般不超过 30 字。'
];

function systemPrompt(baseDate, weekday, nowHM, nowHour) {
  /* 样例里用真实日期，保证模型看到的示例与本次上下文一致 */
  const dAdd = (n) => {
    const d = new Date(baseDate + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return ymd(d);
  };
  const nextDow = (dow) => {
    const d = new Date(baseDate + 'T00:00:00');
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === dow) return ymd(d);
    }
    return dAdd(7);
  };

  const S = (input, tasks) =>
    '输入：' + input + '\n输出：' + JSON.stringify({ tasks: tasks });

  return [
    '你是「语程」时间管理 App 的语音解析引擎。用户会用口语一次说完一整天的安排，',
    '你要把它拆成一条条任务，并清洗掉口语噪声。',
    '',
    '【输出】只输出一个 JSON 对象，形如 {"tasks":[...]}，不要 markdown、不要解释。每个任务字段：',
    ...TITLE_RULES,
    '  date  : string，YYYY-MM-DD；没提日期用基准日期',
    '  start : string，HH:MM 24 小时制；没提具体时间给空串 ""',
    '  end   : string，HH:MM；用户明确说了结束时间或时长才推算；没说结束时间就给空串 ""，绝对不要自动加1小时',
    '  place : string，地点；没提给 ""',
    '  cat   : string，只能是：' + CATS.join('、') + '；判断不了给「其他」',
    '  remind: number，提前提醒分钟数；没提给 -1',
    '          「准时提醒」→ 0；「提前 N 分钟/小时」→ N（小时要换算成分钟）；「提醒我」没说提前多久 → 0',
    '  repeatDays : number 数组，0=周日 .. 6=周六；不重复给 null',
    '          「每天」→ [0,1,2,3,4,5,6]；「工作日/周一到周五」→ [1,2,3,4,5]；',
    '          「每周一三五」→ [1,3,5]；「每周三」→ [3]；「每周末」→ [0,6]；「每月X号」暂按 null',
    '          ⚠️ **重复任务只能输出一条**，用 repeatDays 表达，**绝对禁止**把「每天」展开成 7 条、把「每周一三五」展开成 3 条！',
    '             date 用**最近一次**的日期（今天该时刻已过 → 用下一次的那天）。',
    ...NOTE_RULES,
    '  type  : string，"event" 表示有具体时间的安排，"todo" 表示没有具体时间的待办',
    '',
    '【时间推断 · 重要】现在是 ' + baseDate + ' ' + nowHM + '（当前小时 ' + nowHour + ' 点）。',
    '- ⚠️ **最高优先级：用户说「现在、此刻、马上、这会儿、这就」开始做什么，start必须直接等于当前给出的时间 ' + nowHM + '，绝对不能改成其他任何时间！**',
    '  例如现在是凌晨03:15，用户说「现在开始睡觉」→ start必须是03:15，不能改成下午15点多；',
    '  现在是晚上20:00，用户说「我马上开始写作业」→ start必须是20:00。',
    '- 用户只说「两点」「三点」「四点」这类 1–11 的数字、**没说上午/下午/晚上**时，按下面的逻辑判断：',
    '  · 如果今天这个时刻已经明显过去（早于现在 3 小时以上）→ 理解为**下午/晚上**，加 12 小时；',
    '    例如现在是 15 点，用户说「三点」→ 15:00；说「两点开会」→ 14:00。',
    '  · 如果今天这个时刻还没到、或刚过去不久（差距小于 3 小时）→ 按最近的将来理解，不加 12。',
    '    例如现在是 9 点，用户说「十点」→ 10:00；现在凌晨2点说「三点睡觉」→ 03:00，不能加12变成15点。',
    '- 说了「凌晨/深夜/半夜/早上/上午」按原小时（0-11点，不加12）；说了「中午」→12；说了「下午/傍晚/晚上/夜里」若小于 12 则加 12。',
    '- 中文数字也要识别（「三点半」→ 03:30 或按上面规则 15:30；「八点半」→ 08:30）。',
    '- 「4点到7点」→ start/end；「2小时」「半小时」→ 用来推算 end；**用户只说了开始时间、没说结束时间也没说时长 → end 必须留空给 ""，绝对不要自动加1小时！**',
    '',
    '【日期换算】今天/明天/后天/大后天/下周X/周X/星期X/X月X日/X号 → YYYY-MM-DD',
    '',
    '【必须清洗的口语噪声】',
    '1. 删掉所有语气词/口头禅：嗯、呃、啊、哦、唉、那个、这个、就是说、你知道吧、反正、大概、差不多、然后呢、然后、还有、接着、顺便、对了、另外、我看看、我想想、帮我把、给我、帮我、我要、我想、我打算、记得、别忘了、提醒我、安排一下、搞一下、弄一下',
    '2. 去掉重复啰嗦的表达，同一个意思只说一遍',
    '3. 同一件事被说了两遍 → 合并成一条',
    '4. 纯语气词、没有实际内容的碎片直接丢弃',
    '5. 保留原意里的关键数量/时长/对象，不要丢',
    '',
    '【排好序】按 date、start 升序输出（无时间的待办排在当天最后）。',
    '',
    '================ 参考样例（基准日期 ' + baseDate + ' 周' + weekday + '，现在 ' + nowHM + '）================',
    '',
    S(
      '明天下午4点到7点去图书馆学习PM理论知识',
      [
        {
          title: '学习PM理论知识',
          date: dAdd(1),
          start: '16:00',
          end: '19:00',
          place: '图书馆',
          cat: '学习',
          remind: -1,
          repeatDays: null,
          note: '',
          type: 'event'
        }
      ]
    ),
    '',
    S(
      '嗯那个，我今天下午三点要去图书馆学习PM理论知识，然后晚上八点跟朋友吃饭，还有记得买洗发水',
      [
        {
          title: '学习PM理论知识',
          date: dAdd(0),
          start: '15:00',
          end: '',
          place: '图书馆',
          cat: '学习',
          remind: -1,
          repeatDays: null,
          note: '',
          type: 'event'
        },
        {
          title: '跟朋友吃饭',
          date: dAdd(0),
          start: '20:00',
          end: '',
          place: '',
          cat: '社交',
          remind: -1,
          repeatDays: null,
          note: '',
          type: 'event'
        },
        {
          title: '买洗发水',
          date: dAdd(0),
          start: '',
          end: '',
          place: '',
          cat: '其他',
          remind: -1,
          repeatDays: null,
          note: '',
          type: 'todo'
        }
      ]
    ),
    '',
    S('每天早上八点半健身一小时，提前十分钟提醒我', [
      {
        title: '健身',
        date: dAdd(0),
        start: '08:30',
        end: '09:30',
        place: '',
        cat: '运动',
        remind: 10,
        repeatDays: [0, 1, 2, 3, 4, 5, 6],
        note: '',
        type: 'event'
      }
    ]),
    '',
    S('周一到周五晚上七点半学习英语，提前半小时提醒', [
      {
        title: '学习英语',
        date: dAdd(0),
        start: '19:30',
        end: '20:30',
        place: '',
        cat: '学习',
        remind: 30,
        repeatDays: [1, 2, 3, 4, 5],
        note: '',
        type: 'event'
      }
    ]),
    '',
    S('后天下午两点面试，记得带上简历和作品集', [
      {
        title: '面试',
        date: dAdd(2),
        start: '14:00',
        end: '15:00',
        place: '',
        cat: '工作',
        remind: -1,
        repeatDays: null,
        note: '带上简历和作品集',
        type: 'event'
      }
    ]),
    '',
    S('每周一三五晚上七点跑步半小时', [
      {
        title: '跑步',
        date: nextDow(1),
        start: '19:00',
        end: '19:30',
        place: '',
        cat: '运动',
        remind: -1,
        repeatDays: [1, 3, 5],
        note: '',
        type: 'event'
      }
    ]),
    '',
    S('那个，我要买牛奶，呃就是记得买牛奶', [
      {
        title: '买牛奶',
        date: dAdd(0),
        start: '',
        end: '',
        place: '',
        cat: '其他',
        remind: -1,
        repeatDays: null,
        note: '',
        type: 'todo'
      }
    ]),
    '',
    S('中午十二点跟客户吃饭，提前一小时提醒我', [
      {
        title: '跟客户吃饭',
        date: dAdd(0),
        start: '12:00',
        end: '',
        place: '',
        cat: '社交',
        remind: 60,
        repeatDays: null,
        note: '',
        type: 'event'
      }
    ]),
    '',
    // 凌晨场景测试样例：现在时间是凌晨03:15
    '【特殊场景样例 · 当前时间为凌晨03:15】',
    S('今天现在开始睡觉', [
      {
        title: '睡觉',
        date: dAdd(0),
        start: '03:15',
        end: '',
        place: '',
        cat: '健康',
        remind: -1,
        repeatDays: null,
        note: '',
        type: 'event'
      }
    ]),
    '',
    S('凌晨三点我要睡觉', [
      {
        title: '睡觉',
        date: dAdd(0),
        start: '03:00',
        end: '',
        place: '',
        cat: '健康',
        remind: -1,
        repeatDays: null,
        note: '',
        type: 'event'
      }
    ]),
    '',
    S('明天上午十点去医院体检要空腹，下周三下午三点跟导师开会讨论毕设选题', [
      {
        title: '去医院体检',
        date: dAdd(1),
        start: '10:00',
        end: '',
        place: '医院',
        cat: '健康',
        remind: -1,
        repeatDays: null,
        note: '要空腹',
        type: 'event'
      },
      {
        title: '跟导师开会讨论毕设选题',
        date: nextDow(3),
        start: '15:00',
        end: '',
        place: '',
        cat: '学习',
        remind: -1,
        repeatDays: null,
        note: '',
        type: 'event'
      }
    ]),
    '',
    '================ 样例结束，请严格按上述字段与规则输出 ================'
  ].join('\n');
}

/**
 * 「语音编辑」用的 system prompt：先判断意图（新建 / 修改 / 删除已有任务），再产出结果。
 * 关键点：把用户现有任务以 `id | 标题 | 日期 | 时间 | 分类` 的清单给它，
 * 修改/删除时 id **必须来自这份清单**，杜绝模型编造 id。
 */
function actionPrompt(baseDate, weekday, nowHM, count) {
  const dAdd = (n) => {
    const d = new Date(baseDate + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return ymd(d);
  };
  const nextDow = (dow) => {
    const d = new Date(baseDate + 'T00:00:00');
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === dow) return ymd(d);
    }
    return dAdd(7);
  };

  return [
    '你是「语程」时间管理 App 的语音理解引擎。用户说一句话，你要判断他是',
    '**新建任务**，还是**修改 / 删除已有的任务**。',
    '',
    '用户现有任务会以「id | 标题 | 日期 | 时间 | 分类」的形式给出（共 ' +
      count +
      ' 条，id 只在这份清单里有效）。',
    '现在是 ' + baseDate + ' ' + nowHM + '（周' + weekday + '）。',
    '',
    '【判断意图】',
    '1. 说的是**新的事情**、清单里找不到对应 → intent = "create"',
    '2. 出现「改 / 改成 / 改为 / 换成 / 调到 / 挪到 / 推迟 / 提前 / 延后 / 调整 / 修改 / 补充 / 加上备注」',
    '   并且指向清单里已有的任务 → intent = "update"',
    '3. 出现「取消 / 删掉 / 删除 / 不要了 / 去掉」并且指向清单里已有的任务 → intent = "delete"',
    '4. 指代模糊时（如「那个会」）选最相近的一条；实在匹配不上才当成 create。',
    '5. 一句话里混了新建和修改 → 以**修改类**为准（改已有的优先）。',
    '',
    '【输出】只输出一个 JSON 对象，不要 markdown、不要解释：',
    '  create → {"intent":"create","tasks":[ ... ]}',
    '  update → {"intent":"update","changes":[{"id":3,"patch":{...},"desc":"改到明天下午四点"}]}',
    '  delete → {"intent":"delete","changes":[{"id":3,"desc":"取消健身"}]}',
    '',
    '【硬性要求】',
    '· changes 里的 id **必须来自上面那份清单**，绝对不许编造、不许用序号假想。',
    '· patch 是**部分更新**：只写用户明确要改的字段，没提到的字段不要放进去。',
    '· ⚠️ **修改任务时间时，用户只说了改开始时间（比如"把XX改到下午四点"），patch里绝对不要出现end字段！不要自动补结束时间！原来的end是什么就是什么，没说改end就不要动！**',
    '· patch 可用字段：title / date / start / end / place / cat / remind / repeatDays / note',
    '  （格式见下方 create 字段定义；start 给 "" 表示清掉时间点变成待办）',
    '· desc 是一句简短的中文说明，给用户确认用（如「改到明天下午四点」「标题改为买沐浴露」）。',
    '',
    '【create 任务的字段】',
    ...TITLE_RULES,
    '  date  : YYYY-MM-DD；没提日期用今天',
    '  start : HH:MM；没提具体时间给 ""',
    '  end   : HH:MM；用户明确说了结束时间或时长才推算；没说结束时间就给 ""，绝对不要自动加1小时',
    '  place : 地点；没提给 ""',
    '  cat   : 只能是 ' + CATS.join('、'),
    '  remind: 提前分钟数；没提给 -1；「准时提醒」给 0；说了「提醒我 / 提醒一下」但没说提前多久也给 0',
    '  repeatDays : [0..6]（0=周日）；不重复给 null。「每天」=[0,1,2,3,4,5,6]，「工作日」=[1,2,3,4,5]；',
    '               ⚠️ 重复任务只输出一条，禁止按天展开；date 用**最近一次**的那天（今天该时刻还没到就用今天）',
    ...NOTE_RULES,
    '  type  : "event"（有具体时间）/ "todo"（没有具体时间）',
    '',
    '【时间推断】⚠️ 用户说「现在、此刻、马上」开始，start必须直接等于当前给出的' + nowHM + '，不能改成其他时间；',
    '只说「三点」这类 1–11 的数字且没说上下午时：若今天该时刻已过去 3 小时以上，',
    '按下午/晚上理解（+12）；否则按最近的将来。说了「凌晨/深夜/早上/上午」按原小时不加12，「下午/晚上/夜里」+12。',
    '',
    '================ 样例（基准日 ' + baseDate + '，现在 ' + nowHM + '）================',
    '（假设清单里有：1 | 学习PM理论知识 | ' + baseDate + ' | 15:00-16:00 | 学习',
    '                    2 | 买洗发水 | ' + baseDate + ' | 待办 | 其他',
    '                    3 | 健身 | ' + baseDate + ' | 08:30-09:30 | 运动）',
    '',
    '输入：明天下午三点跟导师开会',
    '输出：{"intent":"create","tasks":[{"title":"跟导师开会","date":"' +
      dAdd(1) +
      '","start":"15:00","end":"","place":"","cat":"学习","remind":-1,"repeatDays":null,"note":"","type":"event"}]}',
    '',
    '输入：把学习PM理论知识改到明天下午四点',
    '输出：{"intent":"update","changes":[{"id":1,"patch":{"date":"' +
      dAdd(1) +
      '","start":"16:00"},"desc":"改到明天下午四点"}]}',
    '',
    '输入：健身推迟到晚上七点',
    '输出：{"intent":"update","changes":[{"id":3,"patch":{"start":"19:00"},"desc":"改到晚上七点"}]}',
    '',
    '输入：买洗发水改成买沐浴露',
    '输出：{"intent":"update","changes":[{"id":2,"patch":{"title":"买沐浴露"},"desc":"标题改为买沐浴露"}]}',
    '',
    '输入：学习PM理论知识提前半小时提醒我',
    '输出：{"intent":"update","changes":[{"id":1,"patch":{"remind":30},"desc":"改为提前30分钟提醒"}]}',
    '',
    '输入：取消今天的健身',
    '输出：{"intent":"delete","changes":[{"id":3,"desc":"取消健身"}]}',
    '',
    '输入：每周一三五晚上七点跑步',
    '输出：{"intent":"create","tasks":[{"title":"跑步","date":"' +
      nextDow(1) +
      '","start":"19:00","end":"20:00","place":"","cat":"运动","remind":-1,"repeatDays":[1,3,5],"note":"","type":"event"}]}',
    '================ 样例结束，请严格按格式输出 ================'
  ].join('\n');
}

function extractJSON(s) {
  if (!s) return null;
  let t = String(s).trim();
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a === -1 || b === -1 || b <= a) return null;
  try {
    return JSON.parse(t.slice(a, b + 1));
  } catch (_) {
    return null;
  }
}

/** 去掉残留的语气词与重复字符，兜底清洗（防止模型漏删） */
const NOISE = /^(嗯|呃|啊|哦|唉|那个|这个|就是说|然后|还有|接着|顺便|对了|另外|反正|大概|差不多|我要|我想|我打算|帮我|给我|记得|别忘了|提醒我|安排一下|搞一下|弄一下)+/;
/* 单独的人称代词：NOISE 只覆盖「我要 / 我想 / 帮我」这类，不含裸的人称。
   模型偶尔会把「我」留在任务名开头。后面跟「的」时不动 ——
   「我们的小组会议」里的「我们的」是定语，不是多余的称代。 */
const LEAD_PERSON = /^(我们|咱们|你们|他们|她们|大家|我|你|咱|他|她)(?!的)/;
/* 结尾语气助词：「买牛奶吧」「早点睡啊」 */
const TAIL_TONE = /[吧啊呀嘛哦呢啦咯嘞]+$/;

function cleanTitle(s) {
  let t = String(s || '').trim();
  t = t.replace(/[，,。.、；;！!？?…\s]+$/g, '');
  let prev;
  do {
    prev = t;
    t = t.replace(NOISE, '').replace(LEAD_PERSON, '').trim();
  } while (t !== prev && t);
  t = t.replace(TAIL_TONE, '');
  t = t.replace(/(.)\1{2,}/g, '$1$1'); // 连续重复 3 次以上压成 2 次（保留「哈哈」这类正常叠词）
  return t.trim();
}

const DOW_CN = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
/** 重复日解析：接受 [1,3,5] 或 ['周一','周三'] 或 '每天'/'工作日' 等 */
function normRepeat(v) {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const nums = v
      .map((x) => {
        if (typeof x === 'number') return x;
        const m = String(x).match(/([0-6])|周([日天一二三四五六])|星期([日天一二三四五六])/);
        if (!m) return NaN;
        if (m[1] !== undefined) return Number(m[1]);
        return DOW_CN[m[2] || m[3]];
      })
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    const uniq = [...new Set(nums)].sort((a, b) => a - b);
    return uniq.length ? uniq : null;
  }
  const s = String(v);
  if (!s || s === 'null' || s === '不重复' || s === 'none') return null;
  if (/每天|天天/.test(s)) return [0, 1, 2, 3, 4, 5, 6];
  if (/工作日/.test(s)) return [1, 2, 3, 4, 5];
  const out = [];
  const re = /周([日天一二三四五六])|星期([日天一二三四五六])/g;
  let m;
  while ((m = re.exec(s))) out.push(DOW_CN[m[1] || m[2]]);
  const uniq = [...new Set(out)].sort((a, b) => a - b);
  return uniq.length ? uniq : null;
}

function normalizeOne(d, baseDate, now, rawInput) {
  const o = d && typeof d === 'object' ? d : {};
  let title = cleanTitle(o.title).slice(0, 30);
  if (!title) title = '新任务';

  let date = String(o.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = baseDate;

  let start = hhmm(o.start);

  /* 硬保险：用户明确说「现在、此刻、马上、这会儿」，直接强制start为当前真实时间，防止模型解析错误 */
  const raw = String(rawInput || '');
  if (/现在|此刻|马上|这会儿|这就/.test(raw)) {
    start = pad(now.getHours()) + ':' + pad(now.getMinutes());
    date = ymd(now);
  }

  /* 注意：这里**不做**「1–11 点自动 +12」的兜底。
     提示词里已经把当前时间给了模型，模型自己就能判断「三点」是凌晨还是下午。
     服务端再盲加 12 会误伤明确说了「早上」的情况（实测把「早上八点半」改成了 20:30）。 */

  let end = hhmm(o.end);
  // 只有开始时间时，结束时间留空（纯提醒类任务）
  if (end && !start) start = '';

  let place = cleanTitle(o.place).slice(0, 30);
  let cat = String(o.cat || '').trim();
  if (CATS.indexOf(cat) === -1) cat = '其他';

  let remind = Number(o.remind);
  if (!isFinite(remind)) remind = -1;
  remind = Math.round(remind);
  if (remind < 0) remind = -1;
  if (remind > 1440) remind = 1440;
  if (!start) remind = -1;

  const repeatDays = normRepeat(o.repeatDays);
  const note = cleanTitle(o.note).slice(0, 100);

  // 有具体时间 = 安排；没有 = 待办
  const type = start ? 'event' : 'todo';

  const out = { title, date, start, end, place, cat, remind, repeatDays, note, type };

  /* 重复任务：若「最近一次」已经过去（今天且时间已过），顺延到下一个匹配的星期。
     只往后推，不猜测用户意图，不会改坏明确说了日期的任务。 */
  if (repeatDays && repeatDays.length && out.date === ymd(now) && start) {
    const cur = now.getHours() * 60 + now.getMinutes();
    const due = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
    if (cur > due) {
      for (let i = 1; i <= 7; i++) {
        const d = new Date(now.getTime());
        d.setDate(d.getDate() + i);
        if (repeatDays.includes(d.getDay())) {
          out.date = ymd(d);
          break;
        }
      }
    }
  }

  return out;
}

/**
 * 「修改已有任务」的字段清洗：**只处理模型明确给出的字段**（patch 语义）。
 * 没出现在 patch 里的字段一律不动。
 */
function normalizePatch(p) {
  const o = p && typeof p === 'object' ? p : {};
  const out = {};

  if (o.title !== undefined) {
    const t = cleanTitle(o.title).slice(0, 30);
    if (t) out.title = t;
  }
  if (o.date !== undefined) {
    const d = String(o.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) out.date = d;
  }
  // start/end 允许清空（把安排改成待办）
  if (o.start !== undefined) out.start = hhmm(o.start);
  if (o.end !== undefined) out.end = hhmm(o.end);
  if (o.place !== undefined) out.place = cleanTitle(o.place).slice(0, 30);
  if (o.cat !== undefined) {
    const c = String(o.cat || '').trim();
    out.cat = CATS.indexOf(c) === -1 ? '其他' : c;
  }
  if (o.remind !== undefined) {
    let r = Number(o.remind);
    if (!isFinite(r) || r < 0) r = -1;
    out.remind = Math.min(1440, Math.round(r));
  }
  if (o.repeatDays !== undefined) out.repeatDays = normRepeat(o.repeatDays);
  if (o.note !== undefined) out.note = cleanTitle(o.note).slice(0, 100);

  return out;
}

/**
 * 语音「意图解析」：既可能是**新建**，也可能是**修改 / 删除已有任务**。
 * @param {string} text      用户说的话
 * @param {string} baseDate  基准日期 YYYY-MM-DD
 * @param {Array}  existing  用户现有任务 [{id,title,date,start,end,cat}]
 * @returns {Promise<{intent:string, tasks?:Array, changes?:Array}|null>}
 */
async function parseVoiceAction(text, baseDate, existing) {
  if (!hasDeepSeek()) return null;
  const src = String(text || '').trim();
  if (!src) return null;

  const now = cnNow();
  const bd = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || '')) ? baseDate : cnYmd(now);
  const wd = '日一二三四五六'[new Date(bd + 'T00:00:00').getDay()];
  const nowHM = cnHM(now);

  const list = (existing || []).slice(0, 60);
  const ctx = list.length
    ? list
        .map((t) => {
          const time = t.start ? t.start + (t.end ? '-' + t.end : '') : '待办';
          return [t.id, t.title, t.date, time, t.cat || ''].join(' | ');
        })
        .join('\n')
    : '（当前没有任务）';
  const user = '【我现在的任务】\n' + ctx + '\n\n【我说】\n' + src;

  for (let i = 1; i <= 2; i++) {
    const got = await callOnceRaw(actionPrompt(bd, wd, nowHM, list.length), user);
    if (!got) continue;
    const intent = got.intent === 'update' || got.intent === 'delete' ? got.intent : 'create';

    if (intent === 'create') {
      const arr = Array.isArray(got.tasks) ? got.tasks : [];
      const tasks = arr.map((x) => normalizeOne(x, bd, now, src));
      // 硬保险：用户没在输入里提结束时间/时长，就直接删掉task里的end，防止模型乱补一小时
      const hasEndWord = /到|结束|持续|小时|分钟|时长|点到/.test(src);
      if (!hasEndWord) {
        tasks.forEach(t => delete t.end);
      }
      if (!tasks.length) continue;
      return { intent: 'create', tasks: sortTasks(mergeRepeats(dedupe(tasks))) };
    }

    /* update / delete：id 必须在给它的清单里，否则丢弃（防模型编造） */
    const valid = {};
    list.forEach((t) => {
      valid[String(t.id)] = t;
    });
    const changes = (Array.isArray(got.changes) ? got.changes : [])
      .map((c) => {
        const target = valid[String(c && c.id != null ? c.id : '')];
        if (!target) return null;
        const item = {
          id: target.id,
          title: target.title,
          desc: String((c && c.desc) || '').slice(0, 40)
        };
        if (intent === 'update') {
          item.patch = normalizePatch(c && c.patch);
          // 硬保险：用户没明确说结束时间/时长，就直接删掉patch里的end，防止模型乱加
          // 只匹配明确表示时长/结束的词，"改到下午四点"里的"到"不算
          const hasEndWord = /结束|持续|小时|分钟|时长|几点到|到几点/.test(src);
          if (!hasEndWord && item.patch.hasOwnProperty('end')) {
            delete item.patch.end;
          }
          if (!Object.keys(item.patch).length) return null;
        }
        return item;
      })
      .filter(Boolean);
    if (!changes.length) continue;
    return { intent, changes };
  }
  return null;
}

/** 合并同一天、同名、同时间的重复任务 */
function dedupe(list) {
  const seen = {};
  const out = [];
  list.forEach((t) => {
    const key = [t.date, t.title, t.start].join('|');
    if (seen[key]) return;
    seen[key] = 1;
    out.push(t);
  });
  return out;
}

/** 排序：按日期 → 有时间的在前 → 时间升序 */
function sortTasks(list) {
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (!!a.start !== !!b.start) return a.start ? -1 : 1;
    if (a.start && b.start && a.start !== b.start) return a.start < b.start ? -1 : 1;
    return 0;
  });
}

/** 通用调用：传入 system + user 两段内容，返回解析后的 JSON 对象（失败返回 null） */
async function callOnceRaw(system, user) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API_KEY },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }),
      signal: ctrl.signal
    });
    if (!resp.ok) {
      console.error('[deepseek] HTTP ' + resp.status);
      return null;
    }
    const data = await resp.json();
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
    const obj = extractJSON(content);
    if (!obj) console.error('[deepseek] JSON 解析失败');
    return obj;
  } catch (e) {
    console.error('[deepseek] 调用失败: ' + (e && e.name === 'AbortError' ? '超时' : e && e.message));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callOnce(src, bd, wd, nowHM, nowHour, now) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API_KEY },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt(bd, wd, nowHM, nowHour) },
          { role: 'user', content: src }
        ],
        temperature: 0.1,
        // 该模型会先消耗 reasoning tokens，上限给小了正文会为空
        max_tokens: 4000
      }),
      signal: ctrl.signal
    });
    if (!resp.ok) {
      console.error('[deepseek] HTTP ' + resp.status);
      return null;
    }
    const data = await resp.json();
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
    const obj = extractJSON(content);
    if (!obj) {
      console.error('[deepseek] JSON 解析失败');
      return null;
    }
    // 兼容模型只输出单条 / 单对象的情况
    let arr = obj.tasks;
    if (!Array.isArray(arr)) arr = obj.title ? [obj] : [];
    const list = arr
      .map((x) => normalizeOne(x, bd, now, src))
      .filter((t) => t.title && t.title !== '新任务' ? true : true);
    if (!list.length) return null;
    return sortTasks(mergeRepeats(dedupe(list)));
  } catch (e) {
    console.error('[deepseek] 调用失败: ' + (e && e.name === 'AbortError' ? '超时' : e && e.message));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 解析一段口语为任务清单
 * @returns {Promise<Array|null>} 失败返回 null（由调用方回落本地解析）
 */
async function parseTasksWithDeepSeek(text, baseDate) {
  if (!hasDeepSeek()) return null;
  const src = String(text || '').trim();
  if (!src) return null;

  const now = cnNow();
  const bd = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || '')) ? baseDate : cnYmd(now);
  const nowHM = cnHM(now);
  const nowHour = now.getUTCHours();
  const wd = '日一二三四五六'[new Date(bd + 'T00:00:00').getDay()];

  for (let i = 1; i <= 2; i++) {
    const got = await callOnce(src, bd, wd, nowHM, nowHour, now);
    if (got) return got;
    if (i === 1) console.error('[deepseek] 第 1 次未拿到有效结果，重试');
  }
  return null;
}

/** 兼容旧接口：返回第一条作为 draft */
async function parseWithDeepSeek(text, baseDate) {
  const list = await parseTasksWithDeepSeek(text, baseDate);
  if (!list || !list.length) return null;
  const { type, ...rest } = list[0];
  return rest;
}

/** 兜底：模型若把重复任务按天展开，这里按「标题+开始时间+分类」合并回一条 + repeatDays */
function mergeRepeats(list) {
  const groups = {};
  list.forEach((t) => {
    const key = [t.title, t.start, t.cat].join("|");
    (groups[key] = groups[key] || []).push(t);
  });
  const out = [];
  Object.keys(groups).forEach((k) => {
    const g = groups[k];
    if (g.length <= 1) { out.push(g[0]); return; }
    const days = [...new Set(g.map((t) => new Date(t.date + "T00:00:00").getDay()))].sort((a, b) => a - b);
    // 每个日期落在不同的星期，才认为是「重复被展开」
    if (days.length !== g.length) { g.forEach((t) => out.push(t)); return; }
    const dates = g.map((t) => t.date).sort();
    const base = { ...g[0], date: dates[0], repeatDays: days.length === 7 ? [0,1,2,3,4,5,6] : days };
    out.push(base);
  });
  return out;
}

module.exports = {
  parseTasksWithDeepSeek,
  parseWithDeepSeek,
  parseVoiceAction,
  hasDeepSeek,
  CATS
};
