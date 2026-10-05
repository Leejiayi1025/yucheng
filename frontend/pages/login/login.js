const api = require('../../utils/api');
const store = require('../../utils/store');

Page({
  data: { themeStyle: '', mode: 'login', phone: '', password: '', nickname: '' },
  onLoad() {
    const app = getApp();
    this.setData({ themeStyle: app.globalData.themeStyle });
    if (store.getToken()) { wx.switchTab({ url: '/pages/today/today' }); }
  },
  setMode(e) { this.setData({ mode: e.currentTarget.dataset.m }); },
  onNick(e) { this.setData({ nickname: e.detail.value }); },
  onPhone(e) { this.setData({ phone: e.detail.value }); },
  onPwd(e) { this.setData({ password: e.detail.value }); },
  submit() {
    const { mode, phone, password, nickname } = this.data;
    if (!/^1\d{10}$/.test(phone)) { wx.showToast({ title: '手机号格式不正确', icon: 'none' }); return; }
    if (!password || password.length < 6) { wx.showToast({ title: '密码至少 6 位', icon: 'none' }); return; }
    const p = (mode === 'register')
      ? api.register(phone, password, nickname || '语程用户')
      : api.login(phone, password);
    p.then(r => {
      getApp().setAuth(r.user, r.token);
      wx.switchTab({ url: '/pages/today/today' });
    }).catch(err => wx.showToast({ title: (err && err.error) || '操作失败', icon: 'none' }));
  }
});
