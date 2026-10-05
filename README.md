# 语程（YuCheng）

> 语音驱动的智能日程管理APP —— 说话就能建日程

![sage](https://img.shields.io/badge/theme-sage-6b8e7b) ![react](https://img.shields.io/badge/react-18-61dafb) ![node](https://img.shields.io/badge/node-express-339933)

---

## ✨ 产品特点

- **语音添加日程**：对着手机说一句话，AI自动解析时间、地点、事项
- **13套主题皮肤**：手账风、胶片风、莫兰迪、iOS极简…每天换个心情
- **账号系统**：邮箱注册登录、验证码确认、数据隔离
- **管理后台**：数据概览、用户列表、埋点统计（管理员专属）
- **数据埋点**：全链路用户行为追踪，产品决策有依据

---

## 🛠️ 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + Vite + CSS Variables |
| 后端 | Node.js + Express |
| 数据库 | MySQL |
| AI | DeepSeek API（语音语义解析） |
| 邮件 | QQ邮箱SMTP（nodemailer） |
| 图表 | Chart.js（管理后台） |

---

## 🚀 快速开始

### 1. 克隆仓库
```bash
git clone https://github.com/你的用户名/yucheng.git
cd yucheng
```

### 2. 后端配置
```bash
cd 后端
npm install
cp .env.example .env
# 编辑 .env 填入你的数据库密码、邮箱授权码、DeepSeek API Key
```

### 3. 初始化数据库
```bash
mysql -u root -p
CREATE DATABASE yucheng CHARACTER SET utf8mb4;
exit
node src/db/init.js
```

### 4. 启动后端
```bash
node src/index.js
# 后端跑在 http://localhost:4000
```

### 5. 前端启动
```bash
cd 前端/app
npm install
npm run dev
# 前端跑在 http://localhost:5173
```

### 6. 生产构建
```bash
cd 前端/app
npm run build
# 构建产物在 前端/dist/，后端自动托管
```

---

## 📁 项目结构

```
语程/
├── 前端/
│   ├── app/              # React源码
│   │   ├── src/pages/    # 页面（登录/今日/日历/我的）
│   │   ├── src/components/ # 组件（语音面板/主题选择/编辑弹窗等）
│   │   ├── src/styles/   # 主题样式
│   │   └── src/lib/      # API封装 + 数据埋点
│   └── dist/             # 构建产物
├── 后端/
│   ├── src/
│   │   ├── index.js      # Express入口
│   │   ├── config/       # 数据库配置
│   │   ├── middleware/   # JWT认证中间件
│   │   ├── routes/       # API路由
│   │   └── util/         # DeepSeek解析 + 邮件发送
│   ├── public/
│   │   └── admin.html    # 管理后台页面
│   └── .env.example      # 环境变量示例
├── PRD-产品需求文档.md
└── 技术文档.md
```

---

## 🗄️ 数据库表

| 表名 | 说明 |
|---|---|
| users | 用户表（id/phone/email/password/nickname/avatar/role） |
| tasks | 日程表（user_id/date/title/start/end/place/cat） |
| categories | 分类表（user_id/name/color） |
| themes | 主题字典表（13套主题） |
| user_themes | 用户主题偏好 |
| events | 数据埋点事件表 |

---

## 🔐 环境变量说明

复制 `后端/.env.example` 为 `后端/.env`，填入以下配置：

| 变量 | 说明 |
|---|---|
| DB_HOST | 数据库地址（默认localhost） |
| DB_USER | 数据库用户名 |
| DB_PASSWORD | 数据库密码 |
| DB_NAME | 数据库名（默认yucheng） |
| JWT_SECRET | JWT签名密钥（改成随机字符串） |
| MAIL_SMTP_USER | 发件邮箱 |
| MAIL_SMTP_PASS | 邮箱授权码（不是登录密码） |
| DEEPSEEK_API_KEY | DeepSeek API密钥 |

> **注意**：`.env` 文件已被 `.gitignore` 排除，不会上传到GitHub。

---

## 🎨 主题列表

共13套主题，用户可自由切换：

| 分组 | 主题 |
|---|---|
| 经典 | sage（默认）、iOS极简、bento、mono线框 |
| 浅色 | 莫兰迪、蜜桃奶油 |
| 深色 | 暗黑奢华、复古胶片、藏青商务、森林墨绿、终端绿 |
| 质感 | 手绘手账（手写字体）、3D黏土 |

---

## 📊 管理后台

- 访问地址：`http://localhost:4000/admin`
- 只有 `role=admin` 的账号能登录
- 功能：数据概览、趋势图表、用户列表、热门操作

---

## 📝 License

MIT
