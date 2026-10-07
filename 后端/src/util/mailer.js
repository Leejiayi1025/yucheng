// 邮件发送：注册验证码 / 绑定邮箱验证码
//
// 【两种方式，Resend(API) 优先，SMTP 回退】
//
// ① HTTP API（主通道，线上用）：Resend / Brevo 等服务商
//    MAIL_API_URL=https://api.resend.com/emails
//    MAIL_API_KEY=xxx
//    MAIL_FROM=语程 <no-reply@yourdomain.com>
//
// ② SMTP（回退 / 本地开发）：QQ / 163 等个人邮箱即可，只需「授权码」，不用域名
//    MAIL_SMTP_HOST=smtp.qq.com      （163 则是 smtp.163.com）
//    MAIL_SMTP_PORT=465              （465=SSL，587=STARTTLS）
//    MAIL_SMTP_USER=你的邮箱@qq.com
//    MAIL_SMTP_PASS=授权码            （不是登录密码！在邮箱设置里生成）
//    MAIL_FROM=语程 <你的邮箱@qq.com>
//
// 【都没配时】不会静默失败：验证码打印到服务端日志，并由接口回传前端，
//   保证在配好邮箱之前也能把注册流程跑通。
require('dotenv').config();

const MAIL_API_URL = (process.env.MAIL_API_URL || '').trim();
const MAIL_API_KEY = (process.env.MAIL_API_KEY || '').trim();
const MAIL_FROM = (process.env.MAIL_FROM || '语程 <no-reply@yucheng.app>').trim();
const TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS || 15000);

const SMTP_HOST = (process.env.MAIL_SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.MAIL_SMTP_PORT || 465);
const SMTP_USER = (process.env.MAIL_SMTP_USER || '').trim();
const SMTP_PASS = (process.env.MAIL_SMTP_PASS || '').trim();

let transporter = null;
let smtpTried = false;

/** SMTP 是否已配置 */
function smtpReady() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (!smtpReady()) return null;
  if (transporter) return transporter;
  smtpTried = true;
  try {
    // 延迟 require：没配 SMTP 时不依赖 nodemailer
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 465 走 SSL，587 走 STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    return transporter;
  } catch (e) {
    console.error('[mailer] 初始化 SMTP 失败（是否装了 nodemailer？）:', e.message);
    return null;
  }
}

function hasMailer() {
  return smtpReady() || Boolean(MAIL_API_URL);
}

function buildMail(code, ttlMin) {
  const subject = '【语程】注册验证码';
  const text = `欢迎使用语程！你的验证码是 ${code}，${ttlMin} 分钟内有效。如非本人操作请忽略本邮件。`;
  const html =
    '<div style="max-width:480px;margin:0 auto;padding:40px 32px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'PingFang SC\',\'Hiragino Sans GB\',\'Microsoft YaHei\',sans-serif;background:#faf9f7;border-radius:16px">' +
    // 顶部品牌
    '<div style="text-align:center;margin-bottom:32px">' +
    '<div style="font-size:24px;font-weight:700;color:#2f6b4f;letter-spacing:2px">语程</div>' +
    '<div style="font-size:13px;color:#999;margin-top:4px">让每一天都井井有条</div>' +
    '</div>' +
    // 卡片
    '<div style="background:#ffffff;border-radius:12px;padding:32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);text-align:center">' +
    '<p style="font-size:15px;color:#666;margin:0 0 8px">欢迎注册语程</p>' +
    '<p style="font-size:13px;color:#999;margin:0 0 24px">请使用以下验证码完成注册</p>' +
    // 验证码按钮
    '<div style="display:inline-block;padding:18px 40px;background:#2f6b4f;border-radius:10px;margin-bottom:12px;cursor:pointer;user-select:all">' +
    '<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#ffffff">' + code + '</span>' +
    '</div>' +
    '<p style="font-size:12px;color:#aaa;margin:0 0 16px">点击验证码即可复制</p>' +
    '<p style="font-size:13px;color:#999;margin:0">' + ttlMin + ' 分钟内有效</p>' +
    '</div>' +
    // 底部说明
    '<div style="text-align:center;margin-top:24px;font-size:12px;color:#aaa;line-height:1.8">' +
    '<p style="margin:0">如非本人操作，请忽略本邮件。</p>' +
    '<p style="margin:4px 0 0">语程 · 语音智能日程管理</p>' +
    '</div>' +
    '</div>';
  return { subject, text, html };
}

/**
 * 发送验证码邮件
 * @param {string} email  收件人
 * @param {string} code   6 位验证码
 * @param {number} ttlMin 有效期（分钟）
 * @returns {Promise<{sent:boolean, via?:string, error?:string}>}
 */
async function sendCodeMail(email, code, ttlMin = 5) {
  const { subject, text, html } = buildMail(code, ttlMin);

  /* ① HTTP API（Resend / Brevo 等，主通道） */
  if (MAIL_API_URL) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(MAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + MAIL_API_KEY
        },
        body: JSON.stringify({ from: MAIL_FROM, to: [email], subject, text, html }),
        signal: ctrl.signal
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error('[mailer] HTTP ' + resp.status + ' ' + body.slice(0, 200));
        return { sent: false, error: 'HTTP ' + resp.status };
      }
      return { sent: true, via: 'api' };
    } catch (e) {
      const msg = e && e.name === 'AbortError' ? '发送超时' : String((e && e.message) || e);
      console.error('[mailer] 发送失败: ' + msg);
      return { sent: false, error: msg };
    } finally {
      clearTimeout(timer);
    }
  }

  /* ② SMTP（QQ / 163 邮箱等，回退通道：本地开发或 API 未配时用） */
  const tp = getTransporter();
  if (tp) {
    try {
      await tp.sendMail({ from: MAIL_FROM, to: email, subject, text, html });
      return { sent: true, via: 'smtp' };
    } catch (e) {
      const msg = String((e && e.message) || e);
      console.error('[mailer] SMTP 发送失败: ' + msg);
      return { sent: false, error: msg };
    }
  }

  /* ③ 都没配 */
  console.log('[mailer] 未配置邮件服务，验证码（' + email + '）：' + code);
  return { sent: false, error: '未配置邮件服务' };
}

/** 供接口返回用：说明当前走的是哪种方式 */
function mailMode() {
  if (MAIL_API_URL) return 'api';
  if (smtpReady()) return 'smtp';
  return 'none';
}

module.exports = { sendCodeMail, hasMailer, mailMode };
