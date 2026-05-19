# AI Email Client

> AI-first 通用邮件客户端 PWA

基于 Next.js 14 构建的 AI 增强型邮件客户端，支持多账户统一收件箱、AI 智能摘要与智能回复，完美适配移动端 PWA 体验。

---

## 项目简介

**AI Email Client** 是一个面向国内用户的通用邮件客户端 PWA（Progressive Web App）。通过 AI 能力大幅提升邮件处理效率：

- **统一收件箱**：将来自 Gmail、Outlook、自定义 IMAP 的邮件聚合到单一时间线视图
- **AI 辅助阅读**：自动为每封邮件生成 50 字以内的中文结构化摘要
- **智能回复**：根据邮件内容和指定语气，一键生成 3 条候选回复草稿
- **PWA 离线支持**：Service Worker 缓存关键资源，支持离线阅读

> 本项目**仅聚焦邮件功能**，不包含日历、联系人管理、任务管理等模块。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 统一收件箱 | 多协议聚合（Gmail / Outlook / IMAP），按时间线排序 |
| 多账户切换 | 侧边栏顶部下拉菜单，支持"所有账户"聚合视图 |
| 三栏布局 | 左侧文件夹导航 / 中间邮件列表 / 右侧详情面板 |
| AI 邮件摘要 | 50 字以内中文摘要 + 关键要点 + 情感分析 |
| 智能回复 | 3 条候选回复（专业/友好/简洁），支持语气切换 |
| 响应式设计 | 移动端单列切换，桌面端三栏自适应 |
| 无限滚动 | 游标分页加载，触底自动获取更多邮件 |
| 离线支持 | Service Worker 缓存静态资源 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | **Next.js 14** (App Router) |
| 语言 | **TypeScript** (严格模式) |
| 样式 | **Tailwind CSS** + Shadcn/UI 变量体系 |
| 状态管理 | **Zustand** |
| AI 集成 | 硅基流动 / DeepSeek（OpenAI 兼容 API） |
| PWA | Web App Manifest + Service Worker |
| 包管理 | **pnpm** |

---

## 项目结构

```
ai-email-client/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 主页面：统一收件箱（三栏布局）
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式 + Shadcn/UI CSS 变量
│   │   ├── api/                # Server API Routes
│   │   │   ├── emails/route.ts       # 统一收件箱接口
│   │   │   └── emails/[id]/route.ts  # 邮件详情接口
│   │   └── inbox/page.tsx      # 收件箱路由
│   │
│   ├── components/             # React 组件
│   │   ├── ui/                 # 基础 UI 组件（按钮、对话框等）
│   │   ├── mail/               # 邮件业务组件
│   │   │   ├── mail-list.tsx   # 邮件列表
│   │   │   └── mail-detail.tsx # 邮件详情
│   │   ├── ai/                 # AI 功能组件
│   │   │   ├── ai-summary.tsx  # AI 摘要展示
│   │   │   └── smart-reply.tsx # 智能回复
│   │   └── layout/             # 布局组件
│   │       ├── sidebar.tsx     # 侧边栏
│   │       └── mobile-nav.tsx  # 移动端导航
│   │
│   ├── hooks/                  # 自定义 React Hooks
│   │   ├── use-mail.ts         # 邮件操作 hook
│   │   ├── useEmails.ts        # 邮件数据 hook（调用 /api/emails）
│   │   ├── use-ai.ts           # AI 功能 hook
│   │   └── use-pwa.ts          # PWA 相关 hook
│   │
│   ├── lib/                    # 工具函数与业务逻辑
│   │   ├── api/                # 前端 API 封装
│   │   │   ├── mail.ts         # 邮件 API
│   │   │   ├── ai.ts           # AI API
│   │   │   ├── types.ts        # 统一数据模型（UnifiedEmail）
│   │   │   ├── gmail.ts        # Gmail 协议适配器
│   │   │   ├── outlook.ts      # Outlook 协议适配器
│   │   │   └── imap.ts         # IMAP 协议适配器
│   │   ├── ai/                 # AI 核心逻辑
│   │   │   ├── agent.ts        # AI Agent（摘要 + 回复）
│   │   │   ├── summarize.ts    # 摘要服务（向后兼容）
│   │   │   └── smart-reply.ts  # 智能回复（向后兼容）
│   │   ├── store/              # Zustand stores
│   │   │   ├── mail-store.ts   # 邮件状态
│   │   │   └── ui-store.ts     # UI 状态
│   │   ├── utils.ts            # 工具函数（cn、formatDate 等）
│   │   ├── constants.ts        # 全局常量
│   │   └── adapters/           # 协议适配器
│   │       ├── gmail.ts
│   │       ├── graph.ts
│   │       └── imap.ts
│   │
│   ├── types/                  # TypeScript 类型
│   │   ├── mail.ts             # 邮件相关类型
│   │   ├── ai.ts               # AI 相关类型
│   │   └── index.ts            # 统一导出
│   │
│   └── styles/
│       └── globals.css
│
├── public/                     # 静态资源
│   ├── manifest.json           # PWA Web App Manifest
│   └── icons/                  # PWA 图标
│       └── icon.svg            # SVG 占位图标
│
├── ARCHITECTURE.md             # 架构设计文档
├── CLAUDE.md                   # 项目指令与开发规范
├── DELIVERY.md                 # 交付清单（本项目完成的所有模块）
├── .env.example                # 环境变量模板
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 快速开始

### 1. 环境要求

- Node.js >= 18.0
- pnpm >= 8.0（或 npm / yarn）

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 AI API Key：

```env
NEXT_PUBLIC_AI_PROVIDER=siliconflow
NEXT_PUBLIC_AI_API_KEY=sk-your-api-key-here
```

### 4. 启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 5. 构建生产版本

```bash
pnpm build
pnpm start
```

---

## 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `NEXT_PUBLIC_AI_PROVIDER` | 否 | `siliconflow` | AI 提供商：`siliconflow` / `deepseek` / `openai-compatible` |
| `NEXT_PUBLIC_AI_API_KEY` | 是 | - | AI API Key（从硅基流动或 DeepSeek 获取） |
| `NEXT_PUBLIC_AI_BASE_URL` | 否 | 根据 provider 自动填充 | 自定义 API 基础 URL |
| `NEXT_PUBLIC_AI_MODEL` | 否 | `deepseek-ai/DeepSeek-V3` | 使用的模型名称 |

---

## 开发指南

### 代码规范

- TypeScript 严格模式，禁止 `any`
- 所有组件使用函数式 + Hooks
- API 请求统一封装在 `src/lib/api/`
- 关键业务逻辑添加中文注释

### 提交规范

```
feat: 新功能
fix: 修复 bug
refactor: 重构（不改变功能行为）
style: 代码格式调整
docs: 文档更新
test: 测试相关
chore: 构建、依赖更新等杂项
```

### 添加新的协议适配器

1. 在 `src/lib/adapters/` 下创建新的适配器文件
2. 实现 `convertToUnified(rawData, accountId): UnifiedEmail` 函数
3. 在 `src/app/api/emails/route.ts` 中添加协议路由

---

## 部署

### Vercel（推荐）

```bash
vercel deploy
```

Next.js 原生支持，零配置部署。

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

---

## License

MIT
