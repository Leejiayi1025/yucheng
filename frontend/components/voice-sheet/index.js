const api = require('../../utils/api');
const date = require('../../utils/date');
const { catColor } = require('../../utils/cats');

const SAMPLES = [
  '明天下午4点到7点学习PM理论知识',
  '后天上午9点开会',
  '周五晚上7点跟朋友吃饭',
  '每天早上8点跑步'
];

Component({
  properties: {
    visible: { type: Boolean, value: false },
    categories: { type: Array, value: [] }
  },
  data: {
    text: '', samples: SAMPLES,
    showSummary: false, showForm: false, recording: false,
    draft: {}, draftMeta: '', draftCatColor: '#ccc',
    fTitle: '', fDate: '', fDateLabel: '', fStart: '', fEnd: '', fPlace: '', fCat: '其他', fHasTime: false,
    catOptions: []
  },
  lifetimes: {
    attached() {
      this._rec = wx.getRecorderManager();
      this._rec.onStop(() => {
        this.setData({ recording: false });
        wx.showToast({ title: '录音完成，请用文字或示例添加', icon: 'none' });
      });
    }
  },
  observers: {
    'categories': function (cats) {
      const opts = (cats || []).map(c => ({ label: c.name, value: c.name, color: c.color || catColor(c.name).bg }));
      opts.push({ label: '＋ 新建分类', value: '__newcat__', special: true });
      this.setData({ catOptions: opts });
    }
  },
  methods: {
    onText(e) { this.setData({ text: e.detail.value }); },
    useSample(e) { this.setData({ text: e.currentTarget.dataset.t }); },
    toggleForm() { this.setData({ showForm: !this.data.showForm }); },
    parse() {
      const text = (this.data.text || '').trim();
      if (!text) { wx.showToast({ title: '先输入或选择一句话', icon: 'none' }); return; }
      api.parseVoice(text).then(r => {
        const d = r.draft || {};
        const start = date.trimTime(d.start) || '';
        const end = date.trimTime(d.end) || '';
        const hasTime = !!(d.start);
        const ds = d.date || date.ymd(new Date());
        const cat = d.cat || '其他';
        this.setData({
          draft: { title: d.title || '新任务', date: ds, start, end, place: d.place || '', cat },
          draftCatColor: catColor(cat).bg,
          draftMeta: this.buildMeta(d.title, ds, start, end, d.place, cat),
          fTitle: d.title || '新任务', fDate: ds, fDateLabel: date.dateSub(ds),
          fStart: start, fEnd: end, fPlace: d.place || '', fCat: cat, fHasTime: hasTime,
          showSummary: true, showForm: true
        });
      }).catch(() => wx.showToast({ title: '解析失败，请重试', icon: 'none' }));
    },
    buildMeta(title, ds, start, end, place, cat) {
      let m = date.dateSub(ds);
      if (start) m += ' ' + start + (end ? '-' + end : '');
      if (place) m += ' · ' + place;
      m += ' · ' + cat;
      return m;
    },
    onFTitle(e) { this.setData({ fTitle: e.detail.value }); },
    onFDate(e) { this.setData({ fDate: e.detail.value, fDateLabel: date.dateSub(e.detail.value) }); },
    onFStart(e) { this.setData({ fStart: e.detail.value }); },
    onFEnd(e) { this.setData({ fEnd: e.detail.value }); },
    onFPlace(e) { this.setData({ fPlace: e.detail.value }); },
    onFCat(e) { this.setData({ fCat: e.detail.value }); },
    onNewCat() { this.triggerEvent('newcat'); },
    toggleRecord() {
      if (!this._rec) return;
      if (this.data.recording) { this._rec.stop(); return; }
      this.setData({ recording: true });
      this._rec.start({ duration: 60000, format: 'mp3' });
    },
    resetAll() {
      this.setData({
        text: '', showSummary: false, showForm: false, draft: {}, draftMeta: '',
        fTitle: '', fStart: '', fEnd: '', fPlace: '', fCat: '其他', fHasTime: false
      });
    },
    onAdd() {
      const f = this.data;
      const payload = {
        title: (f.fTitle || '').trim() || '新任务',
        date: f.fDate,
        start: f.fHasTime ? (f.fStart || null) : null,
        end: f.fHasTime ? (f.fEnd || null) : null,
        place: (f.fPlace || '').trim() || null,
        cat: f.fCat || '其他',
        status: 0, remind: -1, repeatDays: null, note: null
      };
      this.triggerEvent('add', { form: payload });
    },
    onClose() { this.triggerEvent('close'); }
  }
});
