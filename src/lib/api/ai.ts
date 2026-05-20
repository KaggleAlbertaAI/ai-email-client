// AI 功能 API 请求封装

import type { AISummary, SmartReply, MailClassification } from "@/types";
import type { UnifiedEmail } from "@/lib/api/types";

/** 获取 AI 邮件摘要 */
export async function generateSummary(email: UnifiedEmail): Promise<AISummary> {
  const response = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(`生成摘要失败: ${response.statusText}`);
  }
  return response.json();
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
  if (!response.ok) {
    throw new Error(`生成智能回复失败: ${response.statusText}`);
  }
  return response.json();
}

/** AI 邮件分类 */
export async function classifyMail(email: UnifiedEmail): Promise<MailClassification> {
  const response = await fetch("/api/ai/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(`邮件分类失败: ${response.statusText}`);
  }
  return response.json();
}
