/* 语音解析「任务名润色」回归测试集
 *
 * 【为什么需要】提示词里写了「title 要是润色后的任务名、不要照搬口述」，
 * 但模型未必服从，而且这条规范很容易在改提示词时被弄坏。这套测试真的调
 * DeepSeek，逐条检查输出是否还像个任务名，而不是一句口语。
 *
 * 【怎么跑】
 *   node test-voice-title.js              # 只报通过/失败
 *   node test-voice-title.js -v           # 额外打印模型的实际输出
 *   node test-voice-title.js --only=3     # 只跑第 3 条（调试单条用）
 *
 * 【为什么按「性质」而不是「精确匹配」断言】
 * 同一句话模型可能写成「跟产品经理讨论排期」也可能写「与产品经理讨论排期」，
 * 精确比字符串会把大量正确输出判成失败。所以这里断言的是**输出规范**：
 * 长度、不含人称、不含时间、没有照搬原文、该进 note 的进了 note。
 */
require('dotenv').config();
const { parseTasksWithDeepSeek, hasDeepSeek } = require('./src/util/deepseek');

/* 基准日固定，避免测试结果随「今天是哪天」漂移 */
const BASE_DATE = '2026-10-08';

const FIRST_PERSON = ['我', '你', '咱', '俺'];
const TIME_WORDS = ['明天', '后天', '今天', '上午', '下午', '晚上', '早上', '中午', '凌晨'];

const CASES = [
  {
    name: '冗长口述要提炼成短任务名',
    input: '我明天上午得去跟产品经理开个会讨论一下下个季度的排期',
    maxLen: 12,
    notInclude: [...FIRST_PERSON, ...TIME_WORDS, '开会讨论'],
    shouldInclude: ['产品经理'],
  },
  {
    name: '整句照搬要判失败',
    input: '提醒我一下晚上八点去健身房锻炼一个半小时吧',
    maxLen: 8,
    notInclude: [...TIME_WORDS, '提醒我', '一个半小时'],
    shouldInclude: ['健身'],
  },
  {
    name: '清单明细应进 note 而不是 title',
    input: '下午把数学作业和英语作业都写完',
    maxLen: 8,
    notInclude: ['数学作业'],
    noteInclude: ['数学', '英语'],
  },
  {
    name: '地点不进 title',
    input: '明天下午三点和小王他们去环球中心看新上映的电影',
    maxLen: 10,
    notInclude: ['环球中心', ...TIME_WORDS, '小王'],
    placeInclude: '环球中心',
  },
  {
    name: '要带的东西进 note',
    input: '你记得带上简历和作品集啊，明天九点半面试',
    maxLen: 8,
    notInclude: FIRST_PERSON,
    noteInclude: ['简历'],
  },
  {
    name: '短口述也要带上对象',
    input: '下午三点开会',
    maxLen: 10,
    notInclude: TIME_WORDS,
  },
  {
    name: '日常采买',
    input: '那个……我等会儿要去楼下超市买瓶洗发水，家里的用完了',
    maxLen: 10,
    notInclude: [...FIRST_PERSON, '用完了'],
    shouldInclude: ['洗发水'],
  },
  {
    name: '一句话里两件事要拆开',
    input: '今天晚上八点去游泳，然后十点之前回来写周报',
    expectCount: 2,
    notInclude: TIME_WORDS,
  },
  {
    name: '情绪和原因不进 title',
    input: '唉烦死了，明天必须把那个季度复盘报告写完，老板催了好几次了',
    maxLen: 10,
    notInclude: [...TIME_WORDS, '烦', '催', '老板'],
  },
  {
    name: '结尾语气词要剥掉',
    input: '别忘了给我买牛奶吧',
    maxLen: 8,
    notInclude: ['别忘了', '给我'],
    shouldInclude: ['牛奶'],
  },
  {
    name: '时间进 start 不进 title',
    input: '明天早上七点半起来跑步',
    maxLen: 8,
    notInclude: TIME_WORDS,
    shouldInclude: ['跑步'],
  },
  {
    name: '预约类要带上对方',
    input: '帮我约一下牙医，下周三下午',
    maxLen: 10,
    notInclude: ['帮我', ...TIME_WORDS],
    shouldInclude: ['牙医'],
  },
  {
    name: '纯待办（无时间）',
    input: '有空的时候记得把简历更新一下，投几个岗位',
    maxLen: 12,
    notInclude: FIRST_PERSON,
    shouldInclude: ['简历'],
  },
  {
    name: '长句里挑出真正的动作',
    input: '我想想啊，就是说我得抽时间去把车送去保养一下，顺便把年检也办了',
    maxLen: 12,
    notInclude: ['我想想', '就是说', '顺便'],
  },
  {
    name: '不要缩成看不出对象的空泛词',
    input: '明天下午跟投资人在国贸那边见一面聊聊融资的事',
    minLen: 4,
    maxLen: 12,
    notInclude: ['国贸', ...TIME_WORDS],
  },
];

