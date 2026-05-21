// 纯 httpOnly Cookie 存储 OAuth token（不加密，httpOnly + secure 保证安全）

import type { NextRequest, NextResponse } from "next/server";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

/** 将 token 写入 httpOnly Cookie */
export function setAuthCookie(
  response: NextResponse,
  provider: "gmail" | "outlook",
  tokenData: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number; // Unix timestamp 秒
    email?: string;
  }
) {
  // access token — httpOnly，仅服务端可读
  response.cookies.set(`auth_${provider}`, tokenData.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  // refresh token — httpOnly（如果存在）
  if (tokenData.refreshToken) {
    response.cookies.set(`auth_${provider}_refresh`, tokenData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  // 元数据 — 非 httpOnly，客户端可读取用于展示状态
  response.cookies.set(`auth_${provider}_meta`, JSON.stringify({
    email: tokenData.email ?? null,
    expiresAt: tokenData.expiresAt,
  }), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/** 从请求中获取 access token */
export function getAuthToken(
  request: NextRequest,
  provider: "gmail" | "outlook"
): string | null {
  return request.cookies.get(`auth_${provider}`)?.value ?? null;
}

/** 从请求中获取 refresh token */
export function getRefreshToken(
  request: NextRequest,
  provider: "gmail" | "outlook"
): string | null {
  return request.cookies.get(`auth_${provider}_refresh`)?.value ?? null;
}

/** 从请求中获取元数据（客户端也可读） */
export function getAuthMetadata(
  request: NextRequest,
  provider: "gmail" | "outlook"
): { email: string | null; expiresAt: number } | null {
  const raw = request.cookies.get(`auth_${provider}_meta`)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 清除指定 provider 的所有 Cookie */
export function clearAuthCookie(response: NextResponse, provider: "gmail" | "outlook") {
  response.cookies.delete(`auth_${provider}`);
  response.cookies.delete(`auth_${provider}_refresh`);
  response.cookies.delete(`auth_${provider}_meta`);
}
