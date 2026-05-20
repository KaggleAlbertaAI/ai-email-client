// API Route: POST /api/ai/classify
// 为指定邮件进行 AI 分类 —— 失败时返回默认分类

import { NextRequest, NextResponse } from "next/server";

const FALLBACK_CLASSIFICATION = {
  category: "normal" as const,
  priority: 3,
  requiresResponse: false,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;

    if (!email?.body?.plain) {
      return NextResponse.json(
        { code: "INVALID_INPUT", message: "缺少邮件数据" },
        { status: 400 }
      );
    }

    const { classifyMail } = await import("@/lib/ai/agent");
    const classification = await classifyMail(email);
    return NextResponse.json(classification);
  } catch {
    // 降级：返回默认分类
    return NextResponse.json(FALLBACK_CLASSIFICATION);
  }
}
