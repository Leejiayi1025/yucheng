const { request } = require('./request');

const api = {
  // 鉴权
  register: (phone, password, nickname) => request('/auth/register', 'POST', { phone, password, nickname }),
  login: (phone, password) => request('/auth/login', 'POST', { phone, password }),
  me: () => request('/auth/me', 'GET'),

  // 任务
  getTasks: (date) => request('/tasks?date=' + date, 'GET'),
  getTasksRange: (start, end) => request('/tasks/range?start=' + start + '&end=' + end, 'GET'),
  createTask: (data) => request('/tasks', 'POST', data),
  updateTask: (id, data) => request('/tasks/' + id, 'PUT', data),
  deleteTask: (id) => request('/tasks/' + id, 'DELETE'),

  // 分类
  getCategories: () => request('/categories', 'GET'),
  createCategory: (name, color) => request('/categories', 'POST', { name, color }),
  deleteCategory: (name) => request('/categories/' + encodeURIComponent(name), 'DELETE'),

  // 语音解析
  parseVoice: (text) => request('/voice/parse', 'POST', { text })
};

module.exports = api;
