"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store/ui-store";
import { useEmails } from "@/hooks/useEmails";
import type { UnifiedEmail, UnifiedAccount } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
//  模拟账户数据 —— 实际项目中从 /api/accounts 获取
// ---------------------------------------------------------------------------

const MOCK_ACCOUNTS: UnifiedAccount[] = [
  {
    id: "acc-gmail-1",
    name: "Google 账户",
    email: "user@gmail.com",
    protocol: "gmail",
    isConnected: true,
    lastSyncedAt: new Date().toISOString(),
    unreadCount: 12,
  },
  {
    id: "acc-outlook-1",
    name: "工作账户",
    email: "user@company.com",
    protocol: "graph",
    isConnected: true,
    lastSyncedAt: new Date().toISOString(),
    unreadCount: 5,
  },
  {
    id: "acc-imap-1",
    name: "个人 IMAP",
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
  { id: "inbox", name: "收件箱", icon: "inbox" },
  { id: "sent", name: "已发送", icon: "send" },
  { id: "draft", name: "草稿箱", icon: "draft" },
  { id: "starred", name: "星标邮件", icon: "star" },
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
  // UI 状态
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  // 移动端视图控制："list" | "detail"
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // 使用 useEmails hook 获取真实数据
  const { emails, loading, selectedEmail, loadInbox, selectEmail, loadMore } = useEmails();

  // 账户切换时刷新
  const handleAccountChange = useCallback(
    (accountId: string) => {
      setSelectedAccountId(accountId);
      setAccountDropdownOpen(false);
      loadInbox(accountId !== "all" ? { accountId } : undefined);
    },
    [loadInbox]
  );

  // 选择邮件
  const handleSelectEmail = useCallback(
    (email: UnifiedEmail) => {
      selectEmail(email);
      setMobileView("detail");
    },
    [selectEmail]
  );

  // 返回列表（移动端）
  const handleBackToList = useCallback(() => {
    setMobileView("list");
    selectEmail(null);
  }, [selectEmail]);

  // 当前账户名称
  const currentAccountName = useMemo(() => {
    if (selectedAccountId === "all") return "所有账户";
    const account = MOCK_ACCOUNTS.find((a) => a.id === selectedAccountId);
    return account?.name ?? "未知账户";
  }, [selectedAccountId]);

  // 组件挂载时加载邮件
  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
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
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-1 shadow-lg">
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
                  <span>所有账户</span>
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
                onClick={() => setActiveFolder(folder.id)}
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
      </aside>

      {/* ===== 中间邮件列表 ===== */}
      <div
        className={cn(
          "flex flex-col border-r md:flex",
          "w-full md:w-96 lg:w-[420px]",
          // 移动端：只显示列表或详情
          mobileView === "detail" && "hidden md:flex"
        )}
      >
        {/* 列表头部 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
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
          <h1 className="text-base font-semibold">收件箱</h1>
          <span className="text-xs text-muted-foreground">{emails.length} 封邮件</span>
        </div>

        {/* 邮件列表内容 —— 虚拟滚动容器 */}
        <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto" role="list" aria-label="邮件列表">
          {loading ? (
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
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="mb-4 h-16 w-16 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13 2 4" />
              </svg>
              <p className="text-sm text-muted-foreground">没有邮件</p>
            </div>
          ) : (
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
                      {!email.flags.isRead && (
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
                  {/* AI 摘要预览 */}
                  {email.ai?.summary && (
                    <p className="mt-1 truncate text-xs text-muted-foreground/80">
                      <span className="text-primary/70">AI：</span>
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
          "flex flex-1 flex-col bg-background",
          "hidden md:flex",
          // 移动端：只显示详情
          mobileView === "detail" && "flex md:flex"
        )}
      >
        {selectedEmail ? (
          <>
            {/* 详情头部 —— 移动端包含返回按钮 */}
            <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <button
                onClick={handleBackToList}
                className="rounded-md p-2 transition-colors hover:bg-muted md:hidden"
              >
                {ICONS.back}
              </button>
              <h2 className="truncate text-sm font-semibold">{selectedEmail.subject}</h2>
            </div>

            {/* 详情内容 */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
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

              {/* AI 摘要 */}
              {selectedEmail.ai && (
                <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2z" />
                      <path d="M12 8v4l3 3" />
                    </svg>
                    AI 摘要
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedEmail.ai.summary}</p>
                  {selectedEmail.ai.keyPoints && selectedEmail.ai.keyPoints.length > 0 && (
                    <ul className="mt-2 list-inside space-y-0.5">
                      {selectedEmail.ai.keyPoints.map((point, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* 正文 */}
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selectedEmail.body.plain}
              </div>

              {/* 附件 */}
              {selectedEmail.attachments.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    附件（{selectedEmail.attachments.length}）
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
            <p className="text-sm text-muted-foreground">选择一封邮件开始阅读</p>
          </div>
        )}
      </div>
    </div>
  );
}
