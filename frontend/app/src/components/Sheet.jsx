import Icon from './Icon';

export default function Sheet({ title, onClose, children }) {
  return (
    <div
      className="mask"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="sheet">
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          {onClose && (
            <button className="sheet-close" onClick={onClose} aria-label="关闭">
              <Icon name="close" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
