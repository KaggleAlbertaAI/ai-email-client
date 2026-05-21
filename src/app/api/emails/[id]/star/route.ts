// API Route: POST /api/emails/[id]/star
// 切换邮件星标状态 — Gmail 添加/移除 STARRED 标签

import { NextRequest, NextResponse } from "next/server";
import { extractToken } from "@/lib/auth/token-resolver";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const starred: boolean = body.starred ?? true;

  // 尝试从 cookie/header 获取 Gmail token
  const gmailToken = extractToken(request, "gmail");
  if (gmailToken) {
    const action = starred ? "modify" : "modify";
    const labels = starred
      ? { addLabelIds: ["STARRED"] }
      : { removeLabelIds: ["STARRED"] };

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/${action}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(labels),
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { code: "STAR_FAILED", message: `Gmail 操作失败: ${response.status}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, protocol: "gmail", starred });
  }

  // 尝试 Outlook token
  const outlookToken = extractToken(request, "outlook");
  if (outlookToken) {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${outlookToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flag: { flagStatus: starred ? "flagged" : "notFlagged" },
        }),
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { code: "STAR_FAILED", message: `Outlook 操作失败: ${response.status}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, protocol: "graph", starred });
  }

  // Demo 模式
  return NextResponse.json({ success: true, protocol: "demo", starred, id });
}
