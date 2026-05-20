// API 层类型定义 — 统一数据模型 + 各协议原始数据结构
// 此文件是整个邮件数据流转的核心契约，前端只认 UnifiedEmail

// ---------------------------------------------------------------------------
//  统一数据模型（ARCHITECTURE.md §3 定义）
//  不管底层协议是什么，前端拿到的唯一数据结构
// ---------------------------------------------------------------------------

/** 邮件协议类型 */
export type EmailProtocol = "gmail" | "graph" | "imap";

/** 收件人类型 */
export type RecipientType = "to" | "cc" | "bcc";

/** 情感倾向 */
export type Sentiment = "positive" | "neutral" | "negative";

/** 邮件正文 */
export interface EmailBody {
  /** 纯文本版本（默认展示） */
  plain: string;
  /** HTML 版本（富文本渲染） */
  html?: string;
}

/** 发件人 / 收件人 */
export interface EmailAddress {
  name?: string;
  email: string;
}

/** 收件人（带类型区分） */
export interface EmailRecipient extends EmailAddress {
  type: RecipientType;
}

/** 附件信息 */
export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  thumbnailUrl?: string;
}

/** 状态标记 */
export interface EmailFlags {
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  hasAttachments: boolean;
}

/** 时间戳 */
export interface EmailTimestamps {
  /** 发送时间（ISO 8601） */
  sent: string;
  /** 接收时间（ISO 8601） */
  received: string;
}

/** 来源标识（用于调试和协议路由） */
export interface EmailSource {
  /** 账户 ID */
  accountId: string;
  /** 协议类型 */
  protocol: EmailProtocol;
  /** 原始协议 ID */
  rawId: string;
}

/** AI 生成的数据（懒加载） */
export interface EmailAI {
  /** 邮件摘要 */
  summary?: string;
  /** 关键要点 */
  keyPoints?: string[];
  /** 情感倾向 */
  sentiment?: Sentiment;
  /** 是否需要回复 */
  requiresResponse?: boolean;
}

/**
 * 统一邮件数据模型 — 前端拿到的唯一数据结构
 * 所有协议适配器的输出都必须是这个格式
 */
export interface UnifiedEmail {
  /** 全局唯一标识（UUID） */
  id: string;

  /** 发件人信息 */
  sender: EmailAddress;

  /** 收件人列表 */
  recipients: EmailRecipient[];

  /** 邮件主题 */
  subject: string;

  /** 邮件正文 */
  body: EmailBody;

  /** 时间戳 */
  timestamps: EmailTimestamps;

  /** 状态标记 */
  flags: EmailFlags;

  /** 附件列表 */
  attachments: EmailAttachment[];

  /** 邮件线程 ID（用于会话视图） */
  threadId?: string;

  /** 标签/分类（Gmail labels / Outlook categories） */
  labels: string[];

  /** 来源标识 */
  source: EmailSource;

  /** AI 生成的数据（懒加载） */
  ai?: EmailAI;
}

/** 统一账户模型 */
export interface UnifiedAccount {
  id: string;
  name: string;
  email: string;
  protocol: EmailProtocol;
  isConnected: boolean;
  lastSyncedAt: string | null;
  unreadCount: number;
}

// ---------------------------------------------------------------------------
//  分页与请求参数
// ---------------------------------------------------------------------------

/** 收件箱查询参数 */
export interface InboxQuery {
  /** 账户 ID，不传则返回所有账户 */
  accountId?: string;
  /** 游标分页 */
  cursor?: string;
  /** 每页数量，默认 20 */
  limit?: number;
  /** 仅返回未读 */
  unreadOnly?: boolean;
  /** 搜索关键词 */
  searchQuery?: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
//  协议适配：Gmail API 原始数据结构
//  参考：https://developers.google.com/gmail/api/reference/rest/v1/users.messages
// ---------------------------------------------------------------------------

/** Gmail API Message 头部字段 */
export interface GmailHeader {
  name: string;
  value: string;
}

/** Gmail API 邮件片段（正文 / 附件） */
export interface GmailPart {
  partId: string;
  mimeType: string;
  filename: string;
  headers: GmailHeader[];
  body: {
    size: number;
    data?: string;
    attachmentId?: string;
  };
  parts?: GmailPart[];
}

/** Gmail API 邮件完整结构 */
export interface RawGmailMessage {
  /** Gmail 内部 ID */
  id: string;
  /** 线程 ID */
  threadId: string;
  /** 标签列表 */
  labelIds: string[];
  /** 发送时间戳（毫秒） */
  internalDate: string;
  /** 历史 ID 列表（邮件被修改过） */
  historyId: string;
  /** 正文载荷 */
  payload: GmailPart;
  /** 原始尺寸（字节） */
  sizeEstimate: number;
  /** 草稿 ID（如果是草稿） */
  raw?: string;
}

/** Gmail API 邮件列表项（精简版，不含正文） */
export interface RawGmailMessageList {
  id: string;
  threadId: string;
  labelIds: string[];
}

/** Gmail API 发件人 / 收件人地址 */
export interface GmailEmailAddress {
  name?: string;
  address?: string;
}

// ---------------------------------------------------------------------------
//  协议适配：Microsoft Graph API 原始数据结构
//  参考：https://learn.microsoft.com/en-us/graph/api/resources/message
// ---------------------------------------------------------------------------

/** Microsoft Graph 邮件地址 */
export interface GraphEmailAddress {
  name?: string;
  address: string;
}

/** Microsoft Graph 发件人 / 收件人容器 */
export interface GraphRecipient {
  emailAddress: GraphEmailAddress;
}

/** Microsoft Graph 正文容器 */
export interface GraphItemBody {
  contentType: "text" | "html";
  content: string;
}

/** Microsoft Graph 附件元信息 */
export interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentId?: string;
  contentLocation?: string;
  contentBytes?: string;
}

