const NAMES = { sage: '自然绿', dark: '暗夜', rose: '樱粉', neon: '霓虹', purple: '薰紫' };

Component({
  properties: {
    visible: { type: Boolean, value: false },
    current: { type: String, value: 'sage' }
  },
  data: { list: [] },
  lifetimes: {
    attached() {
      const app = getApp();
      const TH = (app && app.THEMES) || {};
      const list = Object.keys(TH).map(key => ({
        key,
        name: NAMES[key] || key,
        bg: TH[key].bg,
        primary: TH[key].primary,
        card: TH[key].card
      }));
      this.setData({ list });
    }
  },
  methods: {
    pick(e) {
      const key = e.currentTarget.dataset.key;
      const app = getApp();
      if (app && app.applyTheme) app.applyTheme(key);
      this.setData({ current: key });
      this.triggerEvent('change', { key });
      this.triggerEvent('close');
    },
    onClose() { this.triggerEvent('close'); }
  }
});
