// 邮件状态管理 - Zustand store

import { create } from "zustand";
import type { Mail } from "@/types";

interface MailStore {
  mails: Mail[];
  selectedMail: Mail | null;
  isLoading: boolean;
  error: string | null;

  setMails: (mails: Mail[]) => void;
  selectMail: (mail: Mail | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMailStore = create<MailStore>((set) => ({
  mails: [],
  selectedMail: null,
  isLoading: false,
  error: null,

  setMails: (mails) => set({ mails }),
  selectMail: (mail) => set({ selectedMail: mail }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
