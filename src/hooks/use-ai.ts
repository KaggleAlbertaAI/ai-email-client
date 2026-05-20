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
      // 分类失败不影响其他功能
    }
  }, []);

  return { summary, replies, classification, isLoading, summarize, getSmartReplies, classify };
}
