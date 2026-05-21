"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

interface ComposeEmailProps {
  mode?: ComposeMode;
  /** 原始邮件（reply/forward 时传入） */
  originalEmail?: {
    sender: { name?: string; email: string };
    recipients: Array<{ name?: string; email: string; type: "to" | "cc" | "bcc" }>;
    subject: string;
    body: { plain: string };
  };
  /** 发送成功回调 */
  onSent?: () => void;
  /** 取消/关闭回调 */
  onClose?: () => void;
}

/** 解析多个收件人为数组 */
function parseRecipients(input: string): string[] {
  return input
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function ComposeForm({
  mode = "new",
  originalEmail,
  onSent,
  onClose,
}: ComposeEmailProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 根据模式初始化表单 — 只在组件挂载时执行一次
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (mode === "new") return;
    if (!originalEmail) return;

    switch (mode) {
      case "reply": {
        setTo(originalEmail.sender.email);
        setSubject(
          originalEmail.subject.startsWith("Re:")
            ? originalEmail.subject
            : `Re: ${originalEmail.subject}`
        );
        setBody(quoteEmail(originalEmail.body.plain));
        break;
      }
      case "replyAll": {
        setTo(originalEmail.sender.email);
        const ccList = originalEmail.recipients
          .filter((r) => r.type === "to")
          .map((r) => r.email)
          .join(", ");
        setCc(ccList);
        setShowCc(true);
        setSubject(
          originalEmail.subject.startsWith("Re:")
            ? originalEmail.subject
            : `Re: ${originalEmail.subject}`
        );
        setBody(quoteEmail(originalEmail.body.plain));
        break;
      }
      case "forward": {
        setTo("");
        setSubject(
          originalEmail.subject.startsWith("Fwd:")
            ? originalEmail.subject
            : `Fwd: ${originalEmail.subject}`
        );
        setBody(buildForwardBody(originalEmail));
        break;
      }
    }
  }, [mode, originalEmail]);

  /** 发送邮件 */
  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      setError("Please fill in the recipient");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const payload = {
        to: parseRecipients(to),
        cc: showCc && cc.trim() ? parseRecipients(cc) : undefined,
        bcc: bcc.trim() ? parseRecipients(bcc) : undefined,
        subject,
        body,
        // Demo 模式下模拟发送
        accountId: "acc-gmail-1",
      };

      const response = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to send");
      }

      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send, please try again");
    } finally {
      setIsSending(false);
    }
  }, [to, cc, bcc, subject, body, showCc, onSent]);

  /** 保存为草稿（存到 localStorage） */
  const handleSaveDraft = useCallback(() => {
    const draft = { to, cc, bcc, subject, body, savedAt: new Date().toISOString() };
    localStorage.setItem("mail-draft", JSON.stringify(draft));
    // 可加 toast 提示，暂时用 alert
    onClose?.();
  }, [to, cc, bcc, subject, body, onClose]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* 头部工具栏 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-2 transition-colors hover:bg-muted"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <span className="text-sm font-semibold">
            {mode === "new" ? "Compose" : mode === "forward" ? "Forward" : "Reply"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            Save Draft
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity",
              isSending ? "opacity-50" : "hover:opacity-90"
            )}
          >
            {isSending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Send
              </>
            )}
          </button>
        </div>
      </div>

      {/* 表单区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 收件人 */}
        <div className="flex items-center border-b py-3">
          <label className="w-16 shrink-0 text-sm font-medium text-muted-foreground">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Enter recipient email address"
            className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-0"
          />
        </div>

        {/* CC / BCC */}
        {showCc && (
          <>
            <div className="flex items-center border-b py-3">
              <label className="w-16 shrink-0 text-sm font-medium text-muted-foreground">CC</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Enter CC email address"
                className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-0"
              />
            </div>
            <div className="flex items-center border-b py-3">
              <label className="w-16 shrink-0 text-sm font-medium text-muted-foreground">BCC</label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Enter BCC email address"
                className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-0"
              />
            </div>
          </>
        )}

        {/* 显示 CC 按钮 */}
        {!showCc && (
          <button
            onClick={() => setShowCc(true)}
            className="mb-2 mt-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Add CC / BCC
          </button>
        )}

        {/* 主题 */}
        <div className="flex items-center border-b py-3">
          <label className="w-16 shrink-0 text-sm font-medium text-muted-foreground">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-0"
          />
        </div>

        {/* 正文 */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message..."
          rows={12}
          className="mt-4 min-h-[200px] w-full resize-none border-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 focus:ring-0"
        />
      </div>

      {/* 底部工具栏 */}
      <div className="flex shrink-0 items-center gap-2 border-t px-4 py-2 text-muted-foreground">
        <button className="rounded p-1.5 transition-colors hover:bg-muted" title="Attachment">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <span className="text-xs">{body.length} characters</span>
      </div>
    </div>
  );
}

/** 引用原文（回复时使用） */
function quoteEmail(text: string): string {
  const lines = text.split("\n").map((line) => `> ${line}`).join("\n");
  return `\n\n--- Original Message ---\n${lines}\n`;
}

/** 构建转发内容 */
function buildForwardBody(
  email: ComposeEmailProps["originalEmail"] & NonNullable<ComposeEmailProps["originalEmail"]>
): string {
  return `

---------- Forwarded Message ----------
From: ${email.sender.name ?? email.sender.email} <${email.sender.email}>
To: ${email.recipients
    .filter((r) => r.type === "to")
    .map((r) => `${r.name ?? r.email} <${r.email}>`)
    .join(", ")}
Subject: ${email.subject}
Date: ${new Date().toLocaleDateString("en-US")}

${email.body.plain}
`;
}
