'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const SNAPSHOT_DEBOUNCE_MS = 45000;

export function useEditSession(documentId, readOnly) {
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const snapshotTimerRef = useRef(null);
  const joiningRef = useRef(false);

  const commitSnapshot = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || !documentId) return;

    try {
      await fetch(`/api/documents/${documentId}/edit-session/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
    } catch (err) {
      console.error('[EditSession] snapshot failed:', err);
    }
  }, [documentId]);

  const scheduleSnapshot = useCallback(() => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      commitSnapshot();
    }, SNAPSHOT_DEBOUNCE_MS);
  }, [commitSnapshot]);

  const onEditActivity = useCallback(() => {
    if (!sessionIdRef.current || readOnly) return;
    scheduleSnapshot();
  }, [readOnly, scheduleSnapshot]);

  const leaveSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || !documentId) return;

    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }

    try {
      await fetch(`/api/documents/${documentId}/edit-session`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      });
    } catch (err) {
      console.error('[EditSession] leave failed:', err);
    }

    sessionIdRef.current = null;
    setSessionId(null);
  }, [documentId]);

  useEffect(() => {
    if (readOnly || !documentId) return;

    let active = true;

    async function joinSession() {
      if (joiningRef.current) return;
      joiningRef.current = true;

      try {
        const res = await fetch(`/api/documents/${documentId}/edit-session`, { method: 'POST' });
        if (!res.ok || !active) return;

        const data = await res.json();
        const sid = data.session?.sessionId;
        if (sid) {
          sessionIdRef.current = sid;
          setSessionId(sid);
        }
      } catch (err) {
        console.error('[EditSession] join failed:', err);
      } finally {
        joiningRef.current = false;
      }
    }

    joinSession();

    return () => {
      active = false;
      leaveSession();
    };
  }, [documentId, readOnly, leaveSession]);

  return { sessionId, onEditActivity, leaveSession };
}
