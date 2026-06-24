import { create } from 'zustand';

export const useSyncStore = create((set) => ({
  status: 'idle',
  pendingCount: 0,
  lastSyncedAt: null,
  networkStatus: 'online',
  collaborators: [],

  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  setCollaborators: (collaborators) => set({ collaborators }),

  addCollaborator: (user) =>
    set((s) => ({
      collaborators: [...s.collaborators.filter((c) => c.userId !== user.userId), user],
    })),

  removeCollaborator: (userId) =>
    set((s) => ({
      collaborators: s.collaborators.filter((c) => c.userId !== userId),
    })),
}));
