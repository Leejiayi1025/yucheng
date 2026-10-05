import Icon from './Icon';
import { ymd, addDays, parseDS, dateLabel } from '../lib/date';

function nextDow(from, dow) {
  let d = addDays(from, 1);
  while (d.getDay() !== dow) d = addDays(d, 1);
  return d;
}

export function postponeOptions(task) {
  const cur = parseDS(task.date);
  const cand = [
    { k: 'tomorrow', label: '明天', d: addDays(cur, 1) },
    { k: 'after', label: '后天', d: addDays(cur, 2) },
    { k: 'weekend', label: '周末', d: nextDow(cur, 6) },
    { k: 'monday', label: '下周一', d: nextDow(cur, 1) }
  ];
  const seen = {};
  const out = [];
  cand.forEach((o) => {
    const k = ymd(o.d);
    if (seen[k]) return;
    seen[k] = 1;
    out.push(o);
  });
  out.sort((a, b) => a.d - b.d);
  return out;
}

export default function PostponeSheet({ task, onClose, onPick }) {
  return (
    <div className="edit-sheet show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-card">
        <div className="es-nav">
          <button className="es-nav-btn" onClick={onClose}>
            取消
          </button>
          <div className="es-nav-title">顺延任务</div>
          <span />
        </div>
        <div className="es-body">
          <div className="es-block es-title-block">
            <div className="es-title" style={{ fontSize: 19, lineHeight: 1.35 }}>
              {task.title}
            </div>
            <div className="es-sub">当前 {dateLabel(task.date)}</div>
          </div>
          <div className="es-block">
            {postponeOptions(task).map((o) => (
              <div
                key={o.k}
                className="es-row"
                role="button"
                tabIndex={0}
                onClick={() => onPick(ymd(o.d))}
              >
                <span className="es-label">{o.label}</span>
                <span className="es-value">{dateLabel(ymd(o.d))}</span>
                <span className="es-arrow">
                  <Icon name="right" size={15} stroke />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
