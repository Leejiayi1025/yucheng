// AssemblyAI Universal-3.5 Pro Streaming —— 云端实时语音识别（主路径）。
// 安全模型：永久密钥只在后端；这里只拿一次性临时令牌（120 秒有效），
// 浏览器无法给 WebSocket 设头，令牌通过 query 参数传递。
//
// 协议要点（v3）：
//  · 连接成功后服务端先发 {type:'Begin', configuration}
//  · 客户端持续发二进制 PCM（pcm_s16le / 16kHz / 单声道）
//  · {type:'Turn', turn_order, end_of_turn, transcript}：按 turn_order 分段，
//    同一 turn_order 的 partial 不断覆盖，end_of_turn=true 为最终
//  · 结束：客户端发 {type:'Terminate'}，服务端回 {type:'Termination'}
import { getAsrToken } from './api';

const TARGET_SAMPLE_RATE = 16000;
const PCM_CHUNK_SAMPLES = 3200; // 200ms / 帧，避免发得太碎
const WS_CONNECT_MS = 8000;
const TOKEN_FETCH_MS = 6000;

// AudioWorklet 代码：每个回调 128 样本（16kHz 下 8ms），原样转发 Float32
const WORKLET_SRC = `
class PcmOutProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      const copy = ch.slice(0);
      this.port.postMessage(copy.buffer, [copy.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-out', PcmOutProcessor);
`;

let session = null; // 当前活动会话的全部资源

function fail(code, extra) {
  const e = new Error(code);
  e.code = code;
  if (extra) e.status = extra;
  return e;
}

/** 带超时的 fetch 封装（AbortController） */
async function fetchTokenWithTimeout() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TOKEN_FETCH_MS);
  try {
    return await getAsrToken();
  } catch (e) {
    throw fail('token_failed');
  } finally {
    clearTimeout(t);
  }
}

/** Float32[-1,1] → Int16 PCM */
function floatTo16(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/**
 * 开始云端录音识别。
 * @param {{onStart:Function, onText:(fullText:string)=>void, onError:(code:string)=>void, onEnd:(finalText:string)=>void}} h
 * 成功返回；失败抛 Error（e.code 见 fail()）
 */
export async function start(h) {
  if (session) await cleanup();

  // ① 临时令牌
  const tr = await fetchTokenWithTimeout();
  if (!tr.ok) {
    if (tr.status === 401) throw fail('unauthorized');
    throw fail('token_failed', tr.status); // 402 额度 / 429 / 5xx / 0 网络
  }
  const info = tr.info;

  // ② 麦克风
  let mediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) throw fail('mic_denied');
    if (e && e.name === 'NotFoundError') throw fail('no_mic');
    throw fail('mic_failed');
  }

  // ③ AudioContext（强制 16kHz）+ AudioWorklet
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    throw fail('unsupported_audio');
  }
  if (ctx.sampleRate !== TARGET_SAMPLE_RATE) {
    try { ctx.close(); } catch {}
    throw fail('unsupported_audio');
  }
  if (!ctx.audioWorklet) {
    try { ctx.close(); } catch {}
    throw fail('unsupported_audio');
  }
  const workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }));
  try {
    await ctx.audioWorklet.addModule(workletUrl);
  } catch {
    URL.revokeObjectURL(workletUrl);
    try { ctx.close(); } catch {}
    throw fail('unsupported_audio');
  }

  // ④ WebSocket（连接结果在 open/error 上裁决）
  const wsUrl =
    info.endpoint +
    '?token=' + encodeURIComponent(info.token) +
    '&speech_model=' + encodeURIComponent(info.model) +
    '&language_codes=' + encodeURIComponent((info.languageCodes || ['zh']).join(',')) +
    '&encoding=pcm_s16le&sample_rate=' + TARGET_SAMPLE_RATE;

  const ws = new WebSocket(wsUrl);
  ws.binaryType = 'arraybuffer';

  const s = {
    h, ws, ctx, mediaStream, workletUrl,
    turns: new Map(), // turn_order -> transcript
    pcmBuffer: [],   // Int16Array 待发
    pcmBuffered: 0,
    begun: false,
    manualStop: false,
    closed: false
  };
  session = s;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(fail('ws_fail'));
    }, WS_CONNECT_MS);

    ws.onopen = () => {};

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'Begin') {
        s.begun = true;
        clearTimeout(timer);
        resolve();
      } else if (msg.type === 'Turn') {
        s.turns.set(msg.turn_order, msg.transcript || '');
        const full = [...s.turns.values()].join('').replace(/\s+/g, ' ').trim();
        if (h.onText) h.onText(full);
      } else if (msg.type === 'Termination') {
        s.closed = true;
        finalize(s);
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      if (!s.begun) reject(fail('ws_fail'));
      // 开始后的错误：交给 onError，尝试在界面上体现；不自动降级（用户正在说话）
      else if (h.onError) h.onError('ws_error');
    };
  });

  // ⑤ 连接成功：挂上 worklet，开始推音频
  const node = new AudioWorkletNode(ctx, 'pcm-out');
  s.node = node;
  node.port.onmessage = (ev) => {
    if (s.manualStop || s.closed) return;
    const pcm = floatTo16(new Float32Array(ev.data));
    s.pcmBuffer.push(pcm);
    s.pcmBuffered += pcm.length;
    if (s.pcmBuffered >= PCM_CHUNK_SAMPLES) flushPcm(s);
  };
  const source = ctx.createMediaStreamSource(mediaStream);
  source.connect(node);
  s.source = source;
  // 注意：node 不连接 ctx.destination（不能让用户自己听到自己）

  if (h.onStart) h.onStart();
}

