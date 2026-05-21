"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AccountStatus {
  provider: "gmail" | "outlook";
  connected: boolean;
  email: string | null;
  loading: boolean;
}

export default function SettingsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [gmailStatus, setGmailStatus] = useState<AccountStatus>({
    provider: "gmail",
    connected: false,
    email: null,
    loading: true,
  });
  const [outlookStatus, setOutlookStatus] = useState<AccountStatus>({
    provider: "outlook",
    connected: false,
    email: null,
    loading: true,
  });
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // 从 URL 参数读取 OAuth 回调结果
  useEffect(() => {
    const connected = params?.get("connected");
    const error = params?.get("error");
    const email = params?.get("email");

    if (connected === "gmail") {
      setGmailStatus({ provider: "gmail", connected: true, email, loading: false });
      setNotification("Gmail 账户已成功连接" + (email ? ` (${email})` : ""));
    } else if (connected === "outlook") {
      setOutlookStatus({ provider: "outlook", connected: true, email, loading: false });
      setNotification("Outlook 账户已成功连接" + (email ? ` (${email})` : ""));
    } else if (error) {
      const detail = params?.get("detail");
      setNotification(`授权失败: ${error}${detail ? `\n详情: ${decodeURIComponent(detail)}` : ""}`);
    }
  }, [params]);

  // 检查账户连接状态
  const checkStatus = useCallback(async () => {
    try {
      await fetch("/api/emails?limit=1");
    } catch {
      // 无法连接
    }

    setGmailStatus((prev) => ({ ...prev, loading: false }));
    setOutlookStatus((prev) => ({ ...prev, loading: false }));
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 清除通知
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleDisconnect = useCallback(async (provider: "gmail" | "outlook") => {
    setDisconnecting(provider);
    try {
      const response = await fetch(`/api/auth/${provider}/disconnect`, {
        method: "POST",
      });
      if (response.ok) {
        if (provider === "gmail") {
          setGmailStatus({ provider: "gmail", connected: false, email: null, loading: false });
        } else {
          setOutlookStatus({ provider: "outlook", connected: false, email: null, loading: false });
        }
        setNotification(`${provider === "gmail" ? "Gmail" : "Outlook"} 已断开连接`);
      }
    } catch {
      setNotification("断开连接失败，请重试");
    } finally {
      setDisconnecting(null);
    }
  }, []);

  const connectUrl = (provider: "gmail" | "outlook") => `/api/auth/${provider}/initiate`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 头部 */}
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <button
          onClick={() => router.push("/")}
          className="mr-4 rounded-md p-2 text-sm transition-colors hover:bg-muted"
          aria-label="返回首页"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">设置</h1>
      </header>

      {/* 通知 */}
      {notification && (
        <div className="mx-6 mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {notification}
        </div>
      )}

      {/* 内容区域 */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-xl font-semibold">邮箱账户</h2>

          <div className="space-y-4">
            {/* Gmail */}
            <div className="rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 5.457v13.911c0 .904-.732 1.636-1.636 1.636h-3.818V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.368V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Gmail</div>
                    {gmailStatus.loading ? (
                      <div className="text-xs text-muted-foreground">检查连接状态...</div>
                    ) : gmailStatus.connected ? (
                      <div className="text-xs text-green-600">
                        已连接 {gmailStatus.email ? `· ${gmailStatus.email}` : ""}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">未连接</div>
                    )}
                  </div>
                </div>
                <div>
                  {gmailStatus.connected ? (
                    <button
                      onClick={() => handleDisconnect("gmail")}
                      disabled={disconnecting === "gmail"}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {disconnecting === "gmail" ? "断开中..." : "断开连接"}
                    </button>
                  ) : (
                    <a
                      href={connectUrl("gmail")}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      连接 Gmail
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Outlook */}
            <div className="rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 7.387v10.478c0 .23 0 .419-.042.607a.82.82 0 01-.18.374.836.836 0 01-.36.24.986.986 0 01-.36.06H13.56v-7.07l-2.97 2.256L7.38 11.31v8.949H1.636A1.636 1.636 0 010 18.623V7.387c0-.23 0-.42.042-.607a.82.82 0 01.18-.375.836.836 0 01.36-.24.986.986 0 01.36-.059h6.06l3.09 2.325 3.03-2.325h10.338c.12 0 .24.02.36.06a.836.836 0 01.36.24c.09.12.15.245.18.374.042.188.042.376.042.607z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Outlook / Microsoft 365</div>
                    {outlookStatus.loading ? (
                      <div className="text-xs text-muted-foreground">检查连接状态...</div>
                    ) : outlookStatus.connected ? (
                      <div className="text-xs text-green-600">
                        已连接 {outlookStatus.email ? `· ${outlookStatus.email}` : ""}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">未连接</div>
                    )}
                  </div>
                </div>
                <div>
                  {outlookStatus.connected ? (
                    <button
                      onClick={() => handleDisconnect("outlook")}
                      disabled={disconnecting === "outlook"}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      {disconnecting === "outlook" ? "断开中..." : "断开连接"}
                    </button>
                  ) : (
                    <a
                      href={connectUrl("outlook")}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      连接 Outlook
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 环境变量配置说明 */}
          <div className="mt-8 rounded-lg border bg-muted/30 p-5">
            <h3 className="mb-3 text-sm font-semibold">环境变量配置</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              要使 OAuth 授权正常工作，需要在 Vercel 或本地环境中配置以下变量：
            </p>
            <pre className="overflow-x-auto rounded bg-muted/50 p-3 text-xs leading-relaxed">
{`GMAIL_CLIENT_ID=your-google-oauth-client-id
GMAIL_CLIENT_SECRET=your-google-oauth-client-secret
OUTLOOK_CLIENT_ID=your-microsoft-oauth-client-id
OUTLOOK_CLIENT_SECRET=your-microsoft-oauth-client-secret
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
COOKIE_ENCRYPTION_KEY=your-32-byte-random-key`}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
