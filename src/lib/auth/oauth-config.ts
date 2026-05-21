// OAuth 配置 — 提供构建函数，确保每次调用都动态读取环境变量

/** Gmail OAuth 配置 — 运行时读取 env */
export function getGmailConfig() {
  return {
    clientId: process.env.GMAIL_CLIENT_ID ?? "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET ?? "",
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/auth/gmail/callback`,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "openid",
      "email",
      "profile",
    ].join(" "),
  };
}

/** Outlook OAuth 配置 — 运行时读取 env */
export function getOutlookConfig() {
  return {
    clientId: process.env.OUTLOOK_CLIENT_ID ?? "",
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET ?? "",
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/auth/outlook/callback`,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access",
  };
}

/** 生成 PKCE code verifier（随机 32 字节） */
export function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 根据 verifier 生成 code challenge（SHA-256） */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
