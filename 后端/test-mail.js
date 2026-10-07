require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  console.log('=== QQ邮箱SMTP发信测试 ===');
  console.log('发件邮箱:', process.env.MAIL_SMTP_USER);
  console.log('SMTP服务器:', process.env.MAIL_SMTP_HOST + ':' + process.env.MAIL_SMTP_PORT);

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SMTP_HOST,
    port: Number(process.env.MAIL_SMTP_PORT),
    secure: process.env.MAIL_SMTP_PORT === 465,
    auth: {
      user: process.env.MAIL_SMTP_USER,
      pass: process.env.MAIL_SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP授权码验证通过，连接成功');

    // 发测试邮件到自己的QQ邮箱
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_SMTP_USER,
      subject: '语程APP - SMTP配置测试',
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:-apple-system,sans-serif;padding:20px;">
          <h2 style="color:#000;">语程APP邮件测试</h2>
          <p>如果你收到这封邮件，说明QQ邮箱SMTP配置完全正常，可以正常发送注册验证码。</p>
          <p style="color:#8e8e93;font-size:14px;">测试时间：${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `,
    });

    console.log('✅ 测试邮件已发送，消息ID:', info.messageId);
    console.log('请打开QQ邮箱（包括垃圾邮件文件夹）查看是否收到测试邮件');
    process.exit(0);
  } catch (e) {
    console.log('❌ 发信失败，错误信息:', e.message);
    if (e.message.includes('auth')) {
      console.log('\n常见原因：');
      console.log('1. QQ邮箱SMTP授权码错误，需要重新获取');
      console.log('2. QQ邮箱未开启IMAP/SMTP服务');
    }
    process.exit(1);
  }
})();
