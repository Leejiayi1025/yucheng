const api = require('../../utils/api');
const store = require('../../utils/store');
const date = require('../../utils/date');
const { catColor } = require('../../utils/cats');

Page({
  data: {
    themeStyle: '', themeKey: 'sage',
    mineName: '语程用户', mineDays: 0, avatarText: '语',
    themeVisible: false, remindVisible: false, reminds: [], accountVisible: false
  },
  onShow() {
    const app = getApp();
    this.setData({ themeStyle: app.globalData.themeStyle, themeKey: app.globalData.theme });
    if (!store.getToken()) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    this.loadMe();
  },
  loadMe() {
    api.me().then(u => {
      const nickname = u.nickname || '语程用户';
      let days = 0;
      if (u.created_at) {
        const created = new Date(u.created_at.replace(' ', 'T'));
        days = Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000) + 1);
      }
      this.setData({ mineName: nickname, mineDays: days, avatarText: (nickname || '语').charAt(0) });
    }).catch(() => {});
  },
  editProfile() {
    wx.showModal({
      title: '修改昵称', editable: true, placeholderText: '给自己起个名字',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          const name = res.content.trim().slice(0, 12);
          const cur = store.getUser() || {};
          store.setUser(Object.assign({}, cur, { nickname: name }));
          this.setData({ mineName: name, avatarText: name.charAt(0) });
          wx.showToast({ title: '已保存（本地）', icon: 'none' });
        }
      }
    });
  },
  openTheme() { this.setData({ themeVisible: true, themeKey: getApp().globalData.theme }); },
  onThemeChange() { this.setData({ themeVisible: false }); },
  onThemeClose() { this.setData({ themeVisible: false }); },
  openRemind() {
    const start = date.ymd(new Date());
    const end = date.ymd(date.addDays(new Date(), 7));
    api.getTasksRange(start, end).then(r => {
      const list = (r.tasks || [])
        .filter(t => t.remind != null && t.remind >= 0)
        .map(t => {
          const c = catColor(t.cat || '其他');
          const meta = date.dateSub(t.date) + (t.start ? ' ' + date.trimTime(t.start) : '') + ' · ' + date.remindText(t.remind);
          return { id: t.id, title: t.title, catBg: c.bg, meta };
        });
      this.setData({ reminds: list, remindVisible: true });
    }).catch(() => this.setData({ reminds: [], remindVisible: true }));
  },
  closeRemind() { this.setData({ remindVisible: false }); },
  openAccount() { this.setData({ accountVisible: true }); },
  closeAccount() { this.setData({ accountVisible: false }); },
  logout() {
    getApp().clearAuth();
    wx.reLaunch({ url: '/pages/login/login' });
  },
  delAccount() {
    wx.showModal({
      title: '注销账号？', content: '将清除本地登录态并退出。后端数据删除请联系服务端（当前未提供该接口）。',
      success: res => {
        if (res.confirm) {
          getApp().clearAuth();
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  }
});
