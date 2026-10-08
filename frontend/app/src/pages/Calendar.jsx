import { useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import TabBar from '../components/TabBar';
import EditSheet from '../components/EditSheet';
import PostponeSheet from '../components/PostponeSheet';
import { useApp } from '../store';
import { ymd, addDays, parseDS, dateLabel, weekStart, WEEK } from '../lib/date';
import { catColor } from '../lib/cats';
import { playPageFlip } from '../lib/sound';

const HEAD = ['一', '二', '三', '四', '五', '六', '日'];

export default function Calendar({ page, onPage }) {
  const { tasks, updateTask, deleteTask, toast } = useApp();
  const today = ymd(new Date());
  const [view, setView] = useState('week');
  const [selected, setSelected] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(null);
  const [openTodo, setOpenTodo] = useState({});
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  /* 翻月：改月份 + 播翻书声（与切换主题同一个音效）。
     左右滑动和标题两边的箭头都走这一个入口，保证行为一致。 */
  const shiftMonth = (delta) => {
    playPageFlip();
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  /* 月视图左右滑动翻月。拖动时让整个网格跟手平移，松手按位移决定翻页还是弹回。
     纵向意图为主时直接放弃接管，否则会把页面上下滚动一起吃掉。 */
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef(null);

  const onMonthDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, dx: 0, active: false };
    // 捕获指针：手指滑出网格再松开也能收到 pointerup，
    // 否则要靠 onPointerLeave 兜底，容易在边缘误触发翻月
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 老浏览器不支持就算了，还有 onPointerCancel 兜底 */
    }
  };
  const onMonthMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        dragRef.current = null; // 用户在上下滑，交还给页面滚动
        return;
      }
      d.active = true;
    }
    d.dx = dx;
    setDragX(dx);
  };
  const onMonthUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragX(0);
    if (!d || !d.active) return;
    // 位移从 ref 读，不读 state —— state 可能还停在上一帧
    if (d.dx <= -60) shiftMonth(1);
    else if (d.dx >= 60) shiftMonth(-1);
  };
  const [sheet, setSheet] = useState(null);
  const [editing, setEditing] = useState(null);

  const board = useMemo(() => {
    const ws = ymd(weekStart(today));
    const days = {};
    for (let i = 0; i < 7; i++) days[ymd(addDays(parseDS(ws), i))] = 1;
    const inWeek = tasks.filter((t) => days[t.date]);
    const done = inWeek.filter((t) => t.status === 'done').length;
    let streak = 0;
    for (let i = 0; i < 3650; i++) {
      const ds = ymd(addDays(new Date(), -i));
      if (tasks.some((t) => t.date === ds && t.status === 'done')) streak++;
      else break;
    }
    return { done, total: inWeek.length, all: tasks.length, streak };
  }, [tasks, today]);

  const tasksOn = (ds) => {
    const list = tasks.filter((t) => t.date === ds);
    return {
      timed: list.filter((t) => t.start).sort((a, b) => a.start.localeCompare(b.start)),
      todos: list.filter((t) => !t.start)
    };
  };

  const openEdit = (t) => {
    setEditing(t);
    setSheet('edit');
  };
  const done = (t) => (t.status === 'done' ? ' done' : ' ');
  const note = (t) => (t.note ? <div className="card-note">{t.note}</div> : null);
  const chev = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );

  /* 单条日程（日视图 / 月视图当天清单用） */
  const evRow = (t) => (
    <div
      key={t.id}
      className={'day-ev' + done(t)}
      style={{ borderColor: catColor(t.cat).bg }}
      onClick={() => openEdit(t)}
    >
      <span className="ev-t">{t.title}</span>
      <div className="dm">
        {t.remind >= 0 && (
          <span className="bell">
            <Icon name="bell" size={13} stroke />
          </span>
        )}
        {t.start}
        {t.end ? ' - ' + t.end : ''}
        {t.place ? ' · ' + t.place : ''}
      </div>
      {note(t)}
    </div>
  );

  const todoRow = (t) => (
    <div
      key={t.id}
      className={'day-ev' + done(t)}
      style={{ borderColor: catColor(t.cat).bg }}
      onClick={() => openEdit(t)}
    >
      <span className="ev-t">{t.title}</span>
      {note(t)}
    </div>
  );

  /* 待办折叠组：默认收起，就地展开 */
  const todoGroup = (todos, ds) => {
    if (!todos.length) return null;
    const isOpen = !!openTodo[ds];
    return (
      <div className={'todo-group' + (isOpen ? ' open' : '')}>
        <div
          className="tg-head"
          role="button"
          aria-expanded={isOpen}
          onClick={() => setOpenTodo((s) => ({ ...s, [ds]: !s[ds] }))}
        >
          <span className="tg-chev">{chev}</span>
          <span className="tg-label">待办</span>
          <span className="tg-count">{todos.length} 项</span>
        </div>
        <div className="tg-body">{todos.map(todoRow)}</div>
      </div>
    );
  };

  const nav = (label, onPrev, onNext) => (
    <div className="month-nav">
      <button className="mn-btn" onClick={onPrev} aria-label="上一个">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="mn-title">{label}</div>
      <button className="mn-btn" onClick={onNext} aria-label="下一个">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
  const mdLabel = (d) => d.getMonth() + 1 + '月' + d.getDate() + '日';

  /* 周视图 */
  const ws = parseDS(weekAnchor || ymd(weekStart(selected)));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  /* 月视图 */
  const my = monthDate.getFullYear();
  const mm = monthDate.getMonth();
  const first = new Date(my, mm, 1);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const days = new Date(my, mm + 1, 0).getDate();
  const rows = Math.ceil((offset + days) / 7);
  const gridStart = addDays(first, -offset);

  const dayDS = selected;
  const dayData = tasksOn(dayDS);
  const dayDate = parseDS(dayDS);

  const monthAll = tasksOn(selected);
  const monthInView =
    dayDate.getFullYear() === my && dayDate.getMonth() === mm;

  return (
    <div className="screen">
      <div className="topbar">
        <h1>日历</h1>
      </div>

      <div className="cal-head">
        <div className="cal-board">
          <div className="cb-row">
            <span className="cb-pill">
              本周 <b>{board.done} / {board.total}</b>
            </span>
            {board.streak > 0 && <span className="cb-pill">连续 {board.streak} 天</span>}
            <span className="cb-pill">累计 {board.all}</span>
          </div>
          <div className="cb-bar">
            <div
              className="cb-fill"
              style={{ width: (board.total ? (board.done / board.total) * 100 : 0) + '%' }}
            />
          </div>
        </div>
        <div className="cal-tabs">
          {[
            ['day', '日'],
            ['week', '周'],
            ['month', '月']
          ].map(([k, label]) => (
            <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="content">
        {view === 'week' && (
          <div className="cal-pane active">
            {nav(
              mdLabel(weekDays[0]) + ' - ' + mdLabel(weekDays[6]),
              () => setWeekAnchor(ymd(addDays(weekDays[0], -7))),
              () => setWeekAnchor(ymd(addDays(weekDays[0], 7)))
            )}
            {/* 当前显示的就是本周时不必再提示（原来拿 weekAnchor 和本周比，null 永远不等 → 一直显示） */}
            {ymd(ws) !== ymd(weekStart(today)) && (
              <div className="month-back">
                <span className="back-today" onClick={() => setWeekAnchor(null)}>{'回到本周'}</span>
              </div>
            )}
            <div className="week-list">
              {weekDays.map((d) => {
                const ds = ymd(d);
                const { timed, todos } = tasksOn(ds);
                const isOpen = !!openTodo[ds];
                return (
                  <div key={ds} className={'week-day' + (ds === selected ? ' sel' : '')}>
                    <div className="week-label">
                      <div className="wd">周{WEEK[d.getDay()]}</div>
                      <div className="dd">{d.getDate()}</div>
                    </div>
                    <div className="week-events">
                      {timed.map((t) => (
                        <div
                          key={t.id}
                          className={'week-event' + done(t)}
                          style={{ borderColor: catColor(t.cat).bg }}
                          onClick={() => openEdit(t)}
                        >
                          <div className="t">{t.title}</div>
                          <div className="m">
                            {t.start}
                            {t.end ? ' - ' + t.end : ''}
                          </div>
                          {note(t)}
                        </div>
                      ))}
                      {todos.length > 0 && (
                        <div
                          className={'week-event tg-mini' + (isOpen ? ' open' : '')}
                          onClick={() => setOpenTodo((s) => ({ ...s, [ds]: !s[ds] }))}
                        >
                          <div className="t">
                            <span className="tg-chev sm">{chev}</span>待办 {todos.length} 项
                          </div>
                        </div>
                      )}
                      {isOpen &&
                        todos.map((t) => (
                          <div
                            key={t.id}
                            className={'week-event tg-todo' + done(t)}
                            style={{ borderColor: catColor(t.cat).bg }}
                            onClick={() => openEdit(t)}
                          >
                            <span className="ev-t">{t.title}</span>
                            {note(t)}
                          </div>
                        ))}
                      {!timed.length && !todos.length && (
                        <div className="week-event empty-ev">无安排</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'day' && (
          <div className="cal-pane active">
            {nav(
              mdLabel(dayDate) + ' 周' + WEEK[dayDate.getDay()] + (dayDS === today ? ' · 今日' : ''),
              () => setSelected(ymd(addDays(dayDate, -1))),
              () => setSelected(ymd(addDays(dayDate, 1)))
            )}
            {(selected !== today) && (
              <div className="month-back">
                <span className="back-today" onClick={() => setSelected(today)}>{'回到今天'}</span>
              </div>
            )}
            <div className="day-axis">
              {dayData.timed.map((t) => (
                <div className="day-row" key={t.id}>
                  <div className="day-time">{t.start}</div>
                  <div className="day-events">{evRow(t)}</div>
                </div>
              ))}
              {dayData.todos.length > 0 && (
                <div className="day-row">
                  <div className="day-time">待办</div>
                  <div className="day-events">{todoGroup(dayData.todos, dayDS)}</div>
                </div>
              )}
              {!dayData.timed.length && !dayData.todos.length && (
                <div className="md-empty">这天还没有安排</div>
              )}
            </div>
          </div>
        )}

        {view === 'month' && (
          <div className="cal-pane active">
            {nav(
              my + '年 ' + (mm + 1) + '月',
              () => shiftMonth(-1),
              () => shiftMonth(1)
            )}
            {(my !== new Date().getFullYear() || mm !== new Date().getMonth()) && (
              <div className="month-back">
                <span className="back-today" onClick={() => setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>{'回到本月'}</span>
              </div>
            )}
            <div
              className={'month-grid' + (dragX ? ' dragging' : '')}
              style={dragX ? { transform: 'translateX(' + dragX + 'px)' } : undefined}
              onPointerDown={onMonthDown}
              onPointerMove={onMonthMove}
              onPointerUp={onMonthUp}
              onPointerCancel={onMonthUp}
            >
              <div className="mg-head">
                {HEAD.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="mg-row">
                {Array.from({ length: rows * 7 }, (_, i) => {
                  const d = addDays(gridStart, i);
                  if (d.getMonth() !== mm) return <div key={i} className="mg-cell empty" />;
                  const ds = ymd(d);
                  const has = tasks.some((t) => t.date === ds);
                  return (
                    <div
                      key={i}
                      className={
                        'mg-cell' +
                        (has ? ' has' : '') +
                        (ds === today ? ' today' : '') +
                        (ds === selected ? ' sel' : '')
                      }
                      onClick={() => setSelected(ds)}
                    >
                      {/* 圆形高亮挂在这个 span 上，格子本身就能压扁成扁矩形 ——
                          否则格子必须保持正方形，6 行白白多占 50px */}
                      <span className="mg-n">{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="month-daylist">
              {!monthInView ? (
                <div className="md-hint">点选日期，查看当天清单</div>
              ) : (
                <>
                  <div className="md-head">
                    <div className="md-date">{dateLabel(selected)}</div>
                    <div className="md-count">
                      {monthAll.timed.length + monthAll.todos.length} 项
                    </div>
                  </div>
                  {monthAll.timed.length + monthAll.todos.length === 0 ? (
                    <div className="md-empty">这天还没有安排</div>
                  ) : (
                    <>
                      {monthAll.timed.length > 0 && (
                        <div className="md-list">{monthAll.timed.map(evRow)}</div>
                      )}
                      {todoGroup(monthAll.todos, selected)}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <TabBar current={page} onChange={onPage} />

      {sheet === 'edit' && (
        <EditSheet
          task={editing}
          type={editing && editing.start ? 'event' : 'todo'}
          defaultDate={selected}
          onClose={() => {
            setSheet(null);
            setEditing(null);
          }}
          onSave={async (payload) => {
            await updateTask(editing.id, payload);
            toast('已保存修改');
            setSheet(null);
            setEditing(null);
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
    </div>
  );
}
