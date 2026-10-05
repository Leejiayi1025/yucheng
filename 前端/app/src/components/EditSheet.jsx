import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import { CatDropdown, SelMenu } from './Dropdown';
import { DatePicker, TimePicker, fmtDateDisplay } from './Pickers';
import { useApp } from '../store';
import { repeatText, remindText, ymd } from '../lib/date';

const DOWS = ['日', '一', '二', '三', '四', '五', '六'];
const REMIND_OPTS = [
  { v: '0', t: '准时' },
  { v: '5', t: '提前 5 分钟' },
  { v: '15', t: '提前 15 分钟' },
  { v: '60', t: '提前 1 小时' },
  { v: 'custom', t: '自定义…' }
];

export default function EditSheet({ task, type = 'event', defaultDate, onClose, onSave, onDelete }) {
  const { cats, addCategory, deleteCategory } = useApp();
  const isEdit = !!task;
  const [isTodo, setIsTodo] = useState(type === 'todo');
  const [form, setForm] = useState({
    title: '',
    date: defaultDate,
    start: '',
    end: '',
    place: '',
    cat: '其他',
    remind: -1,
    note: '',
    repeatDays: null
  });
  const [picker, setPicker] = useState(null); // 'date' | 'start' | 'end' | 'post'
  const [menu, setMenu] = useState(null); // 'remind' | 'unit' | 'repeat'
  const [remindUnit, setRemindUnit] = useState(1); // 1 分钟 / 60 小时
  const [remindNum, setRemindNum] = useState(30);
  /* 顺延到：由日历选择，选完记住展示文案（保存后生效） */
  const [postLabel, setPostLabel] = useState('');

  useEffect(() => {
    if (task) {
      const rm = typeof task.remind === 'number' ? task.remind : -1;
      setForm({
        title: task.title || '',
        date: task.date || defaultDate,
        start: task.start || '',
        end: task.end || '',
        place: task.place || '',
        cat: task.cat || '其他',
        remind: rm,
        note: task.note || '',
        repeatDays: task.repeatDays || null
      });
      setIsTodo(!task.start);
      if (rm > 0) {
        if (rm % 60 === 0) {
          setRemindUnit(60);
          setRemindNum(rm / 60);
        } else {
          setRemindUnit(1);
          setRemindNum(rm);
        }
      }
    }
  }, [task, defaultDate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* 提醒：开关管「提不提醒」，右侧档位管「提前多久」；自定义档位读数值 + 单位 */
  const remindCustom = useMemo(() => form.remind !== -1 && ![0, 5, 15, 60].includes(form.remind), [form.remind]);

  const applyCustom = (num, unit) => {
    const n = Math.max(1, Math.min(1440, Number(num) || 1));
    set('remind', Math.min(1440, unit === 60 ? n * 60 : n));
  };

  const toggleDay = (d) =>
    setForm((f) => {
      const cur = f.repeatDays || [];
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
      return { ...f, repeatDays: next.length ? next.sort((a, b) => a - b) : null };
    });

  /* 点空白 / Esc 关闭自绘下拉 */
  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (e.target.closest && e.target.closest('.rm-sel-wrap')) return;
      setMenu(null);
    };
    document.addEventListener('click', close);
    const onEsc = (e) => e.key === 'Escape' && setMenu(null);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menu]);

  const submit = () =>
    onSave({
      title: form.title.trim(),
      date: form.date,
      place: form.place,
      cat: form.cat,
      note: form.note,
      start: isTodo ? '' : form.start,
      end: isTodo ? '' : form.end,
      remind: isTodo ? -1 : form.remind,
      repeatDays: form.repeatDays,
      type: isTodo ? 'todo' : 'event'
    });

  /* 分组列表里的「标签 → 值 ›」行 */
  const row = (label, value, onClick) => (
    <div className="es-row" role="button" tabIndex={0} onClick={onClick}>
      <span className="es-label">{label}</span>
      <span className="es-value">{value}</span>
      <span className="es-arrow">
        <Icon name="right" size={15} stroke />
      </span>
    </div>
  );

  return (
    <div className="edit-sheet show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-card">
        {/* 导航栏 */}
        <div className="es-nav">
          <button className="es-nav-btn" onClick={onClose}>
            取消
          </button>
          <div className="es-nav-title">{isEdit ? '编辑日程' : isTodo ? '新建待办' : '新建安排'}</div>
          <button className="es-nav-btn primary" disabled={!form.title.trim()} onClick={submit}>
            保存
          </button>
        </div>

        <div className="es-body">
          {/* 标题 */}
          <div className="es-block es-title-block">
            <input
              className="es-title"
              type="text"
              maxLength={15}
              value={form.title}
              placeholder="标题"
              onChange={(e) => set('title', e.target.value)}
            />
            <div className="es-sub">
              {(isTodo ? '待办' : '安排') + ' · ' + fmtDateDisplay(form.date)}
            </div>
          </div>

          {/* 时间 */}
          <div className="es-block">
            {row('日期', fmtDateDisplay(form.date), () => setPicker('date'))}
            {row('开始时间', form.start || '未设置', () => setPicker('start'))}
            {row('结束时间', form.end || '未设置', () => setPicker('end'))}
          </div>

          {/* 地点 / 分类 */}
          <div className="es-block">
            <div className="es-row">
              <span className="es-label">地点</span>
              <input
                className="es-input"
                type="text"
                maxLength={15}
                value={form.place}
                placeholder="未设置"
                onChange={(e) => set('place', e.target.value)}
              />
            </div>
            {/* CatDropdown 自带「分类」行 + 下方内联展开的列表 */}
            <CatDropdown
              value={form.cat}
              cats={cats}
              onChange={(v) => set('cat', v)}
              onDelete={async (n) => {
                await deleteCategory(n);
                if (form.cat === n) set('cat', '其他');
              }}
              onAddCustom={async (n) => {
                const name = await addCategory(n);
                if (name) set('cat', name);
              }}
            />
          </div>

          {/* 提醒 / 重复 */}
          <div className="es-block">
            <div className="es-row">
              <span className="es-label">提醒</span>
              <SelMenu
                id="remind"
                openId={menu}
                setOpenId={setMenu}
                disabled={form.remind < 0}
                text={form.remind === -1 ? '不提醒' : remindText(form.remind)}
              >
                {REMIND_OPTS.map((o) => (
                  <div
                    key={o.v}
                    className={
                      'rm-opt' +
                      ((o.v === 'custom' ? remindCustom : String(form.remind) === o.v) ? ' active' : '')
                    }
                    onClick={() => {
                      if (o.v === 'custom') applyCustom(remindNum, remindUnit);
                      else set('remind', Number(o.v));
                      setMenu(null);
                    }}
                  >
                    {o.t}
                  </div>
                ))}
              </SelMenu>
              <div
                className="es-switch"
                role="switch"
                aria-checked={form.remind >= 0}
                onClick={() => {
                  if (form.remind < 0) applyCustom(remindNum, remindUnit);
                  else set('remind', -1);
                }}
              >
                <div className={'rm-sw' + (form.remind >= 0 ? ' on' : '')}>
                  <span className="rm-knob" />
                </div>
              </div>
            </div>

            {remindCustom && (
              <div className="es-row es-sub-row">
                <span className="es-label">提前</span>
                <input
                  className="es-num"
                  type="number"
                  min="1"
                  value={remindNum}
                  onChange={(e) => {
                    setRemindNum(e.target.value);
                    applyCustom(e.target.value, remindUnit);
                  }}
                  aria-label="提前数值"
                />
                <SelMenu
                  id="unit"
                  openId={menu}
                  setOpenId={setMenu}
                  text={remindUnit === 60 ? '小时' : '分钟'}
                >
                  {[
                    { v: 1, t: '分钟' },
                    { v: 60, t: '小时' }
                  ].map((o) => (
                    <div
                      key={o.v}
                      className={'rm-opt' + (remindUnit === o.v ? ' active' : '')}
                      onClick={() => {
                        setRemindUnit(o.v);
                        applyCustom(remindNum, o.v);
                        setMenu(null);
                      }}
                    >
                      {o.t}
                    </div>
                  ))}
                </SelMenu>
              </div>
            )}

            <div className="es-row">
              <span className="es-label">重复</span>
              <SelMenu
                id="repeat"
                openId={menu}
                setOpenId={setMenu}
                menuClass="rm-menu-dows"
                text={form.repeatDays && form.repeatDays.length ? repeatText(form.repeatDays) : '不重复'}
                extra={
                  form.repeatDays && form.repeatDays.length ? (
                    <span className="rm-cnt">已选 {form.repeatDays.length}</span>
                  ) : null
                }
              >
                {DOWS.map((d, i) => (
                  <div
                    key={i}
                    className={'rm-opt' + ((form.repeatDays || []).includes(i) ? ' active' : '')}
                    role="option"
                    aria-selected={(form.repeatDays || []).includes(i)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDay(i);
                    }}
                  >
                    周{d}
                  </div>
                ))}
              </SelMenu>
            </div>
          </div>

          {/* 备注 */}
          <div className="es-block">
            <textarea
              className="es-note"
              maxLength={100}
              value={form.note}
              placeholder="备注"
              onChange={(e) => set('note', e.target.value)}
            />
          </div>

          {/* 顺延到（仅编辑已有任务时） */}
          {isEdit && (
            <div className="es-block">
              {row('顺延到', postLabel || '选择日期', () => setPicker('post'))}
            </div>
          )}

          {isEdit && (
            <button className="es-del" onClick={onDelete}>
              删除任务
            </button>
          )}
        </div>
      </div>

      {picker === 'date' && (
        <DatePicker
          value={form.date}
          onPick={(ds) => {
            set('date', ds);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {/* 顺延到：直接弹日历自己选一天 */}
      {picker === 'post' && (
        <DatePicker
          label="顺延到"
          value={form.date}
          min={ymd(new Date())}
          onPick={(ds) => {
            set('date', ds);
            setPostLabel(fmtDateDisplay(ds) + '（保存后生效）');
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'start' && (
        <TimePicker
          title="开始时间"
          value={form.start}
          onPick={(v) => {
            setForm((f) => {
              const next = { ...f, start: v };
              if (v && !f.end) {
                const [h, m] = v.split(':').map(Number);
                const tot = h * 60 + m + 60;
                next.end =
                  String(Math.floor(tot / 60) % 24).padStart(2, '0') +
                  ':' +
                  String(tot % 60).padStart(2, '0');
              }
              if (!v) next.remind = -1;
              return next;
            });
            setIsTodo(false);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'end' && (
        <TimePicker
          title="结束时间"
          value={form.end}
          onPick={(v) => {
            set('end', v);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
