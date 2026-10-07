import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { catColor } from '../lib/cats';

/* 与 CSS 里的 prefers-reduced-motion 同一个判据。
   CSS 管不到 JS 驱动的动效（定时器轮播、逐字打字），那些必须在这里拦。 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** 第 1 页：Brand Hero —— 智能手表 Logo + 光晕 */
function BrandHero() {
  return (
    <div className="ob-demo ob-brand">
      <div className="ob-glow" />
      <div className="ob-hero">
        <svg viewBox="0 0 120 150" className="ob-hero-clock" role="img" aria-label="语程">
          <defs>
            {/* 外壳：金属质感靠三段渐变做出「左上受光、右下背光」 */}
            <linearGradient id="obw-case" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4d5563" />
              <stop offset="42%" stopColor="#2c333e" />
              <stop offset="100%" stopColor="#151920" />
            </linearGradient>
            {/* 表带：横向明暗，模拟圆柱面的转折 */}
            <linearGradient id="obw-strap" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#232932" />
              <stop offset="36%" stopColor="#3d4551" />
              <stop offset="100%" stopColor="#1a1f26" />
            </linearGradient>
            {/* 表盘：不用死白，给一个左上偏亮的径向渐变 */}
            <radialGradient id="obw-dial" cx="0.38" cy="0.3" r="0.88">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f6f8fa" />
              <stop offset="100%" stopColor="#e4e8ee" />
            </radialGradient>
            {/* 玻璃反光 */}
            <linearGradient id="obw-glass" x1="0" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="obw-crown" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5d6673" />
              <stop offset="100%" stopColor="#1e232b" />
            </linearGradient>
            <radialGradient id="obw-shadow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#0b0e13" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#0b0e13" stopOpacity="0" />
            </radialGradient>
            <clipPath id="obw-dial-clip">
              <circle cx="60" cy="75" r="32" />
            </clipPath>
          </defs>

          {/* 落地投影：让表「站」在平面上，而不是飘着 —— 立体感的一半来自这里 */}
          <ellipse cx="60" cy="146" rx="36" ry="5" fill="url(#obw-shadow)" />

          {/* 表带 + 缝线 */}
          <rect x="45" y="0" width="30" height="24" rx="6" fill="url(#obw-strap)" />
          <rect x="45" y="126" width="30" height="24" rx="6" fill="url(#obw-strap)" />
          {[6, 18, 132, 144].map((y, i) => (
            <g key={y}>
              <line x1="50" y1={y} x2="50" y2={y + 6} stroke="#8d97a6" strokeWidth="0.8" strokeDasharray="1.6 2" opacity={i < 2 ? 0.45 : 0.35} />
              <line x1="70" y1={y} x2="70" y2={y + 6} stroke="#8d97a6" strokeWidth="0.8" strokeDasharray="1.6 2" opacity={i < 2 ? 0.45 : 0.35} />
            </g>
          ))}

          {/* 表冠 + 凹槽 */}
          <rect x="101" y="60" width="6" height="18" rx="2.5" fill="url(#obw-crown)" />
          <line x1="101" y1="69" x2="107" y2="69" stroke="#0f1319" strokeWidth="0.8" opacity="0.75" />

          {/* 外壳：金属渐变 + 外缘亮边 + 内圈亮边（两道棱线是厚度的来源） */}
          <rect x="18" y="20" width="84" height="110" rx="26" fill="url(#obw-case)" />
          <rect x="18" y="20" width="84" height="110" rx="26" fill="none" stroke="#717c8d" strokeWidth="0.9" opacity="0.5" />
          <rect x="20.4" y="22.4" width="79.2" height="105.2" rx="23.6" fill="none" stroke="#b3bdcb" strokeWidth="0.7" opacity="0.3" />

          {/* 屏幕凹槽：表盘嵌进去，底部内阴影做出深度 */}
          <rect x="24" y="26" width="72" height="98" rx="21" fill="#0d1116" />
          <rect x="24" y="26" width="72" height="98" rx="21" fill="none" stroke="#000000" strokeWidth="2" opacity="0.45" />

          {/* 表盘 + 细边 */}
          <circle cx="60" cy="75" r="32" fill="url(#obw-dial)" />
          <circle cx="60" cy="75" r="32" fill="none" stroke="#c6ccd5" strokeWidth="0.8" />

          {/* 刻度：整点粗黑、其余细灰 —— 单一权重是「一眼AI感」的主要来源 */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const major = deg % 90 === 0;
            return (
              <line
                key={deg}
                x1="60"
                y1={major ? 48 : 49.5}
                x2="60"
                y2={major ? 55.5 : 53}
                stroke={major ? '#1b2029' : '#98a2b3'}
                strokeWidth={major ? 2.6 : 1.1}
                strokeLinecap="round"
                transform={`rotate(${deg} 60 75)`}
              />
            );
          })}

          {/* 指针：加一层位移投影，让指针脱离表盘 */}
          <g opacity="0.18" transform="translate(0.7 1)">
            <path d="M60 75 L60 55" stroke="#000" strokeWidth="3.6" strokeLinecap="round" />
            <path d="M60 75 L77 83" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
          </g>
          <path d="M60 75 L60 55" stroke="#1b2029" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M60 75 L77 83" stroke="#1b2029" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M60 84 L54 98" stroke="#e5484d" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="60" cy="75" r="3.2" fill="#1b2029" />
          <circle cx="60" cy="75" r="1.1" fill="#e5484d" />

          {/* 玻璃反光：斜向一道，裁在表盘内 —— 这是「玻璃盖在上面」的关键 */}
          <g clipPath="url(#obw-dial-clip)">
            <path d="M28 44 L92 32 L92 60 L28 74 Z" fill="url(#obw-glass)" />
          </g>
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

