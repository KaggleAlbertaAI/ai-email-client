// API Route: GET /api/mail/[id] + DELETE /api/mail/[id]
// 获取邮件详情 + 删除邮件

import { NextRequest, NextResponse } from "next/server";

/** GET: 获取邮件详情（Demo 模式返回模拟数据） */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    id: params.id,
    body: { plain: "邮件详情（Demo 模式）" },
    sender: { email: "" },
    recipients: [],
    subject: "",
    timestamps: { sent: new Date().toISOString(), received: new Date().toISOString() },
    flags: { isRead: true, isStarred: false, isDraft: false, hasAttachments: false },
    attachments: [],
    source: { accountId: "demo", protocol: "gmail", rawId: params.id },
  });
}

/** DELETE: 删除邮件 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // 检查 Gmail 令牌
  const gmailToken = process.env.GMAIL_ACCESS_TOKEN ?? null;
  if (gmailToken) {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${gmailToken}` },
      }
    );
    if (!response.ok) {
      throw new Error(`Gmail 删除失败: ${response.status}`);
    }
    return NextResponse.json({ success: true, protocol: "gmail" });
  }

  // Demo 模式：模拟删除
  return NextResponse.json({ success: true, protocol: "demo", deletedId: id });
}
