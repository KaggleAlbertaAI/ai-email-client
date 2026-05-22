// UI 状态管理 - Zustand store

import { create } from "zustand";

interface UIStore {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  mobileView: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setMobileView: (isMobile: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  theme: "system",
  mobileView: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => set({ theme }),
  setMobileView: (mobileView) => set({ mobileView }),
}));
