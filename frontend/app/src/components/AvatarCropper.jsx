import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * 头像裁剪弹窗 - 完全复刻微信风格，极致丝滑
 * 选完图片后弹出，用户可以拖动调整位置，双指捏合缩放，确认后输出 200x200 JPEG
 */
export default function AvatarCropper({ file, onCancel, onConfirm }) {
  const [imgUrl, setImgUrl] = useState('');
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const stateRef = useRef({
    x: 0,
    y: 0,
    scale: 1,
    dragging: false,
    startX: 0,
    startY: 0,
    startStateX: 0,
    startStateY: 0,
    pinchDist: 0,
    pinchScale: 1,
    pinchMidX: 0,
    pinchMidY: 0,
    pinchStartX: 0,
    pinchStartY: 0
  });

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
        stateRef.current.scale = baseScale;
        stateRef.current.x = 0;
        stateRef.current.y = 0;
        setImgUrl(reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }, [file]);

  // 更新图片变换（直接操作DOM，不触发React重渲染，极致丝滑）
  const updateTransform = useCallback(() => {
    if (!imgRef.current) return;
    const s = stateRef.current;
    imgRef.current.style.transform = `translate(-50%, -50%) translate(${s.x}px, ${s.y}px) scale(${s.scale})`;
  }, []);

  // 单指拖动开始
  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch' && e.touches && e.touches.length === 2) return;
    const s = stateRef.current;
    s.dragging = true;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.startStateX = s.x;
    s.startStateY = s.y;
  }, []);

  // 单指拖动中
  const onPointerMove = useCallback((e) => {
    const s = stateRef.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    s.x = s.startStateX + dx;
    s.y = s.startStateY + dy;
    updateTransform();
  }, [updateTransform]);

  // 单指拖动结束
  const onPointerUp = useCallback(() => {
    stateRef.current.dragging = false;
  }, []);

  // 双指捏合开始
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const s = stateRef.current;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      s.pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      s.pinchScale = s.scale;
      s.pinchMidX = (t1.clientX + t2.clientX) / 2;
      s.pinchMidY = (t1.clientY + t2.clientY) / 2;
      s.pinchStartX = s.x;
      s.pinchStartY = s.y;
    }
  }, []);

  // 双指捏合中
  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const s = stateRef.current;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / s.pinchDist;
      
      // 双指中心点移动也跟着拖动
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - s.pinchMidX;
      const dy = midY - s.pinchMidY;

      s.scale = Math.min(3, Math.max(0.1, s.pinchScale * ratio));
      s.x = s.pinchStartX + dx;
      s.y = s.pinchStartY + dy;
      updateTransform();
    }
  }, [updateTransform]);

  // 双指捏合结束
  const onTouchEnd = useCallback(() => {
    stateRef.current.pinchDist = 0;
  }, []);

  // 确认裁剪
  const confirm = () => {
    const s = stateRef.current;
    const OUTPUT_SIZE = 200;
    const cv = document.createElement('canvas');
    cv.width = OUTPUT_SIZE;
    cv.height = OUTPUT_SIZE;
    const ctx = cv.getContext('2d');

    const img = new Image();
    img.onload = () => {
      // 图片在屏幕上的显示尺寸
      const displayW = naturalW * s.scale;
      const displayH = naturalH * s.scale;

      // 屏幕坐标 → canvas坐标 的缩放比例
      const ratio = OUTPUT_SIZE / STAGE_SIZE;

      // 清空canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      // 1. 把canvas原点移到canvas中心（对应裁剪框中心）
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      // 2. 缩放：屏幕尺寸 → canvas尺寸
      ctx.scale(ratio, ratio);
      // 3. 把图片画上去
      ctx.drawImage(
        img,
        s.x - displayW / 2,
        s.y - displayH / 2,
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
        background: '#000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none' // 禁止浏览器默认手势，防止页面滚动
      }}
    >
      {/* 顶部导航栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        paddingTop: 'calc(16px + env(safe-area-inset-top))'
      }}>
        <div
          onClick={onCancel}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
        <div style={{ color: '#fff', fontSize: 17, fontWeight: '500' }}>
          移动和缩放
        </div>
        <div style={{ width: '32px' }}></div>
      </div>

      {/* 裁剪区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div
          ref={stageRef}
          style={{
            width: STAGE_SIZE,
            height: STAGE_SIZE,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '50%',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)'
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: naturalW,
                height: naturalH,
                transform: 'translate(-50%, -50%) translate(0px, 0px) scale(1)',
                transformOrigin: 'center center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
                willChange: 'transform', // GPU加速，丝滑必备
                touchAction: 'none'
              }}
              draggable={false}
            />
          )}
        </div>
      </div>

      {/* 底部完成按钮 */}
      <div style={{
        padding: '20px',
        paddingBottom: 'calc(30px + env(safe-area-inset-bottom))',
      }}>
        <div
          onClick={confirm}
          style={{
            width: '100%',
            padding: '16px 0',
            borderRadius: '28px',
            background: 'var(--primary, #07c160)',
            color: '#fff',
            textAlign: 'center',
            fontSize: '17px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          完成
        </div>
      </div>
    </div>
  );
}
