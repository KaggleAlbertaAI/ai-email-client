// API Route: POST /api/ai/classify
// 为指定邮件进行 AI 分类和优先级评估

import { NextRequest, NextResponse } from "next/server";
import { classifyMail } from "@/lib/ai/agent";
import type { ApiError } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;

    if (!email?.body?.plain) {
      return NextResponse.json<ApiError>(
        { code: "INVALID_INPUT", message: "缺少邮件数据" },
        { status: 400 }
      );
    }

    const classification = await classifyMail(email);
    return NextResponse.json(classification);
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        code: "CLASSIFY_FAILED",
        message: error instanceof Error ? error.message : "邮件分类失败",
      },
      { status: 500 }
    );
  }
}
