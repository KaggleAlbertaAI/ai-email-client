// 邮件操作自定义 Hook

import { useCallback } from "react";
import { useMailStore } from "@/lib/store/mail-store";
import * as mailApi from "@/lib/api/mail";
import type { Mail } from "@/types";

export function useMail() {
  const { mails, selectedMail, isLoading, error, setMails, selectMail, setLoading, setError } =
    useMailStore();

  /** 加载收件箱邮件 */
  const loadInbox = useCallback(
    async (accountId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await mailApi.fetchInboxMail(accountId);
        setMails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setMails]
  );

  /** 选择邮件并标记已读 */
  const handleSelectMail = useCallback(
    async (mail: Mail) => {
      selectMail(mail);
      await mailApi.markMailAsRead(mail.id);
      setMails(mails.map((m) => (m.id === mail.id ? { ...m, isRead: true } : m)));
    },
    [selectMail, setMails, mails]
  );

  /** 删除邮件 */
  const handleDeleteMail = useCallback(
    async (mailId: string) => {
      await mailApi.deleteMail(mailId);
      setMails(mails.filter((m) => m.id !== mailId));
      if (selectedMail?.id === mailId) {
        selectMail(null);
      }
    },
    [setMails, selectedMail, selectMail, mails]
  );

  return {
    mails,
    selectedMail,
    isLoading,
    error,
    loadInbox,
    selectMail: handleSelectMail,
    deleteMail: handleDeleteMail,
  };
}
