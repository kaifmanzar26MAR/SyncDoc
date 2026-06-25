import * as Y from 'yjs';

export function compareClocks(a, b) {
  if (a.logicalClock !== b.logicalClock) {
    return a.logicalClock - b.logicalClock;
  }
  return a.clientId.localeCompare(b.clientId);
}

export function resolveMetadataConflict(local, remote) {
  return compareClocks(local, remote) >= 0 ? local : remote;
}

export function mergeYjsStates(localState, remoteState) {
  const ydoc = new Y.Doc();
  if (localState) {
    try {
      Y.applyUpdate(ydoc, localState);
    } catch {
      /* invalid local state — start fresh */
    }
  }
  if (remoteState) {
    try {
      Y.applyUpdate(ydoc, remoteState);
    } catch {
      /* invalid remote update — skip */
    }
  }
  return Y.encodeStateAsUpdate(ydoc);
}

export function applyYjsUpdate(currentState, update) {
  const ydoc = new Y.Doc();
  if (currentState) {
    try {
      Y.applyUpdate(ydoc, currentState);
    } catch {
      /* reset */
    }
  }
  try {
    Y.applyUpdate(ydoc, update);
    return Y.encodeStateAsUpdate(ydoc);
  } catch {
    return currentState || new Uint8Array();
  }
}

function latestPayloadValue(operations, field) {
  const opTypes =
    field === 'title'
      ? ['TITLE_UPDATE', 'RESTORE']
      : ['CONTENT_UPDATE', 'RESTORE'];

  let winner = null;

  for (const op of operations) {
    if (!opTypes.includes(op.operationType)) continue;
    if (op.payload?.[field] === undefined) continue;
    if (!winner || compareClocks(op, winner) >= 0) {
      winner = op;
    }
  }

  return winner?.payload?.[field];
}

export function resolveDocumentState(localDoc, remoteDoc, options = {}) {
  const { remoteOperations = [], localOperations = [] } = options;

  const mergedYjs = mergeYjsStates(
    localDoc.yjsState ? toUint8Array(localDoc.yjsState) : null,
    remoteDoc.yjsState ? toUint8Array(remoteDoc.yjsState) : null
  );

  const allOps = [...localOperations, ...remoteOperations];
  const resolvedTitle = latestPayloadValue(allOps, 'title');
  const resolvedContent = latestPayloadValue(allOps, 'content');

  return {
    title: resolvedTitle ?? remoteDoc.title ?? localDoc.title,
    content: resolvedContent ?? remoteDoc.content ?? localDoc.content,
    yjsState: mergedYjs,
    currentVersion: Math.max(localDoc.currentVersion || 1, remoteDoc.currentVersion || 1),
  };
}

function toUint8Array(data) {
  if (data instanceof Uint8Array) return data;
  if (typeof data === 'string') {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  if (Array.isArray(data)) return new Uint8Array(data);
  return new Uint8Array(data?.data || data || []);
}

export function uint8ToBase64(bytes) {
  if (!bytes || !bytes.length) return '';
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToUint8(base64) {
  if (!base64) return new Uint8Array();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
