import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import Login from './pages/Login';
import Today from './pages/Today';
import NotifBanner from './components/NotifBanner';
import Onboarding from './components/Onboarding';
import Icon from './components/Icon';
import { useApp } from './store';
import { playKeySound, playAlarmRing, stopAlarmRing } from './lib/sound';

// 懒加载其他页面，首屏只加载首页
const Calendar = lazy(() => import('./pages/Calendar'));
const Mine = lazy(() => import('./pages/Mine'));

/* 错过多久就不再补提醒（分钟）。
   太小会漏提醒；太大会在打开 App 时把今天所有已过去的任务一次性全响一遍。 */
const CATCH_UP_MIN = 30;

const NOTIFIED_KEY = 'yc_notified';
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* 已提醒记录必须跨刷新保留：否则用户点「知道了」之后一刷新，只要还在
   补提醒窗口内就会再响一次。只认当天的记录，隔天自动作废。 */
function loadNotified() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(NOTIFIED_KEY) || '{}');
    const today = ymd(new Date());
    const set = new Set();
    for (const id of Object.keys(saved)) if (saved[id] === today) set.add(id);
    return set;
  } catch {
    return new Set();
  }
}
function saveNotified(set) {
  try {
    const today = ymd(new Date());
    const obj = {};
    set.forEach((id) => {
      obj[id] = today;
    });
    sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(obj));
  } catch {
    /* 隐私模式下 storage 可能不可写，忽略即可 */
  }
}