/* ---------- 断言 ---------- */
function checkCase(c, tasks) {
  const fails = [];
  const first = tasks[0] || {};
  const title = String(first.title || '');
  const note = String(first.note || '');
  const place = String(first.place || '');

  if (!title) fails.push('没输出 title');

  if (c.expectCount && tasks.length !== c.expectCount) {
    fails.push(`应拆成 ${c.expectCount} 条，实际 ${tasks.length} 条`);
  }
  if (c.maxLen && title.length > c.maxLen) {
    fails.push(`title 太长（${title.length} 字 > ${c.maxLen}）：「${title}」`);
  }
  if (c.minLen && title.length < c.minLen) {
    fails.push(`title 太短（${title.length} 字 < ${c.minLen}）：「${title}」`);
  }
  if (c.notInclude) {
    const hit = c.notInclude.filter((w) => title.includes(w));
    if (hit.length) fails.push(`title 里不该出现：${hit.join('、')} ——「${title}」`);
  }
  if (c.shouldInclude) {
    const miss = c.shouldInclude.filter((w) => !title.includes(w));
    if (miss.length) fails.push(`title 里应包含：${miss.join('、')} ——「${title}」`);
  }
  if (c.noteInclude) {
    const miss = c.noteInclude.filter((w) => !note.includes(w));
    if (miss.length) fails.push(`note 里应包含：${miss.join('、')}（实际 note「${note}」）`);
  }
  if (c.placeInclude && !place.includes(c.placeInclude)) {
    fails.push(`place 应是「${c.placeInclude}」（实际「${place}」）`);
  }
  // 照搬整句：title 跟原文高度重合
  const raw = c.input.replace(/[，。！？、,.!?\s]/g, '');
  const t = title.replace(/[，。！？、,.!?\s]/g, '');
  if (t.length >= 8 && raw.includes(t)) {
    fails.push(`title 是原文的整段照搬：「${title}」`);
  }
  return fails;
}

/* ---------- 跑 ---------- */
(async () => {
  const verbose = process.argv.includes('-v') || process.argv.includes('--verbose');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? Number(onlyArg.split('=')[1]) : null;

  if (!hasDeepSeek()) {
    console.log('未配置 DEEPSEEK_API_KEY，测试无法进行（在 后端/.env 里填上再跑）');
    process.exit(1);
  }

  const list = only ? [CASES[only - 1]].filter(Boolean) : CASES;
  console.log(`语音任务名润色 · 回归测试（基准日 ${BASE_DATE}）`);
  console.log(`共 ${list.length} 条\n`);

  let pass = 0;
  const failures = [];

  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const idx = only ? only : i + 1;
    let tasks = [];
    try {
      tasks = (await parseTasksWithDeepSeek(c.input, BASE_DATE)) || [];
    } catch (e) {
      console.log(`✗ [${idx}] ${c.name}`);
      console.log(`    调用失败：${(e && e.message) || e}\n`);
      failures.push({ idx, name: c.name, fails: ['接口调用失败'], tasks });
      continue;
    }
    const fails = checkCase(c, tasks);
    if (verbose) {
      console.log(`— [${idx}] ${c.name}`);
      console.log(`    输入：${c.input}`);
      console.log(`    输出：${JSON.stringify(tasks, null, 0)}`);
    }
    if (fails.length) {
      console.log(`✗ [${idx}] ${c.name}`);
      console.log(`    输入：${c.input}`);
      fails.forEach((f) => console.log(`    · ${f}`));
      console.log('');
      failures.push({ idx, name: c.name, fails, tasks });
    } else {
      pass++;
      if (verbose) console.log(`    ✓ 通过\n`);
    }
  }

  console.log('─'.repeat(56));
  console.log(`通过 ${pass} / ${list.length}`);
  if (failures.length) {
    console.log(`\n失败清单：`);
    failures.forEach((f) => console.log(`  [${f.idx}] ${f.name} —— ${f.fails.join('；')}`));
    process.exit(1);
  }
})();
