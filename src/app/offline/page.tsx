"use client";

import { useCallback } from "react";

export default function OfflinePage() {
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center text-foreground">
      <svg
        className="mb-6 h-20 w-20 text-muted-foreground/50"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M18.36 19.61A9 9 0 105.64 5.64" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
      </svg>

      <h1 className="mb-2 text-2xl font-bold">网络连接已断开</h1>
      <p className="mb-6 text-muted-foreground">
        你当前处于离线状态，无法加载新内容。
        <br />
        请检查网络连接后重试。
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleReload}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          重新加载
        </button>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg border border-border bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          返回上一页
        </button>
      </div>

      {/* 提示已缓存的内容仍然可用 */}
      <div className="mt-12 max-w-sm rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">离线提示</p>
        <p className="mt-1">
          之前加载过的邮件仍然可以在缓存中查看。返回收件箱即可访问已缓存的邮件。
        </p>
      </div>
    </div>
  );
}
