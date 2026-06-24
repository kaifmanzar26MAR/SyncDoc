import { create } from 'zustand';

export const useDocumentStore = create((set, get) => ({
  activeDocument: null,
  title: '',
  content: '',
  isDirty: false,
  versionDrawerOpen: false,

  setActiveDocument: (doc) =>
    set({
      activeDocument: doc,
      title: doc?.title || '',
      content: doc?.content || '',
      isDirty: false,
    }),

  setTitle: (title) => set({ title, isDirty: true }),
  setContent: (content) => set({ content, isDirty: true }),
  applyRemoteUpdate: ({ title, content }) =>
    set((state) => ({
      title: title !== undefined ? title : state.title,
      content: content !== undefined ? content : state.content,
    })),
  markClean: () => set({ isDirty: false }),

  toggleVersionDrawer: () => set((s) => ({ versionDrawerOpen: !s.versionDrawerOpen })),
  setVersionDrawerOpen: (open) => set({ versionDrawerOpen: open }),

  getSnapshot: () => {
    const { title, content } = get();
    return { title, content };
  },
}));
