import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { catColor } from '../lib/cats';

/** 第 1 页：Brand Hero —— 智能手表 Logo + 光晕 */
function BrandHero() {
  return (
    <div className="ob-demo ob-brand">
      <div className="ob-glow" />
      <div className="ob-hero">
        <svg viewBox="0 0 120 150" className="ob-hero-clock">
          {/* 上面的表带 */}
          <rect x="46" y="0" width="28" height="20" rx="4" fill="#2D3748" />
          {/* 下面的表带 */}
          <rect x="46" y="130" width="28" height="20" rx="4" fill="#2D3748" />
          {/* 手表主体（方形圆角，白色背景） */}
          <rect x="20" y="20" width="80" height="110" rx="24" fill="white" stroke="#E2E8F0" strokeWidth="1" />
          {/* 右边的表冠按钮 */}
          <rect x="100" y="60" width="6" height="14" rx="2" fill="#2D3748" />
          {/* 圆形表盘 */}
          <circle cx="60" cy="75" r="34" fill="white" stroke="#2D3748" strokeWidth="2.5" />
          {/* 12个刻度 */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <line
              key={deg}
              x1="60"
              y1="45"
              x2="60"
              y2="50"
              stroke="#2D3748"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${deg} 60 75)`}
            />
          ))}
          {/* 时针（短粗） */}
          <path d="M60 75 L60 56" stroke="#2D3748" strokeWidth="3.5" strokeLinecap="round" />
          {/* 分针（长一点） */}
          <path d="M60 75 L76 82" stroke="#2D3748" strokeWidth="3.5" strokeLinecap="round" />
          {/* 红色秒针 */}
          <path d="M60 75 L54 96" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" />
          {/* 中心点 */}
          <circle cx="60" cy="75" r="3" fill="#2D3748" />
        </svg>
      </div>
      <div className="ob-hero-ripple" />
      <div className="ob-hero-ripple d2" />
    </div>
  );
}

/** 第 2 页：语音 → 识别结果 → 可二次编辑 */
function VoiceEditDemo() {
  return (
    <div className="ob-demo">
      <div className="ob-vmic">
        <Icon name="mic" size={24} />
        <span className="ob-ring" />
        <span className="ob-ring d2" />
        <span className="ob-ring d3" />
      </div>
      <div className="ob-vtext">
        <span className="ob-typewriter">今天下午三点开会，晚上八点健身</span>
      </div>
      <div className="ob-vlist">
        <div className="ob-vcard">
          <span className="ob-vdot" style={{ background: catColor('工作').fg }} />
          <span className="ob-vname">开会</span>
          <span className="ob-vtime">15:00</span>
        </div>
        <div className="ob-vcard d2">
          <span className="ob-vdot" style={{ background: catColor('运动').fg }} />
          <span className="ob-vname">健身</span>
          <span className="ob-vtime">20:00</span>
        </div>
      </div>
      <div className="ob-edittip">
        <Icon name="edit" size={13} stroke />
        <span>识别结果可点选修改</span>
      </div>
    </div>
  );
}

/** 第 3 页：增删改操作演示 */
function EditDemo() {
  return (
    <div className="ob-demo">
      <div className="ob-opcards">
        <div className="ob-opcard">
          <span className="ob-opcheck" />
          <div className="ob-opbody">
            <span className="ob-opname">写文档和画图</span>
            <span className="ob-opmeta">03:00 – 04:00</span>
          </div>
          <span className="ob-opedit"><Icon name="edit" size={14} stroke /></span>
        </div>
        <div className="ob-opcard done">
          <span className="ob-opcheck on"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
          <div className="ob-opbody">
            <span className="ob-opname">记 50 个单词</span>
            <span className="ob-opmeta">已完成</span>
          </div>
        </div>
        <div className="ob-opcard del">
          <span className="ob-opcheck" />
          <div className="ob-opbody">
            <span className="ob-opname">买洗发水</span>
            <span className="ob-opmeta">待办</span>
          </div>
          <span className="ob-opdel"><Icon name="trash" size={14} stroke /></span>
        </div>
      </div>
      <div className="ob-opbar">
        <span className="ob-opstep"><b>点卡片</b>编辑详情</span>
        <span className="ob-opstep"><b>左滑</b>删除</span>
        <span className="ob-opstep"><b>打勾</b>完成</span>
      </div>
    </div>
  );
}

/** 第 4 页：日期条 + 带分类色条的任务卡 */
function PlanDemo() {
  return (
    <div className="ob-demo">
      <div className="ob-strip">
        {['一', '二', '三', '四', '五', '六', '日'].map((w, i) => (
          <div key={w} className={'ob-sd' + (i === 3 ? ' on' : '')}>
            <span className="ob-sw">{w}</span>
            <span className="ob-sn">{8 + i}</span>
          </div>
        ))}
      </div>
      <div className="ob-cards">
        <div className="ob-card">
          <span className="ob-bar" style={{ background: catColor('工作').fg }} />
          <span className="ob-cname">写文档和画图</span>
          <span className="ob-ctag" style={{ background: catColor('工作').bg, color: catColor('工作').fg }}>
            工作
          </span>
        </div>
        <div className="ob-card d2">
          <span className="ob-bar" style={{ background: catColor('学习').fg }} />
          <span className="ob-cname">记 50 个单词</span>
          <span className="ob-ctag" style={{ background: catColor('学习').bg, color: catColor('学习').fg }}>
            学习
          </span>
        </div>
        <div className="ob-card d3">
          <span className="ob-bar" style={{ background: catColor('健康').fg }} />
          <span className="ob-cname">早点睡觉</span>
          <span className="ob-ctag" style={{ background: catColor('健康').bg, color: catColor('健康').fg }}>
            健康
          </span>
        </div>
      </div>
    </div>
  );
}

/** 第 5 页：主题切换演示 - 迷你手机预览 */
function ThemeDemo() {
  const themes = [
    { bg: '#000000', card: '#141414', primary: '#f0c040', text: '#fff', name: '黑白金高级' },
    { bg: '#f5f5f7', card: '#fff', primary: '#000', text: '#000', name: 'iOS黑白极简' },
    { bg: '#f5f1ec', card: '#fff', primary: '#6b8e7b', text: '#2d3a33', name: '鼠尾草' },
    { bg: '#0c0a09', card: '#1c1917', primary: '#d4af37', text: '#e8e0c8', name: '暗黑奢华金' },
    { bg: '#ffebee', card: '#fff', primary: '#ff8a80', text: '#c62828', name: '蜜桃粉' }
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % themes.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ob-demo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* 迷你手机模型 */}
      <div style={{
        width: 120,
        height: 200,
        borderRadius: 20,
        background: '#1a1a1a',
        padding: 4,
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* 手机屏幕 */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 16,
          background: themes[active].bg,
          padding: '10px 8px',
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.5s ease'
        }}>
          {/* 状态栏 */}
          <div style={{ fontSize: '7px', color: themes[active].text, opacity: 0.6, marginBottom: '8px', textAlign: 'center' }}>9:41</div>
          {/* 今日标题 */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: themes[active].text, marginBottom: '8px' }}>今日</div>
          {/* 任务卡片 */}
          <div style={{
            background: themes[active].card,
            borderRadius: 6,
            padding: '6px',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: themes[active].primary }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '3px', borderRadius: '2px', background: themes[active].text, opacity: 0.7, marginBottom: '2px' }} />
              <div style={{ height: '2px', borderRadius: '1px', background: themes[active].text, opacity: 0.3, width: '70%' }} />
            </div>
          </div>
          {/* 任务卡片2 */}
          <div style={{
            background: themes[active].card,
            borderRadius: 6,
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: themes[active].primary }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '3px', borderRadius: '2px', background: themes[active].text, opacity: 0.7, marginBottom: '2px' }} />
              <div style={{ height: '2px', borderRadius: '1px', background: themes[active].text, opacity: 0.3, width: '70%' }} />
            </div>
          </div>
          {/* FAB按钮 */}
          <div style={{
            position: 'absolute',
            right: '8px',
            bottom: '12px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: themes[active].primary
          }} />
        </div>
      </div>
      {/* 主题名称 */}
      <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 14 }}>
        {themes[active].name}
      </div>
      {/* 小圆点指示器 */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {themes.map((t, i) => (
          <div 
            key={i} 
            style={{ 
              width: i === active ? '16px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === active ? 'var(--primary)' : '#ddd',
              transition: 'all 0.3s ease'
            }} 
          />
        ))}
      </div>
    </div>
  );
}

const PAGES = [
  {
    key: 'brand',
    title: '语程',
    title2: '',
    desc: '语音智能日程管理',
    demo: <BrandHero />
  },
  {
    key: 'voice',
    title: '说一句话',
    title2: '自动成日程',
    desc: '',
    demo: <VoiceEditDemo />
  },
  {
    key: 'edit',
    title: '点一点',
    title2: '轻松管理',
    desc: '',
    demo: <EditDemo />
  },
  {
    key: 'plan',
    title: '今日安排',
    title2: '一目了然',
    desc: '',
    demo: <PlanDemo />
  },
  {
    key: 'theme',
    title: '14套主题',
    title2: '随心切换',
    desc: '总有一款适合你',
    demo: <ThemeDemo />
  }
];

export default function Onboarding({ onEnter }) {
  const [i, setI] = useState(0);
  const [dragX, setDragX] = useState(0);
  const trackRef = useRef(null);

  const last = i === PAGES.length - 1;
  const next = useCallback(() => setI((v) => Math.min(v + 1, PAGES.length - 1)), []);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const swipe = useRef({ startX: 0, startY: 0, active: false, width: 0 });

  const onDown = (e) => {
    swipe.current = {
      startX: e.clientX,
      startY: e.clientY,
      active: true,
      width: trackRef.current?.offsetWidth || window.innerWidth
    };
  };

  const onMove = (e) => {
    if (!swipe.current.active) return;
    const dx = e.clientX - swipe.current.startX;
    const dy = e.clientY - swipe.current.startY;
    // 垂直滑动不触发
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      setDragX(dx);
    }
  };

  const onUp = (e) => {
    if (!swipe.current.active) return;
    swipe.current.active = false;
    const dx = e.clientX - swipe.current.startX;
    setDragX(0);
    const threshold = swipe.current.width * 0.2; // 滑动超过20%就翻页
    if (dx < -threshold) next();
    else if (dx > threshold) prev();
  };

  return (
    <div className="ob">
      <button className="ob-skip" onClick={onEnter}>
        跳过
      </button>

      <div
        className="ob-track"
        ref={trackRef}
        style={{
          transform: 'translateX(calc(' + -i * 100 + '% + ' + dragX + 'px))',
          transition: dragX ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)'
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {PAGES.map((p, idx) => (
          <section className="ob-page" key={p.key}>
            <div className="ob-art">{p.demo}</div>
            <div className="ob-copy">
              <h2 className="ob-title">
                {p.title}
                {p.title2 && (
                  <>
                    <br />
                    <span className="ob-title-strong">{p.title2}</span>
                  </>
                )}
              </h2>
              <p className="ob-desc">{p.desc}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="ob-foot">
        <div className="ob-dots">
          {PAGES.map((p, idx) => (
            <span
              key={p.key}
              className={'ob-dot' + (idx === i ? ' on' : '')}
              onClick={() => setI(idx)}
            />
          ))}
        </div>
        <button className={'ob-next' + (last ? ' finish' : '')} onClick={last ? onEnter : next}>
          {last ? '开始使用' : '下一步'}
          <Icon name="arrow" size={16} stroke />
        </button>
      </div>
    </div>
  );
}
