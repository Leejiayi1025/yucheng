import { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './Icon';
import { useApp } from '../store';
import { track } from '../lib/track';

/* 主题清单：默认从后端 themes 表拉，拉不到时用本地兜底。
   这份兜底必须与数据库 themes 表保持一致（顺序即 sort_order）——
   两边不一致会导致「接口挂了」和「接口正常」看到两套不同的主题。 */
const DEFAULT_THEMES = [
  { key: 'sage', name: '奶油鼠尾草', group: 'classic' },
  { key: 'ios-minimal', name: 'iOS黑白极简', group: 'classic' },
  { key: 'bento', name: 'iOS 原生风', group: 'classic' },
  { key: 'mono', name: '线框工程风', group: 'classic' },
  { key: 'luxe', name: '暗黑奢华黑金', group: 'dark' },
  { key: 'film', name: '复古胶片风', group: 'dark' },
  { key: 'morandi', name: '莫兰迪色系', group: 'light' },
  { key: 'navy', name: '藏青商务风', group: 'dark' },
  { key: 'peach', name: '蜜桃奶油风', group: 'light' },
  { key: 'forest', name: '森林墨绿风', group: 'dark' },
  { key: 'terminal', name: '终端绿极客', group: 'dark' },
  { key: 'paper', name: '手绘手账', group: 'texture' },
  { key: 'clay', name: '3D 黏土', group: 'texture' },
  { key: 'midnight', name: '午夜深蓝', group: 'dark' },
  { key: 'ios', name: 'iOS 暗黑', group: 'dark' },
  { key: 'porcelain', name: '青花瓷', group: 'texture' },
  { key: 'editorial', name: '杂志编辑风', group: 'light' },
  { key: 'mint', name: '薄荷清新', group: 'light' },
  { key: 'amber-dusk', name: '琥珀暮色', group: 'light' },
  { key: 'black-gold', name: '黑白金奢华', group: 'dark' }
];

/* 每个主题的 mini 预览配色和特征参数 */
const PREVIEWS = {
  'black-gold': {
    bg: '#000000', card: '#141414', text: '#ffffff', sub: '#999999', primary: '#f0c040',
    cardRadius: 14, cardBorder: '1px solid rgba(240,192,64,0.3)', cardBorderW: 1, cardShadow: '0 8px 24px rgba(240,192,64,0.25)',
    checkRadius: '50%', font: 'normal'
  },
  ios: {
    bg: '#000000', card: '#1c1c1e', text: '#ffffff', sub: '#98989e', primary: '#0a84ff',
    cardRadius: 14, cardBorder: '1px solid rgba(255,255,255,0.06)', cardBorderW: 1, cardShadow: '0 4px 16px rgba(0,0,0,0.5)',
    checkRadius: '50%', font: 'normal'
  },
  auto: {
    bg: 'linear-gradient(180deg,#f5f1ec 0%,#f5f1ec 55%,#0f172a 55%,#0f172a 100%)',
    card: '#fff', text: '#2d3a33', sub: '#8a9a92', primary: '#6b8e7b',
    cardRadius: 12, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 2px 8px rgba(0,0,0,0.08)',
    checkRadius: '50%', font: 'normal'
  },
  sage: {
    bg: '#f5f1ec', card: '#fff', text: '#2d3a33', sub: '#8a9a92', primary: '#6b8e7b',
    cardRadius: 14, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 2px 10px rgba(0,0,0,0.06)',
    checkRadius: '50%', font: 'normal'
  },
  bento: {
    bg: '#f2f3f5', card: '#fff', text: '#1d1d1f', sub: '#86868b', primary: '#5cb86b',
    cardRadius: 20, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 4px 16px rgba(0,0,0,0.08)',
    checkRadius: '6px', font: 'normal'
  },
  mono: {
    bg: '#ffffff', card: '#fff', text: '#111', sub: '#999', primary: '#111',
    cardRadius: 6, cardBorder: '2px solid #111', cardBorderW: 2, cardShadow: 'none',
    checkRadius: '2px', font: 'bold'
  },
  morandi: {
    bg: '#e8e4df', card: '#f5f2ee', text: '#4a4540', sub: '#9a928a', primary: '#a89f91',
    cardRadius: 10, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 1px 6px rgba(0,0,0,0.05)',
    checkRadius: '50%', font: 'normal'
  },
  editorial: {
    bg: '#fafaf8', card: '#fff', text: '#1a1a1a', sub: '#999', primary: '#1a1a1a',
    cardRadius: 0, cardBorder: 'none', cardBorderW: 0, cardShadow: 'none',
    checkRadius: '0', font: 'bold'
  },
  mint: {
    bg: '#f0faf6', card: '#fff', text: '#2d4a3e', sub: '#8aa89a', primary: '#5ec9a8',
    cardRadius: 16, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 3px 12px rgba(94,201,168,0.15)',
    checkRadius: '50%', font: 'normal'
  },
  midnight: {
    bg: '#0f172a', card: 'rgba(30,41,59,0.78)', text: '#f1f5f9', sub: '#94a3b8', primary: '#38bdf8',
    cardRadius: 16, cardBorder: '1px solid rgba(255,255,255,0.08)', cardBorderW: 1, cardShadow: '0 8px 32px rgba(0,0,0,0.35)',
    checkRadius: '50%', font: 'normal'
  },
  luxe: {
    bg: '#0c0a09', card: '#1c1917', text: '#e8e0c8', sub: '#8a8060', primary: '#d4af37',
    cardRadius: 10, cardBorder: '1px solid rgba(212,175,55,0.5)', cardBorderW: 1, cardShadow: '0 2px 12px rgba(212,175,55,0.1)',
    checkRadius: '50%', font: 'normal'
  },
  porcelain: {
    bg: '#f4f7fb', card: '#ffffff', text: '#17222f', sub: '#7b8a9c', primary: '#1e4d8c',
    cardRadius: 12, cardBorder: '1px solid rgba(30,77,140,0.2)', cardBorderW: 1, cardShadow: '0 2px 10px rgba(30,77,140,0.1)',
    checkRadius: '50%', font: 'serif'
  },
  'amber-dusk': {
    bg: 'linear-gradient(180deg,#fff7ee,#ffe9d5)', card: '#fffdfa', text: '#43291a', sub: '#a2866f', primary: '#c2410c',
    cardRadius: 16, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 3px 14px rgba(160,88,40,0.16)',
    checkRadius: '50%', font: 'normal'
  },
  'ios-minimal': {
    bg: '#f5f5f7', card: '#ffffff', text: '#000000', sub: '#8e8e93', primary: '#000000',
    cardRadius: 14, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 1px 3px rgba(0,0,0,0.04)',
    checkRadius: '50%', font: 'normal'
  },
  terminal: {
    bg: '#0a0f0a', card: '#1a2a1a', text: '#00ff41', sub: 'rgba(0,255,65,0.5)', primary: '#00ff41',
    cardRadius: 2, cardBorder: '1px solid rgba(0,255,65,0.3)', cardBorderW: 1, cardShadow: '0 0 10px rgba(0,255,65,0.15)',
    checkRadius: '0', font: 'mono'
  },
  paper: {
    bg: '#f4ecd8', card: '#fefcf5', text: '#5a4a3a', sub: '#9a8a7a', primary: '#5b9e5b',
    cardRadius: '18px 22px 17px 21px', cardBorder: '2px solid rgba(180,130,60,0.8)', cardBorderW: 2, cardShadow: '0 1px 4px rgba(0,0,0,0.08)',
    checkRadius: '50%', font: 'hand'
  },
  clay: {
    bg: '#d4e4ed', card: '#fdfaf3', text: '#3a4a52', sub: '#8a9aa2', primary: '#5aa564',
    cardRadius: 22, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 8px 16px rgba(100,140,165,0.4), inset 0 -4px 8px rgba(150,180,200,0.4), inset 0 4px 8px rgba(255,255,255,0.9)',
    checkRadius: '50%', font: 'normal'
  },
  navy: {
    bg: '#0f172a', card: 'linear-gradient(145deg,#1e293b,#1a2536)', text: '#f1f5f9', sub: 'rgba(241,245,249,0.6)', primary: '#3b82f6',
    cardRadius: 16, cardBorder: '1px solid rgba(59,130,246,0.2)', cardBorderW: 1, cardShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    checkRadius: '6px', font: 'bold'
  },
  peach: {
    bg: '#fff5f0', card: '#ffffff', text: '#4a3a3a', sub: 'rgba(74,58,58,0.6)', primary: '#ff8a80',
    cardRadius: 24, cardBorder: 'none', cardBorderW: 0, cardShadow: '0 8px 24px rgba(255,138,128,0.15)',
    checkRadius: '50%', font: 'normal'
  },
  forest: {
    bg: '#1a2e1f', card: 'linear-gradient(145deg,#2d4a35,#26402d)', text: '#f5f5f0', sub: 'rgba(245,245,240,0.6)', primary: '#81c784',
    cardRadius: 12, cardBorder: '1px solid rgba(129,199,132,0.2)', cardBorderW: 1, cardShadow: '0 8px 24px rgba(0,0,0,0.3)',
    checkRadius: '4px', font: 'serif'
  },
  film: {
    bg: '#1f1815', card: '#2d2420', text: '#f5e6d3', sub: 'rgba(245,230,211,0.6)', primary: '#d4a574',
    cardRadius: 4, cardBorder: '6px solid #f5e6d3', cardBorderW: 6, cardShadow: '0 6px 20px rgba(0,0,0,0.5)',
    checkRadius: '50%', font: 'serif'
  }
};

function MiniPreview({ themeKey }) {
  const p = PREVIEWS[themeKey] || PREVIEWS.sage;

  return (
    <div className="tp-preview" style={{ background: p.bg }}>
      {/* 状态栏 */}
      <div className="tp-status" style={{ color: p.sub }}>9:41</div>
      {/* 日期条 */}
      <div className="tp-week">
        {['一','二','三','四','五','六','日'].map((d,i) => (
          <div key={i} className="tp-day" style={{
            color: i===3 ? '#fff' : p.sub,
            background: i===3 ? p.primary : 'transparent',
            width: i===3 ? 16 : 12,
            height: i===3 ? 16 : 12,
          }}>{i===3?'5':i+1}</div>
        ))}
      </div>
      {/* 标题 */}
      <div className="tp-title" style={{
        color: p.text,
        fontWeight: p.font === 'bold' ? 800 : p.font === 'serif' ? 700 : 700,
        fontFamily: p.font === 'mono' ? 'monospace' : p.font === 'hand' ? 'KaiTi, cursive' : p.font === 'serif' ? 'serif' : 'inherit'
      }}>今日</div>
      {/* 卡片 */}
      <div className="tp-card" style={{
        background: p.card,
        border: p.cardBorder,
        borderRadius: p.cardRadius,
        boxShadow: p.cardShadow,
      }}>
        <div className="tp-check" style={{
          background: p.primary,
          borderRadius: p.checkRadius,
        }} />
        <div className="tp-card-body">
          <div className="tp-card-title" style={{ background: p.text }} />
          <div className="tp-card-sub" style={{ background: p.sub }} />
        </div>
        <div className="tp-tag" style={{
          background: p.primary + '22',
          color: p.primary,
          borderRadius: p.font === 'bold' ? 2 : 8,
        }} />
      </div>
      <div className="tp-card tp-card2" style={{
        background: p.card,
        border: p.cardBorder,
        borderRadius: p.cardRadius,
        boxShadow: p.cardShadow,
      }}>
        <div className="tp-check" style={{
          background: p.primary,
          borderRadius: p.checkRadius,
        }} />
        <div className="tp-card-body">
          <div className="tp-card-title" style={{ background: p.text }} />
          <div className="tp-card-sub" style={{ background: p.sub }} />
        </div>
      </div>
      {/* 第三张卡片 - 待办 */}
      <div style={{ fontSize: 8, fontWeight: 700, color: p.text, margin: '8px 0 5px' }}>待办</div>
      <div className="tp-card" style={{
        background: p.card,
        border: p.cardBorder,
        borderRadius: p.cardRadius,
        boxShadow: p.cardShadow,
        padding: '5px 7px',
      }}>
        <div className="tp-check" style={{
          background: 'transparent',
          border: `1.5px solid ${p.sub}`,
          borderRadius: p.checkRadius,
          width: 9,
          height: 9,
        }} />
        <div className="tp-card-body">
          <div className="tp-card-title" style={{ background: p.sub, opacity: 0.6, height: 5, width: '50%' }} />
        </div>
      </div>
      {/* FAB */}
      <div className="tp-fab" style={{
        background: p.primary,
        boxShadow: themeKey === 'clay'
          ? '0 6px 12px rgba(100,140,165,0.5), inset 0 -3px 6px rgba(150,180,200,0.5), inset 0 3px 6px rgba(255,255,255,0.8)'
          : themeKey === 'luxe'
            ? '0 0 16px rgba(212,175,55,0.5)'
            : themeKey === 'terminal'
              ? '0 0 16px rgba(0,255,65,0.5)'
              : '0 4px 12px rgba(0,0,0,0.25)',
      }} />
      {/* 底部导航栏 */}
      <div className="tp-tabbar" style={{
        background: themeKey === 'luxe' ? 'rgba(28,25,23,0.95)' : themeKey === 'glass' ? 'rgba(255,255,255,0.15)' : themeKey === 'y2k' ? 'rgba(26,10,46,0.9)' : themeKey === 'terminal' ? 'rgba(10,15,10,0.95)' : 'rgba(255,255,255,0.95)',
        borderTop: `1px solid ${p.primary}22`,
      }}>
        <div className="tp-tab" style={{ color: p.primary }} />
        <div className="tp-tab" style={{ color: p.sub }} />
        <div className="tp-tab" style={{ color: p.sub }} />
      </div>
    </div>
  );
}

export default function ThemeSheet({ onClose }) {
  const { theme, setTheme } = useApp();
  const [originalTheme] = useState(theme); // 打开面板时记录原始主题
  const [previewTheme, setPreviewTheme] = useState(theme); // 当前预览的主题
  /* 滚动回调是防抖的、且 effect 不该因预览变化而重建，
     所以用 ref 读最新值，避免闭包读到旧 state。 */
  const previewRef = useRef(theme);
  useEffect(() => {
    previewRef.current = previewTheme;
  }, [previewTheme]);
  const [themes, setThemes] = useState(DEFAULT_THEMES); // 主题列表（从后端拉）
  const [group, setGroup] = useState('all'); // 当前分区：all / classic / dark / light / texture

  /* 20 套主题平铺在横向轮播里太长，底部页码点也失去意义，所以按 group 分区。
     group 由后端 themes 表提供，'auto'（跟随系统）不归属任何分区，只在「全部」里出现。 */
  const shown = useMemo(
    () => (group === 'all' ? themes : themes.filter((t) => (t.group || 'classic') === group)),
    [themes, group]
  );
  const GROUPS = [
    { key: 'all', name: '全部' },
    { key: 'classic', name: '经典' },
    { key: 'dark', name: '深色' },
    { key: 'light', name: '浅色' },
    { key: 'texture', name: '质感' }
  ];

  // 从后端加载主题列表
  useEffect(() => {
    fetch('/api/auth/themes')
      .then(r => r.json())
      .then(d => {
        if (d.themes && d.themes.length) {
          // 加上"跟随系统"放最前面
          setThemes([{ key: 'auto', name: '跟随系统', group: 'auto' }, ...d.themes]);
        }
      })
      .catch(() => {});
  }, []);

  // 滑动停止后，自动预览中间的卡片
  useEffect(() => {
    const track = document.querySelector('.tp-track');
    if (!track || !shown.length) return;

    /* 滚到当前预览主题所在的卡片；切分区后若当前主题不在该分区内，
       就滚到该分区第一张（滚动的副作用会顺带预览它，取消可还原）。 */
    const idx = shown.findIndex((t) => t.key === previewRef.current);
    const target = idx >= 0 ? idx : 0;
    requestAnimationFrame(() => {
      const cards = track.querySelectorAll('.tp-card-item');
      if (cards[target]) cards[target].scrollIntoView({ inline: 'center', block: 'nearest' });
    });

    let timer;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const cards = track.querySelectorAll('.tp-card-item');
        const trackCenter = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        let minDist = Infinity;
        cards.forEach((card, i) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const dist = Math.abs(cardCenter - trackCenter);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        const t = shown[closest];
        if (t && t.key !== previewRef.current) {
          setPreviewTheme(t.key);
          setTheme(t.key);
        }
      }, 80);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [shown, setTheme]);

  // 点卡片：直接滚动到该卡片
  const handleCardClick = (i) => {
    const track = document.querySelector('.tp-track');
    const cards = track.querySelectorAll('.tp-card-item');
    cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // 取消：恢复原始主题，关闭
  const handleCancel = () => {
    setTheme(originalTheme);
    onClose();
  };

  // 确认：保留当前预览的主题，关闭
  const handleConfirm = () => {
    track('theme_change', { old: originalTheme, new: previewTheme });
    onClose();
  };

  return (
    <div className="edit-sheet show" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
      <div className="es-card tp-sheet">
        <div className="es-nav">
          <button className="es-nav-btn" onClick={handleCancel}>取消</button>
          <div className="es-nav-title">选择外观</div>
          <button className="es-nav-btn es-nav-confirm" onClick={handleConfirm}>确认</button>
        </div>

        {/* 横向滑动卡片 */}
        {/* 分区切换：iOS 分段控件 —— 整体一个圆角底槽，选中项是滑动的白色滑块 */}
        <div className="tp-groups">
          <span
            className="tp-group-thumb"
            style={{
              width: `calc((100% - 4px) / ${GROUPS.length})`,
              transform: `translateX(${Math.max(0, GROUPS.findIndex((g) => g.key === group)) * 100}%)`
            }}
          />
          {GROUPS.map((g) => (
            <button
              key={g.key}
              className={'tp-group' + (group === g.key ? ' on' : '')}
              onClick={() => setGroup(g.key)}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="tp-track-wrap">
          <div className="tp-track">
            {shown.map((t, i) => (
              <div
                key={t.key}
                className={'tp-card-item' + (previewTheme === t.key ? ' active' : '')}
                onClick={() => handleCardClick(i)}
              >
                <MiniPreview themeKey={t.key} />
                <div className="tp-card-name" style={{ color: previewTheme === t.key ? 'var(--primary)' : 'var(--text2)' }}>
                  {t.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部页码点 */}
        <div className="tp-dots">
          {shown.map((t, i) => (
            <div key={t.key} className={'tp-dot' + (previewTheme === t.key ? ' on' : '')} />
          ))}
        </div>
      </div>
    </div>
  );
}
