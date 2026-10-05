const api = require('../../utils/api');
const store = require('../../utils/store');
const date = require('../../utils/date');
const { catColor } = require('../../utils/cats');

Page({
  data: {
    themeStyle: '', themeKey: 'sage',
    today: '', selectedDate: '', title: '今日', sub: '', isToday: true,
    dates: [],
    timed: [], todos: [],
    categories: [],
    editVisible: false, editMode: 'new', editTaskType: 'event', editDefaultDate: '', editTask: null,
    voiceVisible: false, themeVisible: false
  },
  onLoad() {
    const t = date.ymd(new Date());
    this.setData({ today: t, selectedDate: t, editDefaultDate: t });
    this.buildStrip();
    this.updateHeader();
  },
  onShow() {
    const app = getApp();
    this.applyStyle();
    if (!store.getToken()) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    this.loadCats();
    this.loadTasks(this.data.selectedDate);
  },
  applyStyle() {
    const app = getApp();
    this.setData({ themeStyle: app.globalData.themeStyle, themeKey: app.globalData.theme });
  },
  buildStrip() {
    const start = date.addDays(new Date(this.data.today + 'T00:00'), -3);
    const arr = [];
    for (let i = 0; i < 22; i++) {
      const d = date.addDays(start, i);
      const ds = date.ymd(d);
      arr.push({ ds, day: d.getDate(), w: (ds === this.data.today) ? '今' : date.WEEK[d.getDay()], active: ds === this.data.selectedDate });
    }
    this.setData({ dates: arr });
  },
  updateHeader() {
    const isToday = this.data.selectedDate === this.data.today;
    this.setData({
      isToday,
      title: isToday ? '今日' : '安排',
      sub: date.dateSub(this.data.selectedDate) + (isToday ? ' · 今天' : '')
    });
  },
  loadCats() {
    api.getCategories().then(r => this.setData({ categories: r.categories || [] })).catch(() => {});
  },
  enrich(list) {
    return (list || []).map(t => {
      const c = catColor(t.cat || '其他');
      return Object.assign({}, t, { catBg: c.bg, catFg: c.fg, status: (t.status === 1) ? 1 : 0 });
    });
  },
  loadTasks(ds) {
    api.getTasks(ds).then(r => {
      const all = this.enrich(r.tasks || []);
      const timed = all.filter(t => t.start).sort((a, b) => String(a.start).localeCompare(String(b.start)));
      const todos = all.filter(t => !t.start);
      this.setData({ timed, todos });
    }).catch(() => { this.setData({ timed: [], todos: [] }); });
  },
  selectDate(e) {
    const ds = e.currentTarget.dataset.ds;
    this.setData({ selectedDate: ds });
    this.buildStrip();
    this.updateHeader();
    this.loadTasks(ds);
  },
  goToday() {
    this.setData({ selectedDate: this.data.today });
    this.buildStrip();
    this.updateHeader();
    this.loadTasks(this.data.today);
  },
  toggleDone(e) {
    const id = e.currentTarget.dataset.id;
    const all = this.data.timed.concat(this.data.todos);
    const t = all.find(x => x.id === id);
    if (!t) return;
    const next = (t.status === 1) ? 0 : 1;
    api.updateTask(id, { status: next }).then(() => this.loadTasks(this.data.selectedDate)).catch(() => {});
  },
  openNew(e) {
    const type = e.currentTarget.dataset.type || 'event';
    this.setData({ editMode: 'new', editTaskType: type, editDefaultDate: this.data.selectedDate, editTask: null, editVisible: true });
  },
  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const t = this.data.timed.concat(this.data.todos).find(x => x.id === id);
    if (!t) return;
    this.setData({ editMode: 'edit', editTask: t, editVisible: true });
  },
  onEditSave(e) {
    const form = e.detail.form;
    const p = (this.data.editMode === 'edit') ? api.updateTask(form.id, form) : api.createTask(form);
    p.then(() => {
      this.setData({ editVisible: false });
      this.loadTasks(this.data.selectedDate);
      wx.showToast({ title: '已保存', icon: 'success' });
    }).catch(err => wx.showToast({ title: (err && err.error) || '保存失败', icon: 'none' }));
  },
  onEditDelete(e) {
    const id = e.detail.id;
    api.deleteTask(id).then(() => {
      this.setData({ editVisible: false });
      this.loadTasks(this.data.selectedDate);
      wx.showToast({ title: '已删除', icon: 'success' });
    }).catch(err => wx.showToast({ title: (err && err.error) || '删除失败', icon: 'none' }));
  },
  onEditClose() { this.setData({ editVisible: false }); },
  onNewCat() {
    wx.showModal({
      title: '新建分类', editable: true, placeholderText: '分类名',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          api.createCategory(res.content.trim()).then(() => {
            this.loadCats();
            wx.showToast({ title: '已添加', icon: 'success' });
          }).catch(err => wx.showToast({ title: (err && err.error) || '添加失败', icon: 'none' }));
        }
      }
    });
  },
  openVoice() { this.setData({ voiceVisible: true }); },
  onVoiceAdd(e) {
    const form = e.detail.form;
    api.createTask(form).then(() => {
      this.setData({ voiceVisible: false });
      this.loadTasks(this.data.selectedDate);
      wx.showToast({ title: '已添加', icon: 'success' });
    }).catch(err => wx.showToast({ title: (err && err.error) || '添加失败', icon: 'none' }));
  },
  onVoiceClose() { this.setData({ voiceVisible: false }); },
  openTheme() { this.setData({ themeVisible: true, themeKey: getApp().globalData.theme }); },
  onThemeChange() {
    this.applyStyle();
    this.setData({ themeVisible: false });
  },
  onThemeClose() { this.setData({ themeVisible: false }); }
});
