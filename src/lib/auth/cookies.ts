// 加密 Cookie 读写 — 使用 jose 库加密 token，存储在客户端 Cookie 中

import { EncryptJWT, jwtDecrypt } from "jose";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY ?? "dev-fallback-key-do-not-use-in-production";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

/** 获取加密密钥 */
function getSecretKey(): Uint8Array {
  const key = COOKIE_ENCRYPTION_KEY;
  // 确保密钥长度为 32 字节
  const encoder = new TextEncoder();
  const encoded = encoder.encode(key);
  if (encoded.length === 32) return encoded;
  // 不足 32 字节则填充，超过则截取
  const result = new Uint8Array(32);
  result.set(encoded.length >= 32 ? encoded.slice(0, 32) : encoded);
  return result;
}

/** 将 token 数据写入加密 Cookie */
export async function setAuthCookie(
  response: NextResponse,
  provider: "gmail" | "outlook",
  tokenData: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number; // Unix timestamp 秒
    email?: string;
  }
) {
  const cookieName = `auth_${provider}`;
  const secret = getSecretKey();

  const jwt = await new EncryptJWT({
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken ?? null,
    expiresAt: tokenData.expiresAt,
    email: tokenData.email ?? null,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setExpirationTime(tokenData.expiresAt)
    .encrypt(secret);

  response.cookies.set(cookieName, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/** 从请求中读取并解密 Cookie */
export async function getAuthCookie(
  request: NextRequest,
  provider: "gmail" | "outlook"
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  email: string | null;
} | null> {
  const cookieName = `auth_${provider}`;
  const encrypted = request.cookies.get(cookieName)?.value;
  if (!encrypted) return null;

  try {
    const secret = getSecretKey();
    const { payload } = await jwtDecrypt(encrypted, secret);

    return {
      accessToken: payload.accessToken as string,
      refreshToken: (payload.refreshToken as string | null) ?? null,
      expiresAt: payload.expiresAt as number,
      email: (payload.email as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** 清除指定 provider 的 Cookie */
export function clearAuthCookie(response: NextResponse, provider: "gmail" | "outlook") {
  response.cookies.delete(`auth_${provider}`);
  // 同时清除 PKCE verifier cookie
  response.cookies.delete(`${provider}_verifier`);
}
