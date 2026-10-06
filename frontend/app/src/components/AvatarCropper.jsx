import { useRef, useState, useEffect } from 'react';

/**
 * 头像裁剪弹窗 - 微信风格
 * 选完图片后弹出，用户可以拖动调整位置，双指捏合缩放，确认后输出 200x200 JPEG
 */
export default function AvatarCropper({ file, onCancel, onConfirm }) {
  const [imgUrl, setImgUrl] = useState('');
  const [pos, setPos] = useState({ x: 0, y: 0 }); // 图片中心相对于裁剪框中心的偏移
  const [scale, setScale] = useState(1);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);

  const STAGE_SIZE = 300; // 裁剪框显示尺寸

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setNaturalW(img.width);
        setNaturalH(img.height);
        // 默认缩放：让图片刚好填满裁剪框（取较大的缩放比例，保证覆盖）
        const baseScale = Math.max(STAGE_SIZE / img.width, STAGE_SIZE / img.height);
        setScale(baseScale);
        setPos({ x: 0, y: 0 }); // 默认居中
        setImgUrl(reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }, [file]);

  // 拖动开始
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' && e.touches && e.touches.length === 2) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y
    };
  };

  // 拖动中
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({
      x: dragRef.current.startPosX + dx,
      y: dragRef.current.startPosY + dy
    });
  };

  // 拖动结束
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // 双指捏合开始
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchRef.current = {
        startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        startScale: scale
      };
    }
  };

  // 双指捏合中
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / pinchRef.current.startDist;
      setScale(Math.min(3, Math.max(0.5, pinchRef.current.startScale * ratio)));
    }
  };

  // 双指捏合结束
  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  // 确认裁剪
  const confirm = () => {
    const OUTPUT_SIZE = 200;
    const cv = document.createElement('canvas');
    cv.width = OUTPUT_SIZE;
    cv.height = OUTPUT_SIZE;
    const ctx = cv.getContext('2d');

    const img = new Image();
    img.onload = () => {
      // 图片在屏幕上的显示尺寸
      const displayW = naturalW * scale;
      const displayH = naturalH * scale;

      // 屏幕坐标 → canvas坐标 的缩放比例
      const ratio = OUTPUT_SIZE / STAGE_SIZE;

      // 清空canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // 关键：
      // 屏幕上，裁剪框中心在 (STAGE_SIZE/2, STAGE_SIZE/2) = (150, 150)
      // 屏幕上，图片中心在 (150 + pos.x, 150 + pos.y)
      // 我们要把裁剪框里看到的内容，画到canvas上

      // 1. 把canvas原点移到canvas中心（对应裁剪框中心）
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      // 2. 缩放：屏幕尺寸 → canvas尺寸
      ctx.scale(ratio, ratio);
      // 3. 把图片画上去：图片中心相对于裁剪框中心的偏移就是 pos.x, pos.y
      // （因为我们已经把原点移到裁剪框中心了）
      ctx.drawImage(
        img,
        pos.x - displayW / 2,  // 图片左上角x（相对于裁剪框中心）
        pos.y - displayH / 2,  // 图片左上角y（相对于裁剪框中心）
        displayW,
        displayH
      );

      onConfirm(cv.toDataURL('image/jpeg', 0.85));
    };
    img.src = imgUrl;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onCancel}
    >
      {/* 标题 */}
      <div style={{ color: '#fff', fontSize: 17, marginBottom: '20px' }}>
        调整头像
      </div>

      {/* 裁剪区域 */}
      <div
        ref={stageRef}
        style={{
          width: STAGE_SIZE,
          height: STAGE_SIZE,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '50%', // 圆形裁剪框
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {imgUrl && (
          <img
            src={imgUrl}
            alt=""
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: naturalW,
              height: naturalH,
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        )}
      </div>

      {/* 提示文字 */}
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '30px 0' }}>
        拖动调整位置 · 双指捏合缩放
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: '40px' }}>
        <div
          onClick={onCancel}
          style={{
            color: '#fff',
            fontSize: 17,
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          取消
        </div>
        <div
          onClick={confirm}
          style={{
            color: '#007aff',
            fontSize: 17,
            fontWeight: '600',
            padding: '10px 20px',
            cursor: 'pointer'
          }}
        >
          完成
        </div>
      </div>
    </div>
  );
}
