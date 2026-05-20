// API Route: GET /api/emails
// 统一收件箱入口 — 根据账户协议类型动态调用适配器，返回统一格式的邮件列表

import { NextRequest, NextResponse } from "next/server";
import type { UnifiedEmail, PaginatedResponse, ApiError, UnifiedAccount, RawGmailMessage, RawOutlookMessage, RawImapMessage } from "@/lib/api/types";
import { convertGmailToUnified } from "@/lib/api/gmail";
import { convertOutlookToUnified } from "@/lib/api/outlook";
import { convertImapToUnified } from "@/lib/api/imap";
import { PAGE_SIZE } from "@/lib/constants";

// ---------------------------------------------------------------------------
//  模拟数据层 — 实际项目中替换为真实的 Gmail / Graph / IMAP 调用
// ---------------------------------------------------------------------------

/**
 * 根据账户 ID 查询账户信息（含协议类型）
 * 实际项目中：从数据库或 OAuth session 中获取
 */
async function lookupAccount(accountId: string): Promise<UnifiedAccount> {
  // TODO: 替换为真实的数据库查询
  // 这里用硬编码模拟，后续接入 OAuth session / Prisma
  const accounts: Record<string, UnifiedAccount> = {
    "acc-gmail-1": {
      id: "acc-gmail-1",
      name: "Google Account",
      email: "user@gmail.com",
      protocol: "gmail",
      isConnected: true,
      lastSyncedAt: new Date().toISOString(),
      unreadCount: 12,
    },
    "acc-outlook-1": {
      id: "acc-outlook-1",
      name: "Work Account",
      email: "user@company.com",
      protocol: "graph",
      isConnected: true,
      lastSyncedAt: new Date().toISOString(),
      unreadCount: 5,
    },
    "acc-imap-1": {
      id: "acc-imap-1",
      name: "Personal IMAP",
      email: "user@custom-mail.com",
      protocol: "imap",
      isConnected: true,
      lastSyncedAt: null,
      unreadCount: 3,
    },
  };

  const account = accounts[accountId];
  if (!account) {
    throw new Error(`账户不存在: ${accountId}`);
  }
  return account;
}

/**
 * 模拟从 Gmail API 获取原始邮件列表
 */
async function fetchGmailMessages(_accountId: string, _cursor: string | null, limit: number) {
  // TODO: 替换为真实的 Gmail API 调用
  // const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  // const response = await gmail.users.messages.list({ userId: "me", q: "", maxResults: limit });

  // 模拟数据 — 开发阶段使用
  const messages = generateMockGmailMessages(limit);
  return { messages, nextCursor: null };
}

/**
 * 模拟从 Microsoft Graph API 获取原始邮件列表
 */
async function fetchOutlookMessages(_accountId: string, _cursor: string | null, limit: number) {
  // TODO: 替换为真实的 Microsoft Graph API 调用
  // const client = Client.init({ authProvider });
  // const response = await client.api("/me/messages").top(limit).get();

  // 模拟数据 — 开发阶段使用
  const messages = generateMockOutlookMessages(limit);
  return { messages, nextCursor: null };
}

/**
 * 模拟从 IMAP 服务器获取原始邮件列表
 */
async function fetchImapMessages(_accountId: string, _cursor: string | null, limit: number) {
  // TODO: 替换为真实的 IMAP 调用（使用 node-imap 等库）
  // const Imap = require("imap");
  // const imap = new Imap({ user, password, host, port, tls: true });

  // 模拟数据 — 开发阶段使用
  const messages = generateMockImapMessages(limit);
  return { messages, nextCursor: null };
}

// ---------------------------------------------------------------------------
//  模拟数据生成 — 开发阶段使用，后续替换为真实 API
// ---------------------------------------------------------------------------

