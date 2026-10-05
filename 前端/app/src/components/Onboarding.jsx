import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { catColor } from '../lib/cats';

/** 第 1 页：Brand Hero —— 时钟 Logo + 光晕 */
function BrandHero() {
  return (
    <div className="ob-demo ob-brand">
      <div className="ob-glow" />
      <div className="ob-hero">
        <svg viewBox="0 0 64 64" className="ob-hero-clock">
          <rect x="3.5" y="3.5" width="57" height="57" rx="16" fill="var(--card)" stroke="var(--line)" />
          <circle cx="32" cy="32" r="18" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
          <path d="M32 32 L32 21" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 32 L40 36" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
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

/** 第 5 页：主题色盘 */
function ThemeDemo() {
  const dots = ['#6B8E7B', '#F2A0B4', '#5AA564', '#D4AF37', '#38BDF8', '#8B7EC8'];
  return (
    <div className="ob-demo">
      <div className="ob-ringset">
        {dots.map((c, i) => (
          <span
            key={c}
            className="ob-cdot"
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="ob-themebar">
        <span className="ob-tb" />
        <span className="ob-tb mid" />
        <span className="ob-tb sm" />
      </div>
    </div>
  );
}

const PAGES = [
  {
    key: 'brand',
    title: '把想做的事',
    title2: '变成今天的日程',
    desc: '语程帮你把一天安排得清清楚楚',
    demo: <BrandHero />
  },
  {
    key: 'voice',
    title: '说一句话',
    title2: '自动拆成任务',
    desc: '不用打字。一次说完整天的安排，自动识别时间、地点，识别结果还能随手改',
    demo: <VoiceEditDemo />
  },
  {
    key: 'edit',
    title: '点一点',
    title2: '管理你的安排',
    desc: '点卡片改详情，打勾标记完成，左滑删除不需要的事',
    demo: <EditDemo />
  },
  {
    key: 'plan',
    title: '安排和待办',
    title2: '一眼看清',
    desc: '每条任务带分类色标，今天有什么、还差什么，一目了然',
    demo: <PlanDemo />
  },
  {
    key: 'theme',
    title: '13 套外观',
    title2: '随手换一个',
    desc: '手账、黏土、马卡龙、暗黑奢华…总有一款合你心情',
    demo: <ThemeDemo />
  }
];

export default function Onboarding({ onEnter }) {
  const [i, setI] = useState(0);
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

  const swipe = useRef({ x: 0, y: 0, active: false });
  const onDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY, active: true };
  };
  const onUp = (e) => {
    if (!swipe.current.active) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    swipe.current.active = false;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
  };

  return (
    <div className="ob">
      <button className="ob-skip" onClick={onEnter}>
        跳过
      </button>

      <div
        className="ob-track"
        ref={trackRef}
        style={{ transform: 'translateX(' + -i * 100 + '%)' }}
        onPointerDown={onDown}
        onPointerUp={onUp}
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
