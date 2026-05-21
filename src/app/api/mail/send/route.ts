// API Route: POST /api/mail/send
// 发送邮件 — 根据账户协议类型路由到 Gmail / Outlook / SMTP

import { NextRequest, NextResponse } from "next/server";
import type { ApiError, UnifiedEmail } from "@/lib/api/types";

// 内存存储已发送邮件（容器生命周期内有效）
const sentEmails: UnifiedEmail[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, bcc, subject, body: emailBody, accountId: _accountId } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json<ApiError>(
        { code: "INVALID_INPUT", message: "缺少收件人" },
        { status: 400 }
      );
    }

    // 检查是否有 Gmail 令牌
    const gmailToken = process.env.GMAIL_ACCESS_TOKEN ?? null;
    if (gmailToken) {
      return await sendViaGmail(gmailToken, to, cc, bcc, subject, emailBody);
    }

    // 检查是否有 Outlook 令牌
    const outlookToken = process.env.OUTLOOK_ACCESS_TOKEN ?? null;
    if (outlookToken) {
      return await sendViaOutlook(outlookToken, to, cc, bcc, subject, emailBody);
    }

    // Demo 模式：存储到内存并返回成功
    const email: UnifiedEmail = {
      id: `sent-${Date.now()}`,
      sender: { email: "user@gmail.com", name: "我" },
      recipients: [
        ...to.map((addr: string) => ({ email: addr, type: "to" as const })),
        ...(cc?.map((addr: string) => ({ email: addr, type: "cc" as const })) ?? []),
        ...(bcc?.map((addr: string) => ({ email: addr, type: "bcc" as const })) ?? []),
      ],
      subject,
      body: { plain: emailBody },
      timestamps: { sent: new Date().toISOString(), received: new Date().toISOString() },
      flags: { isRead: true, isStarred: false, isDraft: false, hasAttachments: false },
      attachments: [],
      labels: ["已发送"],
      source: { accountId: "demo", protocol: "gmail", rawId: `sent-${Date.now()}` },
    };
    sentEmails.unshift(email);

    return NextResponse.json({
      success: true,
      message: "邮件已发送（Demo 模式）",
      demo: true,
    });
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        code: "SEND_FAILED",
        message: error instanceof Error ? error.message : "发送失败",
      },
      { status: 500 }
    );
  }
}

/** GET /api/mail/send — 获取已发送邮件列表 */
export async function GET() {
  return NextResponse.json(sentEmails);
}

/** 通过 Gmail API 发送邮件 */
async function sendViaGmail(
  token: string,
  to: string[],
  cc: string[] | undefined,
  bcc: string[] | undefined,
  subject: string,
  body: string
) {
  // 构造 RFC 2822 格式邮件
  const rawEmail = buildRawEmail({ to, cc, bcc, subject, body });

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEmail }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail 发送失败: ${response.status} - ${errorText}`);
  }

  return NextResponse.json({ success: true, protocol: "gmail" });
}

/** 通过 Microsoft Graph API 发送邮件 */
async function sendViaOutlook(
  token: string,
  to: string[],
  cc: string[] | undefined,
  bcc: string[] | undefined,
  subject: string,
  body: string
) {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "Text", content: body },
          toRecipients: to.map((addr) => ({
            emailAddress: { address: addr },
          })),
          ccRecipients:
            cc?.map((addr) => ({ emailAddress: { address: addr } })) ?? [],
          bccRecipients:
            bcc?.map((addr) => ({ emailAddress: { address: addr } })) ?? [],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Outlook 发送失败: ${response.status} - ${errorText}`);
  }

  return NextResponse.json({ success: true, protocol: "graph" });
}

/**
 * 构造 Gmail API 所需的 Base64 编码邮件
 * 简化版 RFC 2822 格式
 */
function buildRawEmail(data: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}): string {
  const lines: string[] = [];
  lines.push(`To: ${data.to.join(", ")}`);
  if (data.cc?.length) lines.push(`Cc: ${data.cc.join(", ")}`);
  if (data.bcc?.length) lines.push(`Bcc: ${data.bcc.join(", ")}`);
  lines.push(`Subject: ${data.subject}`);
  lines.push("Content-Type: text/plain; charset=utf-8");
  lines.push("");
  lines.push(data.body);

  const email = lines.join("\r\n");
  return btoa(unescape(encodeURIComponent(email)));
}
