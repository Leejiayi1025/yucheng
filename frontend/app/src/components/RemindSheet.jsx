import { useRef, useState } from 'react';
import { remindText, remindAt, ymd, pad } from '../lib/date';

export default function RemindSheet({ tasks, onClose, onDelete }) {
  const today = ymd(new Date());
  const now = new Date();
  const list = tasks
    .filter((t) => t.date === today && t.start && t.remind >= 0 && t.status !== 'done')
    .sort((a, b) => a.start.localeCompare(b.start));

  /* 左滑删除（跟今日页卡片同一个手势语言） */
  const [swiped, setSwiped] = useState(null);
  const swipe = useRef({ id: null, sx: 0, sy: 0, dragging: false, moved: false });

  const pDown = (e, id) => {
    swipe.current = { id, sx: e.clientX, sy: e.clientY, dragging: false, moved: false };
  };
  const pMove = (e) => {
    const s = swipe.current;
    if (!s.id) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.dragging) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) s.dragging = true;
      else if (Math.abs(dy) > 6) {
        s.id = null;
        return;
      }
    }
    if (s.dragging) {
      s.moved = true;
      const inner = e.currentTarget.querySelector('.rm-swipe-inner');
      if (inner) inner.style.transform = 'translateX(' + Math.max(-76, Math.min(0, dx)) + 'px)';
      e.preventDefault();
    }
  };
  const pUp = (e) => {
    const s = swipe.current;
    if (!s.id) return;
    const dx = e.clientX - s.sx;
    const inner = e.currentTarget.querySelector('.rm-swipe-inner');
    if (inner) inner.style.transform = '';
    if (s.dragging) {
      if (dx < -32) setSwiped(s.id);
      else if (dx > 10) setSwiped(null);
    }
    swipe.current = { id: null, sx: 0, sy: 0, dragging: false, moved: false };
  };

  return (
    <div className="edit-sheet show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-card">
        <div className="es-nav">
          <button className="es-nav-btn" onClick={onClose}>
            关闭
          </button>
          <div className="es-nav-title">提醒中心</div>
          <span />
        </div>
        <div className="es-body">
          <div className="es-block">
            <div className="es-row">
              <span className="es-label">现在</span>
              <span className="es-value">
                {pad(now.getHours())}:{pad(now.getMinutes())}
              </span>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="es-empty">今天还没有设置提醒的安排</div>
          ) : (
            <div>
              <div className="es-group-title">今天 · 左滑可删除</div>
              <div className="es-block">
                {list.map((t) => {
                  const at = remindAt(t);
                  const state = at && at <= now ? '已提醒' : '待提醒';
                  return (
                    <div
                      key={t.id}
                      className={'rm-swipe' + (swiped === t.id ? ' swiped' : '')}
                      onPointerDown={(e) => pDown(e, t.id)}
                      onPointerMove={pMove}
                      onPointerUp={pUp}
                      onPointerCancel={pUp}
                    >
                      <div className="rm-swipe-inner es-row">
                        <span className="es-label">{t.title}</span>
                        <span className="es-value">
                          {t.start} · {remindText(t.remind)} · {state}
                        </span>
                      </div>
                      <button
                        className="rm-swipe-del"
                        onClick={() => {
                          setSwiped(null);
                          if (onDelete) onDelete(t.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
