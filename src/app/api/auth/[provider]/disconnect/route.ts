// API Route: POST /api/auth/[provider]/disconnect
// 断开已连接的邮箱账户，清除加密 Cookie

import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/cookies";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (provider !== "gmail" && provider !== "outlook") {
    return NextResponse.json(
      { error: `不支持的 provider: ${provider}` },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookie(response, provider);

  return response;
}
