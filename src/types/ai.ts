// AI 功能相关类型定义

/** AI 邮件摘要结果 */
export interface AISummary {
  mailId: string;
  summary: string;
  keyPoints: string[];
  sentiment?: "positive" | "neutral" | "negative";
  suggestedActions?: string[];
}

/** AI 智能回复建议 */
export interface SmartReply {
  id: string;
  content: string;
  tone: "formal" | "casual" | "brief";
}

/** AI 邮件分类 */
export interface MailClassification {
  mailId: string;
  category: "important" | "normal" | "promotional" | "social";
  priority: number;
  requiresResponse: boolean;
}
