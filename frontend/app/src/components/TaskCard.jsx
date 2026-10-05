import { useRef } from 'react';
import Icon from './Icon';
import { catColor } from '../lib/cats';

/**
 * 卡片结构与交互对齐原型：
 *   左滑超过 6px → 跟手位移（上限 -140px，透明度递减）
 *   松手位移 ≤ -70px → 飞出并删除；否则回弹
 *   长按 480ms（手指未动）→ 打开顺延
 */
export default function TaskCard({ t, onToggle, onEdit, onPostpone, onDelete, color }) {
  const c = color || catColor(t.cat);
  const cardRef = useRef(null);
  const wrapRef = useRef(null);
  const st = useRef({ sx: 0, sy: 0, dragging: false, moved: false, dead: false, lp: null });

  const clearLp = () => {
    if (st.current.lp) {
      clearTimeout(st.current.lp);
      st.current.lp = null;
    }
  };
  const back = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = '.2s ease';
    card.style.transform = 'translateX(0)';
    card.style.opacity = '1';
  };

  const onPointerDown = (e) => {
    const s = st.current;
    if (s.dead) return;
    s.sx = e.clientX;
    s.sy = e.clientY;
    s.dragging = false;
    s.moved = false;
    if (cardRef.current) cardRef.current.style.transition = 'none';
    clearLp();
    s.lp = setTimeout(() => {
      s.lp = null;
      if (s.dead || s.dragging) return;
      s.moved = true; // 顺延打开后，抑制抬手那一次 click
      onPostpone && onPostpone(t);
    }, 480);
    st.current = s;
  };

  const onPointerMove = (e) => {
    const s = st.current;
    if (s.dead || s.sx === 0) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) clearLp();
    if (!s.dragging && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      s.dragging = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (s.dragging) {
      s.moved = true;
      const t2 = Math.max(-140, Math.min(0, dx));
      const card = cardRef.current;
      if (card) {
        card.style.transform = 'translateX(' + t2 + 'px)';
        card.style.opacity = String(1 + (Math.max(t2, 0) / -140) * 0.35);
      }
    }
  };

  const onPointerUp = (e) => {
    const s = st.current;
    if (s.dead) return;
    clearLp();
    if (s.dragging) {
      s.dragging = false;
      if (e.clientX - s.sx <= -70) {
        s.dead = true;
        const card = cardRef.current;
        const wrap = wrapRef.current;
        if (card) {
          card.style.transition = '.22s ease-in';
          card.style.transform = 'translateX(-100%)';
          card.style.opacity = '0';
        }
        if (wrap) {
          wrap.style.transition = 'opacity .22s ease-in';
          wrap.style.opacity = '0';
        }
        setTimeout(() => onDelete && onDelete(t), 210);
      } else {
        back();
      }
    }
    s.sx = 0;
    s.sy = 0;
  };

  const onPointerCancel = () => {
    const s = st.current;
    clearLp();
    if (s.dead) return;
    s.dragging = false;
    back();
    s.sx = 0;
    s.sy = 0;
  };

  const handleClick = () => {
    if (st.current.moved) return;
    onEdit && onEdit(t);
  };

  const check = (cls) => (
    <div
      className={cls}
      onClick={(e) => {
        e.stopPropagation();
        onToggle && onToggle(t.id);
      }}
      role="button"
      aria-label="标记完成"
    >
      <Icon name="check" size={16} />
    </div>
  );

  const note = t.note ? <div className="card-note">{t.note}</div> : null;

  const props = {
    ref: cardRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick: handleClick
  };

  if (t.start) {
    return (
      <div className="swipe-wrap" ref={wrapRef}>
        <div
          {...props}
          className={'event-card' + (t.status === 'done' ? ' done' : '')}
          data-id={t.id}
          style={{ '--cat-c': c.fg }}
        >
          {check('ev-check')}
          <div className="event-info">
            <div className="event-title">{t.title}</div>
            <div className="event-meta">
              {t.remind >= 0 && (
                <span className="bell">
                  <Icon name="bell" size={13} stroke />
                </span>
              )}
              {t.repeatDays && t.repeatDays.length > 0 && (
                <span className="rp-badge">
                  <Icon name="repeat" size={13} stroke />
                </span>
              )}
              {t.start}
              {t.end ? ' - ' + t.end : ''}
              {t.place ? ' · ' + t.place : ''}
            </div>
            {note}
          </div>
          <div className="event-tag" style={{ background: c.bg, color: c.fg }}>
            {t.cat}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="swipe-wrap" ref={wrapRef}>
      <div
        {...props}
        className={'todo-item' + (t.status === 'done' ? ' done' : '')}
        data-id={t.id}
        style={{ '--cat-c': c.fg }}
      >
        {check('todo-check')}
        <div className="todo-body">
          <div className="todo-text">{t.title}</div>
          {note}
        </div>
      </div>
    </div>
  );
}
