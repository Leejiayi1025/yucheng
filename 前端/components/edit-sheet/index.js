const date = require('../../utils/date');
const { catColor } = require('../../utils/cats');

const REMIND_PRESET = [0, 5, 15, 30, 60];

Component({
  properties: {
    visible: { type: Boolean, value: false },
    mode: { type: String, value: 'new' },        // 'new' | 'edit'
    taskType: { type: String, value: 'event' },   // 'event' | 'todo'
    defaultDate: { type: String, value: '' },
    task: { type: Object, value: null },
    categories: { type: Array, value: [] }        // [{name,color}]
  },
  data: {
    title: '', date: '', dateLabel: '', start: '', end: '', place: '',
    cat: '其他', hasTime: true,
    remindOn: false, remindMin: 0, remindState: '不提醒',
    repeatDays: [], dows: ['日', '一', '二', '三', '四', '五', '六'], repeatText: '不重复',
    note: '', postponeValue: '', postponeOptions: [],
    catOptions: [], remindOptions: []
  },
  observers: {
    'visible': function (v) { if (v) this.buildForm(); },
    'categories': function () { if (this.data.visible) this.refreshCatOptions(); }
  },
  methods: {
    buildForm() {
      const p = this.properties;
      const f = {
        title: '', date: p.defaultDate || date.ymd(new Date()),
        start: '', end: '', place: '', cat: '其他',
        hasTime: true, remindOn: false, remindMin: 0,
        repeatDays: [], note: '', postponeValue: ''
      };
      if (p.mode === 'edit' && p.task) {
        const t = p.task;
        f.title = t.title || '';
        f.date = t.date;
        f.start = date.trimTime(t.start) || '';
        f.end = date.trimTime(t.end) || '';
        f.place = t.place || '';
        f.cat = t.cat || '其他';
        f.hasTime = !!(t.start);
        const r = t.remind;
        if (r == null || r < 0) { f.remindOn = false; f.remindMin = 0; }
        else { f.remindOn = true; f.remindMin = (r > 0 ? r : 0); }
        f.repeatDays = (t.repeatDays || []).slice();
        f.note = t.note || '';
        f.postponeValue = '';
      } else {
        f.hasTime = (p.taskType !== 'todo');
        const cats = p.categories || [];
        f.cat = (cats.find(c => c.name === '学习') || cats[0] || { name: '其他' }).name;
      }
      this.setData(f, () => {
        this.refreshCatOptions();
        this.refreshRemindOptions();
        this.computeRepeat();
        this.computePostpone();
        this.computeDateLabel();
      });
    },
    refreshCatOptions() {
      const cats = this.properties.categories || [];
      const opts = cats.map(c => ({ label: c.name, value: c.name, color: c.color || catColor(c.name).bg }));
      opts.push({ label: '＋ 新建分类', value: '__newcat__', special: true });
      this.setData({ catOptions: opts });
    },
    refreshRemindOptions() {
      let opts = REMIND_PRESET.map(v => ({ label: date.remindText(v), value: v }));
      if (this.data.remindOn && this.data.remindMin != null && REMIND_PRESET.indexOf(this.data.remindMin) < 0) {
        opts.unshift({ label: date.remindText(this.data.remindMin), value: this.data.remindMin });
      }
      this.setData({ remindOptions: opts });
    },
    computeRepeat() {
      this.setData({ repeatText: date.repeatText(this.data.repeatDays) });
    },
    computePostpone() {
      if (this.properties.mode !== 'edit') { this.setData({ postponeOptions: [] }); return; }
      const from = this.data.date || (this.properties.task && this.properties.task.date);
      if (!from) { this.setData({ postponeOptions: [] }); return; }
      const cur = new Date(from + 'T00:00');
      const nextDow = (dow) => { let d = new Date(cur); d.setDate(d.getDate() + 1); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d; };
      const cand = [
        { t: '明天', d: date.addDays(cur, 1) },
        { t: '后天', d: date.addDays(cur, 2) },
        { t: '周末', d: nextDow(6) },
        { t: '下周一', d: nextDow(1) }
      ];
      const seen = {}, out = [];
      cand.forEach(o => {
        const k = date.ymd(o.d);
        if (seen[k]) return; seen[k] = 1; out.push(o);
      });
      out.sort((a, b) => a.d - b.d);
      const opts = out.map(o => {
        const ds = date.ymd(o.d);
        const dd = new Date(ds + 'T00:00');
        return { label: o.t + '（' + (dd.getMonth() + 1) + '月' + dd.getDate() + '日）', value: ds };
      });
      this.setData({ postponeOptions: opts });
    },
    computeDateLabel() { this.setData({ dateLabel: date.dateSub(this.data.date) }); },

    onTitle(e) { this.setData({ title: e.detail.value }); },
    onPlace(e) { this.setData({ place: e.detail.value }); },
    onNote(e) { this.setData({ note: e.detail.value }); },
    onDate(e) { this.setData({ date: e.detail.value }, () => this.computeDateLabel()); },
    onStart(e) { this.setData({ start: e.detail.value }); },
    onEnd(e) { this.setData({ end: e.detail.value }); },
    toggleTime() {
      const has = !this.data.hasTime;
      this.setData({ hasTime: has, start: has ? this.data.start : '', end: has ? this.data.end : '' });
    },
    toggleRemind() {
      const on = !this.data.remindOn;
      this.setData({ remindOn: on, remindMin: on ? this.data.remindMin : 0 }, () => this.refreshRemindOptions());
    },
    onRemind(e) { this.setData({ remindMin: e.detail.value }); },
    onCat(e) { this.setData({ cat: e.detail.value }); },
    onNewCat() { this.triggerEvent('newcat'); },
    toggleRepeat(e) {
      const d = +e.currentTarget.dataset.d;
      const arr = this.data.repeatDays.slice();
      const i = arr.indexOf(d);
      if (i >= 0) arr.splice(i, 1); else arr.push(d);
      this.setData({ repeatDays: arr }, () => this.computeRepeat());
    },
    onPostpone(e) {
      const v = e.detail.value;
      this.setData({ postponeValue: v, date: v }, () => this.computeDateLabel());
    },
    onClose() { this.triggerEvent('close'); },
    onDelete() { this.triggerEvent('delete', { id: this.properties.task && this.properties.task.id }); },
    onSave() {
      const f = this.data;
      const payload = {
        title: (f.title || '').trim(),
        date: f.date,
        start: f.hasTime ? (f.start || null) : null,
        end: f.hasTime ? (f.end || null) : null,
        place: (f.place || '').trim() || null,
        cat: f.cat || '其他',
        status: 0,
        remind: f.remindOn ? (f.remindMin || 0) : -1,
        repeatDays: (f.repeatDays && f.repeatDays.length) ? f.repeatDays.slice() : null,
        note: (f.note || '').trim() || null
      };
      if (this.properties.mode === 'edit' && this.properties.task) payload.id = this.properties.task.id;
      if (!payload.title) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
      this.triggerEvent('save', { form: payload });
    }
  }
});
