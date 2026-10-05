const TOKEN_KEY = 'yc_token';
const USER_KEY = 'yc_user';

function getToken() { return wx.getStorageSync(TOKEN_KEY) || ''; }
function setToken(t) { wx.setStorageSync(TOKEN_KEY, t); }
function clearToken() { wx.removeStorageSync(TOKEN_KEY); }
function getUser() { return wx.getStorageSync(USER_KEY) || null; }
function setUser(u) { wx.setStorageSync(USER_KEY, u); }
function clearUser() { wx.removeStorageSync(USER_KEY); }

module.exports = { getToken, setToken, clearToken, getUser, setUser, clearUser };
