// 邮件相关类型定义

/** 邮件基础信息 */
export interface Mail {
  id: string;
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  attachments?: Attachment[];
  accountId: string;
}

/** 邮件附件 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

/** 邮件账户 */
export interface MailAccount {
  id: string;
  email: string;
  name: string;
  provider: string;
  isConnected: boolean;
  lastSyncedAt?: Date;
}

/** 邮件文件夹/标签 */
export interface MailFolder {
  id: string;
  name: string;
  type: "inbox" | "sent" | "draft" | "spam" | "trash" | "custom";
  unreadCount: number;
  totalCount: number;
}
