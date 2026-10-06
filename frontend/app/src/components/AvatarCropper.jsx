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
      // 裁剪框显示尺寸 300x300
      const displaySize = 300;
      // canvas 尺寸 200x200
      const ratio = S / displaySize;

      // 图片在屏幕上的实际显示尺寸
      const displayW = naturalW * scale;
      const displayH = naturalH * scale;

      // 裁剪框中心在 (displaySize/2, displaySize/2) = (150, 150)
      // 图片中心的位置 = (offsetX + displayW/2, offsetY + displayH/2)
      // 我们要让图片中心对齐裁剪框中心？不对，是用户拖动的位置

      // 正确的计算：
      // 图片左上角在裁剪框坐标系中的位置是 (offsetX, offsetY)
      // 裁剪框左上角是 (0, 0)
      // 我们要把裁剪框里的内容画到canvas上

      // 先把canvas平移到裁剪框中心
      ctx.translate(S / 2, S / 2);
      // 缩放
      ctx.scale(ratio, ratio);
      // 平移：图片中心应该在裁剪框中心吗？
      // 不对，图片的位置是 offsetX, offsetY（左上角）
      // 图片中心是 offsetX + displayW/2, offsetY + displayH/2
      // 我们要把图片中心对齐到裁剪框中心 (150, 150)？
      // 不对，用户拖动的就是图片的位置，所以直接用offsetX和offsetY

      // 重新算：
      // 我们要画的是：裁剪框里看到的内容
      // 裁剪框是 300x300，左上角在 (0,0)
      // 图片的位置是：左上角在 (offsetX, offsetY)，大小是 displayW x displayH

      // 所以，drawImage的参数是：
      // 源图：img
      // 源图x：(150 - offsetX) / scale ？不对，应该是从源图的哪个位置开始画
      // 不对，我搞混了。

      // 正确的做法：
      // 1. 先把图片画在canvas上，位置和大小和屏幕上看到的一样
      // 2. 然后裁剪出中心的正方形

      // 重新来：
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, S, S);

      // 计算缩放比例：屏幕上的300px对应canvas的200px
      const s = S / displaySize;

      // 图片在屏幕上的位置：
      // 左上角：(offsetX, offsetY)
      // 大小：(displayW, displayH)
      // 裁剪框中心：(150, 150)

      // 我们要把图片画在canvas上，使得：
      // 屏幕上裁剪框里看到的内容，就是canvas上的内容

      // 所以：
      // 1. 先把canvas的原点移到裁剪框中心
      ctx.translate(S / 2, S / 2);
      // 2. 缩放
      ctx.scale(s, s);
      // 3. 把图片画上去：图片中心应该在哪里？
      // 屏幕上，图片中心 = offsetX + displayW/2, offsetY + displayH/2
      // 屏幕上，裁剪框中心 = 150, 150
      // 所以，相对于裁剪框中心，图片中心的偏移是：
      // (offsetX + displayW/2 - 150, offsetY + displayH/2 - 150)
      const imgCenterX = offsetX + displayW / 2 - displaySize / 2;
      const imgCenterY = offsetY + displayH / 2 - displaySize / 2;

      // 画图片，图片中心对齐到这个位置
      ctx.drawImage(
        img,
        imgCenterX - displayW / 2,
        imgCenterY - displayH / 2,
        displayW,
        displayH
      );

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
        <div className="cropper-hint">拖动调整位置 · 双指捏合缩放</div>
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
