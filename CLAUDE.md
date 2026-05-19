# AI-First 通用邮件客户端 PWA

## 项目概述

这是一个 **AI-first 通用邮件客户端 PWA**（Progressive Web App），旨在通过 AI 能力提升用户的邮件处理效率。

### 核心功能

- 统一收件箱：聚合多邮箱账户，单一视图管理
- AI 邮件摘要：自动提炼长邮件核心要点
- 智能回复：基于上下文生成回复建议
- 邮件分类与优先级排序
- PWA 离线阅读与推送通知

### 明确排除的范围

> 本项目**仅聚焦邮件功能**。不包含日历、联系人管理、任务管理等模块。任何偏离邮件核心体验的需求都应拒绝或标记为未来迭代。

---

## 核心技术栈

| 领域         | 技术选型                                        |
| ------------ | ----------------------------------------------- |
| 框架         | Next.js 14+ (App Router)                        |
| 语言         | TypeScript (严格模式)                           |
| UI 库        | Tailwind CSS + Shadcn/UI                        |
| 状态管理     | Zustand（全局状态） + React Context（局部共享） |
| PWA 方案     | next-pwa (基于 workbox)                         |
| 包管理器     | pnpm                                            |
| 代码格式化   | Prettier + ESLint                               |
| 测试         | Vitest + React Testing Library                  |
| 数据库/ORM   | Prisma (如需本地缓存)                           |

---

## 目录结构规范

```
├── src/
│   ├── app/                    # Next.js App Router: 路由与页面
│   │   ├── (auth)/             # 认证相关页面 (login, register, oauth-callback)
│   │   ├── (mail)/             # 邮件核心页面
│   │   │   ├── inbox/          # 收件箱
│   │   │   ├── [mailboxId]/    # 多账户路由
│   │   │   ├── compose/        # 撰写邮件
│   │   │   └── settings/       # 邮件设置
│   │   ├── api/                # API Routes (Next.js 服务端接口)
│   │   ├── layout.tsx          # 根布局
│   │   └── page.tsx            # 首页
│   │
│   ├── components/             # UI 组件
│   │   ├── ui/                 # Shadcn/UI 基础组件 (button, dialog, dropdown...)
│   │   ├── mail/               # 邮件业务组件 (MailList, MailDetail, Compose...)
│   │   ├── layout/             # 布局组件 (Sidebar, Header, MobileNav...)
│   │   └── ai/                 # AI 功能组件 (AISummary, SmartReply...)
│   │
│   ├── hooks/                  # 自定义 React Hooks
│   │   ├── use-mail.ts         # 邮件操作 hook
│   │   ├── use-ai.ts           # AI 功能 hook
│   │   └── use-pwa.ts          # PWA 相关 hook (install prompt, offline...)
│   │
│   ├── lib/                    # 工具函数与业务逻辑
│   │   ├── api/                # 所有 API 请求封装
│   │   │   ├── mail.ts         # 邮件 API (fetch, send, delete...)
│   │   │   ├── ai.ts           # AI API (summarize, reply suggestion...)
│   │   │   └── account.ts      # 账户 API (connect, disconnect...)
│   │   ├── store/              # Zustand store
│   │   │   ├── mail-store.ts   # 邮件状态
│   │   │   └── ui-store.ts     # UI 状态 (sidebar, theme...)
│   │   ├── utils.ts            # 通用工具函数
│   │   └── constants.ts        # 全局常量与配置
│   │
│   ├── types/                  # TypeScript 类型定义
│   │   ├── mail.ts             # 邮件相关类型
│   │   ├── ai.ts               # AI 相关类型
│   │   └── index.ts            # 类型统一导出
│   │
│   └── styles/                 # 全局样式
│       └── globals.css
│
├── public/                     # 静态资源 (PWA icons, manifest...)
├── prisma/                     # 数据库 schema (如需要)
└── tests/                      # 测试文件
    ├── unit/
    └── e2e/
```

---

## 代码风格与规范

### 基本原则

