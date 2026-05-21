// Middleware: 为 API 请求注入 OAuth token 并自动刷新
// 从加密 cookie 读取 token，检查是否过期，过期则刷新，然后注入请求头

import { NextRequest, NextResponse } from "next/server";
import { getAuthCookie, setAuthCookie } from "@/lib/auth/cookies";
import { isTokenExpired, refreshGmailToken, refreshOutlookToken } from "@/lib/auth/token-manager";

// 需要注入 token 的 API 路径前缀
const PROTECTED_PREFIXES = ["/api/emails", "/api/mail"];
// OAuth 回调路径不需要 middleware 处理
const AUTH_PATHS = ["/api/auth/gmail/initiate", "/api/auth/gmail/callback", "/api/auth/outlook/initiate", "/api/auth/outlook/callback", "/api/auth/gmail/disconnect", "/api/auth/outlook/disconnect"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过非保护路径和 OAuth 路径
  if (
    !PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    AUTH_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // 尝试从 cookie 获取 Gmail token
  let gmailToken = await getAuthCookie(request, "gmail");
  let outlookToken = await getAuthCookie(request, "outlook");

  // Gmail token 刷新
  if (gmailToken && isTokenExpired(gmailToken.expiresAt)) {
    try {
      if (gmailToken.refreshToken) {
        const refreshed = await refreshGmailToken(gmailToken.refreshToken);
        const newExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expiresIn;

        const headers = new Headers(request.headers);
        headers.set("x-auth-token-gmail", refreshed.accessToken);

        const response = NextResponse.next({ request: { headers } });
        await setAuthCookie(response, "gmail", {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: newExpiresAt,
          email: gmailToken.email ?? undefined,
        });

        return response;
      } else {
        // 没有 refresh token，清除 cookie
        const headers = new Headers(request.headers);
        const response = NextResponse.next({ request: { headers } });
        response.cookies.delete("auth_gmail");
        return response;
      }
    } catch (err) {
      console.error("Gmail token refresh failed:", err);
      const headers = new Headers(request.headers);
      const response = NextResponse.next({ request: { headers } });
      response.cookies.delete("auth_gmail");
      return response;
    }
  }

  // Outlook token 刷新
  if (outlookToken && isTokenExpired(outlookToken.expiresAt)) {
    try {
      if (outlookToken.refreshToken) {
        const refreshed = await refreshOutlookToken(outlookToken.refreshToken);
        const newExpiresAt = Math.floor(Date.now() / 1000) + refreshed.expiresIn;

        const headers = new Headers(request.headers);
        headers.set("x-auth-token-outlook", refreshed.accessToken);

        const response = NextResponse.next({ request: { headers } });
        await setAuthCookie(response, "outlook", {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: newExpiresAt,
          email: outlookToken.email ?? undefined,
        });

        return response;
      } else {
        const headers = new Headers(request.headers);
        const response = NextResponse.next({ request: { headers } });
        response.cookies.delete("auth_outlook");
        return response;
      }
    } catch (err) {
      console.error("Outlook token refresh failed:", err);
      const headers = new Headers(request.headers);
      const response = NextResponse.next({ request: { headers } });
      response.cookies.delete("auth_outlook");
      return response;
    }
  }

  // Token 有效或无需刷新，注入请求头
  const headers = new Headers(request.headers);
  if (gmailToken) {
    headers.set("x-auth-token-gmail", gmailToken.accessToken);
  }
  if (outlookToken) {
    headers.set("x-auth-token-outlook", outlookToken.accessToken);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};
