import Icon from './Icon';

/** 时间冲突提醒（原型 #conflictModal） */
export default function ConflictModal({ existing, incoming, onAdjustExisting, onAdjustIncoming, onKeep, onClose }) {
  if (!existing || !incoming) return null;
  const shift = (t) => {
    // 顺移到新任务结束之后（-1 小时为兜底）
    const [sh, sm] = (incoming.end || incoming.start || '09:00').split(':').map(Number);
    const dur = (() => {
      if (!t.start || !t.end) return 60;
      const [a, b] = t.start.split(':').map(Number);
      const [c, d] = t.end.split(':').map(Number);
      return Math.max(30, c * 60 + d - (a * 60 + b));
    })();
    const start = sh * 60 + sm;
    const end = start + dur;
    const fmt = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    return { start: fmt(start), end: fmt(end) };
  };

  const exShift = shift(existing);
  const inShift = shift(incoming);

  return (
    <div className="modal show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-head">
          <h3>
            <Icon name="warn" size={20} />
            时间冲突提醒
          </h3>
          <div className="modal-close" onClick={onClose}>
            <Icon name="close" size={20} />
          </div>
        </div>
        <div className="modal-msg">
          你在 {existing.start} 已有「{existing.title}」安排，要如何处理这次「{incoming.title}」？
        </div>
        <div className="modal-option" onClick={() => onAdjustExisting(exShift)}>
          <div className="t">调整{existing.title}的时间</div>
          <div className="s">
            改到 {exShift.start} - {exShift.end}
          </div>
        </div>
        <div className="modal-option" onClick={() => onAdjustIncoming(inShift)}>
          <div className="t">调整{incoming.title}的时间</div>
          <div className="s">
            改到 {inShift.start} - {inShift.end}
          </div>
        </div>
        <div className="modal-option" onClick={onKeep}>
          <div className="t">两个都保留</div>
          <div className="s">我会自己看着办</div>
        </div>
      </div>
    </div>
  );
}
