// 统一「北京时间」工具：中国大陆全境为 UTC+8 且无夏令时，固定偏移即可。
// 后端容器（Railway 等）默认时区多为 UTC，直接 new Date().getHours() 会差 8 小时；
// 北京时间凌晨 0~8 点时 UTC 仍停在前一天，连日期都会错一天。
// 因此所有「取当前时间 / 今天日期」的业务逻辑必须走本模块，不依赖服务器 TZ 配置。

const CN_OFFSET_MS = 8 * 60 * 60 * 1000;

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * 当前（或指定 UTC 毫秒时刻）对应的「北京时间 Date」。
 * 返回值用 getUTC* 系列方法读取，即为北京时间字段。
 * @param {number} [utcMs] 任意时刻的 UTC 毫秒数，默认当前
 */
function cnNow(utcMs) {
  return new Date((utcMs == null ? Date.now() : utcMs) + CN_OFFSET_MS);
}

/** 北京时间 YYYY-MM-DD；不传参取当前，传入 cnNow 产物则读其北京日期 */
function cnYmd(d) {
  const x = d || cnNow();
  return x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate());
}

/** 北京时间 HH:MM */
function cnHM(d) {
  const x = d || cnNow();
  return pad(x.getUTCHours()) + ':' + pad(x.getUTCMinutes());
}

/** 北京小时（0~23） */
function cnHour(d) {
  return (d || cnNow()).getUTCHours();
}

module.exports = { cnNow, cnYmd, cnHM, cnHour, CN_OFFSET_MS };
