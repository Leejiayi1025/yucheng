const { getToken, clearToken } = require('./store');

// 后端地址：开发阶段用 http + 微信开发者工具「不校验合法域名」；
// 真机/生产需改为 https 域名并在小程序后台配置 request 合法域名。
const BASE = 'http://localhost:4000/api';

function request(path, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE + path,
      method: method || 'GET',
      data: data || {},
      header: {
        'Authorization': 'Bearer ' + getToken(),
        'content-type': 'application/json'
      },
      success(res) {
        if (res.statusCode === 401) {
          clearToken();
          wx.reLaunch({ url: '/pages/login/login' });
          reject(res.data);
          return;
        }
        resolve(res.data);
      },
      fail(err) { reject(err); }
    });
  });
}

module.exports = { request, BASE };
