// 邮件数据自定义 Hook
// 调用 /api/emails 获取并管理 UnifiedEmail 数据

import { useState, useCallback } from "react";
import type { UnifiedEmail, PaginatedResponse } from "@/lib/api/types";

export interface UseEmailsReturn {
  /** 邮件列表 */
  emails: UnifiedEmail[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否还有更多数据 */
  hasMore: boolean;
  /** 下一页游标 */
  nextCursor: string | null;
  /** 当前选中的邮件 */
  selectedEmail: UnifiedEmail | null;
  /** 加载收件箱邮件 */
  loadInbox: (options?: {
    accountId?: string;
    unreadOnly?: boolean;
    searchQuery?: string;
  }) => Promise<void>;
  /** 加载更多（游标分页） */
  loadMore: () => Promise<void>;
  /** 选择邮件 */
  selectEmail: (email: UnifiedEmail | null) => void;
  /** 刷新邮件列表 */
  refresh: () => Promise<void>;
  /** 从本地状态移除邮件（删除后同步 UI） */
  removeEmail: (id: string) => void;
  /** 标记邮件为已归档（本地状态，UI 不再显示） */
  archiveEmailLocal: (id: string) => void;
  /** 更新邮件标签（本地状态同步） */
  addLabelToLocalEmail: (id: string, label: string) => void;
}

export function useEmails(): UseEmailsReturn {
  const [emails, setEmails] = useState<UnifiedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<UnifiedEmail | null>(null);
  const [lastQuery, setLastQuery] = useState<Record<string, string | boolean | undefined>>({});

  /** 加载收件箱邮件 */
  const loadInbox = useCallback(
    async (options?: {
      accountId?: string;
      unreadOnly?: boolean;
      searchQuery?: string;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (options?.accountId) params.set("accountId", options.accountId);
        if (options?.unreadOnly) params.set("unreadOnly", "true");
        if (options?.searchQuery) params.set("searchQuery", options.searchQuery);

        const response = await fetch(`/api/emails?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`获取邮件失败: ${response.statusText}`);
        }

        const data: PaginatedResponse<UnifiedEmail> = await response.json();
        setEmails(data.data);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        setLastQuery(options ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "未知错误");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** 加载更多（游标分页） */
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      Object.entries(lastQuery).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });

      const response = await fetch(`/api/emails?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`加载更多邮件失败: ${response.statusText}`);
      }

      const data: PaginatedResponse<UnifiedEmail> = await response.json();
      setEmails((prev) => [...prev, ...data.data]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, lastQuery]);

  /** 选择邮件 */
  const selectEmail = useCallback((email: UnifiedEmail | null) => {
    setSelectedEmail(email);
  }, []);

  /** 刷新邮件列表 */
  const refresh = useCallback(async () => {
    await loadInbox(lastQuery);
  }, [loadInbox, lastQuery]);

  /** 从本地状态移除邮件（删除后同步 UI） */
  const removeEmail = useCallback((id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    setSelectedEmail((prev) => (prev?.id === id ? null : prev));
  }, []);

  /** 标记邮件为已归档（本地状态，UI 不再显示） */
  const archiveEmailLocal = useCallback((id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    setSelectedEmail((prev) => (prev?.id === id ? null : prev));
  }, []);

  /** 更新邮件标签（本地状态同步） */
  const addLabelToLocalEmail = useCallback((id: string, label: string) => {
    setEmails((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, labels: [...(e.labels ?? []), label] } : e
      )
    );
    setSelectedEmail((prev) =>
      prev?.id === id ? { ...prev, labels: [...(prev.labels ?? []), label] } : prev
    );
  }, []);

  return {
    emails,
    loading,
    error,
    hasMore,
    nextCursor,
    selectedEmail,
    loadInbox,
    loadMore,
    selectEmail,
    refresh,
    removeEmail,
    archiveEmailLocal,
    addLabelToLocalEmail,
  };
}
