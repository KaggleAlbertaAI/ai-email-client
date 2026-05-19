// AI 智能回复服务 —— 基于 agent.ts 统一入口
// 保持向后兼容的 API，内部调用新的 AI Agent

import type { UnifiedEmail } from "@/types";
import { generateReply } from "@/lib/ai/agent";

/** 生成 3 条智能回复建议（向后兼容） */
export async function generateSmartReply(email: UnifiedEmail): Promise<
  Array<{
    content: string;
    tone: "formal" | "casual" | "brief";
  }>
> {
  const toneMap = {
    professional: "formal" as const,
    friendly: "casual" as const,
    concise: "brief" as const,
  };

  const results = await generateReply(email, "professional");
  return results.map((r) => ({
    content: r.content,
    tone: toneMap[r.tone],
  }));
}
