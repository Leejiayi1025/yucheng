// 浏览器原生语音识别（Web Speech API）：免费、无需 key
// 关键设计：continuous = true + 意外结束时自动续听，
// 因此「什么时候结束」完全由用户点按钮决定（不会因停顿自动停）。
export function supported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

let rec = null;
let manualStop = false;
let handlers = null;
let restarting = false;
// 跨「续听」会话累积已经确认的文字（continuous 重启后 results 会重置，必须自己攒）
let committed = '';

function create() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'zh-CN';
  r.interimResults = true;
  r.continuous = true; // 一直听，直到用户手动结束
  r.maxAlternatives = 1;
  let sessionFinal = ''; // 本次会话内已确认的部分

  r.onstart = () => {
    restarting = false;
    if (handlers && handlers.onStart) handlers.onStart();
  };

  r.onresult = (ev) => {
    // 关键：从 0 开始遍历（不是 resultIndex），否则每次只拿到最新一段、前面的会被丢掉
    let sFinal = '';
    let interim = '';
    for (let i = 0; i < ev.results.length; i++) {
      const res = ev.results[i];
      const txt = res[0] ? res[0].transcript : '';
      if (res.isFinal) sFinal += txt;
      else interim += txt;
    }
    sessionFinal = sFinal;
    const full = (committed + sFinal + interim).replace(/\s+/g, ' ').trim();
    if (full && handlers && handlers.onText) handlers.onText(full, !!sFinal && !interim);
  };

  r.onerror = (ev) => {
    const code = (ev && ev.error) || 'unknown';
    // aborted 是用户主动停止的正常情况
    if (code === 'aborted') return;
    if (code === 'no-speech') return; // 没说话不算错误，续听即可
    if (handlers && handlers.onError) handlers.onError(code);
  };

  r.onend = () => {
    // 把本次会话已确认的文字并入累积区，避免重启后丢失
    committed = (committed + sessionFinal).replace(/\s+/g, ' ').trim();
    sessionFinal = '';

    // 用户没点结束、也不是错误 → 自动续听（保证「手动结束」的语义）
    if (!manualStop && !restarting) {
      restarting = true;
      try {
        r.start();
      } catch {
        restarting = false;
        if (handlers && handlers.onEnd) handlers.onEnd();
      }
      return;
    }
    if (handlers && handlers.onEnd) handlers.onEnd();
  };

  return r;
}

/** 开始录音；返回是否成功启动（不支持/失败返回 false） */
export function start(h) {
  if (!supported()) return false;
  handlers = h;
  manualStop = false;
  committed = ''; // 新一轮录音从零开始
  if (rec) {
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
  }
  rec = create();
  if (!rec) return false;
  try {
    rec.start();
    return true;
  } catch {
    // 极少数情况下实例处于异常态，重建一次
    try {
      rec = create();
      rec.start();
      return true;
    } catch {
      return false;
    }
  }
}

/** 用户手动结束录音 */
export function stop() {
  manualStop = true;
  restarting = false;
  if (rec) {
    try {
      rec.stop();
    } catch {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
  }
}

export function isRecording() {
  return !!rec && !manualStop;
}
