# 语程（YuCheng）

> 语音驱动的智能日程管理APP —— 说话就能建日程，到点闹钟式提醒

![default-theme](https://img.shields.io/badge/default%20theme-iOS%20minimal-000000) ![react](https://img.shields.io/badge/react-18-61dafb) ![node](https://img.shields.io/badge/node-express-339933)

---

## ✨ 核心特点
- **语音秒建日程**：对着手机说一句话就能建日程。识别走 AssemblyAI 实时流式（后端只签发一次性临时令牌，密钥不下发前端），云端不可用时自动降级到浏览器识别；语义结构化和任务名润色由 DeepSeek 完成，不随意添加未提及的结束时间
- **闹钟式强提醒**：到点全屏弹窗+铃声，支持「知道了彻底关闭」「稍后5分钟再提醒」。只补最近 30 分钟内错过的提醒，不会一打开 App 就把今天所有过期任务一起响
- **高级主题系统**：19 套主题按风格分五组（极简／柔和／质感／深色／复古），默认 iOS 黑白极简风；每套的背景画、卡片与按钮材质都是各自设计的，切换带真实翻书音效
- **微信风格头像裁剪**：选图后直接双指捏合缩放、单指拖动，圆形裁剪流畅无偏移
- **完整账号体系**：邮箱验证码注册登录、用户协议/隐私政策、密码找回、账号注销
- **内测环境适配**：微信/第三方APP内置浏览器打开时，提示复制链接到系统浏览器使用语音功能
- **数据管理后台**：iOS黑白风管理后台，查看活跃趋势、功能使用率、主题偏好、用户列表
- **全链路数据埋点**：支撑内测产品迭代决策

---

## 🛠️ 技术栈
| 层级 | 技术 |
|---|---|
| 前端 | React 18 + Vite + CSS Variables 主题方案 |
| 后端 | Node.js + Express |
| 数据库 | MySQL 8 |
| AI语义解析 | DeepSeek API |
| 语音识别 | AssemblyAI 实时流式识别（主）+ 浏览器原生 Web Speech（降级） |
| 邮件服务 | Resend API（替代旧SMTP方案） |
| 后台图表 | Chart.js |

### 线上部署
- 前端：Netlify 托管，GitHub master分支自动部署
- 后端+数据库：Railway 自动部署
- 线上主地址：**https://yuchengailee.online**（自定义域名，阿里云购买+实名，DNS 已生效，HTTPS 自动签发）
- 备用地址：https://yuchengaileen.netlify.app/

---

## 🚀 本地快速开始

### 1. 环境准备
- Node.js 18+
- MySQL 8
- DeepSeek、Resend API密钥

### 2. 后端启动
```bash
cd 后端
npm install
# 复制.env.example为.env，填写数据库连接、API密钥
node src/index.js
# 后端运行在 http://localhost:4000
```

### 3. 数据库初始化
创建数据库后执行 `数据库/schema-full.sql` 完成全量表结构创建。

### 4. 前端启动
```bash
cd frontend/app
npm install
npm run dev
# 开发环境运行在 http://localhost:5173
```

### 5. 生产构建
```bash
cd frontend/app
npm run build
# 构建产物在 frontend/app/dist，后端自动托管
# 局域网手机访问 http://电脑本地IP:4000（需连同一WiFi）
```

---

## 📁 项目结构
```
语程/
├── frontend/app/           # React + Vite 前端工程
│   ├── src/pages/          # 页面：登录、今日、日历、我的
│   ├── src/components/     # 组件：头像裁剪、编辑弹窗、语音面板、引导页等
│   ├── src/styles/         # 全局样式、主题token配置
│   ├── src/lib/            # 音效、工具方法
│   ├── src/App.jsx         # 应用入口、闹钟全局逻辑
│   └── public/             # 静态资源、铃声、音效
├── 后端/
│   ├── src/
│   │   ├── index.js        # Express入口、统计接口
│   │   ├── db/             # 数据库连接
│   │   ├── middleware/     # JWT认证中间件
│   │   ├── routes/         # 认证、日程、分类、语音接口
│   │   └── util/           # DeepSeek解析、工具方法
│   ├── public/admin.html   # iOS黑白风管理后台
│   └── .env.example        # 环境变量示例
├── 产品文档/                # PRD、技术文档、部署指南、邮箱配置
├── 数据库/                  # 全量建表SQL脚本
└── README.md
```

---

## 🔐 环境变量说明
| 变量 | 说明 |
|---|---|
| DB_HOST / DB_USER / DB_PASSWORD / DB_NAME | MySQL连接参数 |
| JWT_SECRET | JWT签名密钥，自定义随机字符串。**必须设置**，缺失时鉴权会失效 |
| MAIL_API_URL | 邮件服务API地址（Resend 填 `https://api.resend.com/emails`） |
| MAIL_API_KEY | 邮件服务API密钥（Resend后台获取） |
| MAIL_FROM | 发件人地址（如 `语程 <no-reply@你的域名>`） |
| DEEPSEEK_API_KEY | DeepSeek AI接口密钥 |
| ASSEMBLYAI_API_KEY | AssemblyAI 实时语音识别密钥。只存服务端，用于换临时令牌；不配则语音接口返回 503、前端自动降级 |
| DEEPSEEK_MODEL | 可选，默认 `deepseek-chat`（另一选择是 `deepseek-reasoner`） |
| CORS_ORIGINS | 可选，跨域白名单，逗号分隔。线上域名与本地开发端口已内置默认值，换域名时在这里追加 |

> `.env` 已加入 `.gitignore`，不会提交敏感信息。
> 完整清单见 [后端/.env.example](后端/.env.example)。

---

## 🎨 核心主题

共 **19 套**，按风格气质分成五组（App 里的选择器就是这个分区）：

| 分组 | 主题 |
|---|---|
| **极简** | `ios-minimal` iOS黑白极简（**系统默认**）、`mono` 线框工程风、`bento` iOS原生风 |
| **柔和** | `sage` 奶油鼠尾草、`morandi` 莫兰迪色系、`mint` 薄荷清新、`peach` 蜜桃奶油风、`amber-dusk` 琥珀暮色 |
| **质感** | `paper` 手绘手账、`clay` 3D 黏土、`porcelain` 青花瓷 |
| **深色** | `ios` iOS暗黑、`midnight` 午夜深蓝、`navy` 藏青商务风、`forest` 森林墨绿风、`terminal` 终端绿极客 |
| **复古** | `luxe` 暗黑奢华黑金、`black-gold` 黑白金奢华、`film` 复古胶片风 |

每套主题不只是换配色 —— 背景画（渐变／网格／扫描线／网点）、卡片与按钮的材质都是各自设计的，
切换时带真实翻书音效。主题清单以数据库 `themes` 表为准，前端不再写死数量。
> 数据库备注：`themes` 表的 `preview_card / preview_text / preview_primary` 为 `varchar(100)`，
> 支持存 rgba 与渐变等长值（历史版本曾因 `varchar(20)` 截断过 iOS 暗黑、午夜深蓝、黑白金三套主题的卡片色，已修复）。

---

## 📊 管理后台
- 本地访问：`http://localhost:4000/admin.html`
- 权限：仅`role=admin`管理员账号可登录
- 功能：核心指标卡片、7天活跃趋势、功能使用分布、主题偏好统计、用户列表、事件明细

---

## 📝 License
MIT
