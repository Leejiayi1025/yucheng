Component({
  data: {
    selected: 0,
    style: '',
    list: [
      { page: '/pages/today/today', text: '今日', icon: 'today' },
      { page: '/pages/calendar/calendar', text: '日历', icon: 'cal' },
      { page: '/pages/mine/mine', text: '我的', icon: 'mine' }
    ]
  },
  lifetimes: {
    attached() { this.syncStyle(); }
  },
  pageLifetimes: {
    show() {
      this.syncStyle();
      const pages = getCurrentPages();
      const cur = pages[pages.length - 1];
      const route = cur ? cur.route : '';
      const idx = this.data.list.findIndex(i => i.page === '/' + route);
      if (idx >= 0) this.setData({ selected: idx });
    }
  },
  methods: {
    syncStyle() {
      const app = getApp();
      if (app && app.globalData && app.globalData.themeStyle) this.setData({ style: app.globalData.themeStyle });
    },
    switchTab(e) {
      const idx = e.currentTarget.dataset.index;
      wx.switchTab({ url: this.data.list[idx].page });
    }
  }
});
