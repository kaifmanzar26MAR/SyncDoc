const STORAGE_KEY = 'syncdoc_recent_documents';
const MAX_RECENT = 24;

export function recordRecentDocument(document) {
  if (typeof window === 'undefined' || !document?._id) return;

  const entry = {
    _id: document._id,
    title: document.title || 'Untitled',
    workspaceId: document.workspaceId,
    updatedAt: document.updatedAt || new Date().toISOString(),
    isOwned: Boolean(document.isOwned),
    viewedAt: new Date().toISOString(),
  };

  try {
    const existing = getRecentDocuments();
    const filtered = existing.filter((item) => item._id !== entry._id);
    const next = [entry, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
}

export function getRecentDocuments() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function filterRecentDocuments(documents, search = '') {
  const query = search.trim().toLowerCase();
  if (!query) return documents;
  return documents.filter((doc) => (doc.title || '').toLowerCase().includes(query));
}
