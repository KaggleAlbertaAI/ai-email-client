// API Route: POST /api/emails/[id]/archive
// 归档邮件 — Gmail 移除 INBOX 标签，Outlook 移动到归档文件夹

import { NextRequest, NextResponse } from "next/server";

/**
 * 归档邮件
 * Gmail: 调用 modify 移除 INBOX 标签
 * Outlook: PATCH 移动到归档文件夹
 * Demo 模式: 模拟成功
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Gmail: 移除 INBOX 标签实现归档
  const gmailToken = process.env.GMAIL_ACCESS_TOKEN ?? null;
  if (gmailToken) {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { code: "ARCHIVE_FAILED", message: `Gmail 归档失败: ${response.status}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, protocol: "gmail", action: "archived" });
  }

  // Outlook: 移动到归档文件夹
  const outlookToken = process.env.OUTLOOK_ACCESS_TOKEN ?? null;
  if (outlookToken) {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${id}/move`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${outlookToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ destinationId: "msgfolderroot/Archive" }),
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { code: "ARCHIVE_FAILED", message: `Outlook 归档失败: ${response.status}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, protocol: "graph", action: "archived" });
  }

  // Demo 模式: 模拟归档成功
  return NextResponse.json({ success: true, protocol: "demo", action: "archived", id });
}