/** 生成模拟 Gmail 邮件数据 */
function generateMockGmailMessages(count: number) {
  const subjects = [
    "Q2 季度项目进度汇报会议通知",
    "您的账户登录安全提醒",
    "Re: 技术架构评审反馈",
    "AWS 费用优化建议",
  ];
  const bodies = [
    "你好，关于 Q2 季度的项目进度，我们将在下周三下午 2 点进行复盘会议。请准备好各模块的完成情况、遇到的问题和下周计划。",
    "检测到您的账户于 2026-05-18 22:30 在新设备上登录。如非本人操作，请立即修改密码。",
    "上周的架构评审中，团队对微服务拆分方案提出了几点改进建议，主要是关于数据一致性和服务边界的问题。",
    "经过分析，当前 AWS 账单中有约 30% 的费用来自未充分利用的 EC2 实例和 EBS 卷，建议进行清理。",
  ];

  return Array.from({ length: Math.min(count, subjects.length) }, (_, i) => ({
    id: `gmail-msg-${i}`,
    threadId: `thread-${i}`,
    labelIds: i === 0 ? ["INBOX", "UNREAD"] : ["INBOX"],
    snippet: bodies[i].slice(0, 100),
    internalDate: String(Date.now() - i * 3600000),
    payload: {
      body: { data: Buffer.from(bodies[i]).toString("base64") },
    },
  }));
}

/** 生成模拟 Outlook 邮件数据 */
function generateMockOutlookMessages(count: number) {
  const subjects = [
    "【审批】产品需求文档 PRD v2.3 已提交",
    "Re: 前端性能优化方案讨论",
    "周报 - 第 20 周",
  ];
  const senders = [
    { name: "李四", email: "lisi@company.com" },
    { name: "赵六", email: "zhaoliu@company.com" },
    { name: "团队助手", email: "team@company.com" },
  ];
  const bodies = [
    "PRD v2.3 已提交至 Confluence，主要更新了用户权限模块和数据分析看板的需求。请在本周五前完成审批。",
    "收到你的优化方案，整体思路很好。关于虚拟滚动部分，我建议用 react-window 替代当前方案。",
    "本周团队完成事项：1. 用户认证模块上线 2. 邮件列表性能优化 3. AI 摘要功能内测。",
  ];

  return Array.from({ length: Math.min(count, subjects.length) }, (_, i) => ({
    id: `outlook-msg-${i}`,
    conversationId: `conv-${i}`,
    subject: subjects[i],
    body: { contentType: "text" as const, content: bodies[i] },
    bodyPreview: bodies[i].slice(0, 100),
    sender: { emailAddress: { name: senders[i].name, address: senders[i].email } },
    toRecipients: [{ emailAddress: { name: "我", address: "user@company.com" } }],
    ccRecipients: [],
    bccRecipients: [],
    sentDateTime: new Date(Date.now() - i * 7200000).toISOString(),
    receivedDateTime: new Date(Date.now() - i * 7200000).toISOString(),
    isRead: i > 0,
    isDraft: false,
    hasAttachments: i === 0,
    flag: { flagStatus: "notFlagged" as const },
    importance: "normal" as const,
    internetMessageId: `<outlook-${i}@company.com>`,
    attachments:
      i === 0
        ? [
            {
              id: `att-${i}`,
              name: "PRD_v2.3.pdf",
              contentType: "application/pdf",
              size: 2048000,
              isInline: false,
            },
          ]
        : [],
    parentFolderId: "inbox",
    changeKey: `change-${i}`,
    createdDateTime: new Date(Date.now() - i * 7200000).toISOString(),
    lastModifiedDateTime: new Date(Date.now() - i * 7200000).toISOString(),
  }));
}

