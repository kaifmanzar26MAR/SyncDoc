import { create } from 'zustand';

export const useAppStore = create((set) => ({
  sidebarCollapsed: false,
  currentWorkspaceId: null,
  theme: 'light',
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setWorkspace: (id) => set({ currentWorkspaceId: id }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));
