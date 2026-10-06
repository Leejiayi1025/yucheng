import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import * as api from './lib/api';
import { ymd, addDays } from './lib/date';
import { CAT, autoColor } from './lib/cats';
import { playPageFlip } from './lib/sound';

const Ctx = createContext(null);
export function useApp() {
  return useContext(Ctx);
}

const THEME_KEY = 'timely_theme';
const USER_KEY = 'yucheng_user';

/** profile按用户隔离：key里带userId */
const getProfileKey = (userId) => 'yucheng_profile_' + (userId || 'guest');

const defaultProfile = { av: 'user', img: '', nick: '', sign: '' };

/** 把后端返回的分类色（hsl 底）转成 {bg,fg} */
function toCatPair(name, color) {
  const bg = color || autoColor(name).bg;
  return { bg, fg: autoColor(name).fg };
}

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState('black-gold');
  const [soundOn, setSoundOnState] = useState(() => {
    try {
      return localStorage.getItem('yucheng_sound') !== 'off';
    } catch {
      return true;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const setSoundOn = useCallback((v) => {
    setSoundOnState(v);
    try {
      localStorage.setItem('yucheng_sound', v ? 'on' : 'off');
    } catch {}
  }, []);

  /* 切换主题：更新state + 同步到后端 + 播放翻书声 */
  const setTheme = useCallback(async (t) => {
    playPageFlip(); // 翻书声
    setThemeState(t);
    if (user) {
      try {
        await fetch('/api/auth/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('yucheng_token') || '') },
          body: JSON.stringify({ theme: t })
        });
      } catch {}
    }
  }, [user]);
  const [tasks, setTasks] = useState([]);
  const [cats, setCats] = useState(() => ({ ...CAT }));
  const [profile, setProfileState] = useState(defaultProfile);
  const [toastData, setToastData] = useState(null); // {msg, actLabel, actFn}
  const toastTimer = useRef(null);

  /**
   * 主题：一个 data-theme 属性切换整套色板。
   * theme='auto' 时跟随系统深浅色（浅色→sage，深色→midnight），系统切换会实时响应。
   * 顺带生成日期/时间输入框的图标（原型 applyTheme 的做法）。
   */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      // 没登录时默认用黑白金高级主题，黑白金搭配有立体感
      const real = !user
        ? 'black-gold'
        : theme === 'auto'
          ? (mq.matches ? 'midnight' : 'sage')
          : theme;
      document.documentElement.dataset.theme = real;

      const primary =
        (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '').trim() || '#6B8E7B';
      const mk = (type) => {
        const c = encodeURIComponent(primary);
        const d =
          type === 'date'
            ? "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='" +
              c +
              "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='3'/><path d='M3 9h18M8 2v4M16 2v4'/></svg>"
            : "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='" +
              c +
              "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/></svg>";
        return 'url("data:image/svg+xml,' + encodeURIComponent(d) + '")';
      };
      const root = document.documentElement.style;
      root.setProperty('--date-icon', mk('date'));
      root.setProperty('--time-icon', mk('time'));
    };

    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme, user]);

  /* 手账主题要「手写体」：按需加载霞鹜文楷 Lite（按 unicode-range 分片，只下载用到的字）；
     其他主题不加载，避免白白多几百 KB */
  useEffect(() => {
    if (theme !== 'paper') return;
    if (document.getElementById('lxgw-wenkai')) return;
    const link = document.createElement('link');
    link.id = 'lxgw-wenkai';
    link.rel = 'stylesheet';
    link.href =
      'https://registry.npmmirror.com/lxgw-wenkai-lite-webfont/1.1.0/files/lxgwwenkailite-regular.css';
    document.head.appendChild(link);
  }, [theme]);

  /* 与原型一致：有动作按钮时停留 3.4s，否则 1.6s */
  const toast = useCallback((msg, actLabel, actFn) => {
    setToastData({ msg, actLabel, actFn, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastData(null), actLabel ? 3400 : 1600);
  }, []);
  const closeToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToastData(null);
  }, []);

  useEffect(() => {
    const onUnauth = () => {
      setUser(null);
      setTasks([]);
      try {
        localStorage.removeItem(USER_KEY);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('yc:unauthorized', onUnauth);
    return () => window.removeEventListener('yc:unauthorized', onUnauth);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!api.getToken()) return false;
    try {
      const from = ymd(addDays(new Date(), -370));
      const to = ymd(addDays(new Date(), 400));
      setTasks(await api.fetchTasks(from, to));
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadCats = useCallback(async () => {
    if (!api.getToken()) return;
    const list = await api.fetchCategories();
    if (!list.length) return;
    const next = {};
    list.forEach((c) => {
      next[c.name] = toCatPair(c.name, c.color);
    });
    setCats(next);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTasks();
    loadCats();
    // 从后端加载用户profile和主题
    const loadProfile = async () => {
      try {
        // 加载主题
        const themeRes = await fetch('/api/auth/theme', {
          headers: { Authorization: 'Bearer ' + (localStorage.getItem('yucheng_token') || '') }
        });
        if (themeRes.ok) {
          const td = await themeRes.json();
          if (td.theme) setThemeState(td.theme);
        }
        // 加载头像/昵称/签名
        const res = await api.fetchMe();
        const me = res?.user || res;
        if (me) {
          setProfileState({
            av: 'user',
            img: me.avatar || '',
            nick: me.nickname || '',
            sign: me.sign || ''
          });
        }
      } catch {}
    };
    loadProfile();
  }, [user, loadTasks, loadCats]);

  /* ---- 任务：乐观更新 + 落库 ---- */
  const addTask = useCallback(
    async (t) => {
      const tempId = 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const optimistic = { ...t, id: tempId, status: t.status || 'todo' };
      setTasks((prev) => [...prev, optimistic]);
      const saved = await api.createTask(optimistic).catch(() => null);
      if (saved) setTasks((prev) => prev.map((x) => (x.id === tempId ? saved : x)));
      else toast('网络异常，该任务未同步');
      return saved || optimistic;
    },
    [toast]
  );

  const updateTask = useCallback(
    async (id, patch) => {
      /* 注意：id 用 String 比较。store 里的 id 是字符串（fromServer 转过），
         但调用方可能传数字（如服务端返回的 id），严格 === 会匹配失败、静默不更新。 */
      const cur = tasks.find((x) => String(x.id) === String(id));
      if (!cur) return;
      const next = { ...cur, ...patch };
      setTasks((prev) => prev.map((x) => (String(x.id) === String(id) ? next : x)));
      const saved = await api.patchTask(id, api.toServer(next)).catch(() => null);
      if (!saved) toast('网络异常，修改未同步');
    },
    [tasks, toast]
  );

  /** 删除：返回被删任务，便于「撤销」恢复 */
  const deleteTask = useCallback(
    async (id) => {
      const old = tasks.find((x) => String(x.id) === String(id));
      setTasks((prev) => prev.filter((x) => String(x.id) !== String(id)));
      const ok = await api.removeTask(id).catch(() => null);
      if (!ok) toast('网络异常，删除未同步');
      return old;
    },
    [tasks, toast]
  );

  /** 撤销删除：重新建一条（拿回服务器 id） */
  const restoreTask = useCallback(
    async (t) => {
      if (!t) return;
      const { id, ...rest } = t;
      const saved = await api.createTask(rest).catch(() => null);
      setTasks((prev) => [...prev, saved || { ...rest, id }]);
    },
    []
  );

  const toggleDone = useCallback(
    async (id) => {
      const t = tasks.find((x) => String(x.id) === String(id));
      if (!t) return;
      await updateTask(id, { status: t.status === 'done' ? 'todo' : 'done' });
    },
    [tasks, updateTask]
  );

  /* ---- 分类：自定义新增 / 左滑删除 ---- */
  const addCategory = useCallback(
    async (name) => {
      const n = String(name || '').trim().slice(0, 8);
      if (!n) return null;
      if (cats[n]) return n;
      setCats((prev) => ({ ...prev, [n]: toCatPair(n, null) }));
      await api.createCategory(n, autoColor(n).bg);
      return n;
    },
    [cats]
  );

  const deleteCategory = useCallback(
    async (name) => {
      if (Object.keys(cats).length <= 1) {
        toast('至少需要保留一个分类');
        return false;
      }
      setCats((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      // 后端会把该分类下的任务归到「其他」
      setTasks((prev) => prev.map((t) => (t.cat === name ? { ...t, cat: '其他' } : t)));
      await api.removeCategory(name);
      toast('已删除分类「' + name + '」');
      return true;
    },
    [cats, toast]
  );

  /** 个人信息（头像/昵称/签名）——按用户隔离存本地 */
  const setProfile = useCallback((patch) => {
    setProfileState((prev) => {
      const next = { ...prev, ...patch };
      if (user) {
        try {
          localStorage.setItem(getProfileKey(user.id), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, [user]);

  const logout = useCallback(() => {
    api.setToken('');
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
    setTasks([]);
    setCats({ ...CAT });
    setProfileState(defaultProfile);
    setThemeState('black-gold');
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      user,
      setUser,
      tasks,
      cats,
      profile,
      setProfile,
      loadTasks,
      addTask,
      updateTask,
      deleteTask,
      restoreTask,
      toggleDone,
      addCategory,
      deleteCategory,
      logout,
      soundOn,
      setSoundOn,
      toast,
      closeToast,
      toastData,
      soundOn,
      setSoundOn
    }),
    [
      theme,
      user,
      tasks,
      cats,
      profile,
      setProfile,
      loadTasks,
      addTask,
      updateTask,
      deleteTask,
      restoreTask,
      toggleDone,
      addCategory,
      deleteCategory,
      logout,
      toast,
      closeToast,
      toastData,
      soundOn,
      setSoundOn
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
