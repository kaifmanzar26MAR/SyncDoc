import { create } from 'zustand';

export const useDocumentStore = create((set, get) => ({
  activeDocument: null,
  title: '',
  content: '',
  isDirty: false,
  versionDrawerOpen: false,
  aiPanelOpen: false,

  setActiveDocument: (doc) =>
    set({
      activeDocument: doc,
      title: doc?.title || '',
      content: doc?.content || '',
      isDirty: false,
    }),

  setTitle: (title) => set({ title, isDirty: true }),
  setContent: (content) => set({ content, isDirty: true }),
  markClean: () => set({ isDirty: false }),

  toggleVersionDrawer: () => set((s) => ({ versionDrawerOpen: !s.versionDrawerOpen })),
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  setVersionDrawerOpen: (open) => set({ versionDrawerOpen: open }),

  getSnapshot: () => {
    const { title, content } = get();
    return { title, content };
  },
}));
