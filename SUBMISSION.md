# AI Email Client — Competition Submission

## 1. Live Vercel URL

**https://ai-email-pz.vercel.app/**

---

## 2. CLAUDE.md

Located at `CLAUDE.md` (root) — defines code style, directory structure, tech stack conventions, PWA requirements, and AI collaboration workflow. Enforces:
- Functional React components with TypeScript strict mode
- All API calls encapsulated in `src/lib/api/`
- Chinese comments for "why" not "what"
- Mobile-first responsive design
- Out-of-scope rejection (no calendar/contacts/tasks)

---

## 3. One-Page Architecture

Located at `ARCHITECTURE_ONE_PAGER.md`. Key highlights:

- **3-layer architecture**: PWA Client → Next.js Server (Vercel) → External Services (Gmail API, MS Graph, LLM)
- **UnifiedEmail** is the single data contract consumed by the frontend; all protocol adapters normalize to it
- **AI Pipeline**: click email → `/api/ai/summarize` → `agent.ts` → LLM → structured JSON summary → UI
- **Providers supported**: SiliconFlow, DeepSeek, Aliyun (DashScope), any OpenAI-compatible endpoint
- **Graceful degradation**: LLM failure → HTML-to-plain fallback → text truncation

---

## 4. Agents / Skills / Hooks / Plugins

### Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useEmails.ts` | Email data fetching, pagination, local state mutations (delete/archive/star/labels) |
| `use-ai.ts` | AI summary, smart reply, and classification with loading states and fallback handling |
| `use-mail.ts` | Mail operation helper (mark as read, compose trigger) |
| `use-pwa.ts` | PWA install prompt detection, online/offline status |

### API Layer (`src/lib/api/`)

| Module | Purpose |
|--------|---------|
| `ai.ts` | Client-side AI API calls (summarize, smart reply, classify) |
| `gmail.ts` | Gmail adapter — converts raw Gmail API response to UnifiedEmail |
| `outlook.ts` | Outlook/Graph API adapter |
| `imap.ts` | IMAP adapter (RFC 5322 parsing) |
| `mail.ts` | Mail action APIs (delete, archive, label, star, send) |
| `types.ts` | UnifiedEmail, UnifiedAccount, PaginatedResponse, protocol-specific types |

### AI Agent (`src/lib/ai/`)

| Module | Purpose |
|--------|---------|
| `agent.ts` | Core LLM agent — multi-provider config, chat completion, batch summarization, smart reply, classification |
| `summarize.ts` | Backward-compatible wrapper around `agent.ts` generateSummary |
| `smart-reply.ts` | Backward-compatible wrapper around `agent.ts` generateReply |

### Protocol Adapters (`src/lib/adapters/`)

| Module | Purpose |
|--------|---------|
| `gmail.ts` | Re-exports Gmail adapter |
| `graph.ts` | Re-exports Outlook/Graph adapter |
| `imap.ts` | Re-exports IMAP adapter |
| `index.ts` | Unified adapter barrel exports |

### Zustand Stores (`src/lib/store/`)

| Store | Purpose |
|-------|---------|
| `mail-store.ts` | Global mail state (selected mail, loading flags) |
| `ui-store.ts` | UI state (sidebar open, theme) |

### Claude Code Configuration

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project conventions, code style, scope constraints |
| `.claude/settings.local.json` | Permission allowlist for tool calls |
| `ARCHITECTURE_ONE_PAGER.md` | Single-page system overview for rapid onboarding |

---

## 5. Workflow Writeup

### Development Methodology

This project was built using **spec-driven development** with Claude Code CLI, following an iterative loop:

1. **Requirements → Architecture** — CLAUDE.md defined conventions upfront. `ARCHITECTURE_ONE_PAGER.md` served as the system design spec before implementation.
2. **Implement → Build → Test** — Features were implemented incrementally with TypeScript type safety enforced. Each commit passed `next build`.
3. **Debug → Diagnose → Fix** — When AI summary failed (showing truncated text instead of real summaries), the root cause was traced through 5 layers: UI → hook → client API → route handler → LLM agent. Each layer had independent fallback logic that masked the real issue.
4. **Iterate** — Debug logging was added at every layer to surface the exact failure point, leading to fixes for missing provider registration, request body double-consumption, and HTML-only email handling.

### Key Challenges Solved

| Problem | Root Cause | Solution |
|---------|-----------|----------|
| AI summary showed truncated text | `body.plain` was empty for HTML-only Gmail messages | Added `htmlToPlainText()` fallback in Gmail adapter + API route |
| No `[ai/summarize]` server logs | Provider `aliyun` not registered in `agent.ts` configs | Added `aliyun` type + DashScope endpoint config |
| `Cannot read properties of undefined` | `request.json()` consumed twice (try + catch) | Parse body once at route entry, reuse in both paths |
| OAuth token not refreshing | Middleware cookie encryption mismatch | Switched to plain httpOnly cookies read directly in route handlers |

### What Works

- **Real Gmail data** via OAuth2 PKCE (20 messages fetched per session)
- **AI summaries** generated via Aliyun DashScope (qwen3.6-plus)
- **Smart reply** with 3 tone variations (professional/friendly/concise)
- **Email classification** with category badges and priority indicators
- **PWA** with offline caching, install prompt, and responsive mobile layout
- **Account switching** between Gmail/Outlook/IMAP (unified or per-account view)
- **Compose / Reply / Forward** with auto-fill and email quoting
- **Archive, Delete, Star, Labels** — all with optimistic local state sync

### What's Next (Out of Scope for This Submission)

- Full IMAP integration (requires `node-imap` in a server environment)
- Prisma database for account persistence
- E2E test coverage beyond adapter unit tests
- Web Push notifications for new mail
