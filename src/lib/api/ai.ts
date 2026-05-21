// AI 功能 API 请求封装

import type { AISummary, SmartReply, MailClassification } from "@/types";
import type { UnifiedEmail } from "@/lib/api/types";

/** 获取 AI 邮件摘要 */
export async function generateSummary(email: UnifiedEmail): Promise<AISummary> {
  console.log("[ai-api] Calling /api/ai/summarize for email:", email.id);
  const response = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  console.log("[ai-api] /api/ai/summarize response:", response.status);
  // API 路由已保证返回有效数据（即使 AI 失败也返回降级摘要）
  const data = await response.json();
  // 如果是错误响应，返回降级数据
  if (!response.ok && data.summary) return data as AISummary;
  if (!response.ok) throw new Error(`Failed to generate summary: ${response.statusText}`);
  return data as AISummary;
}

/** 获取智能回复建议 */
export async function generateSmartReplies(
  email: UnifiedEmail,
  tone?: string
): Promise<SmartReply[]> {
  const response = await fetch("/api/ai/smart-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, tone }),
  });
  const data = await response.json();
  if (!response.ok && data.length) return data as SmartReply[];
  if (!response.ok) throw new Error(`Failed to generate smart replies: ${response.statusText}`);
  return data as SmartReply[];
}

/** AI 邮件分类 */
export async function classifyMail(email: UnifiedEmail): Promise<MailClassification> {
  const response = await fetch("/api/ai/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok && data.category) return data as MailClassification;
  if (!response.ok) throw new Error(`Failed to classify email: ${response.statusText}`);
  return data as MailClassification;
}
