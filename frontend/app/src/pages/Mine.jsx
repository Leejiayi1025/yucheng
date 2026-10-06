import { useState } from 'react';
import Icon from '../components/Icon';
import TabBar from '../components/TabBar';
import ThemeSheet from '../components/ThemeSheet';
import RemindSheet from '../components/RemindSheet';
import ProfileSheet, { AvatarInner } from '../components/ProfileSheet';
import { useApp } from '../store';
import { bindEmail, changePassword, sendCode, deleteAccount, bindPhone } from '../lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Mine({ page, onPage }) {
  const { user, tasks, logout, toast, profile, setUser, deleteTask, soundOn, setSoundOn } = useApp();
  const [sheet, setSheet] = useState(null);

  // 展开的section
  const [openSection, setOpenSection] = useState(null); // email | phone | pwd | delete

  // 更换邮箱状态
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [cd, setCd] = useState(0);
  const [devCode, setDevCode] = useState('');

  // 修改密码状态
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd1, setNewPwd1] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [pwdCode, setPwdCode] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdCd, setPwdCd] = useState(0);

  // 绑定手机号状态
  const [newPhone, setNewPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneCd, setPhoneCd] = useState(0);

  // 注销账号状态
  const [delCode, setDelCode] = useState('');
  const [delErr, setDelErr] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delCd, setDelCd] = useState(0);
  const [delConfirm, setDelConfirm] = useState(false);

  const phone = user && user.phone ? user.phone : '';
  const email = (user && user.email) || '';
  const masked = phone ? phone.slice(0, 3) + '****' + phone.slice(7) : '';
  const days = user && user.at ? Math.max(1, Math.floor((Date.now() - user.at) / 86400000) + 1) : 1;

  const items = [
    { key: 'profile', icon: 'user', label: '修改个人信息', stroke: true },
    { key: 'theme', icon: 'palette', label: '外观主题', stroke: false },
    { key: 'sound', icon: 'sound', label: '按键音效', stroke: true },
    { key: 'remind', icon: 'bell', label: '提醒中心', stroke: true },
    { key: 'account', icon: 'shield', label: '账号与安全', stroke: true }
  ];

  const closeSheet = () => setSheet(null);

  const toggleSection = (key) => {
    const next = openSection === key ? null : key;
    setOpenSection(next);
    // 展开时默认填入当前值
    if (next === 'email' && !newEmail) setNewEmail(email);
    if (next === 'phone' && !newPhone && phone) setNewPhone(phone);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <h1>我的</h1>
      </div>
      <div className="content">
        <div className="mine-hero" onClick={() => setSheet('profile')} role="button">
          <div className="mine-avatar">
            <AvatarInner profile={profile} />
          </div>
          <div className="mine-name">{(phone || email) ? profile.nick || '语程用户' : '未登录'}</div>
          <div className="mine-sub">
            {(phone || email)
              ? profile.sign || (email || masked) + ' · 已坚持规划 ' + days + ' 天'
              : '登录后同步你的日程'}
          </div>
        </div>

        <div className="mine-group">
          {items.map((it) => (
            <div key={it.key} className="mine-item" onClick={() => {
              if (it.key === 'sound') {
                setSoundOn(!soundOn);
                return;
              }
              setSheet(it.key);
            }}>
              <div className="mi-icon">
                <Icon name={it.icon} size={20} stroke={it.stroke} />
              </div>
              <div className="mi-text">{it.label}</div>
              {it.key === 'sound' ? (
                <div style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: soundOn ? 'var(--primary)' : '#444',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: soundOn ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'all 0.2s'
                  }} />
                </div>
              ) : (
                <div className="mi-arrow">
                  <Icon name="arrow" size={16} stroke />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="mine-logout"
          onClick={() => {
            logout();
            toast('已退出登录');
          }}
        >
          退出登录
        </button>
      </div>

      <TabBar current={page} onChange={onPage} />

      {sheet === 'theme' && <ThemeSheet onClose={() => setSheet(null)} />}
      {sheet === 'remind' && (
        <RemindSheet tasks={tasks} onClose={() => setSheet(null)} onDelete={deleteTask} />
      )}
      {sheet === 'profile' && <ProfileSheet onClose={() => setSheet(null)} />}

      {/* 账号与安全弹窗：手风琴展开 */}
      {sheet === 'account' && (
        <div className="edit-sheet show" onClick={(e) => e.target === e.currentTarget && closeSheet()}>
          <div className="es-card">
            <div className="es-nav">
              <button className="es-nav-btn" onClick={closeSheet}>
                关闭
              </button>
              <div className="es-nav-title">账号与安全</div>
              <button
                className="es-nav-btn"
                onClick={async () => {
                  let hasError = false;

                  // 更换邮箱
                  if (newEmail && EMAIL_RE.test(newEmail)) {
                    if (!emailCode.trim()) {
                      setEmailErr('请输入邮箱验证码');
                      hasError = true;
                    } else {
                      setEmailBusy(true);
                      const r = await bindEmail(newEmail, emailCode);
                      setEmailBusy(false);
                      if (!r.ok) {
                        setEmailErr(r.msg);
                        hasError = true;
                      } else {
                        setUser({ ...user, email: r.email });
                        toast('邮箱已更新');
                      }
                    }
                  }

                  // 绑定手机号
                  if (newPhone && /^1\d{10}$/.test(newPhone)) {
                    if (!phoneCode.trim()) {
                      setPhoneErr('请输入邮箱验证码');
                      hasError = true;
                    } else {
                      setPhoneBusy(true);
                      const r = await bindPhone(newPhone, phoneCode);
                      setPhoneBusy(false);
                      if (!r.ok) {
                        setPhoneErr(r.msg);
                        hasError = true;
                      } else {
                        setUser({ ...user, phone: r.phone });
                        toast('手机号已绑定');
                      }
                    }
                  }

                  // 修改密码
                  if (oldPwd && newPwd1 && newPwd2) {
                    if (newPwd1.length < 6) {
                      setPwdErr('新密码至少 6 位');
                      hasError = true;
                    } else if (newPwd1 !== newPwd2) {
                      setPwdErr('两次输入的新密码不一致');
                      hasError = true;
                    } else if (!pwdCode.trim()) {
                      setPwdErr('请输入邮箱验证码');
                      hasError = true;
                    } else {
                      setPwdBusy(true);
                      const r = await changePassword(oldPwd, newPwd1, pwdCode);
                      setPwdBusy(false);
                      if (!r.ok) {
                        setPwdErr(r.msg);
                        hasError = true;
                      } else {
                        toast('密码已更新');
                      }
                    }
                  }

                  if (!hasError) {
                    closeSheet();
                  }
                }}
              >
                保存
              </button>
            </div>
            <div className="es-body">
              {/* 基本信息 */}
              <div className="es-block">
                <div className="es-row">
                  <span className="es-label">当前邮箱</span>
                  <span className="es-value">{email || '未绑定'}</span>
                </div>
                <div className="es-row">
                  <span className="es-label">手机号</span>
                  <span className="es-value">{phone || '未绑定'}</span>
                </div>
              </div>

              {/* 更换邮箱 */}
              <div className="es-block">
                <div className="es-row" onClick={() => toggleSection('email')} style={{ cursor: 'pointer' }}>
                  <span className="es-label">更换邮箱</span>
                  <span className="es-arrow">
                    <Icon name={openSection === 'email' ? 'up' : 'right'} size={15} stroke />
                  </span>
                </div>
                {openSection === 'email' && (
                  <>
                    <div className="es-row">
                      <span className="es-label">新邮箱</span>
                      <input
                        className="es-input"
                        type="email"
                        maxLength={60}
                        placeholder="you@example.com"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value.trim());
                          setEmailErr('');
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
                        value={emailCode}
                        onChange={(e) => {
                          setEmailCode(e.target.value.replace(/\D/g, ''));
                          setEmailErr('');
                        }}
                      />
                      <button
                        className="es-code-btn"
                        disabled={cd > 0 || emailBusy}
                        onClick={async () => {
                          setEmailErr('');
                          if (!EMAIL_RE.test(newEmail)) return setEmailErr('请输入正确的邮箱地址');
                          setEmailBusy(true);
                          const r = await sendCode(newEmail);
                          setEmailBusy(false);
                          if (!r.ok) return setEmailErr(r.msg);
                          setCd(60);
                          if (r.emailed) {
                            setDevCode('');
                            toast('验证码已发送至 ' + newEmail);
                          } else {
                            setDevCode(r.code || '');
                            toast(r.hint || '邮件服务未配置，验证码已直接显示');
                          }
                        }}
                      >
                        {cd > 0 ? cd + 's' : '获取'}
                      </button>
                    </div>
                    {devCode && <div className="auth-devcode">邮件服务未配置 · 验证码：{devCode}</div>}
                    {emailErr && <div className="es-err">{emailErr}</div>}
                  </>
                )}
              </div>

              {/* 绑定手机号 */}
              <div className="es-block">
                <div className="es-row" onClick={() => toggleSection('phone')} style={{ cursor: 'pointer' }}>
                  <span className="es-label">{phone ? '更换手机号' : '绑定手机号'}</span>
                  <span className="es-arrow">
                    <Icon name={openSection === 'phone' ? 'up' : 'right'} size={15} stroke />
                  </span>
                </div>
                {openSection === 'phone' && (
                  <>
                    <div className="es-row">
                      <span className="es-label">手机号</span>
                      <input
                        className="es-input"
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="请输入手机号"
                        value={newPhone}
                        onChange={(e) => {
                          setNewPhone(e.target.value.replace(/\D/g, ''));
                          setPhoneErr('');
                        }}
                      />
                    </div>
                    <div className="es-row">
                      <span className="es-label">邮箱验证码</span>
                      <input
                        className="es-input es-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6 位数字"
                        value={phoneCode}
                        onChange={(e) => {
                          setPhoneCode(e.target.value.replace(/\D/g, ''));
                          setPhoneErr('');
                        }}
                      />
                      <button
                        className="es-code-btn"
                        disabled={phoneCd > 0 || phoneBusy}
                        onClick={async () => {
                          setPhoneErr('');
                          setPhoneBusy(true);
                          const r = await sendCode(email);
                          setPhoneBusy(false);
                          if (!r.ok) return setPhoneErr(r.msg);
                          setPhoneCd(60);
                          toast('验证码已发送至 ' + email);
                        }}
                      >
                        {phoneCd > 0 ? phoneCd + 's' : '获取'}
                      </button>
                    </div>
                    {phoneErr && <div className="es-err">{phoneErr}</div>}
                  </>
                )}
              </div>

              {/* 修改密码 */}
              <div className="es-block">
                <div className="es-row" onClick={() => toggleSection('pwd')} style={{ cursor: 'pointer' }}>
                  <span className="es-label">修改密码</span>
                  <span className="es-arrow">
                    <Icon name={openSection === 'pwd' ? 'up' : 'right'} size={15} stroke />
                  </span>
                </div>
                {openSection === 'pwd' && (
                  <>
                    <div className="es-row">
                      <span className="es-label">原密码</span>
                      <input
                        className="es-input"
                        type="password"
                        maxLength={24}
                        placeholder="至少 6 位"
                        value={oldPwd}
                        onChange={(e) => {
                          setOldPwd(e.target.value);
                          setPwdErr('');
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
                        value={newPwd1}
                        onChange={(e) => {
                          setNewPwd1(e.target.value);
                          setPwdErr('');
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
                        value={newPwd2}
                        onChange={(e) => {
                          setNewPwd2(e.target.value);
                          setPwdErr('');
                        }}
                      />
                    </div>
                    <div className="es-row">
                      <span className="es-label">邮箱验证码</span>
                      <input
                        className="es-input es-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6 位数字"
                        value={pwdCode}
                        onChange={(e) => {
                          setPwdCode(e.target.value.replace(/\D/g, ''));
                          setPwdErr('');
                        }}
                      />
                      <button
                        className="es-code-btn"
                        disabled={pwdCd > 0 || pwdBusy}
                        onClick={async () => {
                          setPwdErr('');
                          setPwdBusy(true);
                          const r = await sendCode(email);
                          setPwdBusy(false);
                          if (!r.ok) return setPwdErr(r.msg);
                          setPwdCd(60);
                          toast('验证码已发送至 ' + email);
                        }}
                      >
                        {pwdCd > 0 ? pwdCd + 's' : '获取'}
                      </button>
                    </div>
                    {pwdErr && <div className="es-err">{pwdErr}</div>}
                  </>
                )}
              </div>

              {/* 注销账号 */}
              <div className="es-block">
                <div className="es-row" onClick={() => toggleSection('delete')} style={{ cursor: 'pointer' }}>
                  <span className="es-label" style={{ color: 'var(--danger)' }}>注销账号</span>
                  <span className="es-arrow">
                    <Icon name={openSection === 'delete' ? 'up' : 'right'} size={15} stroke />
                  </span>
                </div>
                {openSection === 'delete' && (
                  <>
                    <div className="es-tip" style={{ margin: '8px 0', color: 'var(--danger)' }}>
                      注销后所有任务数据将被永久删除，无法恢复
                    </div>
                    <div className="es-row">
                      <span className="es-label">验证码</span>
                      <input
                        className="es-input es-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6 位数字"
                        value={delCode}
                        onChange={(e) => {
                          setDelCode(e.target.value.replace(/\D/g, ''));
                          setDelErr('');
                        }}
                      />
                      <button
                        className="es-code-btn"
                        disabled={delCd > 0 || delBusy}
                        onClick={async () => {
                          setDelErr('');
                          setDelBusy(true);
                          const r = await sendCode(email);
                          setDelBusy(false);
                          if (!r.ok) return setDelErr(r.msg);
                          setDelCd(60);
                          toast('验证码已发送至 ' + email);
                        }}
                      >
                        {delCd > 0 ? delCd + 's' : '获取'}
                      </button>
                    </div>
                    {delErr && <div className="es-err">{delErr}</div>}
                    <button
                      className="btn-danger"
                      disabled={delBusy}
                      onClick={() => {
                        if (!delCode.trim()) {
                          setDelErr('请输入验证码');
                          return;
                        }
                        setDelConfirm(true);
                      }}
                    >
                      {delBusy ? '注销中...' : '确认注销'}
                    </button>
                  </>
                )}
              </div>

              <button
                className="mine-logout"
                onClick={() => {
                  logout();
                  toast('已退出登录');
                  closeSheet();
                }}
              >
                退出登录
              </button>
            </div>
          </div>

          {/* 注销二次确认 */}
          {delConfirm && (
            <div className="confirm-overlay" onClick={() => setDelConfirm(false)}>
              <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-title">确认注销账号？</div>
                <div className="confirm-desc">
                  注销后所有任务数据将被永久删除，且无法恢复。<br />
                  确定要继续吗？
                </div>
                <div className="confirm-btns">
                  <button className="confirm-cancel" onClick={() => setDelConfirm(false)}>
                    再想想
                  </button>
                  <button
                    className="confirm-ok"
                    disabled={delBusy}
                    onClick={async () => {
                      setDelBusy(true);
                      const r = await deleteAccount(delCode);
                      setDelBusy(false);
                      if (!r.ok) return setDelErr(r.msg);
                      toast('账号已注销');
                      logout();
                      closeSheet();
                    }}
                  >
                    {delBusy ? '注销中...' : '确认注销'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
