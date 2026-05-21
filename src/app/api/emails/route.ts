// API Route: GET /api/emails
// 统一收件箱入口 — 根据账户协议类型调用真实 API，返回统一格式的邮件列表

import { NextRequest, NextResponse } from "next/server";
import type { UnifiedEmail, PaginatedResponse, ApiError, UnifiedAccount, RawImapMessage } from "@/lib/api/types";
import { convertGmailToUnified } from "@/lib/api/gmail";
import { convertOutlookToUnified } from "@/lib/api/outlook";
import { convertImapToUnified } from "@/lib/api/imap";
import { PAGE_SIZE } from "@/lib/constants";
import { extractToken } from "@/lib/auth/token-resolver";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
//  Demo 模式 —— 无 OAuth 令牌时返回演示数据，便于测试和展示
// ---------------------------------------------------------------------------

/** 构造演示邮件数据，用于开发和演示场景 */
function getDemoEmails(folder: string = "inbox"): UnifiedEmail[] {
  const now = Date.now();
  const allEmails: UnifiedEmail[] = [
    {
      id: "demo-1",
      sender: { name: "张三", email: "zhangsan@example.com" },
      recipients: [{ name: "我", email: "user@gmail.com", type: "to" as const }],
      subject: "Q2 季度项目进度汇报会议通知",
      body: {
        plain: "你好，关于 Q2 季度的项目进度，我们将在下周三下午 2 点进行复盘会议。请准备好各模块的完成情况、遇到的问题和下周计划。另外，客户希望看到我们最新的原型演示。",
        html: "<p>你好，关于 Q2 季度的项目进度，我们将在下周三下午 2 点进行复盘会议。</p>",
      },
      timestamps: { sent: new Date(now - 3600000).toISOString(), received: new Date(now - 3600000).toISOString() },
      flags: { isRead: false, isStarred: true, isDraft: false, hasAttachments: true },
      attachments: [{ id: "att-1", filename: "Q2_Report.pdf", mimeType: "application/pdf", size: 245000, downloadUrl: "" }],
      labels: ["重要", "工作"],
      source: { accountId: "demo", protocol: "gmail", rawId: "demo-1" },
    },
    {
      id: "demo-2",
      sender: { name: "李四", email: "lisi@company.com" },
      recipients: [{ name: "我", email: "user@gmail.com", type: "to" as const }],
      subject: "Re: 前端性能优化方案讨论",
      body: {
        plain: "收到你的优化方案，整体思路很好。关于虚拟滚动部分，我建议用 react-window 替代当前方案，可以减少约 40% 的渲染开销。另外，图片懒加载可以结合 Intersection Observer API 实现。你本周有空一起 review 一下吗？",
      },
      timestamps: { sent: new Date(now - 7200000).toISOString(), received: new Date(now - 7200000).toISOString() },
      flags: { isRead: false, isStarred: false, isDraft: false, hasAttachments: false },
      attachments: [],
      labels: ["技术"],
      source: { accountId: "demo", protocol: "gmail", rawId: "demo-2" },
    },
    {
      id: "demo-3",
      sender: { name: "系统通知", email: "noreply@github.com" },
      recipients: [{ name: "我", email: "user@gmail.com", type: "to" as const }],
      subject: "[ai-email-client] Pull Request #42 merged",
      body: {
        plain: "Pull request #42 'feat: integrate AI summaries' has been merged into main by KaggleAlbertaAI. All 15 checks passed. 3 files changed, 285 insertions(+), 42 deletions(-).",
      },
      timestamps: { sent: new Date(now - 1800000).toISOString(), received: new Date(now - 1800000).toISOString() },
      flags: { isRead: true, isStarred: false, isDraft: false, hasAttachments: false },
      attachments: [],
      labels: ["通知"],
      source: { accountId: "demo", protocol: "gmail", rawId: "demo-3" },
    },
    {
      id: "demo-4",
      sender: { name: "王五", email: "wangwu@custom-mail.com" },
      recipients: [{ name: "我", email: "user@gmail.com", type: "to" as const }],
      subject: "周末技术分享：Rust 在高性能服务中的应用",
      body: {
        plain: "本周六晚 8 点，我们团队有一个内部分享会，主题是 Rust 在高并发服务场景中的实践。我会分享几个实际案例，包括 Tokio 异步运行时的调优经验和内存安全的最佳实践。欢迎参加！",
      },
      timestamps: { sent: new Date(now - 86400000).toISOString(), received: new Date(now - 86400000).toISOString() },
      flags: { isRead: true, isStarred: false, isDraft: false, hasAttachments: false },
      attachments: [],
      labels: ["社交"],
      source: { accountId: "demo", protocol: "gmail", rawId: "demo-4" },
    },
    {
      id: "demo-5",
      sender: { name: "赵六", email: "zhaoliu@company.com" },
      recipients: [{ name: "我", email: "user@company.com", type: "to" as const }],
      subject: "【审批】产品需求文档 PRD v2.3 已提交",
      body: {
        plain: "PRD v2.3 已提交至 Confluence，主要更新了用户权限模块和数据分析看板的需求。请在本周五前完成审批。如有疑问，可以随时联系我。",
      },
      timestamps: { sent: new Date(now - 43200000).toISOString(), received: new Date(now - 43200000).toISOString() },
      flags: { isRead: false, isStarred: false, isDraft: false, hasAttachments: true },
      attachments: [{ id: "att-2", filename: "PRD_v2.3.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024000, downloadUrl: "" }],
      labels: ["工作", "审批"],
      source: { accountId: "demo", protocol: "graph", rawId: "demo-5" },
    },
    {
      id: "demo-6",
      sender: { name: "GitHub", email: "noreply@github.com" },
      recipients: [{ name: "我", email: "user@gmail.com", type: "to" as const }],
      subject: "[ai-email-client] New release v1.2.0",
      body: {
        plain: "Release v1.2.0 has been published with updated dependencies and new features. Please review the changelog.",
      },
      timestamps: { sent: new Date(now - 172800000).toISOString(), received: new Date(now - 172800000).toISOString() },
      flags: { isRead: true, isStarred: true, isDraft: false, hasAttachments: false },
      attachments: [],
      labels: ["通知"],
      source: { accountId: "demo", protocol: "gmail", rawId: "demo-6" },
    },
  ];

  // 按文件夹过滤
  switch (folder) {
    case "starred":
      return allEmails.filter((e) => e.flags.isStarred);
    case "archived":
      return allEmails.filter((e) => !e.labels.includes("INBOX"));
    case "sent":
      return [];
    default: // inbox
      return allEmails;
  }
}

// ---------------------------------------------------------------------------
//  账户信息 — 当前用硬编码模拟，后续替换为数据库 / OAuth session 查询
// ---------------------------------------------------------------------------

/**
 * 从环境变量获取默认 Gmail 访问令牌（fallback）
 * 适用于未配置 OAuth 的开发环境
 */
function getFallbackGmailToken(): string | null {
  return process.env.GMAIL_ACCESS_TOKEN ?? null;
}

/**
 * 从环境变量获取默认 Outlook 访问令牌（fallback）
 */
function getFallbackOutlookToken(): string | null {
  return process.env.OUTLOOK_ACCESS_TOKEN ?? null;
}

const ACCOUNTS: Record<string, UnifiedAccount> = {
  "acc-gmail-1": {
    id: "acc-gmail-1",
    name: "Google Account",
    email: "user@gmail.com",
    protocol: "gmail",
    isConnected: true,
    lastSyncedAt: new Date().toISOString(),
    unreadCount: 0,
  },
  "acc-outlook-1": {
    id: "acc-outlook-1",
    name: "Work Account",
    email: "user@company.com",
    protocol: "graph",
    isConnected: true,
    lastSyncedAt: new Date().toISOString(),
    unreadCount: 0,
  },
  "acc-imap-1": {
    id: "acc-imap-1",
    name: "Personal IMAP",
    email: "user@custom-mail.com",
    protocol: "imap",
    isConnected: true,
    lastSyncedAt: null,
    unreadCount: 0,
  },
};

async function lookupAccount(accountId: string): Promise<UnifiedAccount> {
  const account = ACCOUNTS[accountId];
  if (!account) {
    throw new Error(`账户不存在: ${accountId}`);
  }
  return account;
}

function listConnectedAccounts(): UnifiedAccount[] {
  return Object.values(ACCOUNTS).filter((a) => a.isConnected);
}

// ---------------------------------------------------------------------------
//  Gmail API — 真实 HTTP 调用
// ---------------------------------------------------------------------------

/**
 * 调用 Gmail API 获取邮件列表
 *
 * 令牌优先级:
 *   1. 请求头 Authorization: Bearer <token>（多账户场景）
 *   2. 环境变量 GMAIL_ACCESS_TOKEN（单账户场景）
 *
 * API 文档: https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
 */
async function fetchGmailMessages(token: string, cursor: string | null, limit: number, folder: string = "inbox") {
  const params = new URLSearchParams({
    maxResults: String(limit),
  });

  // 根据文件夹类型设置不同的 labelIds 查询
  switch (folder) {
    case "starred":
      params.set("labelIds", "STARRED");
      break;
    case "archived":
      // 归档 = 不在收件箱中的邮件，使用 -INBOX 排除
      params.set("labelIds", "-INBOX");
      break;
    case "inbox":
    default:
      params.set("labelIds", "INBOX");
      break;
  }

  if (cursor) params.set("pageToken", cursor);

  console.log("[emails] Gmail API request with token length:", token.length);

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  console.log("[emails] Gmail API response status:", response.status);

  if (!response.ok) {
    throw new Error(`Gmail API 请求失败: ${response.status} ${response.statusText}`);
  }

  const listData: { messages?: Array<{ id: string; threadId: string }>; nextPageToken?: string } =
    await response.json();

  if (!listData.messages || listData.messages.length === 0) {
    return { messages: [], nextCursor: null };
  }

  // 批量获取每封邮件的完整详情（Gmail list 只返回 id + threadId）
  const messageDetails = await Promise.all(
    listData.messages.map(async (msg) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!detailRes.ok) return null;
      return detailRes.json() as Promise<import("@/lib/api/types").RawGmailMessage>;
    })
  );

  // 过滤掉请求失败的 null 值
  const validMessages = messageDetails.filter(
    (m): m is import("@/lib/api/types").RawGmailMessage => m !== null
  );

  return { messages: validMessages, nextCursor: listData.nextPageToken ?? null };
}

