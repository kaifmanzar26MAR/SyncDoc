import { addToQueue, getQueueForDocument, acknowledgeSynced, initClockFromMetadata } from './queue-manager';
import { logOperation, mergeRemoteOperations } from './operation-log';
import { resolveDocumentState, base64ToUint8, uint8ToBase64 } from './conflict-resolver';
import { NetworkMonitor, isOnline } from './network-monitor';
import {
  saveDocumentLocal,
  getDocumentLocal,
  getSyncMetadata,
  setSyncMetadata,
  getOrCreateClientId,
} from '@shared/lib/db/dexie';

const DEBOUNCE_MS = 500;

export class SyncWorker {
  constructor(documentId, callbacks = {}) {
    this.documentId = documentId;
    this.callbacks = callbacks;
    this.clientId = getOrCreateClientId();
    this.networkMonitor = new NetworkMonitor();
    this.debounceTimer = null;
    this.syncing = false;
    this.syncedKeys = new Set();
    this.editSessionId = null;
  }

  setEditSession(sessionId) {
    this.editSessionId = sessionId || null;
  }

  async init() {
    const meta = await getSyncMetadata(this.documentId);
    if (meta?.lastClock) initClockFromMetadata(meta.lastClock);

    this.networkMonitor.start((online) => {
      this.callbacks.onNetworkChange?.(online ? 'online' : 'offline');
      if (online) {
        this.scheduleSync();
        this.pullAndMerge();
      }
    });

    if (isOnline()) {
      this.scheduleSync();
      await this.pullAndMerge();
    }

    this.pullTimer = setInterval(() => this.pullAndMerge(), 4000);
  }

  destroy() {
    this.networkMonitor.stop();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.pullTimer) clearInterval(this.pullTimer);
  }

  async recordEdit(operationType, payload) {
    const { operation, pendingCount } = await addToQueue(
      this.documentId,
      this.clientId,
      operationType,
      payload
    );

    logOperation(this.documentId, operation);
    this.callbacks.onPendingChange?.(pendingCount);

    const local = await getDocumentLocal(this.documentId);
    if (local) {
      const updated = { ...local, ...payload, updatedAt: new Date().toISOString() };
      await saveDocumentLocal(updated);
    }

    this.scheduleSync();
    return operation;
  }

  scheduleSync() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.push(), DEBOUNCE_MS);
  }

  async push() {
    if (!isOnline() || this.syncing) return;
    this.syncing = true;
    this.callbacks.onStatusChange?.('syncing');

    try {
      const queue = await getQueueForDocument(this.documentId);
      const unsynced = queue.filter((op) => !this.syncedKeys.has(op.idempotencyKey));
      if (!unsynced.length) {
        await this.pullAndMerge();
        this.callbacks.onStatusChange?.('idle');
        return;
      }

      const meta = await getSyncMetadata(this.documentId);
      const res = await fetch(`/api/documents/${this.documentId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: unsynced.map((op) => ({
            clientId: op.clientId,
            operationType: op.operationType,
            payload: op.payload,
            logicalClock: op.logicalClock,
            idempotencyKey: op.idempotencyKey,
          })),
          lastPullClock: meta?.lastPullClock || 0,
          sessionId: this.editSessionId || undefined,
        }),
      });

      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

      const data = await res.json();
      await this.handleSyncResponse(unsynced, data);
      this.callbacks.onStatusChange?.('idle');
    } catch (err) {
      console.error('[SyncWorker] push failed:', err);
      this.callbacks.onStatusChange?.('error');
    } finally {
      this.syncing = false;
    }
  }

  async handleSyncResponse(localOps, data) {
    const ids = localOps.map((op) => op.id);
    localOps.forEach((op) => this.syncedKeys.add(op.idempotencyKey));
    const pendingCount = await acknowledgeSynced(ids);
    this.callbacks.onPendingChange?.(pendingCount);

    if (data.remoteOperations?.length) {
      mergeRemoteOperations(localOps, data.remoteOperations);
    }

    const local = await getDocumentLocal(this.documentId);
    if (local && data.document) {
      const merged = resolveDocumentState(
        {
          ...local,
          yjsState: local.yjsState ? base64ToUint8(local.yjsState) : null,
        },
        {
          ...data.document,
          yjsState: data.document.yjsState ? base64ToUint8(data.document.yjsState) : null,
        }
      );

      await saveDocumentLocal({
        ...local,
        title: merged.title,
        content: merged.content,
        yjsState: uint8ToBase64(merged.yjsState),
        currentVersion: merged.currentVersion,
        updatedAt: new Date().toISOString(),
      });

      this.callbacks.onDocumentMerged?.(merged);
    }

    await setSyncMetadata(this.documentId, {
      lastPullClock: data.lastPullClock || 0,
      lastClock: data.lastClock || 0,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  async pullAndMerge() {
    if (!isOnline() || this.syncing) return;

    try {
      const data = await this.pull();
      if (!data?.document) return;

      const local = await getDocumentLocal(this.documentId);
      const remoteOps = data.remoteOperations?.length ?? 0;
      const contentChanged = local?.content !== data.document.content;
      const titleChanged = local?.title !== data.document.title;

      if (!remoteOps && !contentChanged && !titleChanged) return;

      await this.handleSyncResponse([], data);
    } catch (err) {
      console.error('[SyncWorker] pull failed:', err);
    }
  }

  async pull() {
    if (!isOnline()) return null;
    const meta = await getSyncMetadata(this.documentId);
    const res = await fetch(`/api/documents/${this.documentId}/sync?since=${meta?.lastPullClock || 0}`);
    if (!res.ok) return null;
    return res.json();
  }
}

export function createSyncWorker(documentId, callbacks) {
  return new SyncWorker(documentId, callbacks);
}
