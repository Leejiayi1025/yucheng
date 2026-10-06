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

export default function App() {
  const { user, toastData, closeToast, soundOn, tasks, toast } = useApp();
  const [page, setPage] = useState('today');
  const [alarm, setAlarm] = useState(null); // 闹钟弹窗 {title, start}
  const [entered, setEntered] = useState(() => {
    try {
      return sessionStorage.getItem('yc_entered') === '1';
    } catch {
      return true;
    }
  });
  const notifiedRef = useRef(new Set()); // 已经提醒过的任务ID，避免重复弹
  const alarmTimeoutRef = useRef(null); // 存闹钟的setTimeout，方便停的时候清掉

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

  // 闹钟提醒：登录后每10秒检查一次，到时间就弹通知+响铃
  useEffect(() => {
    if (!user) return;
    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // 定时检查
    const timer = setInterval(() => {
      const now = new Date();
      const nowHM = now.getHours() * 60 + now.getMinutes();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      tasks.forEach(t => {
        if (!t.start || t.date !== todayStr || t.remind < 0) return;
        // 已完成的任务不提醒
        if (t.done === 1 || t.done === true) return;
        // 计算提醒时间 = start - remind分钟
        const [h, m] = t.start.split(':').map(Number);
        const taskStartMin = h * 60 + m;
        const remindAt = taskStartMin - t.remind;
        // 现在到了提醒时间，而且还没提醒过
        if (nowHM >= remindAt && !notifiedRef.current.has(t.id)) {
          notifiedRef.current.add(t.id);
          // 1. 响铃
          ringAlarm();
          // 2. 弹APP内部大弹窗
          setAlarm({ id: t.id, title: t.title, start: t.start });
        }
      });
    }, 10000); // 每10秒检查一次
    return () => {
      clearInterval(timer);
      stopAlarm();
    };
  }, [user, tasks, toast]);

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
                  // 5分钟后再提醒，弹之前先检查任务还在不在
                  setTimeout(() => {
                    const stillExists = tasks.find(t => t.id === alarmId);
                    if (stillExists && stillExists.done !== 1 && stillExists.done !== true) {
                      ringAlarm();
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
