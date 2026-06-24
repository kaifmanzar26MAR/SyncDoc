const operationLog = new Map();

export function logOperation(documentId, operation) {
  if (!operationLog.has(documentId)) {
    operationLog.set(documentId, []);
  }
  const log = operationLog.get(documentId);
  log.push({ ...operation, loggedAt: Date.now() });
  if (log.length > 500) log.shift();
}

export function getOperationLog(documentId) {
  return operationLog.get(documentId) || [];
}

export function clearOperationLog(documentId) {
  operationLog.delete(documentId);
}

export function mergeRemoteOperations(localOps, remoteOps) {
  const seen = new Set(localOps.map((o) => o.idempotencyKey));
  const merged = [...localOps];
  for (const remote of remoteOps) {
    if (!seen.has(remote.idempotencyKey)) {
      merged.push(remote);
      seen.add(remote.idempotencyKey);
    }
  }
  return merged.sort((a, b) => a.logicalClock - b.logicalClock);
}
