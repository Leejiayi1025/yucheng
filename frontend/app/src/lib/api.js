// 统一 API 客户端：鉴权 / 任务 / 分类 / 语义解析
// 注意：DeepSeek 的 key 只存在后端 .env，前端永远拿不到
//
// API 地址策略：
//  · 生产（后端托管前端，同源）→ 用相对路径 /api，天然无跨域
//  · 本地 Vite 开发（5173 等）→ 指向本机 4000
const DEV_PORTS = ['5173', '5174', '4173', '3000'];
const IS_DEV =
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) &&
  DEV_PORTS.includes(location.port);
const API_BASE = IS_DEV ? 'http://localhost:4000/api' : (import.meta.env.VITE_API_URL || '') + '/api';

const TOKEN_KEY = 'yucheng_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}
export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401) {
    setToken('');
    try {
      localStorage.removeItem('yucheng_user');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('yc:unauthorized'));
    throw new Error('登录已过期');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.msg || '请求失败');
  return data;
}

/* ---------- 鉴权 ---------- */

/** 获取当前用户信息 */
export async function fetchMe() {
  try {
    return await req('/auth/me');
  } catch {
    return null;
  }
}

/** 登录：account 可以是邮箱或手机号 */
export async function login(account, password) {
  try {
    const r = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password })
    });
    if (r.status === 401) {
      const j = await r.json().catch(() => ({}));
      return { ok: false, msg: j.error || '账号或密码错误' };
    }
    if (!r.ok) return { ok: false, msg: '服务暂不可用，请稍后再试' };
    const j = await r.json();
    if (j.token) {
      setToken(j.token);
      return { ok: true, user: j.user };
    }
    return { ok: false, msg: '登录失败，请稍后再试' };
  } catch {
    return { ok: false, msg: '无法连接服务器，请确认后端已启动' };
  }
}

/** 发送邮箱验证码 */
export async function sendCode(email) {
  try {
    const r = await fetch(API_BASE + '/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, msg: j.error || '发送失败' };
    return { ok: true, emailed: !!j.emailed, dev: !!j.dev, code: j.code, hint: j.hint };
  } catch {
    return { ok: false, msg: '无法连接服务器' };
  }
}

/** 注册（邮箱 + 验证码 + 密码） */
export async function register(email, code, password, nickname) {
  try {
    const r = await fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code,
        password,
        nickname: nickname || ('用户' + String(email).split('@')[0].slice(-4))
      })
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 409) return { ok: false, msg: j.error || '该邮箱已注册，请直接登录' };
    if (!r.ok) return { ok: false, msg: j.error || '注册失败，请稍后再试' };
    if (j.token) {
      setToken(j.token);
      return { ok: true, user: j.user };
    }
    return { ok: false, msg: '注册失败，请稍后再试' };
  } catch {
    return { ok: false, msg: '无法连接服务器，请确认后端已启动' };
  }
}

/** 修改密码 */
/** 修改密码 */
export async function changePassword(oldPassword, newPassword, code) {
  try {
    await req('/auth/password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword, code })
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: (e && e.message) || '修改失败' };
  }
}

/** 注销账号 */
export async function deleteAccount(code) {
  try {
    await req('/auth/delete', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: (e && e.message) || '注销失败' };
  }
}

/** 绑定手机号（邮箱验证码验证） */
export async function bindPhone(phone, code) {
  try {
    const d = await req('/auth/phone', {
      method: 'POST',
      body: JSON.stringify({ phone, code })
    });
    return { ok: true, phone: d.phone || phone };
  } catch (e) {
    return { ok: false, msg: (e && e.message) || '绑定失败' };
  }
}

/** 更新个人信息（昵称/签名/头像） */
export async function updateProfile(data) {
  try {
    const d = await req('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return { ok: true, user: d.user };
  } catch (e) {
    return { ok: false, msg: (e && e.message) || '更新失败' };
  }
}

/** 绑定 / 更换邮箱 */
export async function bindEmail(email, code) {
  try {
    const d = await req('/auth/email', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    return { ok: true, email: d.email || email };
  } catch (e) {
    return { ok: false, msg: (e && e.message) || '绑定失败' };
  }
}

/* ---------- 任务 ---------- */
export function toServer(t) {
  return {
    date: t.date,
    title: t.title,
    start: t.start || null,
    end: t.end || null,
    place: t.place || null,
    cat: t.cat || '其他',
    status: t.status === 'done' ? 1 : 0,
    remind: typeof t.remind === 'number' ? t.remind : -1,
    note: t.note || null,
    repeatDays: t.repeatDays || null
  };
}
export function fromServer(r) {
  let rm = typeof r.remind === 'number' ? r.remind : parseInt(r.remind, 10);
  if (!isFinite(rm)) rm = -1;
  let rd = null;
  if (Array.isArray(r.repeatDays)) rd = r.repeatDays;
  else if (typeof r.repeatDays === 'string' && r.repeatDays) {
    try {
      rd = JSON.parse(r.repeatDays);
    } catch {
      rd = null;
    }
  }
  return {
    id: String(r.id),
    date: String(r.date).slice(0, 10),
    title: r.title || '新任务',
    start: r.start || '',
    end: r.end || '',
    place: r.place || '',
    cat: r.cat || '其他',
    status: r.status === 1 || r.status === '1' ? 'done' : 'todo',
    remind: rm,
    note: r.note || '',
    repeatDays: rd
  };
}

export async function fetchTasks(start, end) {
  const d = await req(`/tasks/range?start=${start}&end=${end}`);
  return (d.tasks || []).map(fromServer);
}
export async function createTask(t) {
  const d = await req('/tasks', { method: 'POST', body: JSON.stringify(toServer(t)) });
  return d.task ? fromServer(d.task) : null;
}
export async function patchTask(id, patch) {
  const d = await req('/tasks/' + encodeURIComponent(id), {
    method: 'PUT',
    body: JSON.stringify(patch)
  });
  return d.task ? fromServer(d.task) : null;
}
export async function removeTask(id) {
  return req('/tasks/' + encodeURIComponent(id), { method: 'DELETE' });
}

/* ---------- 分类 ---------- */
export async function fetchCategories() {
  try {
    const d = await req('/categories');
    return d.categories || [];
  } catch {
    return [];
  }
}
export async function createCategory(name, color) {
  try {
    const d = await req('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color })
    });
    return d.category || null;
  } catch {
    return null;
  }
}
export async function removeCategory(name) {
  try {
    await req('/categories/' + encodeURIComponent(name), { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

/* ---------- 语音解析（后端 -> DeepSeek）：一段口语 → 新建 / 修改 / 删除 ---------- */
/**
 * @returns {{intent:'create'|'update'|'delete', tasks:Array, changes:Array, source:string}}
 *   intent='create' → tasks 为要新建的任务
 *   intent='update' → changes 为 [{id,title,desc,patch}]
 *   intent='delete' → changes 为 [{id,title,desc}]
 */
export async function parseTasks(text, baseDate) {
  const d = await req('/voice/parse', {
    method: 'POST',
    body: JSON.stringify({ text, baseDate })
  });
  return {
    intent: d.intent || 'create',
    tasks: d.tasks || [],
    changes: d.changes || [],
    source: d.source || 'local'
  };
}