/** 生成模拟 IMAP 邮件数据 */
function generateMockImapMessages(count: number) {
  const subjects = ["周末技术分享：Rust 在高性能服务中的应用", "服务器维护通知"];
  const senders = [
    { name: "王五", email: "wangwu@custom-mail.com" },
    { name: "IT 部门", email: "it@custom-mail.com" },
  ];
  const bodies = [
    "本周六晚 8 点，我们团队有一个内部分享会，主题是 Rust 在高并发服务场景中的实践。我会分享几个实际案例。",
    "本周日凌晨 2:00-4:00 将进行服务器例行维护，期间邮件服务可能短暂不可用。",
  ];

  return Array.from({ length: Math.min(count, subjects.length) }, (_, i) => ({
    uid: `imap-uid-${i}`,
    seq: String(i + 1),
    envelope: {
      date: new Date(Date.now() - i * 86400000).toISOString(),
      subject: subjects[i],
      from: [{ name: senders[i].name, route: null, mailbox: senders[i].email.split("@")[0], host: senders[i].email.split("@")[1] }],
      sender: null,
      replyTo: null,
      to: [{ name: "我", route: null, mailbox: "user", host: "custom-mail.com" }],
      cc: null,
      bcc: null,
      messageId: `<imap-${i}@custom-mail.com>`,
    },
    bodyStructure: {
      type: "text",
      subtype: "plain",
      encoding: "quoted-printable",
      size: bodies[i].length,
    },
    flags: i === 0 ? ["\\Seen"] : [],
    internalDate: new Date(Date.now() - i * 86400000).toISOString(),
    size: bodies[i].length,
    bodyPlain: bodies[i],
    attachments: [],
  }));
}

// ---------------------------------------------------------------------------
//  核心路由逻辑
// ---------------------------------------------------------------------------

/**
 * GET /api/emails
 *
 * 查询参数：
 *   - accountId (可选): 指定账户 ID，不传则返回所有账户的聚合收件箱
 *   - cursor (可选): 游标分页
 *   - limit (可选): 每页数量，默认 PAGE_SIZE
 *
 * 返回：PaginatedResponse<UnifiedEmail>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get("accountId");
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : PAGE_SIZE;

    // 如果指定了 accountId，只查询该账户
    if (accountId) {
      const account = await lookupAccount(accountId);
      const emails = await fetchMessagesForAccount(account, cursor, limit);
      return NextResponse.json(emails);
    }

    // 否则聚合所有已连接账户的邮件
    const allEmails: UnifiedEmail[] = [];

    // TODO: 从数据库获取所有已连接账户，这里用模拟数据
    const allAccountIds = ["acc-gmail-1", "acc-outlook-1", "acc-imap-1"];

    for (const id of allAccountIds) {
      try {
        const account = await lookupAccount(id);
        const result = await fetchMessagesForAccount(account, null, limit);
        allEmails.push(...result.data);
      } catch {
        // 单个账户获取失败不影响其他账户
        continue;
      }
    }

    // 按接收时间降序排序
    allEmails.sort((a, b) => {
      const timeA = new Date(a.timestamps.received).getTime();
      const timeB = new Date(b.timestamps.received).getTime();
      return timeB - timeA;
    });

    return NextResponse.json<PaginatedResponse<UnifiedEmail>>({
      data: allEmails.slice(0, limit),
      nextCursor: allEmails.length > limit ? allEmails[limit].id : null,
      hasMore: allEmails.length > limit,
    });
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
 * 根据账户协议类型，动态调用对应的适配器和 API
 */
async function fetchMessagesForAccount(
  account: UnifiedAccount,
  cursor: string | null,
  limit: number
): Promise<PaginatedResponse<UnifiedEmail>> {
  switch (account.protocol) {
    case "gmail": {
      const { messages, nextCursor } = await fetchGmailMessages(account.id, cursor, limit);
      // 将原始 Gmail 数据转换为 UnifiedEmail
      const emails = messages.map((msg) =>
        convertGmailToUnified(msg as unknown as RawGmailMessage, account.id)
      );
      return { data: emails, nextCursor, hasMore: !!nextCursor };
    }

    case "graph": {
      const { messages, nextCursor } = await fetchOutlookMessages(account.id, cursor, limit);
      const emails = messages.map((msg) =>
        convertOutlookToUnified(msg as unknown as RawOutlookMessage, account.id)
      );
      return { data: emails, nextCursor, hasMore: !!nextCursor };
    }

    case "imap": {
      const { messages, nextCursor } = await fetchImapMessages(account.id, cursor, limit);
      const emails = messages.map((msg) =>
        convertImapToUnified(msg as unknown as RawImapMessage, account.id)
      );
      return { data: emails, nextCursor, hasMore: !!nextCursor };
    }

    default:
      throw new Error(`不支持的协议类型: ${account.protocol}`);
  }
}
