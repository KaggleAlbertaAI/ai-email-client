// Middleware: 为 API 请求注入 OAuth token 并自动刷新
// 从加密 cookie 读取 token，检查是否过期，过期则刷新，然后注入请求头

import { NextRequest, NextResponse } from "next/server";
import { getAuthCookie, setAuthCookie } from "@/lib/auth/cookies";
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

  // 调试日志：显示收到的 cookie 列表
  const cookieNames = request.cookies.getAll().map(c => c.name);
  console.log("[middleware]", pathname, "cookies:", cookieNames);

  let gmailToken = await getAuthCookie(request, "gmail");
  let outlookToken = await getAuthCookie(request, "outlook");

  console.log("[middleware] gmail token:", gmailToken ? `present, expiresAt=${gmailToken.expiresAt}` : "none");
  console.log("[middleware] outlook token:", outlookToken ? `present, expiresAt=${outlookToken.expiresAt}` : "none");

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

        console.log("[middleware] gmail token refreshed");
        return response;
      } else {
        const headers = new Headers(request.headers);
        const response = NextResponse.next({ request: { headers } });
        response.cookies.delete("auth_gmail");
        console.log("[middleware] gmail: no refresh token, cleared cookie");
        return response;
      }
    } catch (err) {
      console.error("[middleware] gmail refresh failed:", err);
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

        console.log("[middleware] outlook token refreshed");
        return response;
      } else {
        const headers = new Headers(request.headers);
        const response = NextResponse.next({ request: { headers } });
        response.cookies.delete("auth_outlook");
        return response;
      }
    } catch (err) {
      console.error("[middleware] outlook refresh failed:", err);
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
    console.log("[middleware] gmail token injected");
  }
  if (outlookToken) {
    headers.set("x-auth-token-outlook", outlookToken.accessToken);
    console.log("[middleware] outlook token injected");
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};
