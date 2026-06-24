export async function fetchDocumentCounts() {
  const res = await fetch('/api/documents?countsOnly=true');
  if (!res.ok) throw new Error('Failed to fetch document counts');
  return res.json();
}

export async function fetchAllDocuments({
  filter = 'all',
  search = '',
  page = 1,
  pageSize = 12,
} = {}) {
  const params = new URLSearchParams({
    filter,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) params.set('search', search);

  const res = await fetch(`/api/documents?${params}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchWorkspaces() {
  const res = await fetch('/api/workspaces');
  if (!res.ok) throw new Error('Failed to fetch workspaces');
  return res.json();
}

export async function fetchDocuments(workspaceId) {
  const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function createDocument({ title, workspaceId }) {
  const res = await fetch('/api/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, workspaceId }),
  });
  if (!res.ok) throw new Error('Failed to create document');
  return res.json();
}
