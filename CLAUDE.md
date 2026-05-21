# AI-First Universal Email Client PWA

## Project Overview

This is an **AI-first universal email client PWA** (Progressive Web App), designed to enhance users' email handling efficiency through AI capabilities.

### Core Features

- Unified Inbox: Aggregate multiple email accounts into a single management view
- AI Email Summaries: Automatically extract key points from lengthy emails
- Smart Reply: Generate reply suggestions based on context
- Email Classification & Priority Sorting
- PWA Offline Reading & Push Notifications

### Explicitly Out of Scope

> This project **focuses solely on email functionality**. It does not include calendar, contact management, task management, or other similar modules. Any requirement that deviates from the core email experience should be declined or flagged as a future iteration.

---

## Core Tech Stack

| Area             | Technology Selection                              |
| ---------------- | ------------------------------------------------- |
| Framework        | Next.js 14+ (App Router)                          |
| Language         | TypeScript (strict mode)                          |
| UI Library       | Tailwind CSS + Shadcn/UI                          |
| State Management | Zustand (global state) + React Context (local shared) |
| PWA Solution     | next-pwa (powered by Workbox)                     |
| Package Manager  | pnpm                                              |
| Code Formatting  | Prettier + ESLint                                 |
| Testing          | Vitest + React Testing Library                    |
| Database/ORM     | Prisma (if local caching is needed)               |

---

## Directory Structure Specification

```
├── src/
│   ├── app/                    # Next.js App Router: routes and pages
│   │   ├── (auth)/             # Authentication-related pages (login, register, oauth-callback)
│   │   ├── (mail)/             # Core email pages
│   │   │   ├── inbox/          # Inbox
│   │   │   ├── [mailboxId]/    # Multi-account routing
│   │   │   ├── compose/        # Compose email
│   │   │   └── settings/       # Email settings
│   │   ├── api/                # API Routes (Next.js server-side endpoints)
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   │
│   ├── components/             # UI Components
│   │   ├── ui/                 # Shadcn/UI base components (button, dialog, dropdown...)
│   │   ├── mail/               # Email business components (MailList, MailDetail, Compose...)
│   │   ├── layout/             # Layout components (Sidebar, Header, MobileNav...)
│   │   └── ai/                 # AI feature components (AISummary, SmartReply...)
│   │
│   ├── hooks/                  # Custom React Hooks
│   │   ├── use-mail.ts         # Email operations hook
│   │   ├── use-ai.ts           # AI features hook
│   │   └── use-pwa.ts          # PWA-related hooks (install prompt, offline...)
│   │
│   ├── lib/                    # Utility functions and business logic
│   │   ├── api/                # All API request wrappers
│   │   │   ├── mail.ts         # Mail API (fetch, send, delete...)
│   │   │   ├── ai.ts           # AI API (summarize, reply suggestion...)
│   │   │   └── account.ts      # Account API (connect, disconnect...)
│   │   ├── store/              # Zustand stores
│   │   │   ├── mail-store.ts   # Email state
│   │   │   └── ui-store.ts     # UI state (sidebar, theme...)
│   │   ├── utils.ts            # Common utility functions
│   │   └── constants.ts        # Global constants and configuration
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── mail.ts             # Mail-related types
│   │   ├── ai.ts               # AI-related types
│   │   └── index.ts            # Unified type exports
│   │
│   └── styles/                 # Global styles
│       └── globals.css
│
├── public/                     # Static assets (PWA icons, manifest...)
├── prisma/                     # Database schema (if needed)
└── tests/                      # Test files
    ├── unit/
    └── e2e/
```

---

## Code Style & Conventions

### Basic Principles

1. **Components must use functional style with Hooks**; class components are prohibited.
2. **All API requests must be encapsulated under `src/lib/api/`**; do not call `fetch` or external SDKs directly within components.
3. **TypeScript strict mode must be enabled**; `any` is prohibited. Use `unknown` for uncertain types and apply proper type guards.
4. **Variable and function names must be semantic**; key logic must include **Chinese comments**.
5. **When encountering complex logic, output pseudocode or an implementation plan first**, and only write concrete code after confirmation.

### Component Conventions

```tsx
// ✅ Correct: functional component + type annotations
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

### API Call Conventions

```typescript
// src/lib/api/mail.ts
// All API requests are centrally managed for unified handling of interceptors, error retries, offline caching, etc.

export async function fetchInboxMail(accountId: string, page: number = 1): Promise<Mail[]> {
  const response = await fetch(`/api/mail/inbox?accountId=${accountId}&page=${page}`);
  if (!response.ok) {
    throw new APIError(`Failed to fetch email: ${response.statusText}`, response.status);
  }
  return response.json();
}
```

### State Management Conventions

```typescript
// src/lib/store/mail-store.ts
// Use Zustand to manage global email state

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

### Comment Conventions

- Key business logic must include **Chinese comments** that explain *why* something is done, not *what* was done.
- Meaningless inline comments (e.g., `// set state`) are prohibited.
- Complex algorithms, edge-case handling, and temporary workarounds must document the reasoning.

```typescript
// ✅ Good comment: explains the motivation
// IMAP protocol returns inconsistent date formats; normalize to ISO 8601
const normalizedDate = normalizeIMAPDate(rawDate);

// ❌ Bad comment: merely restates the code itself
const mails = data.mails; // get the email list
```

---

## PWA-Specific Requirements

1. **Mobile First**: All components must consider mobile-responsive layout; minimum touch target is 44x44px.
2. **Offline Support**: Use Workbox to cache key pages and email lists, enabling offline reading.
3. **Install Prompt**: Provide a PWA installation prompt component that asks users to add the app to their home screen on first visit.
4. **Push Notifications**: Trigger Web Push notifications when new emails arrive.
5. **Performance Targets**: First Contentful Paint (FCP) < 1.5s, Time to Interactive (TTI) < 3s.

---

## AI Collaboration Guidelines

### Code Generation Requirements

1. **All generated code must be runnable**; it must not contain placeholders, TODOs, or incomplete logic.
2. Code must account for **mobile PWA responsive experience**, using Tailwind responsive utility classes.
3. When generating components, also generate the corresponding type definitions and export statements.
4. When using Shadcn/UI components, ensure they are properly installed and configured.

### Development Workflow

```
User submits a requirement
  → AI outputs an implementation plan / pseudocode
  → User confirms the approach
  → AI generates complete, runnable code
  → User tests & provides feedback
  → Iterative refinement
```

### Constraint Reminders

- If a requirement involves calendar, contacts, or other **out-of-scope** features, proactively remind the user and suggest shelving the request.
- If a requirement involves dependencies or libraries not yet installed, confirm the installation approach first.
- After each code change, briefly describe what was modified and the impact.

---

## Commit Conventions

- `feat:` new feature
- `fix:` bug fix
- `refactor:` refactoring (no change in functional behavior)
- `style:` code formatting adjustments (no impact on logic)
- `docs:` documentation updates
- `test:` testing-related changes
- `chore:` build, dependency updates, and other miscellaneous tasks

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Build the production version
pnpm build
```