/** Microsoft Graph 标记（星标） */
export interface GraphFlag {
  flagStatus: "notFlagged" | "flagged" | "complete";
}

/** Microsoft Graph API 邮件完整结构 */
export interface RawOutlookMessage {
  /** Graph 内部 ID（Base64 编码） */
  id: string;
  /** 会话 / 对话 ID */
  conversationId: string;
  /** 主题 */
  subject: string;
  /** 正文 */
  body: GraphItemBody;
  /** 纯文本正文 */
  bodyPreview: string;
  /** 发件人 */
  sender: GraphRecipient | null;
  /** 收件人（To） */
  toRecipients: GraphRecipient[];
  /** 抄送（Cc） */
  ccRecipients: GraphRecipient[];
  /** 密送（Bcc） */
  bccRecipients: GraphRecipient[];
  /** 时间 */
  sentDateTime: string;
  receivedDateTime: string;
  /** 状态 */
  isRead: boolean;
  isDraft: boolean;
  hasAttachments: boolean;
  /** 标记（星标） */
  flag: GraphFlag;
  /** 重要性 */
  importance: "low" | "normal" | "high";
  /** 互联网消息头（用于追踪原始 Message-ID） */
  internetMessageId: string;
  /** 附件列表 */
  attachments: GraphAttachment[];
  /** 回复 ID（用于会话视图） */
  parentFolderId: string;
  /** 变更追踪 */
  changeKey: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

/** Microsoft Graph API 邮件列表项（精简版） */
export interface RawOutlookMessageList {
  id: string;
  subject: string;
  bodyPreview: string;
  from: GraphRecipient | null;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
}

// ---------------------------------------------------------------------------
//  协议适配：IMAP 原始数据结构
//  IMAP 返回的是 RFC 5322 / RFC 822 格式的原始邮件，需自行解析
// ---------------------------------------------------------------------------

/** IMAP 信封信息（RFC 3501 ENVELOPE 结构） */
export interface ImapEnvelope {
  /** Date 头 */
  date: string | null;
  /** Subject 头 */
  subject: string | null;
  /** 发件人 */
  from: ImapAddress[] | null;
  /** 发件人（代理） */
  sender: ImapAddress[] | null;
  /** Reply-To */
  replyTo: ImapAddress[] | null;
  /** 收件人（To） */
  to: ImapAddress[] | null;
  /** 抄送（Cc） */
  cc: ImapAddress[] | null;
  /** 密送（Bcc） */
  bcc: ImapAddress[] | null;
  /** Message-ID */
  messageId: string | null;
}

/** IMAP 地址（RFC 3501） */
export interface ImapAddress {
  /** 个人名称 */
  name: string | null;
  /** 路由（通常为 null） */
  route: string | null;
  /** 用户名（@ 之前） */
  mailbox: string | null;
  /** 域名（@ 之后） */
  host: string | null;
}

/** IMAP MIME 结构体 */
export interface ImapBodyStructure {
  /** 类型（text / multipart / application ...） */
  type: string;
  /** 子类型（plain / html / pdf ...） */
  subtype: string;
  /** 参数（charset, name ...） */
  params?: Record<string, string>;
  /** Content-ID */
  id?: string;
  /** Content-Description */
  description?: string;
  /** Content-Transfer-Encoding */
  encoding: string;
  /** 尺寸（字节） */
  size: number;
  /** 如果是 multipart，包含子部分 */
  parts?: ImapBodyStructure[];
  /** 行数（text 类型） */
  lines?: number;
  /** MD5 校验 */
  md5?: string;
}

/** IMAP 原始邮件数据结构 */
export interface RawImapMessage {
  /** 邮箱内的唯一 UID */
  uid: string;
  /** IMAP 序列号 */
  seq: string;
  /** RFC 3501 ENVELOPE 解析结果 */
  envelope: ImapEnvelope;
  /** MIME 结构体 */
  bodyStructure: ImapBodyStructure;
  /** IMAP 标记列表（\Seen, \Flagged, \Answered ...） */
  flags: string[];
  /** 内部日期（服务器接收时间） */
  internalDate: string;
  /** 尺寸（字节） */
  size: number;
  /** 邮件正文原始内容（纯文本部分，由服务端提取） */
  bodyPlain?: string;
  /** 邮件正文原始内容（HTML 部分，由服务端提取） */
  bodyHtml?: string;
  /** 附件元信息（由服务端从 MIME 中提取） */
  attachments: Array<{
    cid: string;
    filename: string;
    mimeType: string;
    encoding: string;
    size: number;
  }>;
}

// ---------------------------------------------------------------------------
//  API 错误类型
// ---------------------------------------------------------------------------

/** 统一 API 错误 */
export interface ApiError {
  /** 错误码 */
  code: string;
  /** 错误信息 */
  message: string;
  /** 原始错误（用于调试） */
  details?: unknown;
}
