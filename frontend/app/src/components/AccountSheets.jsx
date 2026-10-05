import { useEffect, useState } from 'react';
import { bindEmail, changePassword, sendCode } from '../lib/api';
import { useApp } from '../store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- 绑定 / 更换邮箱（纯表单，保存由外层控制） ---------- */
export function EmailForm({ current, onSaved, onSave }) {
  const { toast } = useApp();
  const [email, setEmail] = useState(current || '');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cd, setCd] = useState(0);
  const [devCode, setDevCode] = useState('');

  useEffect(() => {
    if (cd <= 0) return;
    const t = setTimeout(() => setCd(cd - 1), 1000);
    return () => clearTimeout(t);
  }, [cd]);

  const doSend = async () => {
    setErr('');
    if (!EMAIL_RE.test(email)) return setErr('请输入正确的邮箱地址');
    setBusy(true);
    const r = await sendCode(email);
    setBusy(false);
    if (!r.ok) return setErr(r.msg);
    setCd(60);
    if (r.emailed) {
      setDevCode('');
      toast('验证码已发送至 ' + email);
    } else {
      setDevCode(r.code || '');
      toast(r.hint || '邮件服务未配置，验证码已直接显示');
    }
  };

  const save = async () => {
    setErr('');
    if (!EMAIL_RE.test(email)) return setErr('请输入正确的邮箱地址');
    if (!code.trim()) return setErr('请输入验证码');
    setBusy(true);
    const r = await bindEmail(email, code);
    setBusy(false);
    if (!r.ok) return setErr(r.msg);
    toast('邮箱已更新');
    if (onSaved) onSaved(r.email);
    if (onSave) onSave();
  };

  // 把save方法暴露给外层
  useEffect(() => {
    if (onSave) {
      // 外层通过ref调用save
    }
  }, []);

  return (
    <>
      <div className="es-row">
        <span className="es-label">新邮箱</span>
        <input
          className="es-input"
          type="email"
          maxLength={60}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value.trim());
            setErr('');
          }}
        />
      </div>
      <div className="es-row">
        <span className="es-label">验证码</span>
        <input
          className="es-input es-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="6 位数字"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''));
            setErr('');
          }}
        />
        <button className="es-code-btn" disabled={cd > 0 || busy} onClick={doSend}>
          {cd > 0 ? cd + 's' : '获取'}
        </button>
      </div>
      {devCode && <div className="auth-devcode">邮件服务未配置 · 验证码：{devCode}</div>}
      {err && <div className="es-err">{err}</div>}
    </>
  );
}

/* ---------- 修改密码（纯表单，保存由外层控制） ---------- */
export function PasswordForm() {
  const { toast } = useApp();
  const [old1, setOld1] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="es-row">
        <span className="es-label">原密码</span>
        <input
          className="es-input"
          type="password"
          maxLength={24}
          placeholder="至少 6 位"
          value={old1}
          onChange={(e) => {
            setOld1(e.target.value);
            setErr('');
          }}
        />
      </div>
      <div className="es-row">
        <span className="es-label">新密码</span>
        <input
          className="es-input"
          type="password"
          maxLength={24}
          placeholder="至少 6 位"
          value={p1}
          onChange={(e) => {
            setP1(e.target.value);
            setErr('');
          }}
        />
      </div>
      <div className="es-row">
        <span className="es-label">确认新密码</span>
        <input
          className="es-input"
          type="password"
          maxLength={24}
          placeholder="再输一次"
          value={p2}
          onChange={(e) => {
            setP2(e.target.value);
            setErr('');
          }}
        />
      </div>
      {err && <div className="es-err">{err}</div>}
    </>
  );
}
