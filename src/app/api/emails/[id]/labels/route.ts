// API Route: POST /api/emails/[id]/labels
// 管理邮件标签 — Gmail 添加/移除 labels，Outlook 设置 categories

import { NextRequest, NextResponse } from "next/server";

/**
 * POST: 为邮件添加或移除标签
 * 请求体: { add?: string[]; remove?: string[] }
 *
 * Gmail: 通过 modify API 添加/移除 labelIds
 * Outlook: 通过 PATCH 更新 categories 字段
 * Demo 模式: 模拟成功
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const { add = [], remove = [] } = body as { add?: string[]; remove?: string[] };

  // Gmail: 调用 modify 添加/移除标签
  const gmailToken = process.env.GMAIL_ACCESS_TOKEN ?? null;
  if (gmailToken) {
    const modifyBody: Record<string, string[]> = {};
    if (add.length > 0) modifyBody.addLabelIds = add;
    if (remove.length > 0) modifyBody.removeLabelIds = remove;

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modifyBody),
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { code: "LABEL_FAILED", message: `Gmail 标签操作失败: ${response.status}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, protocol: "gmail", add, remove });
  }

  // Outlook: 通过 PATCH 更新 categories
  const outlookToken = process.env.OUTLOOK_ACCESS_TOKEN ?? null;
  if (outlookToken) {
    // Outlook 用 categories 数组表示标签
    const categories = add.length > 0 ? add : [];
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${outlookToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categories }),
      }
    );
    if (!response.ok) {
      return NextResponse.json(
        { code: "LABEL_FAILED", message: `Outlook 标签操作失败: ${response.status}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, protocol: "graph", add, remove });
  }

  // Demo 模式
  return NextResponse.json({ success: true, protocol: "demo", add, remove, id });
}
