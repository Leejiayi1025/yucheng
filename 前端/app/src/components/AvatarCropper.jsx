import { useRef, useState, useEffect } from 'react';

/**
 * 头像裁剪弹窗
 * 选完图片后弹出，用户可以拖动调整裁剪位置，确认后输出 200x200 JPEG
 */
export default function AvatarCropper({ file, onCancel, onConfirm }) {
  const [imgUrl, setImgUrl] = useState('');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const dragRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setNaturalW(img.width);
        setNaturalH(img.height);
        // 默认缩放：让图片填满裁剪框
        const baseScale = Math.max(300 / img.width, 300 / img.height);
        setScale(baseScale);
        setImgUrl(reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }, [file]);

  // 拖动
  const onPointerDown = (e) => {
    dragRef.current = true;
    startRef.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    setOffsetX(e.clientX - startRef.current.x);
    setOffsetY(e.clientY - startRef.current.y);
  };
  const onPointerUp = () => {
    dragRef.current = false;
  };

  // 滚轮缩放
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale((s) => Math.min(3, Math.max(0.5, s * delta)));
  };

  // 双指捏合缩放
  const touchStartRef = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchStartRef.current = {
        dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        scale: scale
      };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / touchStartRef.current.dist;
      setScale(Math.min(3, Math.max(0.5, touchStartRef.current.scale * ratio)));
    }
  };

  // 确认裁剪
  const confirm = () => {
    const S = 200;
    const cv = document.createElement('canvas');
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext('2d');

    const img = new Image();
    img.onload = () => {
      // 计算实际绘制位置
      const displayW = naturalW * scale;
      const displayH = naturalH * scale;
      // 裁剪框中心是 150, 150（显示尺寸300x300）
      // 图片左上角在裁剪框中的位置是 offsetX, offsetY
      // 转换成canvas坐标（200x200，缩放比200/300）
      const ratio = S / 300;
      const dx = offsetX * ratio;
      const dy = offsetY * ratio;
      const dw = displayW * ratio;
      const dh = displayH * ratio;

      ctx.drawImage(img, dx, dy, dw, dh);
      onConfirm(cv.toDataURL('image/jpeg', 0.85));
    };
    img.src = imgUrl;
  };

  return (
    <div className="cropper-overlay" onClick={onCancel}>
      <div className="cropper-box" onClick={(e) => e.stopPropagation()}>
        <div className="cropper-title">调整头像</div>
        <div
          className="cropper-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          {imgUrl && (
            <img
              src={imgUrl}
              alt=""
              className="cropper-img"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                width: naturalW,
                height: naturalH
              }}
              draggable={false}
            />
          )}
          <div className="cropper-mask" />
        </div>
        <div className="cropper-hint">拖动调整位置 · 双指捏合或滚轮缩放</div>
        <div className="cropper-slider">
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
        </div>
        <div className="cropper-btns">
          <button className="cropper-cancel" onClick={onCancel}>
            取消
          </button>
          <button className="cropper-ok" onClick={confirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
