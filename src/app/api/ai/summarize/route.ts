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

    // 检查 AI 环境变量
    const provider = process.env.AI_PROVIDER ?? process.env.NEXT_PUBLIC_AI_PROVIDER ?? "siliconflow";
    const apiKey = process.env.AI_API_KEY ?? process.env.NEXT_PUBLIC_AI_API_KEY ?? "";
    const baseUrl = process.env.AI_BASE_URL ?? process.env.NEXT_PUBLIC_AI_BASE_URL ?? "";
    const model = process.env.AI_MODEL ?? process.env.NEXT_PUBLIC_AI_MODEL ?? "";

    console.log("[ai/summarize] provider:", provider, "apiKey:", apiKey ? `present (${apiKey.length} chars)` : "EMPTY", "baseUrl:", baseUrl || "(default)", "model:", model || "(default)");

    // 动态导入 agent，避免构建时依赖
    const { generateSummary } = await import("@/lib/ai/agent");
    const summary = await generateSummary(email as UnifiedEmail);
    console.log("[ai/summarize] summary generated:", summary.summary.slice(0, 30) + "...");
    return NextResponse.json(summary);
  } catch (error) {
    // 降级：返回邮件正文的截断版本
    console.error("[ai/summarize] Error:", error);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(fallbackSummary(body.email));
  }
}
