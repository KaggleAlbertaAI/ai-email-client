// API Route: POST /api/ai/summarize
// 为指定邮件生成 AI 摘要

import { NextRequest, NextResponse } from "next/server";
import { generateSummary } from "@/lib/ai/agent";
import type { ApiError } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;

    if (!email?.body?.plain) {
      return NextResponse.json<ApiError>(
        { code: "INVALID_INPUT", message: "缺少邮件数据，需传入完整的 email 对象" },
        { status: 400 }
      );
    }

    const summary = await generateSummary(email);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        code: "SUMMARIZE_FAILED",
        message: error instanceof Error ? error.message : "生成摘要失败",
      },
      { status: 500 }
    );
  }
}
