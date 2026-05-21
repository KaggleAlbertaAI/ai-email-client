// API Route: GET /api/auth/outlook/callback
// Outlook OAuth 回调 — 用授权码换取 token，写入加密 cookie

import { NextRequest, NextResponse } from "next/server";
import { getOutlookConfig } from "@/lib/auth/oauth-config";
import { setAuthCookie } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

function redirectTo(url: string, request: NextRequest) {
  return NextResponse.redirect(new URL(url, request.url));
}

export async function GET(request: NextRequest) {
  try {
    const config = getOutlookConfig();

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return redirectTo("/settings?error=outlook_denied", request);
    }

    if (!code || !state) {
      return redirectTo("/settings?error=outlook_missing_params", request);
    }

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
      return redirectTo("/settings?error=outlook_state_mismatch", request);
    }

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
      console.error("[outlook/callback] Token exchange failed:", errorText);
      return redirectTo("/settings?error=outlook_token_failed", request);
    }

    const tokenData: {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    } = await tokenResponse.json();

    const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;

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

    return response;
  } catch (err) {
    console.error("[outlook/callback] Unhandled error:", err);
    return NextResponse.redirect(new URL("/settings?error=outlook_server_error", request.url));
  }
}
