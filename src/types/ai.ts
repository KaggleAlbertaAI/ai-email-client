// AI 功能类型定义 — 与 API 路由返回结构对齐

/** AI 邮件摘要结果 */
export interface AISummary {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative";
  requiresResponse: boolean;
}

/** AI 智能回复建议 */
export interface SmartReply {
  content: string;
  tone: "professional" | "friendly" | "concise";
}

/** AI 邮件分类 */
export interface MailClassification {
  category: "important" | "normal" | "promotional" | "social";
  priority: number;
  requiresResponse: boolean;
}