// ---------------------------------------------------------------------------
//  Microsoft Graph API — 真实 HTTP 调用
// ---------------------------------------------------------------------------

/**
 * 调用 Microsoft Graph API 获取邮件列表
 *
 * 令牌优先级:
 *   1. 请求头 Authorization: Bearer <token>
 *   2. 环境变量 OUTLOOK_ACCESS_TOKEN
 *
 * API 文档: https://learn.microsoft.com/en-us/graph/api/user-list-messages
 */
async function fetchOutlookMessages(token: string, _cursor: string | null, limit: number, folder: string = "inbox") {
  const params = new URLSearchParams({
    $top: String(limit),
    $orderby: "receivedDateTime DESC",
    $select:
      "id,conversationId,subject,body,bodyPreview,sender,toRecipients,ccRecipients,bccRecipients,sentDateTime,receivedDateTime,isRead,isDraft,hasAttachments,flag,internetMessageId,attachments,parentFolderId,changeKey,createdDateTime,lastModifiedDateTime",
  });

  // Outlook 文件夹过滤
  if (folder === "starred") {
    params.set("$filter", "isRead eq false or flag/flagStatus ne 'notFlagged'");
  } else if (folder === "archived") {
    // Outlook 归档在 Archive 文件夹下
    params.set("$filter", `parentFolderId ne 'inbox'`);
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ConsistencyLevel: "eventual",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Graph API 请求失败: ${response.status} ${response.statusText}`);
  }

  const data: {
    value: import("@/lib/api/types").RawOutlookMessage[];
    "@odata.nextLink"?: string;
  } = await response.json();

  // 提取下一页游标（Graph API 用 @odata.nextLink 分页）
  const nextLink = data["@odata.nextLink"] ?? null;

  return { messages: data.value, nextCursor: nextLink };
}

// ---------------------------------------------------------------------------
//  IMAP — 占位，等待服务端中间件实现
// ---------------------------------------------------------------------------

/**
 * IMAP 协议需要长连接，无法在 Serverless 函数中直接使用 fetch 调用。
 * 需要安装 node-imap 等库，并在 API Route 中建立 TCP 连接。
 *
 * 所需环境变量:
 *   IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD
 */
async function fetchImapMessages(_cursor: string | null, _limit: number): Promise<{
  messages: RawImapMessage[];
  nextCursor: string | null;
}> {
  // 检查必要的环境变量是否配置
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const password = process.env.IMAP_PASSWORD;

  if (!host || !user || !password) {
    throw new Error(
      "IMAP 未配置连接参数。请在环境变量中设置 IMAP_HOST, IMAP_USER, IMAP_PASSWORD"
    );
  }

  // TODO: 安装 node-imap 库后实现真实连接
  // const Imap = require("imap");
  // const imap = new Imap({ user, password, host, port: 993, tls: true });
  // 返回原始 RawImapMessage[]

  throw new Error("IMAP 协议尚未接入，请先安装 node-imap 并取消注释实现代码");
}

// ---------------------------------------------------------------------------
//  过滤与排序
// ---------------------------------------------------------------------------

/**
 * 对邮件列表应用搜索过滤、未读过滤和排序，返回分页结果
 */
function applyFilters(
  result: PaginatedResponse<UnifiedEmail>,
  searchQuery: string | null,
  unreadOnly: boolean,
  limit: number
): PaginatedResponse<UnifiedEmail> {
  let emails = result.data;

  // 搜索：匹配主题、发件人、正文
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    emails = emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(query) ||
        e.sender.email.toLowerCase().includes(query) ||
        (e.sender.name && e.sender.name.toLowerCase().includes(query)) ||
        e.body.plain.toLowerCase().includes(query)
    );
  }

  // 仅未读
  if (unreadOnly) {
    emails = emails.filter((e) => !e.flags.isRead);
  }

  // 按接收时间降序排序
  emails.sort((a, b) => {
    const timeA = new Date(a.timestamps.received).getTime();
    const timeB = new Date(b.timestamps.received).getTime();
    return timeB - timeA;
  });

  return {
    data: emails.slice(0, limit),
    nextCursor: emails.length > limit ? emails[limit].id : null,
    hasMore: emails.length > limit,
  };
}

// ---------------------------------------------------------------------------
//  核心路由逻辑
// ---------------------------------------------------------------------------

/**
 * GET /api/emails
 *
 * 查询参数：
 *   - accountId (可选): 指定账户 ID，不传则返回所有账户的聚合收件箱
 *   - folder (可选): 文件夹类型 — inbox | sent | starred | archived
 *   - cursor (可选): 游标分页
 *   - limit (可选): 每页数量，默认 PAGE_SIZE
 *
 * 请求头：
 *   - Authorization: Bearer <token> — OAuth 访问令牌（多账户场景）
 *
 * 返回：PaginatedResponse<UnifiedEmail>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get("accountId");
    const folder = searchParams.get("folder") ?? "inbox";
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const searchQuery = searchParams.get("searchQuery");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = limitParam ? parseInt(limitParam, 10) : PAGE_SIZE;

    // 指定了 accountId，只查询该账户
    if (accountId) {
      const account = await lookupAccount(accountId);
      const emails = await fetchMessagesForAccount(account, cursor, limit, request, folder);
      return NextResponse.json(applyFilters(emails, searchQuery, unreadOnly, limit));
    }

    // 聚合所有已连接账户的邮件
    const allEmails: UnifiedEmail[] = [];
    const accounts = listConnectedAccounts();

    console.log("[emails] Aggregating emails from", accounts.length, "accounts, folder:", folder);

    for (const account of accounts) {
      try {
        const result = await fetchMessagesForAccount(account, null, limit, request, folder);
        console.log("[emails] Account", account.id, "returned", result.data.length, "emails");
        allEmails.push(...result.data);
      } catch (err) {
        // 单个账户获取失败不影响其他账户
        console.error("[emails] Account", account.id, "failed:", err);
        continue;
      }
    }

    // 所有账户获取失败时，返回演示数据便于测试和展示
    if (allEmails.length === 0) {
      console.log("[emails] No real emails found, returning demo data");
      const demoEmails = getDemoEmails(folder);
      return NextResponse.json<PaginatedResponse<UnifiedEmail>>(
        applyFilters({ data: demoEmails, nextCursor: null, hasMore: false }, searchQuery, unreadOnly, limit)
      );
    }

    return NextResponse.json<PaginatedResponse<UnifiedEmail>>(
      applyFilters({ data: allEmails, nextCursor: null, hasMore: false }, searchQuery, unreadOnly, limit)
    );
  } catch (error) {
    const apiError: ApiError = {
      code: "FETCH_EMAILS_FAILED",
      message: error instanceof Error ? error.message : "获取邮件失败",
      details: error,
    };
    return NextResponse.json<ApiError>(apiError, { status: 500 });
  }
}

/**
 * 根据账户协议类型，动态调用对应的真实 API 并转换为 UnifiedEmail
 */
async function fetchMessagesForAccount(
  account: UnifiedAccount,
  cursor: string | null,
  limit: number,
  request: NextRequest,
  folder: string = "inbox"
): Promise<PaginatedResponse<UnifiedEmail>> {
  switch (account.protocol) {
    case "gmail": {
      const token = extractToken(request, "gmail");
      const fallback = getFallbackGmailToken();
      const finalToken = token ?? fallback;
      console.log("[emails] Gmail token:", finalToken ? `present (${finalToken.length} chars), source=${token ? "cookie" : "env"}` : "none");
      if (!finalToken) {
        throw new Error(
          "缺少 Gmail 访问令牌。请先在设置页面连接 Gmail 账户，或设置环境变量 GMAIL_ACCESS_TOKEN"
        );
      }
      const { messages, nextCursor } = await fetchGmailMessages(finalToken, cursor, limit, folder);
      console.log("[emails] Gmail messages fetched:", messages.length);
      const emails = messages.map((msg) => convertGmailToUnified(msg, account.id));
      return { data: emails, nextCursor, hasMore: !!nextCursor };
    }

    case "graph": {
      const token = extractToken(request, "outlook");
      const fallback = getFallbackOutlookToken();
      const finalToken = token ?? fallback;
      if (!finalToken) {
        throw new Error(
          "缺少 Outlook 访问令牌。请先在设置页面连接 Outlook 账户，或设置环境变量 OUTLOOK_ACCESS_TOKEN"
        );
      }
      const { messages, nextCursor } = await fetchOutlookMessages(finalToken, cursor, limit, folder);
      const emails = messages.map((msg) => convertOutlookToUnified(msg, account.id));
      return { data: emails, nextCursor, hasMore: !!nextCursor };
    }

    case "imap": {
      const { messages, nextCursor } = await fetchImapMessages(cursor, limit);
      const emails = messages.map((msg: RawImapMessage) =>
        convertImapToUnified(msg, account.id)
      );
      return { data: emails, nextCursor, hasMore: !!nextCursor };
    }

    default:
      throw new Error(`不支持的协议类型: ${account.protocol}`);
  }
}
