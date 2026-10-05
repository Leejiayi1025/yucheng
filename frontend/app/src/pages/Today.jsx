import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import TaskCard from '../components/TaskCard';
import TabBar from '../components/TabBar';
import EditSheet from '../components/EditSheet';
import { track } from '../lib/track';
import VoiceSheet from '../components/VoiceSheet';
import PostponeSheet from '../components/PostponeSheet';
import ThemeSheet from '../components/ThemeSheet';
import ConflictModal from '../components/ConflictModal';
import { useApp } from '../store';
import { ymd, addDays, parseDS, WEEK, findConflict } from '../lib/date';

/* 日期条的单个格子。拆成 memo：456 格里只有内容变化的那几格会重渲染 */
const StripDay = memo(function StripDay({ day, ds, active, isToday, hasTask, onPick }) {
  return (
    <div
      className={'strip-day' + (active ? ' active' : '') + (isToday ? ' is-today' : '')}
      onClick={() => onPick(ds)}
    >
      <span className="w">{isToday ? '今' : WEEK[day.getDay()]}</span>
      <span className="d">{day.getDate()}</span>
      <span className={'dot' + (hasTask ? ' on' : '')} />
    </div>
  );
});

export default function Today({ page, onPage }) {
  const { tasks, addTask, updateTask, deleteTask, restoreTask, toggleDone, toast } = useApp();
  const today = ymd(new Date());
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState(null);
  const [editing, setEditing] = useState(null);
  const [manualType, setManualType] = useState('event');
  const [conflict, setConflict] = useState(null);
  const stripRef = useRef(null);

  /* 原型行为：选中日自动滚到日期条中间 */
  useEffect(() => {
    const box = stripRef.current;
    if (!box) return;
    const active = box.querySelector('.strip-day.active');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [selected]);

  const list = useMemo(() => tasks.filter((t) => t.date === selected), [tasks, selected]);
  const timed = useMemo(
    () => list.filter((t) => t.start).sort((a, b) => a.start.localeCompare(b.start)),
    [list]
  );
  const todos = useMemo(() => list.filter((t) => !t.start), [list]);

  /* 日期条：今天前 90 天 ~ 后 365 天，可一直滑动（原来只有 22 格，滑两下就到头） */
  const STRIP_BACK = 90;
  const STRIP_FWD = 365;
  const strip = useMemo(
    () =>
      Array.from({ length: STRIP_BACK + STRIP_FWD + 1 }, (_, i) =>
        addDays(new Date(), i - STRIP_BACK)
      ),
    []
  );

  /* 问候语（按当前时段） */
  const greet = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return '凌晨好';
    if (h < 9) return '早上好';
    if (h < 11) return '上午好';
    if (h < 13) return '中午好';
    if (h < 18) return '下午好';
    if (h < 23) return '晚上好';
    return '夜深了';
  }, []);

  const pickDay = useCallback((ds) => setSelected(ds), []);

  /* 哪些日子有任务（日期条上打小圆点） */
  const daysWithTasks = useMemo(() => {
    const s = new Set();
    tasks.forEach((t) => {
      if (t.date) s.add(t.date);
    });
    return s;
  }, [tasks]);

  /* 日期条滑走了：今天那一格离开可视区 → 也提示「回到今天」（不只是点了别的日期才提示） */
  const [stripAway, setStripAway] = useState(false);
  useEffect(() => {
    const box = stripRef.current;
    if (!box) return;
    const check = () => {
      const el = box.querySelector('.strip-day.is-today');
      if (!el) return;
      const br = box.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setStripAway(er.right < br.left + 24 || er.left > br.right - 24);
    };
    check();
    box.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      box.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [tasks, selected]);

  const backToToday = useCallback(() => {
    setSelected(today);
    const box = stripRef.current;
    const el = box && box.querySelector('.strip-day.is-today');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [today]);

  const isToday = selected === today;
  const d = parseDS(selected);

  const openNew = (type) => {
    setManualType(type);
    setEditing(null);
    setSheet('edit');
  };
  const openEdit = (t) => {
    setManualType(t.start ? 'event' : 'todo');
    setEditing(t);
    setSheet('edit');
  };

  /* 保存（可带时间覆盖修正） */
  const commitSave = async (payload, override) => {
    const final = override ? { ...payload, ...override } : payload;
    if (editing) {
      await updateTask(editing.id, final);
      track('task_edit', { task_id: editing.id, method: 'manual' });
      toast('已保存修改');
    } else {
      await addTask(final);
      track('task_add', { method: sheet === 'voice' ? 'voice' : 'manual', type: final.start ? 'event' : 'todo' });
      toast('已添加');
    }
    setSheet(null);
    setEditing(null);
    setConflict(null);
  };

  /* 删除 + 撤销（与原型一致：toast 带「撤销」，3.4s 内可恢复） */
  const removeWithUndo = async (t) => {
    const removed = await deleteTask(t.id);
    if (!removed) return;
    toast('已删除「' + removed.title + '」', '撤销', async () => {
      await restoreTask(removed);
      toast('已恢复');
    });
  };

  const secTitle = (name, count, mt, addType) => (
    <div className="sec-title" style={mt ? { marginTop: 24 } : undefined}>
      <span className="st-left">
        {name} <span className="count">{count}</span>
      </span>
      {addType && (
        <span
          className="st-add"
          role="button"
          tabIndex={0}
          aria-label={'手动添加' + name}
          onClick={() => openNew(addType)}
        >
          <Icon name="plus" size={18} stroke />
        </span>
      )}
    </div>
  );

  return (
    <div className="screen">
      <div className="content">
        <div className="today-sticky">
          <div className="topbar">
            <div className="left"></div>
          </div>
          <div className="date-header">
            <div>
              <h2>{isToday ? '今日' : '安排'}</h2>
              <div className="sub">
                {isToday ? greet + ' · ' : ''}
                {d.getMonth() + 1}月{d.getDate()}日 周{WEEK[d.getDay()]}
              </div>
            </div>
            <div className="right-actions">
              <div className="theme-entry" onClick={() => setSheet('theme')} aria-label="切换主题">
                <Icon name="palette" size={16} />
                <span>切换主题</span>
              </div>
              {/* 选中了别的日期，或只是把日期条滑走了 → 都提示可以回来 */}
              {(stripAway || !isToday) && (
                <div className="back-today" onClick={backToToday}>
                  <Icon name="left" size={16} stroke />
                  回到今天
                </div>
              )}
            </div>
          </div>
          <div className="strip" ref={stripRef}>
            {strip.map((day) => {
              const ds = ymd(day);
              return (
                <StripDay
                  key={ds}
                  day={day}
                  ds={ds}
                  isToday={ds === today}
                  active={ds === selected}
                  hasTask={daysWithTasks.has(ds)}
                  onPick={pickDay}
                />
              );
            })}
          </div>
        </div>

        <div id="todayBody">
          {secTitle('今日安排', timed.length, false, 'event')}
          {timed.length === 0 ? (
            <div className="empty-hint">这一天还没有安排</div>
          ) : (
            timed.map((t) => (
              <TaskCard
                key={t.id}
                t={t}
                onToggle={toggleDone}
                onEdit={openEdit}
                onPostpone={(x) => {
                  setEditing(x);
                  setSheet('postpone');
                }}
                onDelete={removeWithUndo}
              />
            ))
          )}

          {secTitle('待办事项', todos.length, true, 'todo')}
          {todos.length === 0 ? (
            <div className="empty-hint">没有待办，享受轻松时刻</div>
          ) : (
            todos.map((t) => (
              <TaskCard
                key={t.id}
                t={t}
                onToggle={toggleDone}
                onEdit={openEdit}
                onPostpone={(x) => {
                  setEditing(x);
                  setSheet('postpone');
                }}
                onDelete={removeWithUndo}
              />
            ))
          )}
        </div>
      </div>

      <div className="fab" onClick={() => { track('voice_mic_click'); setSheet('voice'); }} aria-label="语音添加">
        <Icon name="mic" size={26} />
      </div>

      <TabBar current={page} onChange={onPage} />

      {sheet === 'voice' && (
        <VoiceSheet
          defaultDate={selected}
          onClose={() => setSheet(null)}
          onAddAll={async (list) => {
            if (!list || !list.length) return;
            for (const t of list) {
              await addTask({
                date: t.date || selected,
                title: t.title,
                start: t.start || '',
                end: t.end || '',
                place: t.place || '',
                cat: t.cat || '其他',
                remind: typeof t.remind === 'number' ? t.remind : -1,
                note: t.note || '',
                repeatDays: t.repeatDays && t.repeatDays.length ? t.repeatDays : null,
                status: 'todo'
              });
            }
            const ev = list.filter((t) => t.type !== 'todo').length;
            const td = list.length - ev;
            toast('已添加 ' + list.length + ' 条（安排 ' + ev + ' · 待办 ' + td + '）');
            setSheet(null);
          }}
          /* 语音修改 / 删除已有任务 */
          onUpdate={async (id, patch) => {
            await updateTask(id, patch);
          }}
          onDelete={async (id) => {
            await deleteTask(id);
          }}
        />
      )}
      {sheet === 'edit' && (
        <EditSheet
          task={editing}
          type={manualType}
          defaultDate={selected}
          onClose={() => {
            setSheet(null);
            setEditing(null);
          }}
          onSave={async (payload) => {
            // 先做时间冲突检测（原型有「时间冲突提醒」弹层）
            const hit = findConflict({ ...payload, id: editing ? editing.id : null }, tasks);
            if (hit) {
              setConflict({ existing: hit, incoming: payload });
              return;
            }
            await commitSave(payload);
          }}
          onDelete={async () => {
            await deleteTask(editing.id);
            toast('已删除');
            setSheet(null);
            setEditing(null);
          }}
        />
      )}
      {sheet === 'postpone' && editing && (
        <PostponeSheet
          task={editing}
          onClose={() => {
            setSheet(null);
            setEditing(null);
          }}
          onPick={async (ds) => {
            await updateTask(editing.id, { date: ds });
            toast('已顺延');
            setSheet(null);
            setEditing(null);
          }}
        />
      )}
      {sheet === 'theme' && <ThemeSheet onClose={() => setSheet(null)} />}

      {conflict && (
        <ConflictModal
          existing={conflict.existing}
          incoming={conflict.incoming}
          onClose={() => setConflict(null)}
          onAdjustExisting={async (shift) => {
            await updateTask(conflict.existing.id, shift);
            await commitSave(conflict.incoming);
            toast('已调整「' + conflict.existing.title + '」的时间');
          }}
          onAdjustIncoming={async (shift) => {
            await commitSave(conflict.incoming, shift);
            toast('已调整新任务的时间');
          }}
          onKeep={async () => {
            await commitSave(conflict.incoming);
            toast('已保留两条安排');
          }}
        />
      )}
    </div>
  );
}
