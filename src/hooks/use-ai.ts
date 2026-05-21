// AI 功能自定义 Hook

import { useState, useCallback } from "react";
import * as aiApi from "@/lib/api/ai";
import type { AISummary, SmartReply, MailClassification } from "@/types";
import type { UnifiedEmail } from "@/lib/api/types";

export interface UseAIReturn {
  summary: AISummary | null;
  replies: SmartReply[];
  classification: MailClassification | null;
  isLoading: boolean;
  summarize: (email: UnifiedEmail) => Promise<void>;
  getSmartReplies: (email: UnifiedEmail, tone?: string) => Promise<void>;
  classify: (email: UnifiedEmail) => Promise<void>;
}

export function useAI(): UseAIReturn {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [classification, setClassification] = useState<MailClassification | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /** 生成邮件摘要 */
  const summarize = useCallback(async (email: UnifiedEmail) => {
    console.log("[useAI] summarize called for email:", email.id, "hasAiCache:", !!email.ai?.summary);

    // 如果邮件已有 AI 摘要缓存，直接使用
    if (email.ai?.summary) {
      setSummary({
        summary: email.ai.summary,
        keyPoints: email.ai.keyPoints ?? [],
        sentiment: email.ai.sentiment ?? "neutral",
        requiresResponse: email.ai.requiresResponse ?? false,
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await aiApi.generateSummary(email);
      // 将摘要同步缓存到 email.ai 上，避免重复调用
      (email as any).ai = result;
      setSummary(result);
    } catch {
      // 摘要失败时设置降级数据
      const text = email.body?.plain ?? "";
      setSummary({
        summary: text.slice(0, 80) + (text.length > 80 ? "..." : ""),
        keyPoints: [],
        sentiment: "neutral",
        requiresResponse: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** 生成智能回复建议 */
  const getSmartReplies = useCallback(async (email: UnifiedEmail, tone?: string) => {
    setIsLoading(true);
    try {
      const result = await aiApi.generateSmartReplies(email, tone);
      setReplies(result);
    } catch {
      // 回复失败时设置降级回复
      setReplies([
        { content: "Thank you for your email. I will handle it as soon as possible.", tone: "professional" },
        { content: "Thank you for your message. I'll reply soon!", tone: "friendly" },
        { content: "Received, thank you.", tone: "concise" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** 邮件分类 */
  const classify = useCallback(async (email: UnifiedEmail) => {
    // 如果已有分类缓存，直接使用
    if ((email as any).ai?.category) {
      setClassification({
        category: (email as any).ai.category,
        priority: (email as any).ai.priority ?? 3,
        requiresResponse: (email as any).ai.requiresResponse ?? false,
      });
      return;
    }

    try {
      const result = await aiApi.classifyMail(email);
      // 将分类缓存到 email.ai 上
      (email as any).ai = { ...((email as any).ai || {}), category: result.category, priority: result.priority, requiresResponse: result.requiresResponse };
      setClassification(result);
    } catch {
      // 分类失败时使用默认值
      setClassification({ category: "normal", priority: 3, requiresResponse: false });
    }
  }, []);

  return { summary, replies, classification, isLoading, summarize, getSmartReplies, classify };
}
