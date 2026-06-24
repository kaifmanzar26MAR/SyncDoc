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
