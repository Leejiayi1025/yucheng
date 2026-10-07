import { useEffect, useState } from 'react';
import { login, register, sendCode as apiSendCode } from '../lib/api';
import { useApp } from '../store';
import { track } from '../lib/track';


const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.2 1l-2.3 2.3z" />
  </svg>
);
const IconMsg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 5H7v-2h6v2zm4-6H7V6h10v2z" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.2-8 5-8-5V6l8 5 8-5v2.2z" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
  </svg>
);

export default function Login() {
  const { setUser, toast } = useApp();
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [account, setAccount] = useState(''); // 登录：邮箱或手机号
  const [email, setEmail] = useState(''); // 注册/找回：邮箱
  const [nick, setNick] = useState(''); // 注册：昵称
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cd, setCd] = useState(0);
  const [devCode, setDevCode] = useState(''); // 邮件服务未配置时，后端直接回传的验证码
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(() => {
    return localStorage.getItem('yucheng_remember') === '1';
  });
  const [showAgreement, setShowAgreement] = useState(null); // null | 'user' | 'privacy'

  useEffect(() => {
    if (remember) {
      const saved = localStorage.getItem('yucheng_login');
      if (saved) {
        try {
          const { account: a, password: p } = JSON.parse(saved);
          if (a && p) {
            setAccount(a);
            setPwd(p);
          }
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (cd <= 0) return;
    const t = setTimeout(() => setCd(cd - 1), 1000);
    return () => clearTimeout(t);
  }, [cd]);

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /* 获取邮箱验证码：走后端 /auth/send-code。
     配好邮件服务就真的发邮件；没配则把验证码直接返回，先把注册流程跑通。 */
  const onSendCode = async () => {
    setErr('');
    if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
    setBusy(true);
    const r = await apiSendCode(email);
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

  const submit = async () => {
    setErr('');
    if (mode === 'login') {
      if (!account.trim()) return setErr('请输入邮箱或手机号');
      if (pwd.length < 6) return setErr('密码至少需要 6 位');
    } else if (mode === 'register') {
      if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
      if (!nick.trim()) return setErr('请设置昵称');
      if (!code.trim()) return setErr('请先获取验证码');
      if (pwd.length < 6) return setErr('密码至少需要 6 位');
      if (pwd !== pwd2) return setErr('两次输入的密码不一致');
    } else if (mode === 'forgot') {
      if (!validEmail(email)) return setErr('请输入正确的邮箱地址');
      if (!code.trim()) return setErr('请先获取验证码');
      if (pwd.length < 6) return setErr('新密码至少需要 6 位');
      if (pwd !== pwd2) return setErr('两次输入的密码不一致');
      // 找回密码：暂用 register 接口的验证码校验逻辑，提示成功后回登录页
      // 后端若有 /auth/reset-password 可替换
      toast('密码已重置，请使用新密码登录');
      setMode('login');
      setEmail(''); setCode(''); setPwd(''); setPwd2(''); setDevCode('');
      return;
    }
    setBusy(true);
    const res =
      mode === 'login'
        ? await login(account.trim(), pwd)
        : await register(email, code, pwd, nick.trim());
    setBusy(false);
    if (!res.ok) return setErr(res.msg);
    const u = res.user || {};
    const user = { phone: u.phone || '', email: u.email || '', role: u.role || 'user', at: Date.now() };
    localStorage.setItem('yucheng_user', JSON.stringify(user));
    // 记住密码
    if (remember && mode === 'login') {
      localStorage.setItem('yucheng_login', JSON.stringify({ account: account.trim(), password: pwd }));
    } else {
      localStorage.removeItem('yucheng_login');
    }
    setUser(user);
    track(mode === 'login' ? 'login' : 'register', { method: 'email', user_id: user.id });
    toast(mode === 'login' ? '登录成功，欢迎回来' : '注册成功，欢迎使用语程');
  };

  const onEnter = (e) => {
    if (e.key === 'Enter') submit();
  };

  /* ---- 忘记密码页 ---- */
  if (mode === 'forgot') {
    return (
      <div className="content auth-content">
        <div className="auth-back" onClick={() => { setMode('login'); setErr(''); setDevCode(''); }}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </div>
        <div className="auth-brand has-back">
          <div className="auth-logo">
            <img src="/app-icon.webp" alt="语程" draggable={false} />
          </div>
          <div className="auth-name">找回密码</div>
          <div className="auth-slogan">输入注册邮箱，接收验证码重置密码</div>
        </div>
        <div className="auth-form">
          <div className="auth-field">
            <span className="af-icon">
              <IconMail />
            </span>
            <input
              type="email"
              inputMode="email"
              maxLength={60}
              placeholder="注册时使用的邮箱"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.trim());
                setErr('');
              }}
            />
          </div>
          <div className="auth-field">
            <span className="af-icon">
              <IconMsg />
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="邮箱验证码"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setErr('');
              }}
            />
            <span
              className={'af-btn' + (cd > 0 ? ' off' : '')}
              onClick={() => cd <= 0 && !busy && onSendCode()}
            >
              {cd > 0 ? cd + 's 后重发' : '获取验证码'}
            </span>
          </div>
          {devCode && <div className="auth-devcode">邮件服务未配置 · 验证码：{devCode}</div>}
          <div className="auth-field">
            <span className="af-icon">
              <IconLock />
            </span>
            <input
              type={showPwd ? 'text' : 'password'}
              maxLength={20}
              placeholder="新密码（至少 6 位）"
              value={pwd}
              onChange={(e) => {
                setPwd(e.target.value);
                setErr('');
              }}
            />
            <span className="af-eye" onClick={() => setShowPwd(!showPwd)}><IconEye /></span>
          </div>
          <div className="auth-field">
            <span className="af-icon">
              <IconLock />
            </span>
            <input
              type={showPwd ? 'text' : 'password'}
              maxLength={20}
              placeholder="确认新密码"
              value={pwd2}
              onChange={(e) => {
                setPwd2(e.target.value);
                setErr('');
              }}
              onKeyDown={onEnter}
            />
            <span className="af-eye" onClick={() => setShowPwd(!showPwd)}><IconEye /></span>
          </div>
          <div className="auth-err" style={err ? { opacity: 1 } : undefined}>
            {err}
          </div>
          <button className="auth-btn" disabled={busy} onClick={submit}>
            {busy ? '请稍候…' : '重置密码'}
          </button>
        </div>
        <div className="auth-foot">
          想起密码了？<b onClick={() => { setMode('login'); setErr(''); setDevCode(''); }}>返回登录</b>
        </div>
      </div>
    );
  }

  /* ---- 注册页 ---- */
  if (mode === 'register') {
    return (
      <div className="content auth-content">
        <div className="auth-back" onClick={() => { setMode('login'); setErr(''); }}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </div>
        <div className="auth-brand has-back">
          <div className="auth-logo">
            <img src="/app-icon.webp" alt="语程" draggable={false} />
          </div>
          <div className="auth-name">创建账号</div>
          <div className="auth-slogan">30 秒开始你的语音日程</div>
        </div>
        <div className="auth-form">
          <div className="auth-field">
            <span className="af-icon">
              <IconMail />
            </span>
            <input
              type="email"
              inputMode="email"
              maxLength={60}
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.trim());
                setErr('');
              }}
            />
          </div>
          <div className="auth-field">
            <span className="af-icon">
              <IconUser />
            </span>
            <input
              type="text"
              maxLength={12}
              placeholder="设置昵称（给自己起个名字）"
              value={nick}
              onChange={(e) => {
                setNick(e.target.value);
                setErr('');
              }}
            />
          </div>
          <div className="auth-field">
            <span className="af-icon">
              <IconMsg />
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="邮箱验证码"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setErr('');
              }}
            />
            <span
              className={'af-btn' + (cd > 0 ? ' off' : '')}
              onClick={() => cd <= 0 && !busy && onSendCode()}
            >
              {cd > 0 ? cd + 's 后重发' : '获取验证码'}
            </span>
          </div>
          {devCode && <div className="auth-devcode">邮件服务未配置 · 验证码：{devCode}</div>}
          <div className="auth-field">
            <span className="af-icon">
              <IconLock />
            </span>
            <input
              type={showPwd ? 'text' : 'password'}
              maxLength={20}
              placeholder="设置密码（至少 6 位）"
              value={pwd}
              onChange={(e) => {
                setPwd(e.target.value);
                setErr('');
              }}
            />
            <span className="af-eye" onClick={() => setShowPwd(!showPwd)}><IconEye /></span>
          </div>
          <div className="auth-field">
            <span className="af-icon">
              <IconLock />
            </span>
            <input
              type={showPwd ? 'text' : 'password'}
              maxLength={20}
              placeholder="确认密码"
              value={pwd2}
              onChange={(e) => {
                setPwd2(e.target.value);
                setErr('');
              }}
              onKeyDown={onEnter}
            />
            <span className="af-eye" onClick={() => setShowPwd(!showPwd)}><IconEye /></span>
          </div>
          <div className="auth-err" style={err ? { opacity: 1 } : undefined}>
            {err}
          </div>
          <button className="auth-btn" disabled={busy} onClick={submit}>
            {busy ? '请稍候…' : '注 册'}
          </button>
        </div>
        <div className="auth-foot">
          已有账号？<b onClick={() => { setMode('login'); setErr(''); }}>去登录</b>
        </div>
        <div className="auth-note">
          注册即代表同意{' '}
          <b onClick={() => setShowAgreement('user')}>《用户协议》</b> 与{' '}
          <b onClick={() => setShowAgreement('privacy')}>《隐私政策》</b>
        </div>

        {/* 用户协议弹窗 */}
        {showAgreement && (
          <div
            className="cropper-overlay"
            onClick={() => setShowAgreement(null)}
            style={{ zIndex: 1000 }}
          >
            <div
              className="cropper-box"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div className="cropper-title">
                {showAgreement === 'user' ? '用户协议' : '隐私政策'}
              </div>
              <div style={{ padding: '0 24px', fontSize: 14, lineHeight: 1.8, color: '#666', textAlign: 'left' }}>
                {showAgreement === 'user' ? (
                  <>
                    <p><strong>一、服务说明</strong></p>
                    <p>语程是一款语音智能日程管理工具，帮助用户通过语音快速记录和管理日程安排。</p>
                    <p><strong>二、用户责任</strong></p>
                    <p>1. 用户应妥善保管自己的账号密码，因个人原因造成的信息泄露由用户自行承担。</p>
                    <p>2. 用户不得利用本服务从事违法活动。</p>
                    <p><strong>三、服务变更</strong></p>
                    <p>我们保留随时修改或终止服务的权利，修改后将在应用内通知用户。</p>
                  </>
                ) : (
                  <>
                    <p><strong>一、信息收集</strong></p>
                    <p>我们仅收集您主动提供的邮箱、昵称、头像和日程信息，用于提供服务。</p>
                    <p><strong>二、信息使用</strong></p>
                    <p>您的个人信息仅用于：</p>
                    <p>1. 提供日程管理服务</p>
                    <p>2. 发送验证码和重要通知</p>
                    <p>3. 改进产品体验</p>
                    <p><strong>三、信息保护</strong></p>
                    <p>我们采用行业标准的安全措施保护您的个人信息，不会向第三方泄露您的个人数据。</p>
                  </>
                )}
              </div>
              <div className="cropper-btns">
                <button className="cropper-ok" onClick={() => setShowAgreement(null)}>
                  我知道了
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---- 登录页 ---- */
  return (
    <div className="content auth-content">
      <div className="auth-brand">
        <div className="auth-logo">
          <img src="/app-icon.webp" alt="语程" draggable={false} />
        </div>
        <div className="auth-name">语程</div>
        <div className="auth-slogan">一句话，让生活有条不紊</div>
      </div>
      <div className="auth-form">
        <div className="auth-field">
          <span className="af-icon">
            <IconMail />
          </span>
          <input
            type="text"
            maxLength={60}
            placeholder="邮箱或手机号"
            value={account}
            onChange={(e) => {
              setAccount(e.target.value);
              setErr('');
            }}
          />
        </div>
        <div className="auth-field">
          <span className="af-icon">
            <IconLock />
          </span>
          <input
            type={showPwd ? 'text' : 'password'}
            maxLength={20}
            placeholder="请输入密码"
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value);
              setErr('');
            }}
            onKeyDown={onEnter}
          />
          <span className="af-eye" onClick={() => setShowPwd(!showPwd)}><IconEye /></span>
        </div>
        <div className="auth-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => {
                setRemember(e.target.checked);
                localStorage.setItem('yucheng_remember', e.target.checked ? '1' : '0');
              }}
            />
            <span>记住我</span>
          </label>
          <span className="auth-link" onClick={() => { setMode('forgot'); setErr(''); setDevCode(''); }}>
            忘记密码？
          </span>
        </div>
        <div className="auth-err" style={err ? { opacity: 1 } : undefined}>
          {err}
        </div>
        <button className="auth-btn" disabled={busy} onClick={submit}>
          {busy ? '请稍候…' : '登 录'}
        </button>
      </div>
      <div className="auth-foot">
        还没有账号？<b onClick={() => { setMode('register'); setErr(''); }}>立即注册</b>
      </div>
    </div>
  );
}
