// Gmail 协议适配器
// 将 Gmail API 原始响应转换为 UnifiedEmail 统一格式

import type {
  UnifiedEmail,
  EmailAddress,
  EmailRecipient,
  RawGmailMessage,
  GmailPart,
} from "@/lib/api/types";

/**
 * 从嵌套的 MIME parts 树中提取纯文本正文
 * Gmail 的 payload.parts 可能是多层嵌套，需递归查找 text/plain
 */
function extractPlainText(part: GmailPart): string | undefined {
  if (part.mimeType === "text/plain" && part.body.data) {
    return atob(part.body.data);
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      const text = extractPlainText(subPart);
      if (text) return text;
    }
  }
  return undefined;
}

/**
 * 从嵌套的 MIME parts 树中提取 HTML 正文
 * 优先取第一个 text/html 部分
 */
function extractHtml(part: GmailPart): string | undefined {
  if (part.mimeType === "text/html" && part.body.data) {
    return atob(part.body.data);
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      const html = extractHtml(subPart);
      if (html) return html;
    }
  }
  return undefined;
}

/**
 * 解析 "Name <email@example.com>" 格式的发件人字符串
 * 也兼容纯邮箱格式 "email@example.com"
 */
function parseAddress(raw: string): EmailAddress {
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    const name = match[1].trim() || undefined;
    return { name, email: match[2] };
  }
  return { email: raw.trim() };
}

/**
 * 从邮件头部查找指定字段的值
 */
function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** 提取附件列表 */
function extractAttachments(part: GmailPart): Array<UnifiedEmail["attachments"][0]> {
  const attachments: Array<UnifiedEmail["attachments"][0]> = [];

  if (part.filename && part.body.attachmentId) {
    attachments.push({
      id: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType,
      size: part.body.size,
      downloadUrl: `/api/attachments/${part.body.attachmentId}`,
      thumbnailUrl: undefined,
    });
  }

  if (part.parts) {
    for (const subPart of part.parts) {
      attachments.push(...extractAttachments(subPart));
    }
  }

  return attachments;
}

/**
 * Gmail API → UnifiedEmail 核心转换函数
 *
 * 数据映射：
 *   id           → id
 *   labelIds     → flags (UNREAD, STARRED, DRAFT)
 *   internalDate → timestamps.sent / received
 *   payload      → body.plain + body.html + attachments
 *   headers[From] → sender
 *   headers[To/Cc] → recipients
 */
export function convertGmailToUnified(
  raw: RawGmailMessage,
  accountId: string
): UnifiedEmail {
  const headers = raw.payload.headers;

  // 解析发件人
  const fromHeader = getHeader(headers, "From");
  const sender = fromHeader ? parseAddress(fromHeader) : { email: "" };

  // 解析收件人（To + Cc）
  const recipients: EmailRecipient[] = [];
  const toHeader = getHeader(headers, "To");
  const ccHeader = getHeader(headers, "Cc");

  if (toHeader) {
    const addresses = toHeader.split(",").filter(Boolean);
    for (const addr of addresses) {
      const parsed = parseAddress(addr.trim());
      recipients.push({ ...parsed, type: "to" });
    }
  }
  if (ccHeader) {
    const addresses = ccHeader.split(",").filter(Boolean);
    for (const addr of addresses) {
      const parsed = parseAddress(addr.trim());
      recipients.push({ ...parsed, type: "cc" });
    }
  }

  // 从 MIME 树中提取正文
  const plainText = extractPlainText(raw.payload);
  const htmlText = extractHtml(raw.payload);

  // 从 labelIds 推断邮件状态
  const labels = raw.labelIds;
  const hasAttachmentPart = raw.payload.parts?.some(
    (p) => p.filename && p.filename.length > 0
  ) ?? false;

  // 转换时间戳（Gmail internalDate 是毫秒时间戳字符串）
  const isoDate = new Date(parseInt(raw.internalDate, 10)).toISOString();

  return {
    id: raw.id,
    sender,
    recipients,
    subject: getHeader(headers, "Subject"),
    body: {
      plain: plainText ?? "",
      html: htmlText,
    },
    timestamps: {
      sent: isoDate,
      received: isoDate,
    },
    flags: {
      isRead: !labels.includes("UNREAD"),
      isStarred: labels.includes("STARRED"),
      isDraft: labels.includes("DRAFT"),
      hasAttachments: hasAttachmentPart || labels.includes("HAS_ATTACHMENT"),
    },
    attachments: extractAttachments(raw.payload),
    threadId: raw.threadId,
    labels: raw.labelIds.filter((l) => !["INBOX", "UNREAD", "STARRED", "DRAFT", "SENT", "IMPORTANT"].includes(l)),
    source: {
      accountId,
      protocol: "gmail",
      rawId: raw.id,
    },
  };
}