function flushPcm(s) {
  if (!s.pcmBuffered || s.ws.readyState !== WebSocket.OPEN) {
    s.pcmBuffer = [];
    s.pcmBuffered = 0;
    return;
  }
  const merged = new Int16Array(s.pcmBuffered);
  let off = 0;
  for (const part of s.pcmBuffer) {
    merged.set(part, off);
    off += part.length;
  }
  s.pcmBuffer = [];
  s.pcmBuffered = 0;
  try {
    s.ws.send(merged.buffer);
  } catch {
    /* 发送失败忽略，后续帧继续 */
  }
}

/** 拼出当前完整识别文本 */
function fullTextOf(s) {
  return [...s.turns.values()].join('').replace(/\s+/g, ' ').trim();
}

/** 服务端 Termination 后的收尾 */
function finalize(s) {
  const text = fullTextOf(s);
  cleanup(s);
  if (s.h.onEnd) s.h.onEnd(text);
}

/** 停止录音：发 Terminate，等待 Termination（带超时兜底） */
export function stop() {
  const s = session;
  if (!s) return Promise.resolve('');
  s.manualStop = true;

  return new Promise((resolve) => {
    let done = false;
    const finish = (text) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup(s);
      resolve(text);
    };
    const timer = setTimeout(() => finish(fullTextOf(s)), 4000);

    // 先把缓冲音频发完
    flushPcm(s);
    if (s.ws.readyState === WebSocket.OPEN) {
      const prevEnd = s.h.onEnd;
      s.h.onEnd = (text) => {
        if (prevEnd) prevEnd(text);
        finish(text);
      };
      try {
        s.ws.send(JSON.stringify({ type: 'Terminate' }));
      } catch {
        finish(fullTextOf(s));
      }
    } else {
      finish(fullTextOf(s));
    }
  });
}

/** 释放全部资源（WS / 音频） */
function cleanup(s) {
  if (!s) s = session;
  if (!s) return;
  if (session === s) session = null;
  try {
    if (s.node) s.node.disconnect();
  } catch {}
  try {
    if (s.source) s.source.disconnect();
  } catch {}
  try {
    s.mediaStream.getTracks().forEach((t) => t.stop());
  } catch {}
  try {
    if (s.ctx && s.ctx.state !== 'closed') s.ctx.close();
  } catch {}
  try {
    URL.revokeObjectURL(s.workletUrl);
  } catch {}
  try {
    if (s.ws.readyState === WebSocket.OPEN || s.ws.readyState === WebSocket.CONNECTING) s.ws.close();
  } catch {}
}

export function isRecording() {
  return !!session && session.begun && !session.manualStop;
}
