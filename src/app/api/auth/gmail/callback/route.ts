// API Route: GET /api/auth/gmail/callback
// Gmail OAuth 回调 — 用授权码换取 token，写入加密 cookie

import { NextRequest, NextResponse } from "next/server";
import { getGmailConfig } from "@/lib/auth/oauth-config";
import { setAuthCookie } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

function redirectTo(url: string, request: NextRequest) {
  return NextResponse.redirect(new URL(url, request.url));
}

export async function GET(request: NextRequest) {
  try {
    const config = getGmailConfig();

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return redirectTo("/settings?error=gmail_denied", request);
    }

    if (!code || !state) {
      return redirectTo("/settings?error=gmail_missing_params", request);
    }

    // 从 state 中提取 verifier（格式：randomState:verifier，base64 编码）
    let randomState: string;
    let verifier: string;
    try {
      const decoded = atob(state);
      const [s, v] = decoded.split(":");
      randomState = s;
      verifier = v;
      if (!randomState || !verifier) {
        throw new Error("Invalid state format");
      }
    } catch {
      console.error("[gmail/callback] Invalid state format");
      return redirectTo("/settings?error=gmail_state_mismatch", request);
    }

    console.log("[gmail/callback] Verifier extracted from state");

    const params = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    });

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[gmail/callback] Token exchange failed:", tokenResponse.status, errorText);
      const detail = encodeURIComponent(errorText.substring(0, 200));
      return redirectTo(`/settings?error=gmail_token_failed&detail=${detail}`, request);
    }

    const tokenData: {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    } = await tokenResponse.json();

    console.log("[gmail/callback] Token received, expires_in:", tokenData.expires_in);

    const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;

    let email: string | null = null;
    try {
      const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        email = profile.emailAddress;
        console.log("[gmail/callback] Email:", email);
      }
    } catch (err) {
      console.warn("[gmail/callback] Failed to fetch profile:", err);
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

    console.log("[gmail/callback] Success, redirecting to /settings");
    return response;
  } catch (err) {
    console.error("[gmail/callback] Unhandled error:", err);
    return NextResponse.redirect(new URL("/settings?error=gmail_server_error", request.url));
  }
}
