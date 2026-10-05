// 端到端联调：登录 -> 拿 JWT -> 调语义解析 -> 校验 DeepSeek 结果
const BASE = 'http://127.0.0.1:4000/api';

async function main() {
  // 1. 登录
  const lr = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13800138000', password: '123456' })
  });
  const lj = await lr.json();
  if (!lj.token) { console.log('登录失败', lj); return; }
  console.log('1) 登录 OK, uid =', lj.user && lj.user.id);

  const token = lj.token;

  // 2. 引擎状态（不应包含任何 key）
  const er = await fetch(BASE + '/voice/engine', { headers: { Authorization: 'Bearer ' + token } });
  const rawEngine = await er.text();
  console.log('2) /voice/engine =', rawEngine, '| 含 sk- ?', /sk-/.test(rawEngine));

  // 3. 语义解析
  const cases = [
    '明天下午三点在图书馆开会',
    '后天早上8点半健身1小时',
    '下周三下午4点到7点学习PM理论知识',
    '晚上8点提醒我看电影'
  ];
  for (const c of cases) {
    const pr = await fetch(BASE + '/voice/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ text: c, baseDate: '2025-04-22' })
    });
    const pj = await pr.json();
    const body = JSON.stringify(pj);
    console.log('3)', c, '=>', body, '| source =', pj.source, '| 泄露 sk- ?', /sk-/.test(body));
  }

  // 4. 无 token 必须被拒（防止白嫖 key 额度）
  const nr = await fetch(BASE + '/voice/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '明天开会' })
  });
  console.log('4) 无 token 调用 => HTTP', nr.status, '(应为 401)');

  // 5. 任务 CRUD：日期必须是 YYYY-MM-DD（dateStrings 修复验证）
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const today = new Date(); const p = n => String(n).padStart(2, '0');
  const day = today.getFullYear() + '-' + p(today.getMonth() + 1) + '-' + p(today.getDate());

  const cr = await fetch(BASE + '/tasks', { method: 'POST', headers: H, body: JSON.stringify({ date: day, title: '联调测试任务', start: '15:00', end: '16:00', place: '图书馆', cat: '学习', status: 0, remind: 15, note: '备注', repeatDays: [1, 3] }) });
  const cj = await cr.json();
  const t = cj.task || {};
  console.log('5a) 创建 =>', JSON.stringify(cj), '| date 格式 OK?', /^\d{4}-\d{2}-\d{2}$/.test(t.date || ''), '| start OK?', t.start === '15:00');

  const gr = await fetch(BASE + '/tasks/range?start=' + day + '&end=' + day, { headers: H });
  const gj = await gr.json();
  const gd = (gj.tasks || [])[0];
  console.log('5b) 区间查 =>', (gj.tasks || []).length, '条 | date =', gd && gd.date, '| repeatDays =', JSON.stringify(gd && gd.repeatDays));

  const ur = await fetch(BASE + '/tasks/' + t.id, { method: 'PUT', headers: H, body: JSON.stringify({ status: 1 }) });
  const uj = await ur.json();
  console.log('5c) 完成 => status =', uj.task && uj.task.status, '(应为 1)');

  const dr = await fetch(BASE + '/tasks/' + t.id, { method: 'DELETE', headers: H });
  const dj = await dr.json();
  const gr2 = await fetch(BASE + '/tasks/range?start=' + day + '&end=' + day, { headers: H });
  const gj2 = await gr2.json();
  console.log('5d) 删除 =>', JSON.stringify(dj), '| 剩余', (gj2.tasks || []).length, '条');
}

main().catch(e => console.log('ERR', e.message));
