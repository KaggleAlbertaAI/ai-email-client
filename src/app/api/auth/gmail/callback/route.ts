// API Route: GET /api/auth/gmail/callback
// Gmail OAuth 回调 — 用授权码换取 token，写入加密 cookie

import { NextRequest, NextResponse } from "next/server";
import { getGmailConfig } from "@/lib/auth/oauth-config";
import { setAuthCookie } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getGmailConfig();

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/settings?error=gmail_denied", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?error=gmail_missing_params", request.url));
  }

  const savedState = request.cookies.get("gmail_state")?.value;
  if (!savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/settings?error=gmail_state_mismatch", request.url));
  }

  const verifier = request.cookies.get("gmail_verifier")?.value;
  if (!verifier) {
    return NextResponse.redirect(new URL("/settings?error=gmail_missing_verifier", request.url));
  }

  const params = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error(`Gmail token exchange failed: ${errorText}`);
    return NextResponse.redirect(new URL("/settings?error=gmail_token_failed", request.url));
  }

  const tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  } = await tokenResponse.json();

  const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;

  let email: string | null = null;
  try {
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      email = profile.emailAddress;
    }
  } catch {
    // 不影响 token 存储
  }

  const redirectUrl = new URL("/settings?connected=gmail", request.url);
  if (email) redirectUrl.searchParams.set("email", email);

  const response = NextResponse.redirect(redirectUrl);

  await setAuthCookie(response, "gmail", {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt,
    email: email ?? undefined,
  });

  response.cookies.delete("gmail_verifier");
  response.cookies.delete("gmail_state");

  return response;
}
