// API Route: POST /api/emails/[id]/archive
// 归档邮件 — Gmail 移除 INBOX 标签，Outlook 移动到归档文件夹

import { NextRequest, NextResponse } from "next/server";
import { extractToken } from "@/lib/auth/token-resolver";

/**
 * 归档邮件
 * Gmail: 调用 modify 移除 INBOX 标签
 * Outlook: PATCH 移动到归档文件夹
 * Demo 模式: 模拟成功
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  console.log("[archive] Archiving email:", id);

  // 尝试从 cookie/header 获取 Gmail token
  const gmailToken = extractToken(request, "gmail");
  console.log("[archive] Gmail token:", gmailToken ? `present (${gmailToken.length} chars)` : "none");

  if (gmailToken) {
    console.log("[archive] Calling Gmail API to remove INBOX label for:", id);
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
    console.log("[archive] Gmail API response:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[archive] Gmail archive failed:", errorText);
      return NextResponse.json(
        { code: "ARCHIVE_FAILED", message: `Gmail 归档失败: ${response.status}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, protocol: "gmail", action: "archived" });
  }

  // Outlook token
  const outlookToken = extractToken(request, "outlook");
  console.log("[archive] Outlook token:", outlookToken ? `present (${outlookToken.length} chars)` : "none");

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

  console.log("[archive] No token found, using demo mode");
  // Demo 模式: 模拟归档成功
  return NextResponse.json({ success: true, protocol: "demo", action: "archived", id });
}
