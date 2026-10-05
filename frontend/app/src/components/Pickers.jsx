import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { WEEK, ymd, parseDS } from '../lib/date';

const HEAD = ['一', '二', '三', '四', '五', '六', '日'];

/** 自绘日期选择器（原型 #datePickerModal）；label 用于说明这次选的是哪个字段（如「顺延到」） */
export function DatePicker({ value, min, onPick, onClose, label }) {
  const [view, setView] = useState(() => {
    const d = value ? parseDS(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const y = view.getFullYear();
  const m = view.getMonth();
  const first = new Date(y, m, 1);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  /* 固定 6 行（42 格）：日历弹窗高度不随月份天数（4/5/6 行）变化 */
  const ROWS = 6;
  const start = new Date(y, m, 1 - offset);
  const today = ymd(new Date());

  const cells = Array.from({ length: ROWS * 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { d, ds: ymd(d), other: d.getMonth() !== m };
  });

  return (
    <div className="picker-modal show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="picker-card">
        <div className="picker-head">
          <div>
            {label && <div className="picker-label">{label}</div>}
            <div className="picker-title">
              {y}年{String(m + 1).padStart(2, '0')}月
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="picker-nav">
              <button onClick={() => setView(new Date(y, m - 1, 1))} aria-label="上个月">
                <Icon name="left" size={18} stroke />
              </button>
              <button onClick={() => setView(new Date(y, m + 1, 1))} aria-label="下个月">
                <Icon name="right" size={18} stroke />
              </button>
            </div>
            <div className="picker-close" onClick={onClose}>
              <Icon name="close" size={20} />
            </div>
          </div>
        </div>
        <div className="date-grid dows-row">
          {HEAD.map((w) => (
            <div key={w} className="dow">
              {w}
            </div>
          ))}
        </div>
        <div className="date-grid date-grid-body">
          {cells.map((c, i) => {
            const off = min && c.ds < min;
            return (
              <div
                key={i}
                className={
                  'day' +
                  (c.other ? ' other' : '') +
                  (c.ds === value ? ' active' : '') +
                  (c.ds === today ? ' today' : '') +
                  (off ? ' disabled' : '')
                }
                aria-disabled={off || c.other || undefined}
                onClick={() => {
                  if (c.other || off) return;
                  onPick(c.ds);
                }}
              >
                {c.d.getDate()}
              </div>
            );
          })}
        </div>
        <div className="picker-actions">
          <button className="secondary" onClick={onClose}>
            取消
          </button>
          <button className="primary" onClick={() => onPick(today)}>
            今天
          </button>
        </div>
      </div>
    </div>
  );
}

/** 自绘时间选择器（原型 #timePickerModal）：小时/分钟两列滚动，选中项居中 */
export function TimePicker({ value, onPick, onClose, allowClear, title = '选择时间' }) {
  const [h, setH] = useState(value ? Number(value.split(':')[0]) : 9);
  const [mi, setMi] = useState(value ? Number(value.split(':')[1]) : 0);
  const canClear = allowClear !== false;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins = Array.from({ length: 60 }, (_, i) => i);

  const useCol = (cur, setCur, list) => {
    const ref = useRef(null);
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / 44);
      const v = list[Math.max(0, Math.min(list.length - 1, idx))];
      if (v !== cur) setCur(v);
    };
    useEffect(() => {
      const el = ref.current;
      if (el) el.scrollTop = cur * 44;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return { ref, onScroll };
  };

  const hCol = useCol(h, setH, hours);
  const mCol = useCol(mi, setMi, mins);

  return (
    <div className="picker-modal show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="picker-card">
        <div className="picker-head">
          <div className="picker-title">{title}</div>
          <div className="picker-close" onClick={onClose}>
            <Icon name="close" size={20} />
          </div>
        </div>
        <div className="time-picker-body">
          <div className="time-col" ref={hCol.ref} onScroll={hCol.onScroll}>
            {hours.map((v) => (
              <div
                key={v}
                className={'time-opt' + (v === h ? ' on' : '')}
                onClick={() => {
                  setH(v);
                  if (hCol.ref.current) hCol.ref.current.scrollTop = v * 44;
                }}
              >
                {String(v).padStart(2, '0')}
              </div>
            ))}
          </div>
          <div className="time-col" ref={mCol.ref} onScroll={mCol.onScroll}>
            {mins.map((v) => (
              <div
                key={v}
                className={'time-opt' + (v === mi ? ' on' : '')}
                onClick={() => {
                  setMi(v);
                  if (mCol.ref.current) mCol.ref.current.scrollTop = v * 44;
                }}
              >
                {String(v).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
        <div className="picker-actions">
          {canClear ? (
            <button className="secondary" onClick={() => onPick('')}>
              清除
            </button>
          ) : (
            <button className="secondary" onClick={onClose}>
              取消
            </button>
          )}
          <button
            className="primary"
            onClick={() => onPick(String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'))}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

/** 日期显示格式：与原型 fmtDateDisplay 一致（今天/明天/后天/周X X月X日） */
export function fmtDateDisplay(ds) {
  if (!ds) return '';
  const today = ymd(new Date());
  if (ds === today) return '今天';
  const t = new Date();
  const tmr = ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1));
  const aft = ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 2));
  if (ds === tmr) return '明天';
  if (ds === aft) return '后天';
  const d = parseDS(ds);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + WEEK[d.getDay()];
}
