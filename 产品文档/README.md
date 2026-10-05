# 语程（YueCheng）项目说明

> 一款「语音驱动」的个人日程 / 日历 App：用说话代替打字，自动解析成带时间、地点、分类的日程，并提供今日视图、日历（日/周/月）、重复、提醒、顺延等能力。

## 一、工程位置

项目根目录：**`D:\语程`**

```
D:\语程
├── 原型\        # 高保真交互原型（单文件 HTML，设计稿基准）
├── 前端\        # 移动端前端（Vite + React + TypeScript）— 待搭建
├── 后端\        # 服务端 API（Node + Express + MySQL）
├── 产品文档\    # PRD / 技术文档 / 数据库设计 / 运行手册（本目录）
└── 数据库\      # MySQL schema.sql（建库建表语句）
```

## 二、技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 前端 | Vite + React + TypeScript | 移动端模拟手机壳，严格还原原型视觉 |
| 后端 | Node.js + Express | REST API，CommonJS |
| 数据库 | MySQL 8.x（兼容 5.7+） | 用户信息 / 任务 / 分类 |
| 鉴权 | JWT（jsonwebtoken） | 登录后返回 token，请求头 `Authorization: Bearer <token>` |
| 密码 | bcryptjs | 加盐哈希，不存明文 |
| 数据库驱动 | mysql2/promise | 连接池 |

## 三、当前进度

- ✅ 后端：已完成（schema、连接池、鉴权、任务/分类/语音解析 API、初始化脚本与种子数据）
- ✅ 数据库：schema 与种子数据脚本已完成
- 📄 产品文档：PRD + 技术文档已完成（见同目录）
- ⏳ 前端：工程结构与页面待搭建（已定技术方案，等确认后开工）
- ⏳ 原型：作为视觉与交互基准，已在 `原型\` 提供

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
