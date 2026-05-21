# AI Email Client

> AI-First Universal Email Client PWA

An AI-enhanced email client built with Next.js 14, supporting multi-account unified inbox, AI smart summaries, and smart replies, with a perfect mobile PWA experience.

---

## Overview

**AI Email Client** is a universal email client PWA (Progressive Web App). It significantly improves email processing efficiency through AI capabilities:

- **Unified Inbox**: Aggregates emails from Gmail, Outlook, and custom IMAP into a single timeline view
- **AI-Assisted Reading**: Automatically generates a structured summary of 50 words or less for each email
- **Smart Reply**: Generate 3 candidate reply drafts with one click, based on email content and a chosen tone
- **PWA Offline Support**: Service Worker caches key resources for offline reading

> This project **focuses solely on email functionality**. It does not include calendar, contact management, task management, or other modules.

---

## Core Features

| Feature | Description |
|---------|-------------|
| Unified Inbox | Multi-protocol aggregation (Gmail / Outlook / IMAP), sorted by timeline |
| Multi-Account Switching | Sidebar top dropdown menu, supports "All Accounts" aggregated view |
| Three-Column Layout | Left folder navigation / Center mail list / Right detail panel |
| AI Mail Summary | Summary of 50 words or less + key points + sentiment analysis |
| Smart Reply | 3 candidate replies (professional / friendly / concise), with tone switching |
| Responsive Design | Single-column switching on mobile, three-column adaptive on desktop |
| Infinite Scroll | Cursor-based pagination, auto-loads more emails on reaching the bottom |
| Offline Support | Service Worker caches static assets |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** (strict mode) |
| Styling | **Tailwind CSS** + Shadcn/UI variable system |
| State Management | **Zustand** |
| AI Integration | SiliconFlow / DeepSeek (OpenAI-compatible API) |
| PWA | Web App Manifest + Service Worker |
| Package Manager | **pnpm** |

---

## Project Structure

```
ai-email-client/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Main page: Unified Inbox (three-column layout)
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles + Shadcn/UI CSS variables
│   │   ├── api/                # Server API Routes
│   │   │   ├── emails/route.ts       # Unified inbox endpoint
│   │   │   └── emails/[id]/route.ts  # Mail detail endpoint
│   │   └── inbox/page.tsx      # Inbox route
│   │
│   ├── components/             # React Components
│   │   ├── ui/                 # Base UI components (button, dialog, etc.)
│   │   ├── mail/               # Mail business components
│   │   │   ├── mail-list.tsx   # Mail list
│   │   │   └── mail-detail.tsx # Mail detail
│   │   ├── ai/                 # AI feature components
│   │   │   ├── ai-summary.tsx  # AI summary display
│   │   │   └── smart-reply.tsx # Smart reply
│   │   └── layout/             # Layout components
│   │       ├── sidebar.tsx     # Sidebar
│   │       └── mobile-nav.tsx  # Mobile navigation
│   │
│   ├── hooks/                  # Custom React Hooks
│   │   ├── use-mail.ts         # Mail operation hook
│   │   ├── useEmails.ts        # Mail data hook (calls /api/emails)
│   │   ├── use-ai.ts           # AI feature hook
│   │   └── use-pwa.ts          # PWA-related hook
│   │
│   ├── lib/                    # Utilities and business logic
│   │   ├── api/                # Frontend API wrapper
│   │   │   ├── mail.ts         # Mail API
│   │   │   ├── ai.ts           # AI API
│   │   │   ├── types.ts        # Unified data model (UnifiedEmail)
│   │   │   ├── gmail.ts        # Gmail protocol adapter
│   │   │   ├── outlook.ts      # Outlook protocol adapter
│   │   │   └── imap.ts         # IMAP protocol adapter
│   │   ├── ai/                 # AI core logic
│   │   │   ├── agent.ts        # AI Agent (summary + reply)
│   │   │   ├── summarize.ts    # Summary service (backward compatible)
│   │   │   └── smart-reply.ts  # Smart reply (backward compatible)
│   │   ├── store/              # Zustand stores
│   │   │   ├── mail-store.ts   # Mail state
│   │   │   └── ui-store.ts     # UI state
│   │   ├── utils.ts            # Utility functions (cn, formatDate, etc.)
│   │   ├── constants.ts        # Global constants
│   │   └── adapters/           # Protocol adapters
│   │       ├── gmail.ts
│   │       ├── graph.ts
│   │       └── imap.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── mail.ts             # Mail-related types
│   │   ├── ai.ts               # AI-related types
│   │   └── index.ts            # Unified exports
│   │
│   └── styles/
│       └── globals.css
│
├── public/                     # Static assets
│   ├── manifest.json           # PWA Web App Manifest
│   └── icons/                  # PWA icons
│       └── icon.svg            # SVG placeholder icon
│
├── ARCHITECTURE.md             # Architecture design document
├── CLAUDE.md                   # Project instructions and development guidelines
├── DELIVERY.md                 # Delivery checklist (all modules completed in this project)
├── .env.example                # Environment variable template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Quick Start

### 1. Prerequisites

- Node.js >= 18.0
- pnpm >= 8.0 (or npm / yarn)

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the environment variable template:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your AI API Key:

```env
NEXT_PUBLIC_AI_PROVIDER=siliconflow
NEXT_PUBLIC_AI_API_KEY=sk-your-api-key-here
```

### 4. Start the Development Server

```bash
pnpm dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### 5. Build for Production

```bash
pnpm build
pnpm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_AI_PROVIDER` | No | `siliconflow` | AI provider: `siliconflow` / `deepseek` / `openai-compatible` |
| `NEXT_PUBLIC_AI_API_KEY` | Yes | - | AI API Key (obtained from SiliconFlow or DeepSeek) |
| `NEXT_PUBLIC_AI_BASE_URL` | No | Auto-filled based on provider | Custom API base URL |
| `NEXT_PUBLIC_AI_MODEL` | No | `deepseek-ai/DeepSeek-V3` | Model name to use |

---

## Development Guide

### Code Standards

- TypeScript strict mode, no `any`
- All components use functional style + Hooks
- API requests are uniformly encapsulated in `src/lib/api/`
- Key business logic should include comments

### Commit Conventions

```
feat: new feature
fix: bug fix
refactor: refactoring (no change in behavior)
style: code formatting adjustments
docs: documentation updates
test: testing related
chore: build, dependency updates, and other miscellaneous tasks
```

### Adding a New Protocol Adapter

1. Create a new adapter file under `src/lib/adapters/`
2. Implement the `convertToUnified(rawData, accountId): UnifiedEmail` function
3. Add the protocol route in `src/app/api/emails/route.ts`

---

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Native Next.js support, zero-configuration deployment.

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
