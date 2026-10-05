// 从原型抽取 CSS 作为设计源，落到 React 工程的 app.css
// 只替换「手机外壳」相关的布局规则，其余组件样式保持原样
const fs = require('fs');

const html = fs.readFileSync('D:/语程/原型/语程-Timely风格原型.html', 'utf8');
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error('未找到 style 块');
let css = m[1];

/** 替换某选择器开头的规则块 */
function replaceRule(src, selector, replacement) {
  const re = new RegExp('(^|\\n)\\s*' + selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*\\}', 'g');
  return src.replace(re, () => replacement);
}
/**
 * 删除以某选择器开头的规则块。
 * 注意：原型 CSS 一行里可能有多条规则，所以不能用行首锚点，
 * 否则会漏删（曾因此漏删 .screen{display:none}，导致整页空白）。
 */
function dropRule(src, selector) {
  const re = new RegExp('(?<![\\w.-])' + selector + '[^\\s{,>+~]*\\s*\\{[^}]*\\}', 'g');
  return src.replace(re, '');
}

// 1) 去掉手机外壳 / 假状态栏 / 假 Home 指示条
//    .screen / .content 交给下面的外壳规则重定义，避免 pin 到原型的外壳布局
css = dropRule(css, '\\.phone');
css = dropRule(css, '\\.status');
css = dropRule(css, '\\.screens');
css = dropRule(css, '\\.home-indicator');
css = dropRule(css, '\\.screen');
css = dropRule(css, '\\.content');
css = dropRule(css, '\\*');
// :root 由 tokens.css 提供（含 5 套主题），这里若保留会盖掉主题切换
css = dropRule(css, ':root');

// 2) 外壳改成真实手机视口：100dvh + flex + 安全区
const shell = `
/* ===== 外壳：真实手机 H5（原型里的 .phone 手机壳已移除） ===== */
html,body{margin:0;padding:0;height:100%;background:var(--body-bg)}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",Arial,sans-serif;color:var(--text);overscroll-behavior-y:none;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
#root{height:100vh;height:100dvh;display:flex;justify-content:center}
.app{position:relative;width:100%;max-width:520px;height:100vh;height:100dvh;background:var(--bg);overflow:hidden;display:flex;flex-direction:column}
.screen{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding-top:env(safe-area-inset-top);position:relative}
.content{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:0 20px calc(160px + env(safe-area-inset-bottom));scrollbar-width:none}
.content::-webkit-scrollbar{display:none}
`;
css = replaceRule(css, 'html,body', shell);

fs.writeFileSync('D:/语程/前端/app/src/styles/app.css', css, 'utf8');
console.log('已写出 app.css，行数:', css.split('\n').length);
