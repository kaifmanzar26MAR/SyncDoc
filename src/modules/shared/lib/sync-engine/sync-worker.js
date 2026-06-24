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

function isAbortError(err) {
  return err?.name === 'AbortError';
}

function isNetworkFetchError(err) {
  return err instanceof TypeError && /fetch|network/i.test(err.message || '');
}

export class SyncWorker {
  constructor(documentId, callbacks = {}) {
    this.documentId = documentId;
    this.callbacks = callbacks;
    this.clientId = getOrCreateClientId();
    this.networkMonitor = new NetworkMonitor();
    this.debounceTimer = null;
    this.pullTimer = null;
    this.syncing = false;
    this.syncedKeys = new Set();
    this.editSessionId = null;
    this.destroyed = false;
    this.abortController = null;
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setEditSession(sessionId) {
    this.editSessionId = sessionId || null;
  }

  async init() {
    if (this.destroyed) return;

    const meta = await getSyncMetadata(this.documentId);
    if (meta?.lastClock) initClockFromMetadata(meta.lastClock);

    this.networkMonitor.start((online) => {
      if (this.destroyed) return;
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
    this.destroyed = true;
    this.networkMonitor.stop();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.pullTimer) clearInterval(this.pullTimer);
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async recordEdit(operationType, payload) {
    if (this.destroyed) return null;

    const { operation, pendingCount } = await addToQueue(
      this.documentId,
      this.clientId,
      operationType,
      payload,
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
    if (this.destroyed) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.push(), DEBOUNCE_MS);
  }

  async push() {
    if (this.destroyed || !isOnline() || this.syncing) return;

    this.syncing = true;
    this.callbacks.onStatusChange?.('syncing');

    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      const queue = await getQueueForDocument(this.documentId);
      const unsynced = queue.filter((op) => !this.syncedKeys.has(op.idempotencyKey));

      if (!unsynced.length) {
        await this.pullAndMerge(signal);
        if (!this.destroyed) this.callbacks.onStatusChange?.('idle');
        return;
      }

      const meta = await getSyncMetadata(this.documentId);
      const res = await fetch(`/api/documents/${this.documentId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        signal,
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

      if (this.destroyed || signal.aborted) return;

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Sync failed: ${res.status}`);
      }

      const data = await res.json();
      await this.handleSyncResponse(unsynced, data);

      if (!this.destroyed) this.callbacks.onStatusChange?.('idle');
    } catch (err) {
      if (this.destroyed || isAbortError(err)) return;
      if (isNetworkFetchError(err)) {
        console.warn('[SyncWorker] push skipped — server unreachable');
      } else {
        console.error('[SyncWorker] push failed:', err);
      }
      if (!this.destroyed) this.callbacks.onStatusChange?.('error');
    } finally {
      this.syncing = false;
      if (this.abortController?.signal === signal) {
        this.abortController = null;
      }
    }
  }

  async handleSyncResponse(localOps, data) {
    if (this.destroyed) return;

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
        },
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

  async pullAndMerge(signal) {
    if (this.destroyed || !isOnline() || this.syncing) return;

    try {
      const data = await this.pull(signal);
      if (!data?.document || this.destroyed) return;

      const local = await getDocumentLocal(this.documentId);
      const remoteOps = data.remoteOperations?.length ?? 0;
      const contentChanged = local?.content !== data.document.content;
      const titleChanged = local?.title !== data.document.title;

      if (!remoteOps && !contentChanged && !titleChanged) return;

      await this.handleSyncResponse([], data);
    } catch (err) {
      if (this.destroyed || isAbortError(err)) return;
      if (!isNetworkFetchError(err)) {
        console.error('[SyncWorker] pull failed:', err);
      }
    }
  }

  async pull(signal) {
    if (this.destroyed || !isOnline()) return null;

    const meta = await getSyncMetadata(this.documentId);
    const res = await fetch(`/api/documents/${this.documentId}/sync?since=${meta?.lastPullClock || 0}`, {
      credentials: 'same-origin',
      signal,
    });

    if (!res.ok) return null;
    return res.json();
  }
}

export function createSyncWorker(documentId, callbacks) {
  return new SyncWorker(documentId, callbacks);
}
