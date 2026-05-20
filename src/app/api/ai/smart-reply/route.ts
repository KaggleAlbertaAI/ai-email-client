// API Route: POST /api/ai/smart-reply
// 为指定邮件生成智能回复建议 —— 失败时返回降级回复

import { NextRequest, NextResponse } from "next/server";

const FALLBACK_REPLIES = [
  { content: "感谢您的邮件，我会尽快处理。", tone: "professional" as const },
  { content: "谢谢你的来信，我会尽快回复！", tone: "friendly" as const },
  { content: "收到，谢谢。", tone: "concise" as const },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;
    const tone = body.tone ?? "professional";

    if (!email?.body?.plain) {
      return NextResponse.json(
        { code: "INVALID_INPUT", message: "缺少邮件数据" },
        { status: 400 }
      );
    }

    const { generateReply } = await import("@/lib/ai/agent");
    const replies = await generateReply(email, tone);
    return NextResponse.json(replies);
  } catch {
    // 降级：返回预置回复
    return NextResponse.json(FALLBACK_REPLIES);
  }
}
