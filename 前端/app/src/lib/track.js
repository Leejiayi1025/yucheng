// 数据埋点：上报用户行为事件到后端
// 用法：track('task_add', { method: 'voice', type: 'event' })

const API_BASE = '/api';

export async function track(eventName, eventData = {}, page = '') {
  try {
    await fetch(API_BASE + '/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (localStorage.getItem('yucheng_token') || '')
      },
      body: JSON.stringify({
        event_name: eventName,
        event_data: eventData,
        page: page || (location.hash || '').replace('#/', '') || 'unknown'
      })
    });
  } catch {
    // 埋点失败不影响用户体验，静默忽略
  }
}
