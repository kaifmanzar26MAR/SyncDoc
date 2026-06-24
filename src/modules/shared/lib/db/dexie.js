import Dexie from 'dexie';

class SyncDocDB extends Dexie {
  constructor() {
    super('SyncDocDB');
    this.version(1).stores({
      documents: 'id, workspaceId, updatedAt',
      pendingOperations: '++id, documentId, createdAt, synced',
      versions: '++id, documentId, version, createdAt',
      syncMetadata: 'key',
    });
  }
}

export const db = typeof window !== 'undefined' ? new SyncDocDB() : null;

export function getOrCreateClientId() {
  if (typeof window === 'undefined') return null;
  let clientId = localStorage.getItem('syncdoc_client_id');
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem('syncdoc_client_id', clientId);
  }
  return clientId;
}

export async function saveDocumentLocal(doc) {
  if (!db) return;
  await db.documents.put({
    ...doc,
    updatedAt: doc.updatedAt || new Date().toISOString(),
  });
}

export async function getDocumentLocal(id) {
  if (!db) return null;
  return db.documents.get(id);
}

export async function getDocumentsByWorkspace(workspaceId) {
  if (!db) return [];
  return db.documents.where('workspaceId').equals(workspaceId).toArray();
}

export async function enqueueOperation(operation) {
  if (!db) return;
  await db.pendingOperations.add({
    ...operation,
    synced: false,
    retries: 0,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingOperations(documentId) {
  if (!db) return [];
  return db.pendingOperations
    .where('documentId')
    .equals(documentId)
    .filter((op) => !op.synced)
    .toArray();
}

export async function getPendingCount() {
  if (!db) return 0;
  return db.pendingOperations.filter((op) => !op.synced).count();
}

export async function markOperationsSynced(ids) {
  if (!db || !ids.length) return;
  await db.pendingOperations.where('id').anyOf(ids).modify({ synced: true });
}

export async function saveVersionLocal(version) {
  if (!db) return;
  await db.versions.add(version);
}

export async function getVersionsLocal(documentId) {
  if (!db) return [];
  return db.versions.where('documentId').equals(documentId).reverse().sortBy('version');
}

export async function getSyncMetadata(documentId) {
  if (!db) return null;
  return db.syncMetadata.get(`doc:${documentId}`);
}

export async function setSyncMetadata(documentId, data) {
  if (!db) return;
  await db.syncMetadata.put({ key: `doc:${documentId}`, documentId, ...data });
}
