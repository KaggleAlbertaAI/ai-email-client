// Token 解析器 — 从 middleware 注入的请求头中读取 token

import type { NextRequest } from "next/server";

/** 从请求头读取 middleware 注入的 token */
export function resolveToken(
  request: NextRequest,
  provider: "gmail" | "outlook"
): string | null {
  const headerName = provider === "gmail" ? "x-auth-token-gmail" : "x-auth-token-outlook";
  return request.headers.get(headerName);
}
