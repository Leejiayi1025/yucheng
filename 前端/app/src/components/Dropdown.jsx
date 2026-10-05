import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

/**
 * 下拉浮层锚定：**按下拉框 + 菜单真实高度**计算，紧贴触发器。
 *
 * 之前用固定估算高度（240/260）预留空间，导致菜单离下拉框很远、中间空一大块
 * （用户反馈：「顺延到」的菜单弹到屏幕中间去了）。
 * 现在：打开时先离屏渲染一帧量真实高度，再定位显示；useLayoutEffect 在绘制前完成，不会闪。
 */
function useAnchor({ open, selRef, menuRef, minWidth = 160 }) {
  const [pos, setPos] = useState(null);

  const measure = useCallback(() => {
    const sel = selRef.current;
    const menu = menuRef.current;
    if (!sel || !menu) return;
    const r = sel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mh = menu.offsetHeight || 0;
    const mw = Math.max(minWidth, Math.min(r.width, vw - 16));
    const below = vh - r.bottom;
    // 下方放得下 → 向下弹；放不下 → 向上紧贴触发器
    let top = below >= mh + 12 ? r.bottom + 6 : r.top - mh - 6;
    top = Math.max(8, Math.min(top, Math.max(8, vh - mh - 8)));
    const left = Math.max(8, Math.min(r.left, Math.max(8, vw - mw - 8)));
    setPos({ left, width: mw, top });
  }, [minWidth, menuRef, selRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    measure();
  }, [open, measure]);

  /* 视口变化 / 滚动时重算，保证一直贴着触发器 */
  useEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, measure]);

  return pos;
}

/** 未定位时的占位样式：离屏且不可见（仍可量高度） */
const HIDDEN = { left: 0, top: 0, visibility: 'hidden' };

/**
 * 通用自绘下拉：结构 .rm-sel-wrap > .rm-sel(.rm-sel-t + extra) + .rm-menu.show + .rm-chev
 * 自动计算浮层位置：下方放不下就向上弹，并夹紧在视口内（保证完整显示）
 * 由父组件用 openId/setOpenId 控制「同时只开一个」
 */
export function SelMenu({ id, openId, setOpenId, text, extra, children, disabled, menuClass }) {
  const wrapRef = useRef(null);
  const selRef = useRef(null);
  const menuRef = useRef(null);
  const open = openId === id;
  const pos = useAnchor({ open, selRef, menuRef });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      setOpenId(null);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpenId(null);
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, setOpenId]);

  return (
    <div className="rm-sel-wrap" ref={wrapRef}>
      <div
        className={'rm-sel' + (open ? ' open' : '')}
        ref={selRef}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          if (open) setOpenId(null);
          else setOpenId(id);
        }}
      >
        <span className="rm-sel-t">{text}</span>
        {extra}
      </div>
      {open && (
        <div
          className={'rm-menu show' + (menuClass ? ' ' + menuClass : '')}
          ref={menuRef}
          role="listbox"
          style={pos || HIDDEN}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
      <span className="rm-chev">
        <Icon name="chevron" size={14} stroke />
      </span>
    </div>
  );
}

