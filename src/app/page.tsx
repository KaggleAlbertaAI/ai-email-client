"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store/ui-store";
import { useEmails } from "@/hooks/useEmails";
import { useAI } from "@/hooks/use-ai";
import { usePWA } from "@/hooks/use-pwa";
import { SmartReply } from "@/components/ai/smart-reply";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import { ComposeForm, ComposeMode } from "@/components/mail/compose-form";
import type { UnifiedEmail, UnifiedAccount } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";
import { archiveEmail, updateEmailLabels } from "@/lib/api/mail";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
//  模拟账户数据 —— 实际项目中从 /api/accounts 获取
// ---------------------------------------------------------------------------

const MOCK_ACCOUNTS: UnifiedAccount[] = [
  {
    id: "acc-gmail-1",
    name: "Google Account",
    email: "user@gmail.com",
    protocol: "gmail",
    isConnected: true,
    lastSyncedAt: new Date().toISOString(),
    unreadCount: 12,
  },
  {
    id: "acc-outlook-1",
    name: "Work Account",
    email: "user@company.com",
    protocol: "graph",
    isConnected: true,
    lastSyncedAt: new Date().toISOString(),
    unreadCount: 5,
  },
  {
    id: "acc-imap-1",
    name: "Personal IMAP",
    email: "user@custom-mail.com",
    protocol: "imap",
    isConnected: true,
    lastSyncedAt: null,
    unreadCount: 3,
  },
];

// ---------------------------------------------------------------------------
//  文件夹配置
// ---------------------------------------------------------------------------

const FOLDERS = [
  { id: "inbox", name: "Inbox", icon: "inbox" },
  { id: "sent", name: "Sent", icon: "send" },
  { id: "draft", name: "Drafts", icon: "draft" },
  { id: "starred", name: "Starred", icon: "star" },
  { id: "archived", name: "Archive", icon: "archive" },
];

// ---------------------------------------------------------------------------
//  图标 SVG（内联，避免引入外部库）
// ---------------------------------------------------------------------------

const ICONS: Record<string, React.ReactNode> = {
  inbox: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  ),
  send: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  draft: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  star: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  archive: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  ),
  chevron: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  back: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
//  主页面组件
// ---------------------------------------------------------------------------

