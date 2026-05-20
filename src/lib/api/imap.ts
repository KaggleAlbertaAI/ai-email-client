// IMAP 协议适配器
// 将 IMAP 原始数据（RFC 5322 / RFC 3501 格式）转换为 UnifiedEmail 统一格式

import type {
  UnifiedEmail,
  EmailAddress,
  EmailRecipient,
  EmailAttachment,
  RawImapMessage,
  ImapAddress,
} from "@/lib/api/types";

/**
 * 将 IMAP 地址对象转换为标准邮箱格式
 * ImapAddress 的结构是 { name, route, mailbox, host }
 * 完整邮箱地址 = mailbox@host
 */
function imapAddressToEmail(addr: ImapAddress): EmailAddress {
  const email = addr.mailbox && addr.host ? `${addr.mailbox}@${addr.host}` : "";
  return {
    name: addr.name || undefined,
    email,
  };
}

/**
 * 解析 IMAP envelope 中的地址列表
 * envelope.from / envelope.to 等字段是 ImapAddress[] | null
 */
function parseAddressList(
  list: ImapAddress[] | null,
  type: EmailRecipient["type"]
): EmailRecipient[] {
  if (!list) return [];
  return list.map((addr) => ({
    ...imapAddressToEmail(addr),
    type,
  }));
}

/**
 * 解析 IMAP 标记列表
 * IMAP 使用反斜杠前缀标记：\Seen, \Flagged, \Answered, \Draft
 */
function hasFlag(flags: string[], flagName: string): boolean {
  return flags.some((f) => f.toLowerCase() === `\\${flagName.toLowerCase()}`);
}

/**
 * 将 IMAP 附件转换为统一附件格式
 * IMAP 附件信息来自服务端解析后的 MIME 结构
 */
function convertImapAttachment(
  attachment: RawImapMessage["attachments"][0],
  uid: string
): EmailAttachment {
  return {
    id: attachment.cid || attachment.filename,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    downloadUrl: `/api/emails/${uid}/attachments/${attachment.cid}/download`,
    thumbnailUrl: undefined,
  };
}

/**
 * 格式化 IMAP 内部日期
 * IMAP 日期格式示例："17-Feb-2024 10:30:00 +0800"（RFC 3501 INTERNALDATE）
 * JavaScript Date 构造函数可直接解析此格式
 */
function normalizeImapDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

/**
 * IMAP → UnifiedEmail 核心转换函数
 *
 * 数据映射：
 *   uid           → id + source.rawId
 *   envelope      → sender + recipients + subject
 *   bodyPlain     → body.plain
 *   bodyHtml      → body.html
 *   flags         → flags (\Seen → isRead, \Flagged → isStarred)
 *   internalDate  → timestamps.received
 *   envelope.date → timestamps.sent
 */
export function convertImapToUnified(
  raw: RawImapMessage,
  accountId: string
): UnifiedEmail {
  // 解析发件人（取 envelope.from 列表的第一个）
  const fromList = raw.envelope.from;
  const sender: EmailAddress =
    fromList && fromList.length > 0
      ? imapAddressToEmail(fromList[0])
      : { email: "" };

  // 解析收件人
  const recipients: EmailRecipient[] = [
    ...parseAddressList(raw.envelope.to, "to"),
    ...parseAddressList(raw.envelope.cc, "cc"),
    ...parseAddressList(raw.envelope.bcc, "bcc"),
  ];

  // 附件转换
  const attachments: EmailAttachment[] = raw.attachments.map((a) =>
    convertImapAttachment(a, raw.uid)
  );

  return {
    id: raw.uid,
    sender,
    recipients,
    subject: raw.envelope.subject || "",
    body: {
      plain: raw.bodyPlain ?? "",
      html: raw.bodyHtml,
    },
    timestamps: {
      sent: raw.envelope.date ? normalizeImapDate(raw.envelope.date) : new Date().toISOString(),
      received: normalizeImapDate(raw.internalDate),
    },
    flags: {
      isRead: hasFlag(raw.flags, "Seen"),
      isStarred: hasFlag(raw.flags, "Flagged"),
      isDraft: hasFlag(raw.flags, "Draft"),
      hasAttachments: raw.attachments.length > 0,
    },
    attachments,
    threadId: raw.envelope.messageId || undefined,
    labels: [],
    source: {
      accountId,
      protocol: "imap",
      rawId: raw.uid,
    },
  };
}