/** 第 5 页：主题切换演示 —— 多台立体手机横向滑动（coverflow）
 *
 * 原来是「单台手机 + 内联样式改颜色」，看不出「切换」这个动作。
 * 改成多台手机并排、中间的立正、两侧的向内旋转并缩小后退，
 * 每隔两秒整体平移一格 —— 就是翻主题时的那种感觉。
 * 色值照抄 tokens.css，别再编不存在的主题名（上一版编过「蜜桃粉」）。
 */
const DEMO_THEMES = [
  { name: 'iOS黑白极简', bg: '#f5f5f7', card: '#ffffff', text: '#000000', sub: '#8e8e93', accent: '#000000' },
  { name: '暗黑奢华黑金', bg: '#0a0a0a', card: '#151412', text: '#f3eadb', sub: '#a08f6f', accent: '#d4af37' },
  { name: '青花瓷', bg: '#f4f7fb', card: '#ffffff', text: '#17222f', sub: '#7b8a9c', accent: '#1e4d8c' },
  { name: '手绘手账', bg: '#f7f0df', card: '#fdfaf1', text: '#4a4038', sub: '#a1937e', accent: '#5b9e5b' },
  { name: '终端绿极客', bg: '#0a0f0a', card: '#1a2a1a', text: '#00ff41', sub: 'rgba(0,255,65,0.55)', accent: '#00ff41' },
  { name: '琥珀暮色', bg: '#fff3e6', card: '#fffdfa', text: '#43291a', sub: '#a2866f', accent: '#c2410c' }
];

/** 手机屏幕里的迷你界面 */
function MiniPhone({ t }) {
  return (
    <div className="ob-ph-body">
      <div className="ob-ph-screen" style={{ background: t.bg }}>
        <span className="ob-ph-notch" />
        <div className="ob-ph-ui">
          <div className="ob-ph-status" style={{ color: t.sub }}>9:41</div>
          <div className="ob-ph-h" style={{ color: t.text }}>今日</div>
          {[0, 1, 2].map((i) => (
            <div className="ob-ph-card" key={i} style={{ background: t.card }}>
              <span className="ob-ph-dot" style={{ background: i === 0 ? t.accent : t.sub }} />
              <span className="ob-ph-lines">
                <span className="ob-ph-l1" style={{ background: t.text }} />
                <span className="ob-ph-l2" style={{ background: t.sub }} />
              </span>
            </div>
          ))}
        </div>
        <div className="ob-ph-tabbar" style={{ background: t.card }}>
          <span style={{ background: t.accent }} />
          <span style={{ background: t.sub }} />
          <span style={{ background: t.sub }} />
        </div>
      </div>
    </div>
  );
}

function ThemeDemo() {
  const n = DEMO_THEMES.length;
  const [active, setActive] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    // 用户要求减弱动效时停在第一台，不要一直滑动
    if (reduced) return;
    const timer = setInterval(() => setActive((p) => (p + 1) % n), 2200);
    return () => clearInterval(timer);
  }, [reduced, n]);

  return (
    <div className="ob-demo">
      <div className="ob-phones">
        {DEMO_THEMES.map((t, i) => {
          /* 取环绕后的最近距离：这样左右各能看到两台，
             而且轮到最后一台时下一台绕回第一台，不会突然跳一下 */
          let off = i - active;
          if (off > n / 2) off -= n;
          if (off < -n / 2) off += n;
          const abs = Math.abs(off);
          const step = Math.max(-2, Math.min(2, off));
          const sign = step === 0 ? 0 : Math.sign(step);
          return (
            <div
              className={'ob-ph' + (abs === 0 ? ' on' : '')}
              key={t.name}
              style={{
                transform:
                  'translateX(' + (step * 100 + sign * 7) + '%) ' +
                  'rotateY(' + step * -30 + 'deg) ' +
                  'scale(' + (abs === 0 ? 1 : abs === 1 ? 0.84 : 0.7) + ')',
                zIndex: 100 - abs * 20,
                opacity: abs > 2 ? 0 : 1
              }}
            >
              <MiniPhone t={t} />
            </div>
          );
        })}
      </div>
      <div className="ob-ph-caption">{DEMO_THEMES[active].name}</div>
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
    title: '20套主题',
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
          /* is-on 用来让 CSS 暂停非当前屏上的动画（5 屏是同时挂载的） */
          <section className={'ob-page' + (idx === i ? ' is-on' : '')} key={p.key}>
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
