// AI 功能自定义 Hook

import { useState, useCallback } from "react";
import * as aiApi from "@/lib/api/ai";
import type { AISummary, SmartReply, MailClassification } from "@/types";
import type { UnifiedEmail } from "@/lib/api/types";

export function useAI() {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [classification, setClassification] = useState<MailClassification | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /** 生成邮件摘要 */
  const summarize = useCallback(async (email: UnifiedEmail) => {
    setIsLoading(true);
    try {
      const result = await aiApi.generateSummary(email);
      setSummary(result);
    } catch {
      // 摘要失败时设置降级数据
      const text = email.body?.plain ?? "";
      setSummary({
        summary: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
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
        { content: "感谢您的邮件，我会尽快处理。", tone: "professional" },
        { content: "谢谢你的来信，我会尽快回复！", tone: "friendly" },
        { content: "收到，谢谢。", tone: "concise" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** 邮件分类 */
  const classify = useCallback(async (email: UnifiedEmail) => {
    try {
      const result = await aiApi.classifyMail(email);
      setClassification(result);
    } catch {
      // 分类失败时使用默认值
      setClassification({ category: "normal", priority: 3, requiresResponse: false });
    }
  }, []);

  return { summary, replies, classification, isLoading, summarize, getSmartReplies, classify };
}
