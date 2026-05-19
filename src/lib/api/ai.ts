// AI 功能 API 请求封装

import type { AISummary, SmartReply, MailClassification } from "@/types";

/** 获取 AI 邮件摘要 */
export async function generateSummary(mailId: string): Promise<AISummary> {
  const response = await fetch(`/api/ai/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mailId }),
  });
  if (!response.ok) {
    throw new Error(`生成摘要失败: ${response.statusText}`);
  }
  return response.json();
}

/** 获取智能回复建议 */
export async function generateSmartReplies(mailId: string): Promise<SmartReply[]> {
  const response = await fetch(`/api/ai/smart-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mailId }),
  });
  if (!response.ok) {
    throw new Error(`生成智能回复失败: ${response.statusText}`);
  }
  return response.json();
}

/** AI 邮件分类 */
export async function classifyMail(mailId: string): Promise<MailClassification> {
  const response = await fetch(`/api/ai/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mailId }),
  });
  if (!response.ok) {
    throw new Error(`邮件分类失败: ${response.statusText}`);
  }
  return response.json();
}
