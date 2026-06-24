export async function fetchDocument(documentId) {
  const res = await fetch(`/api/documents/${documentId}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
}

export async function createSnapshot(documentId, label = '') {
  const res = await fetch(`/api/documents/${documentId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error('Failed to create snapshot');
  return res.json();
}

export async function restoreVersion(documentId, versionId) {
  const res = await fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore version');
  return res.json();
}
