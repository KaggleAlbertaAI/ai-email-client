// Token 解析器 — 从 middleware 注入的请求头或 httpOnly cookie 读取 token

import { getAuthToken } from "./cookies";
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
 * 直接从 httpOnly cookie 读取 access token（不依赖 middleware）
 * 作为 fallback，当 middleware 注入的 header 为空时使用
 *
 * 已知问题：NextResponse.next({ request: { headers } }) 在 Vercel 边缘运行时
 * 下不会把修改后的 header 传递给下游 route handler
 */
export function resolveTokenFromCookie(
  request: NextRequest,
  provider: "gmail" | "outlook"
): string | null {
  return getAuthToken(request, provider);
}
