// Middleware: 为 API 请求注入 OAuth token 并自动刷新
// 从 httpOnly cookie 读取 token，检查是否过期，过期则刷新，然后注入请求头

import { NextRequest, NextResponse } from "next/server";
import { getAuthToken, getRefreshToken, getAuthMetadata, setAuthCookie, clearAuthCookie } from "@/lib/auth/cookies";
import { isTokenExpired, refreshGmailToken, refreshOutlookToken } from "@/lib/auth/token-manager";

const PROTECTED_PREFIXES = ["/api/emails", "/api/mail"];
const AUTH_PATHS = ["/api/auth/gmail/initiate", "/api/auth/gmail/callback", "/api/auth/outlook/initiate", "/api/auth/outlook/callback", "/api/auth/gmail/disconnect", "/api/auth/outlook/disconnect"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    !PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    AUTH_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const gmailAccessToken = getAuthToken(request, "gmail");
  const outlookAccessToken = getAuthToken(request, "outlook");

  const gmailMeta = getAuthMetadata(request, "gmail");
  const outlookMeta = getAuthMetadata(request, "outlook");

  // Gmail token 刷新
  if (gmailAccessToken && gmailMeta && isTokenExpired(gmailMeta.expiresAt)) {
    const gmailRefresh = getRefreshToken(request, "gmail");
    if (gmailRefresh) {
      try {
        const refreshed = await refreshGmailToken(gmailRefresh);
        const newExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expiresIn;

        const headers = new Headers(request.headers);
        headers.set("x-auth-token-gmail", refreshed.accessToken);

        const response = NextResponse.next({ request: { headers } });
        setAuthCookie(response, "gmail", {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: newExpiresAt,
          email: gmailMeta.email ?? undefined,
        });

        console.log("[middleware] gmail token refreshed");
        return response;
      } catch (err) {
        console.error("[middleware] gmail refresh failed:", err);
        const headers = new Headers(request.headers);
        const response = NextResponse.next({ request: { headers } });
        clearAuthCookie(response, "gmail");
        return response;
      }
    } else {
      const headers = new Headers(request.headers);
      const response = NextResponse.next({ request: { headers } });
      clearAuthCookie(response, "gmail");
      console.log("[middleware] gmail: no refresh token, cleared cookie");
      return response;
    }
  }

  // Outlook token 刷新
  if (outlookAccessToken && outlookMeta && isTokenExpired(outlookMeta.expiresAt)) {
    const outlookRefresh = getRefreshToken(request, "outlook");
    if (outlookRefresh) {
      try {
        const refreshed = await refreshOutlookToken(outlookRefresh);
        const newExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expiresIn;

        const headers = new Headers(request.headers);
        headers.set("x-auth-token-outlook", refreshed.accessToken);

        const response = NextResponse.next({ request: { headers } });
        setAuthCookie(response, "outlook", {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: newExpiresAt,
          email: outlookMeta.email ?? undefined,
        });

        console.log("[middleware] outlook token refreshed");
        return response;
      } catch (err) {
        console.error("[middleware] outlook refresh failed:", err);
        const headers = new Headers(request.headers);
        const response = NextResponse.next({ request: { headers } });
        clearAuthCookie(response, "outlook");
        return response;
      }
    } else {
      const headers = new Headers(request.headers);
      const response = NextResponse.next({ request: { headers } });
      clearAuthCookie(response, "outlook");
      return response;
    }
  }

  // Token 有效或无需刷新，注入请求头
  const headers = new Headers(request.headers);
  if (gmailAccessToken) {
    headers.set("x-auth-token-gmail", gmailAccessToken);
    console.log("[middleware] gmail token injected");
  }
  if (outlookAccessToken) {
    headers.set("x-auth-token-outlook", outlookAccessToken);
    console.log("[middleware] outlook token injected");
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};
