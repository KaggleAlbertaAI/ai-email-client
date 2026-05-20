#!/usr/bin/env node
/**
 * OAuth Token Generator — 快速生成 Gmail / Outlook 访问令牌
 *
 * 用法:
 *   node scripts/get-tokens.js gmail    # 生成 Gmail Token
 *   node scripts/get-tokens.js outlook   # 生成 Outlook Token
 *   node scripts/get-tokens.js all       # 依次生成两个 Token
 *
 * 前置要求:
 *   - Google Cloud Console 项目已启用 Gmail API
 *   - Azure AD 已注册应用并授予 Mail.Read 权限
 */

const http = require("http");
const url = require("url");
const crypto = require("crypto");
const { exec } = require("child_process");

// ===========================================================================
//  配置 — 修改为你自己的 OAuth 凭据
// ===========================================================================

const GMAIL_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri: "http://localhost:3001/callback",
  scopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "openid",
    "email",
    "profile",
  ].join(" "),
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
};

const OUTLOOK_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID || "",
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  redirectUri: "http://localhost:3001/callback",
  scopes:
    "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access",
  authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

// ===========================================================================
//  工具函数
// ===========================================================================

function openBrowser(uri) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${uri}"`
      : process.platform === "darwin"
        ? `open "${uri}"`
        : `xdg-open "${uri}"`;
  exec(cmd);
}

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url, true);
      const code = parsed.query.code;
      const state = parsed.query.state;

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (code) {
        res.end(
          "<h1>授权成功！</h1><p>已获取授权码，请回到终端查看令牌。</p>"
        );
      } else {
        res.end("<h1>授权失败</h1><p>未收到授权码，请重试。</p>");
      }

      server.close();
      resolve({ code, state });
    });

    server.listen(port, () => {
      console.log(`\n本地服务器已启动: http://localhost:${port}`);
    });
  });
}

async function waitForAuthCode(expectedState) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("等待授权超时（5 分钟）。请在浏览器中完成授权。"));
    }, 300000);

    const server = http.createServer((req, res) => {
      const parsed = url.parse(req.url, true);
      const code = parsed.query.code;
      const state = parsed.query.state;
      const error = parsed.query.error;

      clearTimeout(timeout);

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>授权失败</h1><p>${error}</p>`);
        reject(new Error(`OAuth 授权被拒绝: ${error}`));
        return;
      }

      if (code && state === expectedState) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>✅ 授权成功！</h1><p>已获取授权码，请回到终端查看令牌。</p>"
        );
        server.close();
        resolve(code);
      } else if (state !== expectedState) {
        res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>State 不匹配</h1><p>请重新运行脚本。</p>");
        server.close();
        reject(new Error("OAuth State 不匹配，可能存在 CSRF 攻击"));
      }
    });

    server.listen(3001, () => {
      console.log(`本地回调服务器已启动: http://localhost:3001/callback`);
    });
  });
}

async function exchangeForToken(config, code, verifier) {
  const params = new URLSearchParams({
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
  });

  // Google 需要 client_secret；Microsoft 可选
  if (config.clientSecret) {
    params.set("client_secret", config.clientSecret);
  }

  // Google 使用 authorization_code grant
  if (config.tokenUrl.includes("google")) {
    params.set("grant_type", "authorization_code");
  } else {
    // Microsoft PKCE
    params.set("grant_type", "authorization_code");
    params.set("code_verifier", verifier);
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`令牌交换失败 (${response.status}): ${body}`);
  }

  return response.json();
}

async function generateGmailToken() {
  console.log("\n========== Gmail OAuth Token ==========");

  if (!GMAIL_CONFIG.clientId) {
    console.error(
      "❌ 未设置 GOOGLE_CLIENT_ID 环境变量。\n" +
        "请在 Google Cloud Console 创建 OAuth 2.0 凭据：\n" +
        "https://console.cloud.google.com/apis/credentials"
    );
    return;
  }

  // 生成 PKCE verifier + challenge
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  // 构建授权 URL
  const authUrl = new URL(GMAIL_CONFIG.authUrl);
  authUrl.searchParams.set("client_id", GMAIL_CONFIG.clientId);
  authUrl.searchParams.set("redirect_uri", GMAIL_CONFIG.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GMAIL_CONFIG.scopes);
  authUrl.searchParams.set("state", "gmail");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("\n正在打开浏览器进行授权...");
  console.log(
    "如果浏览器没有自动打开，请手动访问:\n" + authUrl.toString()
  );

  openBrowser(authUrl.toString());

  const code = await waitForAuthCode("gmail");
  console.log("\n✅ 已获取授权码");

  const tokenData = await exchangeForToken(GMAIL_CONFIG, code, verifier);

  console.log("\n✅ Gmail 令牌已生成！\n");
  console.log("请将以下内容添加到 Vercel 环境变量中：\n");
  console.log(`GMAIL_ACCESS_TOKEN=${tokenData.access_token}`);
  if (tokenData.refresh_token) {
    console.log(`GMAIL_REFRESH_TOKEN=${tokenData.refresh_token}`);
  }
  console.log(
    "\n⚠️  access_token 有效期约 1 小时，refresh_token 可长期续期。"
  );

  return tokenData;
}

async function generateOutlookToken() {
  console.log("\n========== Outlook OAuth Token ==========");

  if (!OUTLOOK_CONFIG.clientId) {
    console.error(
      "❌ 未设置 MICROSOFT_CLIENT_ID 环境变量。\n" +
        "请在 Azure AD 注册应用：\n" +
        "https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps"
    );
    return;
  }

  // 生成 PKCE verifier + challenge
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  const authUrl = new URL(OUTLOOK_CONFIG.authUrl);
  authUrl.searchParams.set("client_id", OUTLOOK_CONFIG.clientId);
  authUrl.searchParams.set("redirect_uri", OUTLOOK_CONFIG.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", OUTLOOK_CONFIG.scopes);
  authUrl.searchParams.set("state", "outlook");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  console.log("\n正在打开浏览器进行授权...");
  console.log(
    "如果浏览器没有自动打开，请手动访问:\n" + authUrl.toString()
  );

  openBrowser(authUrl.toString());

  const code = await waitForAuthCode("outlook");
  console.log("\n✅ 已获取授权码");

  const tokenData = await exchangeForToken(OUTLOOK_CONFIG, code, verifier);

  console.log("\n✅ Outlook 令牌已生成！\n");
  console.log("请将以下内容添加到 Vercel 环境变量中：\n");
  console.log(`OUTLOOK_ACCESS_TOKEN=${tokenData.access_token}`);
  if (tokenData.refresh_token) {
    console.log(`OUTLOOK_REFRESH_TOKEN=${tokenData.refresh_token}`);
  }
  console.log(
    "\n⚠️  access_token 有效期约 1 小时，refresh_token 可长期续期。"
  );

  return tokenData;
}

// ===========================================================================
//  主入口
// ===========================================================================

const command = process.argv[2] || "all";

(async () => {
  try {
    switch (command) {
      case "gmail":
        await generateGmailToken();
        break;
      case "outlook":
        await generateOutlookToken();
        break;
      case "all":
        await generateGmailToken();
        await generateOutlookToken();
        break;
      default:
        console.log("用法: node scripts/get-tokens.js [gmail|outlook|all]");
    }
  } catch (err) {
    console.error(`\n❌ 错误: ${err.message}`);
    process.exit(1);
  }
})();
