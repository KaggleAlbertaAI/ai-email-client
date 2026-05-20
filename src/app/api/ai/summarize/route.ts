// API Route: POST /api/ai/summarize
// 为指定邮件生成 AI 摘要 —— 即使 AI 调用失败也返回降级数据

import { NextRequest, NextResponse } from "next/server";
import type { UnifiedEmail } from "@/lib/api/types";

function fallbackSummary(email: unknown) {
  const e = email as Record<string, unknown>;
  const body = (e.body as Record<string, unknown> | undefined)?.plain as string | undefined;
  const text = body || "";
  return {
    summary: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
    keyPoints: [] as string[],
    sentiment: "neutral" as const,
    requiresResponse: false,
  };
}

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

    // 动态导入 agent，避免构建时依赖
    const { generateSummary } = await import("@/lib/ai/agent");
    const summary = await generateSummary(email as UnifiedEmail);
    return NextResponse.json(summary);
  } catch (error) {
    // 降级：返回邮件正文的截断版本
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(fallbackSummary(body.email));
  }
}
