'use client';

import { useEffect } from 'react';
import { getGlobalPendingCount } from '@shared/lib/sync-engine';
import { useSyncStore } from '@shared/stores/useSyncStore';
import { subscribeNetwork } from '@shared/lib/sync-engine/network-monitor';

export default function GlobalStateProvider({ children }) {
  const setPendingCount = useSyncStore((s) => s.setPendingCount);
  const setNetworkStatus = useSyncStore((s) => s.setNetworkStatus);

  useEffect(() => {
    getGlobalPendingCount().then(setPendingCount);
    const unsub = subscribeNetwork((online) => {
      setNetworkStatus(online ? 'online' : 'offline');
    });
    return unsub;
  }, [setPendingCount, setNetworkStatus]);

  return children;
}
