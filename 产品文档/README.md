# 语程（YueCheng）项目说明

> 一款「语音驱动」的个人日程 / 日历 App：用说话代替打字，自动解析成带时间、地点、分类的日程，并提供今日视图、日历（日/周/月）、重复、提醒、顺延等能力。

## 一、工程位置

项目根目录：**`D:\语程`**

```
D:\语程
├── frontend\app\     # 移动端前端（Vite + React 18，已落地）
├── 后端\             # 服务端 API（Node + Express + MySQL）
├── 产品文档\          # PRD / 技术文档 / 部署指南（本目录）
└── 数据库\           # schema-full.sql（建库建表语句）
```

> ⚠️ 前端目录是英文 `frontend`（不是「前端」）；早期 `.gitignore` 因路径写错导致构建产物被误提交，已修复。

## 二、技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 前端 | Vite + React 18 | 移动端 H5，自适应真实手机尺寸，无手机壳 |
| 后端 | Node.js + Express | REST API，CommonJS |
| 数据库 | MySQL 8.x（Railway 云端） | 用户信息 / 任务 / 分类 / 主题 |
| 鉴权 | JWT（jsonwebtoken） | 登录后返回 token，请求头 `Authorization: Bearer <token>` |
| 密码 | bcryptjs | 加盐哈希，不存明文 |
| 数据库驱动 | mysql2/promise | 连接池 |

## 三、当前进度

- ✅ 前端：已落地（Vite + React 18 H5，引导页 / 登录 / 今日 / 日历 / 我的）
- ✅ 后端：已完成（schema、连接池、鉴权、任务/分类/主题/语音解析 API、初始化脚本与种子数据）
- ✅ 数据库：schema 与种子数据脚本已完成（含 19 套主题字典）
- ✅ 已上线：前端 Netlify + 自定义域名 https://yuchengailee.online，后端+数据库 Railway
- 📄 最新文档见：《PRD-产品需求文档.md》《技术文档.md》《部署指南.md》

## 四、快速开始（后端）

```bash
cd D:\语程\后端
npm install
cp .env.example .env        # 填入本机 MySQL 账号密码
npm run initdb              # 建库建表 + 写入演示数据
npm start                   # 启动 API，默认 http://localhost:4000
```

演示账号：`13800138000` / `123456`

详细 API、数据库表结构、部署方式见《技术文档.md》。
