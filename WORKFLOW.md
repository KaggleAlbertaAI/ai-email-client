# AI Email Client — Agentic Workflow

> 本项目完全由 Claude Code CLI + 多智能体协作构建，采用 Specs-Driven Development + CLAUDE.md 约束模式。

---

## Agents 与 Roles

本项目在开发过程中使用了以下智能体协作：

| Agent Type | 职责 | 使用场景 |
|------------|------|----------|
| **claude (主 Agent)** | 任务编排、代码生成、架构设计、文件操作 | 全程主导，协调各子 Agent |
| **Explore (子 Agent)** | 代码库搜索、文件定位、依赖关系分析 | 项目启动时探索现有结构，定位 API 路由和类型定义 |
| **Plan (子 Agent)** | 实现方案设计、权衡分析 | 复杂功能（如统一数据模型、协议适配器）开发前的架构规划 |
| **general-purpose (子 Agent)** | 多步骤任务执行、跨文件修改 | 批量更新 API 封装、同步多个组件的状态管理 |

---

## Skills 与 Tools 使用

| Skill / Hook | 用途 | 本项目中的使用 |
|--------------|------|----------------|
| **/init** | 初始化 CLAUDE.md 项目指令文件 | 项目启动时创建 CLAUDE.md 规范 |
| **Agent tool** | 启动子 Agent 并行工作 | 前端界面 + AI Agent 逻辑同步开发 |
| **TaskCreate / TaskUpdate** | 任务跟踪与进度管理 | 每个功能模块创建独立 Task，完成后标记 resolved |
| **CronCreate** | 定时任务调度 | 可用于后续实现邮件定期同步 |
| **Read / Edit / Write / Grep / Glob** | 文件操作工具 | 全部代码读写、搜索、定位操作 |

---

## 开发工作流

### 阶段 1: 需求分析与架构设计（Day 1-2）

```
需求输入 (Prompt)
    │
    ▼
主 Agent 解析需求 → 拆分 5 个核心阶段
    │
    ├──► 架构设计 (Plan Agent) → ARCHITECTURE.md
    ├──► 项目规范 (CLAUDE.md) → 约束规则、技术栈、目录结构
    └──► 统一数据模型 (UnifiedEmail) → 协议适配契约
```

**产出**：ARCHITECTURE.md、CLAUDE.md、统一数据模型（`src/lib/api/types.ts`）

### 阶段 2: 协议适配层开发（Day 2-3）

```
UnifiedEmail 契约
    │
    ├──► Gmail 适配器 (lib/adapters/gmail.ts)
    ├──► Microsoft Graph 适配器 (lib/adapters/graph.ts)
    ├──► IMAP 适配器 (lib/adapters/imap.ts)
    └──► 统一入口 (lib/adapters/index.ts)
```

**模式**：先定义类型契约，再并行实现各适配器，最后统一转换。

### 阶段 3: 前端 PWA 界面（Day 3-5）

```
主界面 (page.tsx)
    ├──► 三栏布局（侧边栏 / 列表 / 详情）
    ├──► 账户切换下拉菜单
    ├──► 响应式（移动/平板/桌面自适应）
    └──► Mock 数据 → 真实 API 对接 (useEmails.ts)
```

**模式**：先出静态布局 → 添加交互 → 对接数据。

### 阶段 4: AI 智能体集成（Day 5-6）

```
AI Agent (lib/ai/agent.ts)
    ├──► generateSummary() → 50 字中文摘要
    ├──► generateReply() → 3 条候选回复
    └──► 多提供商支持（硅基流动 / DeepSeek）
         ├──► Prompt 编排
         ├──► JSON 结构化输出
         └──► 降级容错处理
```

### 阶段 5: PWA 配置与交付（Day 6-7）

```
PWA 配置
    ├──► manifest.json (应用名称/图标/主题色)
    ├──► Service Worker 缓存
    ├──► 环境变量模板 (.env.example)
    └──► 交付文档 (README.md / DELIVERY.md / WORKFLOW.md)
```

---

## CLAUDE.md 约束体系

本项目采用双层 CLAUDE.md 架构：

| 文件 | 作用域 | 内容 |
|------|--------|------|
| `CLAUDE.md` (全局) | 用户级 `~/.claude/` | 通用协作规则 |
| `CLAUDE.md` (项目) | 项目根目录 | 技术栈、目录结构、代码规范、范围约束 |

**关键约束规则**：
1. 仅邮件功能，排除日历/联系人/任务管理
2. 组件必须函数式 + Hooks
3. API 请求统一封装在 `src/lib/api/`
4. TypeScript 严格模式，禁用 `any`
5. 关键业务逻辑添加中文注释
6. 生成代码必须是可运行的（无占位符/TODO）

---

## Specs-Driven Development

每次开发遵循：**Spec → Plan → Implement → Verify**

| 步骤 | 说明 |
|------|------|
| **Spec** | 明确输入需求（类型定义、API 契约、UI 布局） |
| **Plan** | Agent 设计实现方案，识别关键文件和依赖 |
| **Implement** | 生成完整可运行代码 |
| **Verify** | 检查 TypeScript 编译、依赖安装、页面渲染 |

---

## AI-First 设计体现

| 功能 | AI 介入方式 |
|------|-------------|
| 邮件摘要 | 自动提取核心内容，50 字以内结构化输出 |
| 智能回复 | 基于上下文生成 3 条不同语气回复 |
| 邮件优先级 | 情感分析 + 重要性评估 + 是否需要回复标记 |
| 列表预览 | AI 摘要直接显示在邮件列表，无需打开详情 |
| 容错降级 | LLM 调用失败时自动回退到邮件正文截取 |
