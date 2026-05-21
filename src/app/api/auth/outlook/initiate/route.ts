// API Route: GET /api/auth/outlook/initiate
// 发起 Outlook OAuth2 PKCE 授权流程

import { NextResponse } from "next/server";
import { getOutlookConfig, generateCodeVerifier, generateCodeChallenge } from "@/lib/auth/oauth-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getOutlookConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: "OUTLOOK_CLIENT_ID 环境变量未配置" },
      { status: 500 }
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authUrl.toString());

  response.cookies.set("outlook_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  response.cookies.set("outlook_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
