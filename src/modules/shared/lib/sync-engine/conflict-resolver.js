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

export function resolveDocumentState(localDoc, remoteDoc) {
  const mergedYjs = mergeYjsStates(
    localDoc.yjsState ? toUint8Array(localDoc.yjsState) : null,
    remoteDoc.yjsState ? toUint8Array(remoteDoc.yjsState) : null
  );

  const localMeta = {
    title: localDoc.title,
    content: localDoc.content,
    logicalClock: localDoc.logicalClock || 0,
    clientId: localDoc.clientId || '',
  };
  const remoteMeta = {
    title: remoteDoc.title,
    content: remoteDoc.content,
    logicalClock: remoteDoc.logicalClock || 0,
    clientId: remoteDoc.clientId || '',
  };

  const winner = resolveMetadataConflict(localMeta, remoteMeta);

  return {
    title: winner.title ?? remoteDoc.title ?? localDoc.title,
    content: winner.content ?? remoteDoc.content ?? localDoc.content,
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
