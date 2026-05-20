// API Route: POST /api/ai/smart-reply
// 为指定邮件生成智能回复建议

import { NextRequest, NextResponse } from "next/server";
import { generateReply } from "@/lib/ai/agent";
import type { ApiError } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email;
    const tone = body.tone ?? "professional";

    if (!email?.body?.plain) {
      return NextResponse.json<ApiError>(
        { code: "INVALID_INPUT", message: "缺少邮件数据" },
        { status: 400 }
      );
    }

    const replies = await generateReply(email, tone);
    return NextResponse.json(replies);
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        code: "SMART_REPLY_FAILED",
        message: error instanceof Error ? error.message : "生成回复失败",
      },
      { status: 500 }
    );
  }
}
