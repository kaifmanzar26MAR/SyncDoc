import { enqueueOperation, getPendingOperations, getPendingCount, markOperationsSynced } from '@shared/lib/db/dexie';

let logicalClock = 0;

export function getLogicalClock() {
  return logicalClock;
}

export function incrementClock() {
  logicalClock += 1;
  return logicalClock;
}

export function initClockFromMetadata(lastClock = 0) {
  logicalClock = Math.max(logicalClock, lastClock);
}

export async function addToQueue(documentId, clientId, operationType, payload) {
  const clock = incrementClock();
  const idempotencyKey = `${clientId}-${clock}-${operationType}`;

  const operation = {
    documentId,
    clientId,
    operationType,
    payload,
    logicalClock: clock,
    idempotencyKey,
  };

  await enqueueOperation(operation);
  const count = await getPendingCount();

  return { operation, pendingCount: count };
}

export async function getQueueForDocument(documentId) {
  return getPendingOperations(documentId);
}

export async function acknowledgeSynced(operationIds) {
  await markOperationsSynced(operationIds);
  const count = await getPendingCount();
  return count;
}

export async function getGlobalPendingCount() {
  return getPendingCount();
}