1. **组件必须使用函数式写法与 Hooks**，禁止使用 Class 组件。
2. **所有 API 请求必须封装在 `src/lib/api/` 目录下**，禁止在组件中直接调用 `fetch` 或外部 SDK。
3. **TypeScript 严格模式必须开启**，禁止使用 `any`，不确定的类型用 `unknown` 并做类型守卫。
4. **变量和函数命名必须语义化**，关键逻辑必须添加**中文注释**。
5. **遇到复杂逻辑时，必须先输出伪代码或实现计划**，经确认后再写具体代码。

### 组件规范

```tsx
// ✅ 正确: 函数式组件 + 类型标注
interface MailItemProps {
  mail: Mail;
  onSelect: (id: string) => void;
}

export function MailItem({ mail, onSelect }: MailItemProps) {
  const { markAsRead } = useMail();

  const handleSelect = () => {
    markAsRead(mail.id);
    onSelect(mail.id);
  };

  return (
    <button onClick={handleSelect} className="...">
      {mail.subject}
    </button>
  );
}
```

### API 调用规范

```typescript
// src/lib/api/mail.ts
// 所有 API 请求集中管理，便于统一处理拦截器、错误重试、离线缓存等逻辑

export async function fetchInboxMail(accountId: string, page: number = 1): Promise<Mail[]> {
  const response = await fetch(`/api/mail/inbox?accountId=${accountId}&page=${page}`);
  if (!response.ok) {
    throw new APIError(`获取邮件失败: ${response.statusText}`, response.status);
  }
  return response.json();
}
```

### 状态管理规范

```typescript
// src/lib/store/mail-store.ts
// 使用 Zustand 管理全局邮件状态

interface MailStore {
  mails: Mail[];
  selectedMail: Mail | null;
  isLoading: boolean;
  setMails: (mails: Mail[]) => void;
  selectMail: (mail: Mail) => void;
}

export const useMailStore = create<MailStore>((set) => ({
  mails: [],
  selectedMail: null,
  isLoading: false,
  setMails: (mails) => set({ mails }),
  selectMail: (mail) => set({ selectedMail: mail }),
}));
```

### 注释规范

- 关键业务逻辑必须添加**中文注释**，说明「为什么」这么做，而非「做了什么」。
- 禁止无意义的行内注释（如 `// 设置状态`）。
- 复杂算法、边界处理、临时 workaround 必须写明原因。

```typescript
// ✅ 好的注释: 解释动机
// IMAP 协议返回的日期格式不一致，统一转换为 ISO 8601
const normalizedDate = normalizeIMAPDate(rawDate);

// ❌ 坏注释: 重复代码本身
const mails = data.mails; // 获取邮件列表
```

---

## PWA 专项要求

1. **移动端优先**：所有组件必须考虑移动端响应式布局，最小触摸目标 44x44px。
2. **离线支持**：使用 Workbox 缓存关键页面和邮件列表，支持离线阅读。
3. **安装引导**：提供 PWA 安装引导组件，首次访问时提示用户添加到主屏幕。
4. **推送通知**：新邮件到达时触发 Web Push 通知。
5. **性能指标**：首次内容绘制 (FCP) < 1.5s，可交互时间 (TTI) < 3s。

---

## AI 协作指令

### 生成代码要求

1. **所有生成的代码必须是可运行的**，不能包含占位符、TODO 或不完整的逻辑。
2. 代码必须考虑**移动端 PWA 的响应式体验**，使用 Tailwind 的响应式工具类。
3. 生成组件时，同时生成对应的类型定义和导出语句。
4. 使用 Shadcn/UI 组件时，确保组件已正确安装并配置。

### 开发流程

```
用户提出需求
  → AI 输出实现计划 / 伪代码
  → 用户确认方案
  → AI 生成完整可运行代码
  → 用户测试 & 反馈
  → 迭代优化
```

### 约束提醒

- 如果需求涉及日历、联系人等**排除范围**的功能，应主动提醒用户并建议搁置。
- 如果需求涉及尚未安装的依赖或库，应先确认安装方式。
- 每次修改代码后，简要说明改动内容和影响范围。

---

## 提交规范

- `feat:` 新功能
- `fix:` 修复 bug
- `refactor:` 重构（不改变功能行为）
- `style:` 代码格式调整（不影响逻辑）
- `docs:` 文档更新
- `test:` 测试相关
- `chore:` 构建、依赖更新等杂项

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```