export default function App() {
  const { user, toastData, closeToast, soundOn, tasks } = useApp();
  const [page, setPage] = useState('today');
  const [alarm, setAlarm] = useState(null); // 闹钟弹窗 {title, start}
  const [entered, setEntered] = useState(() => {
    try {
      return sessionStorage.getItem('yc_entered') === '1';
    } catch {
      return true;
    }
  });
  const notifiedRef = useRef(loadNotified()); // 已经提醒过的任务ID，避免重复弹
  const alarmTimeoutRef = useRef(null); // 存闹钟的setTimeout，方便停的时候清掉
  /* 定时器里要读「最新」的任务。直接依赖 tasks 会让 interval 每次任务变动都重建，
     频繁变动时定时器一直重置、反而永远不触发，所以放进 ref。 */
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // 闹钟响铃：连续响2次，存定时器id方便停止
  const ringAlarm = () => {
    playAlarmRing();
    // 清掉之前的定时器
    if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    alarmTimeoutRef.current = setTimeout(() => playAlarmRing(), 3000);
  };

  // 彻底停闹钟：停铃声+清所有定时器
  const stopAlarm = () => {
    stopAlarmRing();
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }
  };

  /* 页面在后台时补一条系统通知 —— 此时 App 内的大弹窗用户看不见。
     前台不重复打扰。注意：H5 只能在页面存活时发通知，
     关掉标签页/锁屏后不会响，这是浏览器限制，不是这里能解决的。 */
  const notifySystem = (title, start) => {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (document.visibilityState === 'visible') return;
      new Notification('语程 · 任务提醒', { body: title + ' ' + start + ' 开始', tag: 'yc-alarm' });
    } catch {
      /* 部分浏览器（iOS Safari）不支持直接构造通知，忽略 */
    }
  };

  // 全局按钮点击音效
  useEffect(() => {
    if (!soundOn) return;
    const handler = (e) => {
      if (e.target.closest('button, .mine-item, .tabbar-item, .vs-chip')) {
        playKeySound();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [soundOn]);

  /* 通知权限必须在用户手势里申请，Safari 在挂载时直接调用会被拒。
     所以挂在「首次点击」上补一次。 */
  useEffect(() => {
    if (!user || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    const ask = () => {
      Notification.requestPermission().catch(() => {});
    };
    document.addEventListener('click', ask, { once: true });
    return () => document.removeEventListener('click', ask);
  }, [user]);

  // 闹钟提醒：登录后每10秒检查一次，到时间就响铃+弹窗
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      const now = new Date();
      const nowHM = now.getHours() * 60 + now.getMinutes();
      const todayStr = ymd(now);
      tasksRef.current.forEach(t => {
        if (!t.start || t.date !== todayStr || t.remind < 0) return;
        // 已完成的任务不提醒（任务的状态字段是 status，不是 done）
        if (t.status === 'done') return;
        // 提醒时间 = start - remind分钟
        const [h, m] = t.start.split(':').map(Number);
        const remindAt = h * 60 + m - t.remind;
        /* 只补「刚刚到点」的提醒。若不加这个上界，
           每次打开 App 都会把今天所有已过去的任务一起响一遍。 */
        const late = nowHM - remindAt;
        if (late < 0 || late > CATCH_UP_MIN) return;
        if (notifiedRef.current.has(t.id)) return;
        notifiedRef.current.add(t.id);
        saveNotified(notifiedRef.current);
        ringAlarm();
        notifySystem(t.title, t.start);
        setAlarm({ id: t.id, title: t.title, start: t.start });
      });
    }, 10000); // 每10秒检查一次
    return () => {
      clearInterval(timer);
      stopAlarm();
    };
  }, [user]);

  const toastNode = toastData && (
    <div className="toast show" key={toastData.key}>
      <span>{toastData.msg}</span>
      {toastData.actLabel && (
        <b
          className="toast-act"
          onClick={(e) => {
            e.stopPropagation();
            closeToast();
            toastData.actFn && toastData.actFn();
          }}
        >
          {toastData.actLabel}
        </b>
      )}
    </div>
  );

  /* 首次使用的引导页（同一会话只出现一次）；每一页都会跟随当前主题 */
  if (!entered) {
    return (
      <div className="app">
        <Onboarding
          onEnter={() => {
            try {
              sessionStorage.setItem('yc_entered', '1');
            } catch {
              /* ignore */
            }
            setEntered(true);
          }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <Login />
        {toastNode}
      </div>
    );
  }

  return (
    <div className="app">
      {page === 'today' && <Today page={page} onPage={setPage} />}
      <Suspense fallback={<div style={{padding: 20, textAlign: 'center', color: '#999'}}>加载中...</div>}>
        {page === 'calendar' && <Calendar page={page} onPage={setPage} />}
        {page === 'mine' && <Mine page={page} onPage={setPage} />}
      </Suspense>
      <NotifBanner />
      {toastNode}
      {/* 闹钟大弹窗 */}
      {alarm && (
        <div className="alarm-mask" onClick={() => {
          stopAlarm();
          setAlarm(null);
        }}>
          <div className="alarm-dialog" onClick={e => e.stopPropagation()}>
            <div style={{marginBottom: 16, color: 'var(--primary)'}}>
              <Icon name="clock" size={60} />
            </div>
            <div style={{fontSize: 22, fontWeight: 600, marginBottom: 8}}>任务提醒</div>
            <div style={{fontSize: 18, marginBottom: 8, opacity: 0.9}}>{alarm.title}</div>
            <div style={{fontSize: 16, marginBottom: 32, opacity: 0.6}}>{alarm.start} 开始</div>
            <div style={{display: 'flex', gap: 12}}>
              <button 
                className="alarm-later" 
                onClick={() => {
                  stopAlarm();
                  const alarmId = alarm.id;
                  const alarmTitle = alarm.title;
                  const alarmStart = alarm.start;
                  setAlarm(null);
                  // 5分钟后再提醒，弹之前先检查任务还在不在、有没有被标记完成
                  setTimeout(() => {
                    const stillExists = tasksRef.current.find(t => t.id === alarmId);
                    if (stillExists && stillExists.status !== 'done') {
                      ringAlarm();
                      notifySystem(alarmTitle, alarmStart);
                      setAlarm({ id: alarmId, title: alarmTitle, start: alarmStart });
                    }
                  }, 5 * 60 * 1000);
                }}
              >
                稍后提醒
              </button>
              <button className="alarm-ok" onClick={() => {
                stopAlarm();
                setAlarm(null);
              }}>知道了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
