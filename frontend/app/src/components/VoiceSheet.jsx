import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import EditSheet from './EditSheet';
import { parseTasks } from '../lib/api';
import { parseLocalMulti } from '../lib/parse';
import * as asr from '../lib/asr';
import { catColor } from '../lib/cats';
import { dateLabel, repeatText, remindText, ymd, pad } from '../lib/date';
import { useApp } from '../store';

const SAMPLES = ['今天下午三点开会', '每天八点健身', '记得买牛奶'];

let seq = 0;
const mkUid = () => 'vt' + ++seq + '_' + Date.now().toString(36);

/** 给解析结果补齐字段 + 稳定的 _uid（key 必须稳定，否则输入时组件会被重建、打不了字） */
function normRow(t) {
  return {
    _uid: mkUid(),
    title: t.title || '新任务',
    date: t.date || ymd(new Date()),
    start: t.start || '',
    end: t.end || '',
    place: t.place || '',
    cat: t.cat || '其他',
    remind: typeof t.remind === 'number' ? t.remind : -1,
    repeatDays: t.repeatDays && t.repeatDays.length ? t.repeatDays : null,
    note: t.note || ''
  };
}

export default function VoiceSheet({ defaultDate, onClose, onAddAll, onUpdate, onDelete }) {
  const { tasks: storeTasks, toast } = useApp();
  const [text, setText] = useState('');
  const [stage, setStage] = useState('idle'); // idle | listening | parsing | ready | immersive
  const [intent, setIntent] = useState('create'); // create | update | delete
  const [tasks, setTasks] = useState([]); // 新建的草稿
  const [changes, setChanges] = useState([]); // 要修改/删除的已有任务
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState('');
  /* 正在编辑哪一条（复用统一的编辑弹层） */
  const [editingUid, setEditingUid] = useState(null);
  /* 环境检测：不支持语音的环境（局域网HTTP/微信webview）点击麦克风时弹出提示 */
  const [envTip, setEnvTip] = useState('');
  const [showEnvDialog, setShowEnvDialog] = useState(false);
  const seqRef = useRef(0);
  const timer = useRef(null);
  const debounce = useRef(null);
  const taRef = useRef(null);
  const touchStartY = useRef(0);
  const [touchY, setTouchY] = useState(0);

  // 下滑关闭手势
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    setTouchY(0);
  };
  const onTouchMove = (e) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setTouchY(deltaY);
    }
  };
  const onTouchEnd = () => {
    if (touchY > 100) {
      onClose();
    }
    setTouchY(0);
  };

  /* 检测当前环境是否允许使用语音功能 */
  useEffect(() => {
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const ua = navigator.userAgent.toLowerCase();

    // 精准识别第三方APP内置webview，避免误判普通浏览器（QQ浏览器、Chrome等）
    // 微信：micromessenger；支付宝：alipay；钉钉：dingtalk；飞书：lark/feishu
    // QQ内置webview：包含 v1_and_sq 或 qq/ 版本标识，排除qq浏览器(mqqbrowser)
    const isThirdPartyWebview =
      /micromessenger|alipayclient|dingtalk|feishu|lark/i.test(ua) ||
      (/qq\//i.test(ua) && !/mqqbrowser/i.test(ua));

    // 本地localhost环境永远允许语音，不做任何拦截
    if (isLocalhost) {
      setEnvTip('');
      return;
    }

    // 不支持语音的场景：HTTP公网/局域网非本地访问 或者 明确的第三方APP内置webview
    if ((!isHTTPS) || isThirdPartyWebview) {
      setEnvTip('当前为内测阶段，语音识别功能仅支持浏览器环境使用。您可以手动输入任务，系统会自动识别时间和内容。');
    } else {
      setEnvTip('');
    }
  }, []);

  /* 点击麦克风按钮时先检测环境 */
  const handleMicClick = () => {
    if (envTip) {
      setShowEnvDialog(true);
      return;
    }
    onMic(true);
  };

  useEffect(
    () => () => {
      asr.stop();
      clearInterval(timer.current);
      clearTimeout(debounce.current);
    },
    []
  );

  /* 录音计时（用户手动结束前一直走） */
  useEffect(() => {
    if (stage !== 'listening') {
      clearInterval(timer.current);
      return;
    }
    setSecs(0);
    timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(timer.current);
  }, [stage]);

  /* 输入框自动增高（最多 3 行左右，再长就内部滚动） */
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);

  /**
   * 解析：解析完成前不显示任何任务，只显示「正在解析」。
   * 后端会先判断意图：新建 → tasks；修改/删除已有任务 → changes。
   */
  /* 过滤无意义的语气词和废话 */
  const filterNoise = (text) => {
    let v = text.trim();
    // 去掉开头结尾的语气词
    v = v.replace(/^(你好|您好|哈喽|嗨|嘿|嗯|呃|那个|这个|就是说|然后|那么|其实|对了|哦|噢|啊|呀|吧|呢|嘛)[，。！？\s]*/gi, '');
    v = v.replace(/[，。！？\s]*(你好|您好|哈喽|嗨|嘿|嗯|呃|那个|这个|就是说|然后|那么|其实|对了|哦|噢|啊|呀|吧|呢|嘛)[。！？\s]*$/gi, '');
    // 去掉重复的无意义词（如"哈喽哈喽"）
    v = v.replace(/^(哈喽|嗨|嘿|你好|您好)[\s\1]+$/i, '');
    return v.trim();
  };

  const runParse = async (value) => {
    let v = String(value || '').trim();
    // 先过滤废话
    v = filterNoise(v);
    if (!v) {
      setTasks([]);
      setChanges([]);
      setStage('idle');
      return;
    }
    setStage('parsing');
    setErr('');
    setTasks([]);
    setChanges([]);
    const my = ++seqRef.current;
    const t0 = Date.now();
    let res = null;
    try {
      res = await parseTasks(v, ymd(new Date()));
    } catch {
      res = null;
    }
    // 「正在解析」至少显示 600ms，避免一闪而过
    const wait = Math.max(0, 600 - (Date.now() - t0));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    if (my !== seqRef.current) return;

    /* ① 修改 / 删除已有任务 */
    if (res && res.intent !== 'create' && res.changes.length) {
      setIntent(res.intent);
      setChanges(res.changes);
      setStage('ready');
      return;
    }
    /* ② 新建任务 */
    if (res && res.tasks.length) {
      setIntent('create');
      setTasks(res.tasks.map(normRow));
      setStage('ready');
      return;
    }
    /* ③ 回落本地规则（只会新建） */
    setIntent('create');
    setTasks(parseLocalMulti(v, new Date()).map(normRow));
    setErr('已用本地规则解析');
    setStage('ready');
  };

  const onMic = (immersive = false) => {
    if (stage === 'listening' || stage === 'immersive') {
      asr.stop(); // 用户手动结束
      setStage('parsing');
      return;
    }
    setErr('');
    if (!asr.supported()) {
      const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      setText(s);
      runParse(s);
      return;
    }
    const ok = asr.start({
      onStart: () => setStage(immersive ? 'immersive' : 'listening'),
      onText: (t) => setText(t),
      onError: (code) => {
        setStage('idle');
        const map = {
          'not-allowed': '麦克风权限被拒绝，请允许后重试',
          'service-not-allowed': '浏览器禁止了语音识别，请检查权限',
          'audio-capture': '未检测到麦克风',
          network: '请检查网络'
        };
        const msg = map[code];
        if (msg) setErr(msg);
        else if (code) setErr('语音识别出错（' + code + '）');
      },
      onEnd: () => {
        setStage((s) => {
          if (s !== 'listening') return s;
          if (!text.trim()) {
            setErr('没有听清，请重试');
            return 'idle';
          }
          return 'parsing';
        });
      }
    });
    if (!ok) setErr('无法启动语音识别');
  };

  /* 录音结束后进入解析 */
  useEffect(() => {
    if (stage !== 'parsing') return;
    const v = text.trim();
    if (!v) {
      setStage('idle');
      return;
    }
    runParse(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const patchBy = (u, obj) =>
    setTasks((prev) => prev.map((x) => (x._uid === u ? { ...x, ...obj } : x)));
  const removeBy = (u) => setTasks((prev) => prev.filter((x) => x._uid !== u));
  const pickSample = (s) => {
    setText(s);
    runParse(s);
  };

  const metaText = (t) => {
    const p = [t.date === ymd(new Date()) ? '今天' : dateLabel(t.date)];
    if (t.start) p.push(t.start + (t.end ? '-' + t.end : ''));
    if (t.place) p.push(t.place);
    if (t.repeatDays && t.repeatDays.length) p.push(repeatText(t.repeatDays));
    if (t.remind >= 0) p.push(remindText(t.remind));
    p.push(t.cat);
    return p.join(' · ');
  };

  const cardNode = (t) => (
    <div className="vs-item" key={t._uid}>
      <button className="vs-item-main" onClick={() => setEditingUid(t._uid)}>
        <span className="vs-item-dot" style={{ background: catColor(t.cat).fg }} />
        <span className="vs-item-txt">
          <span className="vs-item-title">{t.title || '未命名'}</span>
          <span className="vs-item-meta">{metaText(t)}</span>
        </span>
      </button>
      <button className="vs-item-del" onClick={() => removeBy(t._uid)} aria-label="删除这条">
        <Icon name="close" size={15} />
      </button>
    </div>
  );

  const events = tasks.filter((t) => !!t.start);
  const todos = tasks.filter((t) => !t.start);

  const submit = () => {
    onAddAll(
      tasks.map((t) => ({
        title: t.title.trim() || '新任务',
        date: t.date,
        start: t.start,
        end: t.end,
        place: t.place,
        cat: t.cat,
        remind: t.start ? t.remind : -1,
        repeatDays: t.repeatDays,
        note: t.note,
        type: t.start ? 'event' : 'todo'
      }))
    );
  };

  /* ---------- 修改 / 删除已有任务 ---------- */
  const taskLine = (t) => {
    if (!t) return '';
    const d = t.date === ymd(new Date()) ? '今天' : dateLabel(t.date);
    return t.start ? d + ' ' + t.start + (t.end ? '-' + t.end : '') : d + ' · 待办';
  };

  /* 改动卡：显示「原来 → 改成」 */
  const changeNode = (ch) => {
    const before = storeTasks.find((t) => String(t.id) === String(ch.id));
    if (intent === 'delete') {
      return (
        <div className="vs-change del" key={ch.id}>
          <div className="vs-change-title">{ch.title}</div>
          {before && <div className="vs-change-line">{taskLine(before)}</div>}
        </div>
      );
    }
    const after = before ? { ...before, ...ch.patch } : null;
    return (
      <div className="vs-change" key={ch.id}>
        <div className="vs-change-title">{(after && after.title) || ch.title}</div>
        {before && <div className="vs-change-line">{taskLine(before)}</div>}
        {after && (
          <div className="vs-change-line to">
            <span className="vs-change-arrow">↓</span>
            {taskLine(after)}
          </div>
        )}
      </div>
    );
  };

  const applyChanges = async () => {
    const n = changes.length;
    for (const ch of changes) {
      if (intent === 'delete') {
        if (onDelete) await onDelete(ch.id);
      } else if (onUpdate) {
        await onUpdate(ch.id, ch.patch);
      }
    }
    toast((intent === 'delete' ? '已删除 ' : '已修改 ') + n + ' 条');
    onClose();
  };

  const editing = editingUid ? tasks.find((t) => t._uid === editingUid) : null;
  const listening = stage === 'listening';

  return (
    <div className="voice-modal show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {stage === 'immersive' ? (
        /* 沉浸式全屏聆听界面 */
        <div className="vs-immersive">
          <div className="vs-immersive-bg" />
          <button className="vs-immersive-close" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={20} />
          </button>
          <div className="vs-immersive-status">
            <span className="vs-live-dot" />
            正在聆听
          </div>
          <textarea
            className="vs-immersive-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="说点什么…"
            rows={4}
          />
          <div className="vs-immersive-mic-wrap">
            <div className="vs-immersive-ring" />
            <div className="vs-immersive-ring2" />
            <div className="vs-immersive-mic">
              <Icon name="mic" size={32} />
            </div>
          </div>
          <div className="vs-immersive-actions">
            <button className="vs-immersive-btn cancel" onClick={onClose}>
              <Icon name="close" size={18} />
              取消
            </button>
            <button className="vs-immersive-btn done" onClick={onMic}>
              <Icon name="check" size={18} />
              完成
            </button>
          </div>
        </div>
      ) : (
      <div 
        className="vs-card"
        style={{
          transform: touchY > 0 ? `translateY(${touchY}px)` : 'none',
          transition: touchY === 0 ? 'transform 0.2s ease' : 'none'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="vs-grab" />

        {/* 标题栏 */}
        <div className="vs-head">
          <div className="vs-title">语音添加</div>
          <button className="vs-close" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="vs-body">
          {stage === 'parsing' ? (
            <div className="vs-loading">
              <span className="vm-spin" />
              正在解析…
            </div>
          ) : changes.length > 0 ? (
            <>
              <div className="vs-sec">
                {intent === 'delete' ? '要删除的任务' : '要修改的任务'} <span>{changes.length}</span>
              </div>
              {changes.map(changeNode)}
              <button
                className={'vs-add' + (intent === 'delete' ? ' danger' : '')}
                onClick={applyChanges}
              >
                {intent === 'delete'
                  ? '确认删除（' + changes.length + '）'
                  : '应用修改（' + changes.length + '）'}
              </button>
            </>
          ) : tasks.length > 0 ? (
            <>
              {events.length > 0 && (
                <>
                  <div className="vs-sec">
                    今日安排 <span>{events.length}</span>
                  </div>
                  {events.map(cardNode)}
                </>
              )}
              {todos.length > 0 && (
                <>
                  <div className="vs-sec">
                    待办清单 <span>{todos.length}</span>
                  </div>
                  {todos.map(cardNode)}
                </>
              )}
              <button className="vs-add" onClick={submit}>
                全部添加（{tasks.length}）
              </button>
            </>
          ) : (
            <div className="vs-empty">
              <button className="vs-empty-icon" onClick={handleMicClick} aria-label="开始录音">
                <Icon name="mic" size={36} />
              </button>
              <div className="vs-empty-title">说出你的安排</div>
              <div className="vs-empty-sub">点击麦克风，直接说话</div>
              <div className="vs-chips">
                {SAMPLES.map((s, i) => (
                  <button key={i} className="vs-chip" onClick={() => pickSample(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {err && <div className="vs-err">{err}</div>}
        </div>

        {/* 录音状态 */}
        {listening && (
          <div className="vs-live">
            <span className="vs-live-dot" />
            正在聆听 {pad(Math.floor(secs / 60))}:{pad(secs % 60)} · 点击结束
          </div>
        )}

        {/* 底部输入栏 */}
        <div className="vs-foot">
          <textarea
            ref={taRef}
            className="vs-input"
            value={text}
            rows={1}
            placeholder="说点什么…"
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              clearTimeout(debounce.current);
              debounce.current = setTimeout(() => {
                if (v.trim()) runParse(v);
              }, 900);
            }}
          />
          {text && (
            <button
              className="vs-clear"
              onClick={() => setText('')}
              aria-label="清空"
            >
              <Icon name="close" size={16} />
            </button>
          )}
          {stage === 'ready' && (
            <button
              className="vs-mic-small"
              onClick={handleMicClick}
              aria-label="语音修改"
              title="语音修改"
            >
              <Icon name="mic" size={18} />
            </button>
          )}
        </div>
      </div>
      )}

      {/* 编辑某一条：复用统一编辑弹层，保证跟今日页一致 */}
      {editing && (
        <div className="voice-edit-layer">
          <EditSheet
            task={editing}
            type={editing.start ? 'event' : 'todo'}
            defaultDate={editing.date || defaultDate}
            onClose={() => setEditingUid(null)}
            onSave={(payload) => {
              patchBy(editing._uid, payload);
              setEditingUid(null);
            }}
            onDelete={() => {
              removeBy(editing._uid);
              setEditingUid(null);
            }}
          />
        </div>
      )}

      {/* 环境提示弹窗：系统风格 */}
      {showEnvDialog && (
        <div className="vs-env-overlay" onClick={() => setShowEnvDialog(false)}>
          <div className="vs-env-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="vs-env-icon">
              <Icon name="mic" size={28} />
            </div>
            <div className="vs-env-title">语音输入暂不可用</div>
            <div className="vs-env-desc">当前为内测阶段，语音识别仅支持浏览器环境。您可以手动输入任务，或复制链接到浏览器使用语音。</div>
            <button className="vs-env-btn" onClick={() => {
              // 兼容HTTP环境的复制方法
              const textArea = document.createElement('textarea');
              textArea.value = window.location.href;
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                const btn = document.querySelector('.vs-env-btn');
                if (btn) {
                  btn.textContent = '链接已复制，请打开浏览器粘贴';
                  btn.style.background = '#2ecc71';
                  btn.style.color = '#fff';
                  btn.disabled = true;
                  setTimeout(() => {
                    setShowEnvDialog(false);
                  }, 2000);
                }
              } catch (e) {
                prompt('请手动复制链接：', window.location.href);
              }
              document.body.removeChild(textArea);
            }}>
              复制链接，去浏览器打开
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
