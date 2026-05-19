# AI Email Client — One-Page Architecture

## System Overview

An AI-first universal email client PWA supporting Gmail, Office 365, and IMAP with a unified inbox, AI summaries, and smart reply drafts. Built with Next.js 14 App Router, TypeScript, and Tailwind CSS.

---

## Architecture (3-Layer)

```
┌──────────────────────────────────────────────────────────────────┐
│                     PWA Client (Browser)                         │
│   ┌──────────────┐  ┌───────────┐  ┌────────────┐  ┌─────────┐ │
│   │ React UI     │  │ Zustand   │  │ Custom     │  │ PWA SW  │ │
│   │ Components   │  │ Stores    │  │ Hooks      │  │ Cache   │ │
│   └──────┬───────┘  └─────┬─────┘  └─────┬──────┘  └────┬────┘ │
│          │                │               │               │      │
│          └────────────────┴───────────────┴───────────────┘      │
│                              │ HTTP / Next.js API Routes         │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                    Next.js Server (Vercel)                        │
│                              │                                    │
│   ┌──────────────────────────┴──────────────────────────────┐    │
│   │              API Route: /api/emails                     │    │
│   │  Protocol Router → adapter.normalize() → UnifiedEmail   │    │
│   └──────┬───────────┬───────────┬───────────┬──────────────┘    │
│          │           │           │           │                    │
│   ┌──────▼──────┐ ┌─▼────────┐ ┌▼────────┐ ┌▼──────────────┐   │
│   │ Gmail       │ │ MS Graph │ │ IMAP    │ │ AI Agent      │   │
│   │ Adapter     │ │ Adapter  │ │ Adapter │ │ (Summarize/   │   │
│   └─────────────┘ └──────────┘ └─────────┘ │  Smart Reply) │   │
│                                            └───────┬───────┘   │
│                                                    │ HTTP      │
└────────────────────────────────────────────────────┼────────────┘
                                                     │
┌────────────────────────────────────────────────────┼────────────┐
│                    External Services                          │
│   ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────┐ │
│   │ Gmail    │  │ Microsoft    │  │ IMAP     │  │ LLM API   │ │
│   │ REST API │  │ Graph API    │  │ Server   │  │(SiliconFlow││
│   └──────────┘  └──────────────┘  └──────────┘  │ /DeepSeek) ││
│                                                   └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Unified Data Model

All protocol responses are normalized to a single contract — `UnifiedEmail`:

```
UnifiedEmail { id, sender, recipients, subject, body{plain, html},
  timestamps{sent, received}, flags{isRead, isStarred, isDraft, hasAttachments},
  attachments[], source{accountId, protocol, rawId}, ai?{summary, keyPoints, sentiment} }
```

This is the sole interface the frontend consumes. Protocol adapters (`gmail.ts`, `graph.ts`, `imap.ts`) convert raw API responses into this format.

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 (App Router) | SSR-ready, zero-config deployment |
| State Management | Zustand | Lightweight vs Redux, performant vs Context |
| Styling | Tailwind CSS + CSS variables | Mobile-first, easy theme switching |
| AI Integration | OpenAI-compatible API | Swappable providers (SiliconFlow, DeepSeek) |
| Data Fetching | Native fetch + Hooks | No over-engineering, upgradeable to SWR later |
| PWA | Web Manifest + Service Worker | Standard W3C, cross-platform |

---

## Project Structure (Core Files)

```
src/
├── app/          # Next.js App Router — page.tsx (unified inbox), API routes
├── components/   # React UI — mail, ai, layout components
├── hooks/        # Custom hooks — useEmails, useMail, useAI, usePWA
├── lib/          # Business logic
│   ├── api/      # API wrappers + UnifiedEmail type definition
│   ├── ai/       # AI agent (summarize + smart reply + multi-provider)
│   ├── adapters/ # Protocol adapters (gmail, graph, imap)
│   └── store/    # Zustand stores (mail, ui)
├── types/        # TypeScript type definitions
└── styles/       # Global CSS (Tailwind + Shadcn/UI variables)
```

---

## AI Features

| Feature | Input | Output | Provider |
|---------|-------|--------|----------|
| Email Summary | UnifiedEmail.body.plain | 50-char Chinese summary + key points + sentiment | SiliconFlow / DeepSeek |
| Smart Reply | Email context + tone | 3 candidate drafts (professional/friendly/concise) | Same |
| Prioritization | Email content | requiresResponse flag + sentiment analysis | Same |

**Fallback**: LLM API failure → degrade to plain text truncation (graceful degradation).
