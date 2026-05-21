// Token 解析器 — 从 middleware 注入的请求头或直接解密 cookie 读取 token

import { jwtDecrypt } from "jose";
import type { NextRequest } from "next/server";

/** 从请求头读取 middleware 注入的 token */
export function resolveToken(
  request: NextRequest,
  provider: "gmail" | "outlook"
): string | null {
  const headerName = provider === "gmail" ? "x-auth-token-gmail" : "x-auth-token-outlook";
  return request.headers.get(headerName);
}

/**
 * 直接从加密 cookie 读取 token（不依赖 middleware）
 * 作为 fallback，当 middleware 注入的 header 为空时使用
 *
 * 已知问题：NextResponse.next({ request: { headers } }) 在 Vercel 边缘运行时
 * 下不会把修改后的 header 传递给下游 route handler
 */
export async function decryptTokenCookie(
  request: NextRequest,
  provider: "gmail" | "outlook"
): Promise<string | null> {
  const cookieName = `auth_${provider}`;
  const encrypted = request.cookies.get(cookieName)?.value;
  if (!encrypted) return null;

  try {
    const key = process.env.COOKIE_ENCRYPTION_KEY ?? "dev-fallback-key-do-not-use-in-production";
    const encoder = new TextEncoder();
    const encoded = encoder.encode(key);
    const secret = new Uint8Array(32);
    secret.set(encoded.length >= 32 ? encoded.slice(0, 32) : encoded);

    const { payload } = await jwtDecrypt(encrypted, secret);
    return (payload.accessToken as string) ?? null;
  } catch {
    return null;
  }
}
