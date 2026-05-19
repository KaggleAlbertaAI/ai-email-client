// AI 功能自定义 Hook

import { useState, useCallback } from "react";
import * as aiApi from "@/lib/api/ai";
import type { AISummary, SmartReply } from "@/types";

export function useAI() {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /** 生成邮件摘要 */
  const summarize = useCallback(async (mailId: string) => {
    setIsLoading(true);
    try {
      const result = await aiApi.generateSummary(mailId);
      setSummary(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** 生成智能回复建议 */
  const getSmartReplies = useCallback(async (mailId: string) => {
    setIsLoading(true);
    try {
      const result = await aiApi.generateSmartReplies(mailId);
      setReplies(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { summary, replies, isLoading, summarize, getSmartReplies };
}
