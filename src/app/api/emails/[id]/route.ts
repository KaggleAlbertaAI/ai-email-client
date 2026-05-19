// API Route: /api/emails/[id]
// 获取单封邮件详情

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // TODO: 实现邮件详情获取
  // 1. 根据 rawId 和 source.protocol 路由到对应适配器
  // 2. 获取完整邮件数据 (含附件元信息)
  // 3. 标记为已读 (可选参数)
  // 4. 返回 UnifiedEmail

  return NextResponse.json({ id });
}
