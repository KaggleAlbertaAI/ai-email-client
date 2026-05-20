// Microsoft Graph (Office 365 / Outlook) 协议适配器
// 将 Microsoft Graph API 原始响应转换为 UnifiedEmail 统一格式

import type {
  UnifiedEmail,
  EmailAddress,
  EmailRecipient,
  EmailAttachment,
  RawOutlookMessage,
} from "@/lib/api/types";

/**
 * 解析 Graph API 的收件人结构
 * Graph 的 recipients 是 { emailAddress: { name?, address } } 格式
 */
function parseRecipient(
  recipient: RawOutlookMessage["toRecipients"][0],
  type: EmailRecipient["type"]
): EmailRecipient {
  return {
    name: recipient.emailAddress.name || undefined,
    email: recipient.emailAddress.address,
    type,
  };
}

/**
 * 解析发件人信息
 * Graph API 的 sender 可能为 null（某些系统邮件）
 */
function parseSender(sender: RawOutlookMessage["sender"]): EmailAddress {
  if (!sender) {
    return { email: "" };
  }
  return {
    name: sender.emailAddress.name || undefined,
    email: sender.emailAddress.address,
  };
}

/**
 * 将 Graph API 附件转换为统一附件格式
 * 注意：Graph API 不直接提供 downloadUrl，需额外调用 /messages/{id}/attachments/{id}/$value
 */
function convertAttachment(attachment: RawOutlookMessage["attachments"][0], messageId: string): EmailAttachment {
  return {
    id: attachment.id,
    filename: attachment.name,
    mimeType: attachment.contentType,
    size: attachment.size,
    downloadUrl: `/api/emails/${messageId}/attachments/${attachment.id}/download`,
    thumbnailUrl: undefined,
  };
}

/**
 * 处理时区转换
 * Graph API 的 sentDateTime 是 ISO 8601 字符串，可能不带时区信息
 * 统一转换为 UTC ISO 字符串供前端使用
 */
function normalizeTimestamp(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // 兼容处理：某些 Outlook 日期可能格式不规范
    return new Date().toISOString();
  }
  return date.toISOString();
}

/**
 * 判断邮件是否为草稿状态
 * Graph API 通过 parentFolderId 为 "drafts" 来判断
 */
function isDraft(message: RawOutlookMessage): boolean {
  return message.isDraft || message.parentFolderId.toLowerCase() === "drafts";
}

/**
 * Graph API → UnifiedEmail 核心转换函数
 *
 * 数据映射：
 *   id              → id
 *   conversationId  → threadId
 *   sender          → sender
 *   toRecipients    → recipients (type: "to")
 *   ccRecipients    → recipients (type: "cc")
 *   bccRecipients   → recipients (type: "bcc")
 *   body            → body.html / body.plain
 *   sentDateTime    → timestamps.sent
 *   receivedDateTime → timestamps.received
 *   flag.flagStatus → flags.isStarred
 *   attachments     → attachments
 */
export function convertOutlookToUnified(
  raw: RawOutlookMessage,
  accountId: string
): UnifiedEmail {
  // 合并所有收件人
  const recipients: EmailRecipient[] = [
    ...raw.toRecipients.map((r) => parseRecipient(r, "to")),
    ...raw.ccRecipients.map((r) => parseRecipient(r, "cc")),
    ...raw.bccRecipients.map((r) => parseRecipient(r, "bcc")),
  ];

  // Graph API 的 body 同时提供纯文本和 HTML 两种格式
  // 但 bodyPreview 是系统生成的摘要（截断版），这里优先用 body.content
  const bodyHtml = raw.body.contentType === "html" ? raw.body.content : undefined;
  const bodyPlain =
    raw.body.contentType === "text" ? raw.body.content : raw.bodyPreview;

  // 附件转换
  const attachments: EmailAttachment[] = raw.attachments.map((a) =>
    convertAttachment(a, raw.id)
  );

  return {
    id: raw.id,
    sender: parseSender(raw.sender),
    recipients,
    subject: raw.subject,
    body: {
      plain: bodyPlain,
      html: bodyHtml,
    },
    timestamps: {
      sent: normalizeTimestamp(raw.sentDateTime),
      received: normalizeTimestamp(raw.receivedDateTime),
    },
    flags: {
      isRead: raw.isRead,
      isStarred: raw.flag?.flagStatus === "flagged",
      isDraft: isDraft(raw),
      hasAttachments: raw.hasAttachments,
    },
    attachments,
    threadId: raw.conversationId,
    labels: ((raw as unknown) as Record<string, unknown>).categories as string[] | undefined ?? [],
    source: {
      accountId,
      protocol: "graph",
      rawId: raw.id,
    },
  };
}