export default function Home() {
  const router = useRouter();
  // UI 状态
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  // 移动端视图控制："list" | "detail"
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // 撰写/回复/转发面板
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
  const [composeEmail, setComposeEmail] = useState<UnifiedEmail | null>(null);

  // 已发送邮件列表（本地维护）
  const [sentEmails, setSentEmails] = useState<UnifiedEmail[]>([]);
  const [sentLoading, setSentLoading] = useState(false);

  // 打开 compose
  const openCompose = useCallback((mode: ComposeMode, email?: UnifiedEmail) => {
    setComposeMode(mode);
    setComposeEmail(email ?? null);
  }, []);

  // 关闭 compose
  const closeCompose = useCallback(() => {
    setComposeMode(null);
    setComposeEmail(null);
  }, []);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // 使用 useEmails hook 获取真实数据
  const { emails, loading, error, selectedEmail, loadInbox, selectEmail, loadMore, removeEmail, archiveEmailLocal, addLabelToLocalEmail, toggleStarLocal } = useEmails();

  // AI 功能 hook
  const { summary, replies, classification, isLoading: aiLoading, summarize, getSmartReplies, classify } = useAI();

  // PWA 状态
  const { isOnline } = usePWA();

  // AI 摘要生成状态（记录已生成摘要的邮件 ID）
  const [summarizedIds, setSummarizedIds] = useState<Set<string>>(new Set());

  // 选择邮件并触发 AI 处理
  const handleSelectEmail = useCallback(
    (email: UnifiedEmail) => {
      console.log("[page] handleSelectEmail clicked, id:", email.id, "has body.plain:", !!email.body?.plain, "plainLen:", email.body?.plain?.length || 0, "has body.html:", !!email.body?.html);
      selectEmail(email);
      setMobileView("detail");

      // 首次选中时触发 AI 摘要和分类
      if (!summarizedIds.has(email.id)) {
        console.log("[page] First time selecting this email, triggering AI summary and classify");
        summarize(email);
        classify(email);
        setSummarizedIds((prev) => new Set(prev).add(email.id));
      } else {
        console.log("[page] Email already summarized, skipping AI calls");
      }
    },
    [selectEmail, summarizedIds, summarize, classify]
  );

  // 返回列表（移动端）
  const handleBackToList = useCallback(() => {
    setMobileView("list");
    selectEmail(null);
  }, [selectEmail]);

  // 回复/转发
  const handleReply = useCallback((mode: ComposeMode) => {
    if (!selectedEmail) {
      console.warn("handleReply: no selectedEmail");
      return;
    }
    console.log("handleReply:", mode, selectedEmail.subject);
    openCompose(mode, selectedEmail);
  }, [selectedEmail, openCompose]);

  const handleComposeSent = useCallback(() => {
    setComposeMode(null);
    setComposeEmail(null);
    loadInbox();
  }, [loadInbox]);

  // 搜索（前端过滤已加载的邮件）
  const handleSearch = useCallback(() => {
    loadInbox(searchQuery ? { searchQuery } : undefined);
    setShowSearch(false);
  }, [searchQuery, loadInbox]);

  // 删除邮件 — 先更新本地状态，再调 API
  const handleDelete = useCallback(async () => {
    if (!selectedEmail) return;
    try {
      // 先同步本地 UI 状态，用户立即看到变化
      removeEmail(selectedEmail.id);
      const response = await fetch(`/api/emails/${selectedEmail.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        // API 失败，恢复邮件
        loadInbox();
      }
    } catch {
      // 网络失败，恢复邮件
      loadInbox();
    }
  }, [selectedEmail, removeEmail, loadInbox]);

  // 归档邮件 — 先更新本地状态，再调 API
  const handleArchive = useCallback(async () => {
    if (!selectedEmail) return;
    try {
      archiveEmailLocal(selectedEmail.id);
      await archiveEmail(selectedEmail.id);
    } catch {
      loadInbox();
    }
  }, [selectedEmail, archiveEmailLocal, loadInbox]);

  // 切换星标 — 先更新本地状态，再调 API
  const handleToggleStar = useCallback(async () => {
    if (!selectedEmail) return;
    const newStarred = !selectedEmail.flags.isStarred;
    // 先更新本地状态，用户立即看到变化
    toggleStarLocal(selectedEmail.id);
    try {
      await fetch(`/api/emails/${selectedEmail.id}/star`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: newStarred }),
      });
    } catch {
      // API 失败，回滚本地状态
      loadInbox();
    }
  }, [selectedEmail, toggleStarLocal, loadInbox]);

  // 快速添加标签 — 先本地同步，再调 API
  const handleAddLabel = useCallback(async (label: string) => {
    if (!selectedEmail) return;
    try {
      addLabelToLocalEmail(selectedEmail.id, label);
      await updateEmailLabels(selectedEmail.id, { add: [label] });
    } catch {
      loadInbox();
    }
  }, [selectedEmail, addLabelToLocalEmail, loadInbox]);

  // 当前账户名称
  const currentAccountName = useMemo(() => {
    if (selectedAccountId === "all") return "All Accounts";
    const account = MOCK_ACCOUNTS.find((a) => a.id === selectedAccountId);
    return account?.name ?? "Unknown Account";
  }, [selectedAccountId]);

  // 组件挂载时加载邮件
  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换文件夹时加载对应数据
  const handleFolderChange = useCallback(async (folderId: string) => {
    setActiveFolder(folderId);
    selectEmail(null);
    setMobileView("list");

    if (folderId === "sent") {
      setSentLoading(true);
      try {
        const response = await fetch("/api/mail/send");
        if (response.ok) {
          const data: UnifiedEmail[] = await response.json();
          setSentEmails(data);
        }
      } catch {
        // 加载失败不影响其他操作
      } finally {
        setSentLoading(false);
      }
    } else {
      // 收件箱、星标、归档等文件夹，调用 /api/emails 并传入 folder 参数
      loadInbox({ folder: folderId });
    }
  }, [selectEmail, loadInbox]);

  // 邮件列表滚动容器 ref —— 用于触底加载更多
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || loading || !emails.length) return;
    // 距离底部 100px 时触发加载
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      loadMore();
    }
  }, [loading, emails.length, loadMore]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* ===== 左侧侧边栏 ===== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex-col border-r bg-muted/30 p-4 transition-transform md:relative md:translate-x-0",
          sidebarOpen ? "flex" : "-translate-x-full md:flex md:w-20 lg:w-64"
        )}
      >
        {/* 应用 Logo */}
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13 2 4" />
            </svg>
          </div>
          <span className={cn("font-bold tracking-tight", "lg:inline hidden")}>AI Mail</span>
        </div>

        {/* 账户切换下拉菜单 */}
        <div className="relative mb-4">
          <button
            onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
              {currentAccountName.charAt(0)}
            </div>
            <span className="truncate flex-1 text-xs lg:text-sm">{currentAccountName}</span>
            <span className="transition-transform duration-200" style={{ transform: accountDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              {ICONS.chevron}
            </span>
          </button>

          {accountDropdownOpen && (
            <>
              {/* 点击外部关闭 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAccountDropdownOpen(false)}
              />
              <div className="absolute z-50 mt-1 w-full max-w-[280px] rounded-lg border bg-white p-1 shadow-xl">
                <button
                  onClick={() => {
                    setSelectedAccountId("all");
                    setAccountDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    selectedAccountId === "all" ? "bg-muted font-medium" : "hover:bg-muted"
                  )}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <span>All Accounts</span>
                </button>
                {MOCK_ACCOUNTS.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setAccountDropdownOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      selectedAccountId === account.id ? "bg-muted font-medium" : "hover:bg-muted"
                    )}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold">
                      {account.name.charAt(0)}
                    </div>
                    <span className="truncate flex-1">{account.email}</span>
                    {account.unreadCount > 0 && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                        {account.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 文件夹导航 */}
        <nav className="space-y-1">
          {FOLDERS.map((folder) => {
            const unread =
              folder.id === "inbox"
                ? emails.filter((e) => !e.flags.isRead).length
                : 0;
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  activeFolder === folder.id
                    ? "bg-primary/10 font-medium"
                    : "hover:bg-muted"
                )}
              >
                {ICONS[folder.icon]}
                <span className="flex-1 truncate lg:inline hidden">{folder.name}</span>
                {unread > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 设置链接 */}
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => router.push("/settings")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="flex-1 truncate lg:inline hidden">Settings</span>
          </button>
        </div>
      </aside>

      {/* ===== 中间邮件列表 ===== */}
      <div
        className={cn(
          "flex min-w-0 flex-col border-r md:flex",
          "w-full md:w-96 lg:w-[420px]",
          // 移动端：只显示列表或详情
          mobileView === "detail" && "hidden md:flex"
        )}
      >
        {/* 列表头部 */}
        {showSearch ? (
          <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                loadInbox();
              }}
              className="rounded-md p-2 transition-colors hover:bg-muted"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search emails..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button
              onClick={handleSearch}
              className="rounded-md bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSidebar}
                className="rounded-md p-2 transition-colors hover:bg-muted md:hidden"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setShowSearch(true)}
                className="rounded-md p-2 transition-colors hover:bg-muted"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
            <h1 className="text-base font-semibold">
              {activeFolder === "sent" ? "Sent" : activeFolder === "starred" ? "Starred" : activeFolder === "archived" ? "Archive" : activeFolder === "draft" ? "Drafts" : "Inbox"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openCompose("new")}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Compose
              </button>
              <span className="text-xs text-muted-foreground">
                {activeFolder === "sent" ? sentEmails.length : emails.length} emails
              </span>
            </div>
          </div>
        )}

        {/* 邮件列表内容 —— 虚拟滚动容器 */}
        <div ref={listRef} onScroll={activeFolder === "inbox" ? handleScroll : undefined} className="flex-1 overflow-y-auto" role="list" aria-label="邮件列表">
          {/* 已发送文件夹 */}
          {activeFolder === "sent" ? (
            sentLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-lg border p-4">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : sentEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg className="mb-4 h-16 w-16 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <p className="text-sm text-muted-foreground">No sent emails</p>
              </div>
            ) : (
              <div className="divide-y">
                {sentEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={cn(
                      "w-full border-b p-4 text-left transition-colors hover:bg-muted",
                      selectedEmail?.id === email.id && "bg-muted"
                    )}
                    role="listitem"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStarLocal(email.id);
                            fetch(`/api/emails/${email.id}/star`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ starred: !email.flags.isStarred }),
                            }).catch(() => loadInbox());
                          }}
                          className={cn(
                            "shrink-0 transition-colors hover:text-amber-500",
                            email.flags.isStarred ? "text-amber-500" : "text-muted-foreground/40"
                          )}
                          title={email.flags.isStarred ? "Remove star" : "Add star"}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill={email.flags.isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                        <span className="shrink-0 text-green-500">{ICONS.send}</span>
                        <span className="truncate text-sm font-medium">
                          {email.recipients.filter((r) => r.type === "to").map((r) => r.email).join(", ")}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(new Date(email.timestamps.sent))}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm">{email.subject}</p>
                  </button>
                ))}
              </div>
            )
          ) : loading ? (
            /* 收件箱 — 加载中 */
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                  <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
                  <div className="mt-1 h-3 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* 收件箱 — 加载失败 */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="mb-4 h-16 w-16 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="mb-2 text-sm text-muted-foreground">Failed to load</p>
              <p className="max-w-xs text-xs text-red-400">{error}</p>
              <button
                onClick={() => loadInbox()}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Retry
              </button>
            </div>
          ) : emails.length === 0 ? (
            /* 收件箱 — 空 */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="mb-4 h-16 w-16 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13 2 4" />
              </svg>
              <p className="text-sm text-muted-foreground">No emails</p>
            </div>
          ) : (
            /* 收件箱 — 邮件列表 */
            <div className="divide-y">
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={cn(
                    "w-full border-b p-4 text-left transition-colors hover:bg-muted",
                    selectedEmail?.id === email.id && "bg-muted",
                    !email.flags.isRead && "bg-primary/5"
                  )}
                  role="listitem"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarLocal(email.id);
                          fetch(`/api/emails/${email.id}/star`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ starred: !email.flags.isStarred }),
                          }).catch(() => loadInbox());
                        }}
                        className={cn(
                          "shrink-0 transition-colors hover:text-amber-500",
                          email.flags.isStarred ? "text-amber-500" : "text-muted-foreground/40"
                        )}
                        title={email.flags.isStarred ? "Remove star" : "Add star"}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill={email.flags.isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                      {email.ai?.requiresResponse && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" title="Needs reply" />
                      )}
                      {!email.flags.isRead && !email.ai?.requiresResponse && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      {email.flags.isStarred && (
                        <span className="shrink-0 text-amber-500">{ICONS.star}</span>
                      )}
                      <span
                        className={cn(
                          "truncate text-sm",
                          !email.flags.isRead ? "font-semibold" : "font-medium"
                        )}
                      >
                        {email.sender.name || email.sender.email}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(new Date(email.timestamps.received))}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm">{email.subject}</p>
                  {email.ai?.summary && (
                    <p className="mt-1 truncate text-xs text-muted-foreground/80">
                      <span className="text-primary/70">AI: </span>
                      {email.ai.summary}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== 右侧邮件详情面板 ===== */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col bg-background",
          "hidden md:flex",
          // 移动端：只显示详情
          mobileView === "detail" && "flex md:flex"
        )}
      >
        {selectedEmail ? (
          <>
            {/* 详情头部 —— 移动端包含返回按钮 */}
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBackToList}
                  className="rounded-md p-2 transition-colors hover:bg-muted md:hidden"
                >
                  {ICONS.back}
                </button>
              </div>
              <h2 className="truncate text-sm font-semibold">{selectedEmail.subject}</h2>
              <button
                onClick={handleArchive}
                className="rounded-md p-2 transition-colors hover:bg-muted"
                title="Archive email"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 8v13H3V8" />
                  <path d="M1 3h22v5H1z" />
                  <path d="M10 12h4" />
                </svg>
              </button>
              <button
                onClick={handleToggleStar}
                className={cn(
                  "rounded-md p-2 transition-colors hover:bg-muted",
                  selectedEmail.flags.isStarred ? "text-amber-500" : "text-muted-foreground"
                )}
                title={selectedEmail.flags.isStarred ? "Remove star" : "Add star"}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill={selectedEmail.flags.isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-50"
                title="Delete email"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>

            {/* 详情内容 */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
              {/* 发件人信息 */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                  {(selectedEmail.sender.name || selectedEmail.sender.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {selectedEmail.sender.name || selectedEmail.sender.email}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(new Date(selectedEmail.timestamps.received))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedEmail.sender.email}</p>
                </div>
              </div>

              {/* 标签显示与添加 */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {selectedEmail.labels?.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {label}
                  </span>
                ))}
                <button
                  onClick={() => {
                    const label = prompt("Enter label name:");
                    if (label?.trim()) {
                      handleAddLabel(label.trim());
                    }
                  }}
                  className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  + Label
                </button>
              </div>

              {/* 回复/转发操作按钮 */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleReply("reply")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 17 4 12 9 7" />
                    <path d="M20 18v-2a4 4 0 00-4-4H4" />
                  </svg>
                  Reply
                </button>
                <button
                  onClick={() => handleReply("replyAll")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="7 17 2 12 7 7" />
                    <polyline points="17 17 12 12 17 7" />
                    <path d="M22 18v-2a4 4 0 00-4-4H4" />
                  </svg>
                  Reply All
                </button>
                <button
                  onClick={() => handleReply("forward")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 17 20 12 15 7" />
                    <path d="M4 18v-2a4 4 0 014-4h12" />
                  </svg>
                  Forward
                </button>
              </div>

              {/* AI 摘要 + 分类 */}
              <div className="mt-4 space-y-3">
                {aiLoading && !summary ? (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a10 10 0 0110 10" />
                      </svg>
                      AI is analyzing email...
                    </div>
                  </div>
                ) : summary ? (
                  <>
                    <div className="rounded-lg border bg-muted/50 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                          </svg>
                          AI Summary
                        </div>
                        {/* 优先级标签 */}
                        {classification && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              classification.category === "important"
                                ? "bg-red-100 text-red-700"
                                : classification.category === "promotional"
                                  ? "bg-green-100 text-green-700"
                                  : classification.category === "social"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {classification.category === "important" && "Important"}
                            {classification.category === "normal" && "Normal"}
                            {classification.category === "promotional" && "Promotional"}
                            {classification.category === "social" && "Social"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90">{summary.summary}</p>
                      {summary.keyPoints && summary.keyPoints.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {summary.keyPoints.map((point, i) => (
                            <li key={i} className="text-xs text-muted-foreground">
                              • {point}
                            </li>
                          ))}
                        </ul>
                      )}
                      {summary.requiresResponse && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          AI suggests a reply is needed
                        </div>
                      )}
                    </div>

                    {/* 智能回复建议 */}
                    <button
                      onClick={() => getSmartReplies(selectedEmail)}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      {replies.length > 0 ? "Refresh smart replies" : "Generate smart reply suggestions"}
                    </button>

                    {replies.length > 0 && (
                      <SmartReply
                        suggestions={replies.map((r) => ({ content: r.content, tone: r.tone }))}
                        onSelect={(content) => {
                          navigator.clipboard?.writeText(content);
                          // TODO: 未来填充到回复框
                        }}
                      />
                    )}
                  </>
                ) : null}
              </div>

              {/* 正文 */}
              <div className="mt-6 min-w-0 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                {selectedEmail.body.plain}
              </div>

              {/* 附件 */}
              {selectedEmail.attachments.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Attachments ({selectedEmail.attachments.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-muted"
                      >
                        <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span className="max-w-[120px] truncate">{att.filename}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* 未选择邮件时的占位 */
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <svg
              className="mb-4 h-20 w-20 text-muted-foreground/50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13 2 4" />
            </svg>
            <p className="text-sm text-muted-foreground">Select an email to start reading</p>
          </div>
        )}
      </div>

      {/* ===== 离线横幅 ===== */}
      {!isOnline && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-950">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18.36 19.61A9 9 0 105.64 5.64" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          Offline mode — only cached emails are available
        </div>
      )}

      {/* ===== PWA 安装引导 ===== */}
      <PWAInstallPrompt />

      {/* ===== 撰写/回复/转发面板（固定定位覆盖层） ===== */}
      {composeMode && (() => {
        const composeData = composeEmail
          ? {
              sender: composeEmail.sender,
              recipients: composeEmail.recipients,
              subject: composeEmail.subject,
              body: { plain: composeEmail.body.plain },
            }
          : undefined;

        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
            className="bg-black/50 p-2 md:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCompose();
            }}
          >
            <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-300 bg-white shadow-2xl md:h-auto md:max-h-[85vh] md:max-w-2xl">
              <ComposeForm
                mode={composeMode}
                originalEmail={composeData}
                onSent={handleComposeSent}
                onClose={closeCompose}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
