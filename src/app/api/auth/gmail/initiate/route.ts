// API Route: GET /api/auth/gmail/initiate
// 发起 Gmail OAuth2 PKCE 授权流程

import { NextResponse } from "next/server";
import { GMAIL_CONFIG, generateCodeVerifier, generateCodeChallenge } from "@/lib/auth/oauth-config";

export async function GET() {
  if (!GMAIL_CONFIG.clientId) {
    return NextResponse.json(
      { error: "GMAIL_CLIENT_ID 环境变量未配置" },
      { status: 500 }
    );
  }

  // 生成 PKCE verifier 和 challenge
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  // 构建授权 URL
  const authUrl = new URL(GMAIL_CONFIG.authUrl);
  authUrl.searchParams.set("client_id", GMAIL_CONFIG.clientId);
  authUrl.searchParams.set("redirect_uri", GMAIL_CONFIG.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GMAIL_CONFIG.scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authUrl.toString());

  // 将 verifier 和 state 存入 httpOnly cookie，回调时验证
  response.cookies.set("gmail_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 分钟
    path: "/",
  });

  response.cookies.set("gmail_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
