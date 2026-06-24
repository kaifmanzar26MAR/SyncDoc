'use client';

import { useEffect, useRef } from 'react';
import { createSyncWorker } from '@shared/lib/sync-engine';

export function useSyncEngine(documentId, callbacks = {}) {
  const workerRef = useRef(null);

  useEffect(() => {
    if (!documentId) return;
    const worker = createSyncWorker(documentId, callbacks);
    workerRef.current = worker;
    worker.init();
    return () => worker.destroy();
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  return workerRef;
}
