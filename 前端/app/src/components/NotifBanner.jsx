import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useApp } from '../store';
import { remindAt, ymd } from '../lib/date';

/**
 * 提醒通知横幅（原型 .notif）：到点弹出、排队显示、12s 自动消失，
 * 「稍后 5 分钟」= 贪睡，5 分钟后再提醒。
 */
export default function NotifBanner({ onOpenTask }) {
  const { tasks } = useApp();
  const [current, setCurrent] = useState(null);
  const queue = useRef([]);
  const fired = useRef({});
  const snooze = useRef({});
  const timer = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const today = ymd(now);
      tasks.forEach((t) => {
        if (!t.start || !(t.remind >= 0) || t.date !== today || t.status === 'done') return;
        const at = remindAt(t);
        if (!at) return;
        const sn = snooze.current[t.id];
        if (fired.current[t.id] && !sn) return;
        if (sn && now.getTime() < sn) return;
        if (at <= now) {
          fired.current[t.id] = true;
          delete snooze.current[t.id];
          queue.current.push(t);
          if (!timer.current) next();
        }
      });
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const next = () => {
    const t = queue.current.shift();
    if (!t) {
      timer.current = null;
      return;
    }
    setCurrent(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(), 12000);
  };

  const dismiss = () => {
    clearTimeout(timer.current);
    timer.current = null;
    setCurrent(null);
    setTimeout(() => {
      if (!timer.current) next();
    }, 340);
  };

  const onSnooze = () => {
    if (current) snooze.current[current.id] = Date.now() + 5 * 60000;
    dismiss();
  };

  if (!current) return null;

  return (
    <div className="notif show" role="alert" aria-live="assertive">
      <div
        className="notif-top"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          onOpenTask && onOpenTask(current);
          dismiss();
        }}
      >
        <div className="notif-logo">
          <Icon name="bell" size={16} stroke />
        </div>
        <div className="notif-app">语程 · 提醒</div>
        <div className="notif-ago">现在</div>
      </div>
      <div
        className="notif-title"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          onOpenTask && onOpenTask(current);
          dismiss();
        }}
      >
        {current.title}
      </div>
      <div className="notif-body">
        {current.start}
        {current.end ? ' - ' + current.end : ''}
        {current.place ? ' · ' + current.place : ''}
      </div>
      <div className="notif-acts">
        <button className="notif-later" onClick={onSnooze}>
          稍后 5 分钟
        </button>
        <button className="notif-ok" onClick={dismiss}>
          知道了
        </button>
      </div>
    </div>
  );
}
