const api = require('../../utils/api');
const store = require('../../utils/store');
const date = require('../../utils/date');
const { catColor } = require('../../utils/cats');

Page({
  data: {
    themeStyle: '', view: 'week',
    weekDone: 0, weekTotal: 0, streak: 0, total: 0,
    dayTitle: '', dayShort: '', dayTimed: [], dayTodos: [], dayBackShow: false,
    weekRange: '', weekDays: [], weekBackShow: false,
    selDs: '', monthTitle: '', monthCells: [], monthBackShow: false, monthSelLabel: '', monthSelTasks: [],
    categories: [],
    editVisible: false, editMode: 'new', editTaskType: 'event', editDefaultDate: '', editTask: null
  },
  onLoad() {
    const now = new Date();
    this._anchor = now;
    this._selDs = date.ymd(now);
    this.allTasks = [];
  },
  onShow() {
    this.applyStyle();
    if (!store.getToken()) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    this.loadCats();
    this.fetchRange();
  },
  applyStyle() { const app = getApp(); this.setData({ themeStyle: app.globalData.themeStyle }); },
  loadCats() {
    api.getCategories().then(r => this.setData({ categories: r.categories || [] })).catch(() => {});
  },
  enrich(list) {
    return (list || []).map(t => {
      const c = catColor(t.cat || '其他');
      return Object.assign({}, t, { catBg: c.bg, catFg: c.fg, status: (t.status === 1) ? 1 : 0 });
    });
  },
  fetchRange() {
    const start = date.ymd(date.addDays(new Date(), -400));
    const end = date.ymd(date.addDays(new Date(), 400));
    api.getTasksRange(start, end).then(r => {
      this.allTasks = this.enrich(r.tasks || []);
      this.renderAll();
    }).catch(() => { this.allTasks = []; this.renderAll(); });
  },
  split(ds) {
    const list = this.allTasks.filter(t => t.date === ds);
    const timed = list.filter(t => t.start).sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const todos = list.filter(t => !t.start);
    return { timed, todos };
  },
  renderAll() { this.renderBoard(); this.renderView(); },
  renderBoard() {
    const today = date.ymd(new Date());
    const ws = date.startOfWeek(this._anchor);
    const we = date.addDays(ws, 6);
    const inWeek = this.allTasks.filter(t => t.date >= date.ymd(ws) && t.date <= date.ymd(we));
    let streak = 0, cur = new Date();
    while (streak <= 400) {
      const ds = date.ymd(cur);
      if (this.allTasks.some(t => t.date === ds)) streak++;
      else break;
      cur = date.addDays(cur, -1);
    }
    this.setData({
      weekDone: inWeek.filter(t => t.status === 1).length,
      weekTotal: inWeek.length,
      streak, total: this.allTasks.length
    });
  },
  renderView() {
    if (this.data.view === 'day') this.renderDay();
    else if (this.data.view === 'week') this.renderWeek();
    else this.renderMonth();
  },
  renderDay() {
    const today = date.ymd(new Date());
    const ds = date.ymd(this._anchor);
    const { timed, todos } = this.split(ds);
    this.setData({
      dayTitle: date.dateSub(ds), dayShort: date.dateShort(ds, today),
      dayTimed: timed, dayTodos: todos, dayBackShow: ds !== today
    });
  },
  renderWeek() {
    const today = date.ymd(new Date());
    const ws = date.startOfWeek(this._anchor);
    const we = date.addDays(ws, 6);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = date.addDays(ws, i);
      const ds = date.ymd(d);
      const { timed, todos } = this.split(ds);
      weekDays.push({ ds, day: d.getDate(), w: date.WEEK[d.getDay()], isToday: ds === today, tasks: timed.concat(todos) });
    }
    const sameWeek = date.ymd(date.startOfWeek(new Date())) === date.ymd(ws);
    this.setData({
      weekRange: (ws.getMonth() + 1) + '月' + ws.getDate() + '日 - ' + (we.getMonth() + 1) + '月' + we.getDate() + '日',
      weekDays, weekBackShow: !sameWeek
    });
  },
  renderMonth() {
    const today = date.ymd(new Date());
    const y = this._anchor.getFullYear(), m = this._anchor.getMonth();
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7;
    const startCell = date.addDays(first, -lead);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = date.addDays(startCell, i);
      const ds = date.ymd(d);
      cells.push({ key: ds, ds, day: d.getDate(), other: d.getMonth() !== m, isToday: ds === today, hasTask: this.allTasks.some(t => t.date === ds) });
    }
    const { timed, todos } = this.split(this._selDs);
    this.setData({
      monthTitle: y + '年 ' + (m + 1) + '月',
      monthCells: cells,
      monthBackShow: !(y === new Date().getFullYear() && m === new Date().getMonth()),
      monthSelLabel: date.dateSub(this._selDs),
      monthSelTasks: timed.concat(todos)
    });
  },
  switchView(e) { this.setData({ view: e.currentTarget.dataset.v }); this.renderView(); },
  stepDay(e) { this._anchor = date.addDays(this._anchor, +e.currentTarget.dataset.d); this.renderDay(); },
  stepWeek(e) { this._anchor = date.addDays(this._anchor, 7 * +e.currentTarget.dataset.d); this.renderBoard(); this.renderWeek(); },
  prevMonth() { this._anchor = new Date(this._anchor.getFullYear(), this._anchor.getMonth() - 1, 1); this.renderMonth(); },
  nextMonth() { this._anchor = new Date(this._anchor.getFullYear(), this._anchor.getMonth() + 1, 1); this.renderMonth(); },
  pickDay(e) {
    const ds = e.currentTarget.dataset.ds;
    this._selDs = ds;
    if (this.data.view === 'month') this.renderMonth();
    else if (this.data.view === 'week') { this._anchor = new Date(ds + 'T00:00'); this.renderWeek(); }
  },
  backToToday() { this._anchor = new Date(); this._selDs = date.ymd(this._anchor); this.renderDay(); },
  backToThisWeek() { this._anchor = new Date(); this.renderWeek(); },
  backToThisMonth() { this._anchor = new Date(); this.renderMonth(); },
  openNewDay() {
    this.setData({ editMode: 'new', editTaskType: 'event', editDefaultDate: date.ymd(this._anchor), editTask: null, editVisible: true });
  },
  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const t = this.allTasks.find(x => x.id === id);
    if (!t) return;
    this.setData({ editMode: 'edit', editTask: t, editVisible: true });
  },
  toggleDone(e) {
    const id = e.currentTarget.dataset.id;
    const t = this.allTasks.find(x => x.id === id);
    if (!t) return;
    const next = (t.status === 1) ? 0 : 1;
    api.updateTask(id, { status: next }).then(() => this.fetchRange()).catch(() => {});
  },
  onEditSave(e) {
    const form = e.detail.form;
    const p = (this.data.editMode === 'edit') ? api.updateTask(form.id, form) : api.createTask(form);
    p.then(() => { this.setData({ editVisible: false }); this.fetchRange(); wx.showToast({ title: '已保存', icon: 'success' }); })
      .catch(err => wx.showToast({ title: (err && err.error) || '保存失败', icon: 'none' }));
  },
  onEditDelete(e) {
    api.deleteTask(e.detail.id).then(() => { this.setData({ editVisible: false }); this.fetchRange(); wx.showToast({ title: '已删除', icon: 'success' }); })
      .catch(err => wx.showToast({ title: (err && err.error) || '删除失败', icon: 'none' }));
  },
  onEditClose() { this.setData({ editVisible: false }); },
  onNewCat() {
    wx.showModal({
      title: '新建分类', editable: true, placeholderText: '分类名',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          api.createCategory(res.content.trim()).then(() => { this.loadCats(); wx.showToast({ title: '已添加', icon: 'success' }); })
            .catch(err => wx.showToast({ title: (err && err.error) || '添加失败', icon: 'none' }));
        }
      }
    });
  }
});
