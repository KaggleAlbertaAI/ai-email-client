// AI 邮件摘要服务 —— 基于 agent.ts 统一入口
// 保持向后兼容的 API，内部调用新的 AI Agent

import type { UnifiedEmail } from "@/types";
import { generateSummary } from "@/lib/ai/agent";

/** 为邮件生成结构化摘要（向后兼容） */
export async function summarizeEmail(email: UnifiedEmail): Promise<{
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative";
}> {
  const result = await generateSummary(email);
  return {
    summary: result.summary,
    keyPoints: result.keyPoints,
    sentiment: result.sentiment,
  };
}
