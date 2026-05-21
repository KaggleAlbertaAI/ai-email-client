// API Route: GET /api/auth/outlook/callback
// Outlook OAuth 回调 — 用授权码换取 token，写入加密 cookie

import { NextRequest, NextResponse } from "next/server";
import { OUTLOOK_CONFIG } from "@/lib/auth/oauth-config";
import { setAuthCookie } from "@/lib/auth/cookies";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/settings?error=outlook_denied", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?error=outlook_missing_params", request.url));
  }

  const savedState = request.cookies.get("outlook_state")?.value;
  if (!savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/settings?error=outlook_state_mismatch", request.url));
  }

  const verifier = request.cookies.get("outlook_verifier")?.value;
  if (!verifier) {
    return NextResponse.redirect(new URL("/settings?error=outlook_missing_verifier", request.url));
  }

  const params = new URLSearchParams({
    code,
    client_id: OUTLOOK_CONFIG.clientId,
    client_secret: OUTLOOK_CONFIG.clientSecret,
    redirect_uri: OUTLOOK_CONFIG.redirectUri,
    grant_type: "authorization_code",
    code_verifier: verifier,
  });

  const tokenResponse = await fetch(OUTLOOK_CONFIG.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error(`Outlook token exchange failed: ${errorText}`);
    return NextResponse.redirect(new URL("/settings?error=outlook_token_failed", request.url));
  }

  const tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  } = await tokenResponse.json();

  const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;

  // 获取邮箱地址
  let email: string | null = null;
  try {
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      email = profile.mail ?? profile.userPrincipalName;
    }
  } catch {
    // 不影响 token 存储
  }

  const redirectUrl = new URL("/settings?connected=outlook", request.url);
  if (email) redirectUrl.searchParams.set("email", email);

  const response = NextResponse.redirect(redirectUrl);

  await setAuthCookie(response, "outlook", {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    email: email ?? undefined,
  });

  response.cookies.delete("outlook_verifier");
  response.cookies.delete("outlook_state");

  return response;
}