/** 普通自绘下拉：.rm-sel-wrap > .rm-sel + .rm-menu.show > .rm-opt */
export function Dropdown({ value, options, onChange, placeholder = '请选择' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selRef = useRef(null);
  const menuRef = useRef(null);
  const pos = useAnchor({ open, selRef, menuRef });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('scroll', onDoc, true);
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('scroll', onDoc, true);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const current = options.find((o) => String(o.value) === String(value));
  return (
    <div className="rm-sel-wrap" ref={wrapRef}>
      <div
        className={'rm-sel' + (open ? ' open' : '')}
        ref={selRef}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="rm-sel-t">{current ? current.label : placeholder}</span>
      </div>
      {open && (
        <div
          className="rm-menu show"
          ref={menuRef}
          role="listbox"
          style={pos || HIDDEN}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((o) => (
            <div
              key={o.value}
              className={'rm-opt' + (String(o.value) === String(value) ? ' active' : '')}
              role="option"
              onClick={() => {
                onChange && onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
      <span className="rm-chev">
        <Icon name="chevron" size={14} stroke />
      </span>
    </div>
  );
}

/**
 * 分类选择：点这一行 → 在**行下方内联展开列表**（不是弹窗、也不是浮层菜单）。
 * 列表项支持左滑露出「删除」，底部「＋ 自定义…」。
 */
export function CatDropdown({ label = '分类', value, cats, onChange, onDelete, onAddCustom }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState('');
  const [swiped, setSwiped] = useState(null);
  const swipe = useRef({ el: null, sx: 0, sy: 0, dragging: false, moved: false });
  const selRef = useRef(null);
  const menuRef = useRef(null);
  /* 跟「重复」一样的浮动下拉：按菜单真实高度锚定在触发器旁边 */
  const pos = useAnchor({ open, selRef, menuRef });

  /* 点外部 / Esc 关闭（触发器和菜单都算「内部」） */
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setCustom(false);
      setSwiped(null);
    };
    const onDoc = (e) => {
      const inSel = selRef.current && selRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (inSel || inMenu) return;
      close();
    };
    const onEsc = (e) => e.key === 'Escape' && close();
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const pDown = (e, name) => {
    swipe.current = { el: name, sx: e.clientX, sy: e.clientY, dragging: false, moved: false };
  };
  const pMove = (e) => {
    const s = swipe.current;
    if (!s.el) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.dragging) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) s.dragging = true;
      else if (Math.abs(dy) > 6) {
        s.el = null;
        return;
      }
    }
    if (s.dragging) {
      s.moved = true;
      const x = Math.max(-56, Math.min(0, dx));
      const opt = e.currentTarget.querySelector('.rm-opt');
      if (opt) opt.style.transform = 'translateX(' + x + 'px)';
      e.preventDefault();
    }
  };
  const pUp = (e) => {
    const s = swipe.current;
    if (!s.el) return;
    const dx = e.clientX - s.sx;
    const opt = e.currentTarget.querySelector('.rm-opt');
    if (opt) opt.style.transform = '';
    if (s.dragging) {
      if (dx < -30) setSwiped(s.el);
      else if (dx > 10) setSwiped(null);
    }
    swipe.current = { el: null, sx: 0, sy: 0, dragging: false, moved: false };
  };

  const closeAll = () => {
    setOpen(false);
    setCustom(false);
    setSwiped(null);
  };

  const pick = (name) => {
    if (swipe.current.moved) {
      swipe.current.moved = false;
      setSwiped(null);
      return;
    }
    if (swiped) {
      setSwiped(null);
      return;
    }
    onChange && onChange(name);
    closeAll();
  };

  const commit = () => {
    const v = draft.trim();
    if (v && onAddCustom) onAddCustom(v);
    setDraft('');
    setCustom(false);
  };

  return (
    <>
      {/* 分类行（触发器）：点开是跟「重复」一样的浮动下拉 */}
      <div
        className="es-row"
        ref={selRef}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="es-label">{label}</span>
        <span className="es-value">{value}</span>
        <span className={'es-arrow' + (open ? ' up' : '')}>
          <Icon name="chevron" size={15} stroke />
        </span>
      </div>

      {open && (
        <div
          className="rm-menu show rm-menu-cats"
          ref={menuRef}
          role="listbox"
          style={pos || HIDDEN}
          onClick={(e) => e.stopPropagation()}
        >
          {Object.keys(cats).map((n) => (
            <div
              key={n}
              className={'rm-opt-wrap' + (swiped === n ? ' swiped' : '')}
              onPointerDown={(e) => pDown(e, n)}
              onPointerMove={pMove}
              onPointerUp={pUp}
              onPointerCancel={pUp}
            >
              <div
                className={'rm-opt' + (n === value ? ' active' : '')}
                role="option"
                aria-selected={n === value}
                onClick={() => pick(n)}
              >
                {n}
              </div>
              <div
                className="cat-del"
                onClick={(e) => {
                  e.stopPropagation();
                  setSwiped(null);
                  onDelete && onDelete(n);
                }}
              >
                删除
              </div>
            </div>
          ))}

          <div className="rm-opt cat-custom-opt" onClick={() => setCustom(!custom)}>
            ＋ 自定义…
          </div>

          {custom && (
            <div className="cat-custom show">
              <input
                type="text"
                maxLength={8}
                autoFocus
                placeholder="输入自定义分类"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
              />
              <button onClick={commit}>确定</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** 开关：.rm-ctl > .rm-sw > .rm-knob + .rm-sw-t */
export function Switch({ on, onChange, text }) {
  return (
    <div className={'rm-ctl' + (on ? '' : ' off')}>
      <div
        className={'rm-sw' + (on ? ' on' : '')}
        role="switch"
        aria-checked={on}
        tabIndex={0}
        onClick={() => onChange && onChange(!on)}
      >
        <span className="rm-knob" />
      </div>
      <span className="rm-sw-t">{text || (on ? '已开启' : '不提醒')}</span>
    </div>
  );
}
