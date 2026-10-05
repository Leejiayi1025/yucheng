const { getToken, getUser } = require('./utils/store');

// 主题色板（移植自原型，rpx 化的尺寸在 wxss 中处理）
const THEMES = {
  sage: {
    'bg': '#F5F1EC', 'card': 'rgba(255,255,255,.82)', 'solid': '#FFFFFF',
    'primary': '#6B8E7B', 'primary-soft': '#E1F0E8', 'primary-dark': '#5A7A6A',
    'text': '#3D3D3D', 'text2': '#8E8E93', 'line': 'rgba(60,60,60,.08)',
    'shadow': '0 8rpx 32rpx rgba(60,60,60,.08)', 'danger': '#C25B4E',
    'body-bg': '#E8E0D8', 'tabbar-bg': 'rgba(245,241,236,.92)', 'tabbar-border': 'rgba(60,60,60,.06)'
  },
  dark: {
    'bg': '#0F172A', 'card': 'rgba(30,41,59,.78)', 'solid': '#1E293B',
    'primary': '#6B8E7B', 'primary-soft': '#1E3A30', 'primary-dark': '#5A7A6A',
    'text': '#E2E8F0', 'text2': '#94A3B8', 'line': 'rgba(255,255,255,.10)',
    'shadow': '0 8rpx 32rpx rgba(0,0,0,.35)', 'danger': '#F87171',
    'body-bg': '#020617', 'tabbar-bg': 'rgba(15,23,42,.92)', 'tabbar-border': 'rgba(255,255,255,.06)'
  },
  rose: {
    'bg': '#FFF0F3', 'card': 'rgba(255,255,255,.82)', 'solid': '#FFFFFF',
    'primary': '#C9889B', 'primary-soft': '#FCE4EA', 'primary-dark': '#B06A7E',
    'text': '#3D3D3D', 'text2': '#8E8E93', 'line': 'rgba(60,60,60,.08)',
    'shadow': '0 8rpx 32rpx rgba(180,120,130,.08)', 'danger': '#C44D5A',
    'body-bg': '#F8DDE3', 'tabbar-bg': 'rgba(255,240,243,.92)', 'tabbar-border': 'rgba(60,60,60,.06)'
  },
  neon: {
    'bg': '#111111', 'card': 'rgba(30,30,30,.80)', 'solid': '#1A1A1A',
    'primary': '#B6FF00', 'primary-soft': '#2A3300', 'primary-dark': '#8FCC00',
    'text': '#F5F5F5', 'text2': '#9A9A9A', 'line': 'rgba(255,255,255,.10)',
    'shadow': '0 8rpx 32rpx rgba(182,255,0,.12)', 'danger': '#FF3B30',
    'body-bg': '#000000', 'tabbar-bg': 'rgba(17,17,17,.92)', 'tabbar-border': 'rgba(255,255,255,.08)'
  },
  purple: {
    'bg': '#F3F0F7', 'card': 'rgba(255,255,255,.82)', 'solid': '#FFFFFF',
    'primary': '#8B7EC8', 'primary-soft': '#ECE8F7', 'primary-dark': '#6F63A8',
    'text': '#3D3D3D', 'text2': '#8E8E93', 'line': 'rgba(60,60,60,.08)',
    'shadow': '0 8rpx 32rpx rgba(139,126,200,.08)', 'danger': '#C25B4E',
    'body-bg': '#E5DFF0', 'tabbar-bg': 'rgba(243,240,247,.92)', 'tabbar-border': 'rgba(60,60,60,.06)'
  }
};

App({
  globalData: {
    token: '',
    user: null,
    theme: 'sage',
    themeStyle: ''
  },
  THEMES,
  onLaunch() {
    this.globalData.token = getToken();
    const u = getUser();
    if (u) this.globalData.user = u;
    this.applyTheme(wx.getStorageSync('theme') || 'sage');
  },
  applyTheme(key) {
    const t = THEMES[key] || THEMES.sage;
    const style = Object.keys(t).map(k => `--${k}:${t[k]}`).join(';');
    this.globalData.theme = key;
    this.globalData.themeStyle = style;
    wx.setStorageSync('theme', key);
  },
  setAuth(user, token) {
    this.globalData.user = user;
    this.globalData.token = token;
    const store = require('./utils/store');
    store.setToken(token);
    store.setUser(user);
  },
  clearAuth() {
    this.globalData.user = null;
    this.globalData.token = '';
    const store = require('./utils/store');
    store.clearToken();
    store.clearUser();
  }
});
