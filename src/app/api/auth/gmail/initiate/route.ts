// API Route: GET /api/auth/gmail/initiate
// 发起 Gmail OAuth2 PKCE 授权流程

import { NextResponse } from "next/server";
import { getGmailConfig, generateCodeVerifier, generateCodeChallenge } from "@/lib/auth/oauth-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getGmailConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: "GMAIL_CLIENT_ID 环境变量未配置" },
      { status: 500 }
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // 将 verifier 编码到 state 中（Google 会原样返回），不再依赖 cookie
  const randomState = crypto.randomUUID();
  const combinedState = btoa(`${randomState}:${verifier}`);

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("state", combinedState);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
