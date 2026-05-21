// Token 生命周期管理 — 刷新过期令牌

import { getGmailConfig, getOutlookConfig } from "./oauth-config";

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 秒
}

/** 判断 token 是否即将过期（预留 5 分钟缓冲） */
export function isTokenExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now < 300; // 5 分钟缓冲
}

/** 刷新 Gmail token */
export async function refreshGmailToken(refreshToken: string): Promise<TokenResponse> {
  const config = getGmailConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail token 刷新失败: ${response.status} - ${errorText}`);
  }

  const data: { access_token: string; refresh_token?: string; expires_in: number } =
    await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  };
}

/** 刷新 Outlook token */
export async function refreshOutlookToken(refreshToken: string): Promise<TokenResponse> {
  const config = getOutlookConfig();

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Outlook token 刷新失败: ${response.status} - ${errorText}`);
  }

  const data: { access_token: string; refresh_token?: string; expires_in: number } =
    await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  };
}
