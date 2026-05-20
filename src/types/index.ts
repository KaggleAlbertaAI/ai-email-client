export type { Mail, Attachment, MailAccount, MailFolder } from "./mail";
export type { AISummary, SmartReply, MailClassification } from "./ai";

// 重新导出 API 层统一类型（供组件和 AI 模块直接 import）
export type {
  UnifiedEmail,
  EmailAddress,
  EmailRecipient,
  EmailAttachment,
  EmailBody,
  EmailFlags,
  EmailTimestamps,
  EmailSource,
  EmailAI,
  UnifiedAccount,
  EmailProtocol,
  PaginatedResponse,
  ApiError,
} from "@/lib/api/types";
