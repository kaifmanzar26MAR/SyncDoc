'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSyncStore } from '@shared/stores/useSyncStore';
import { getUserColorFromInitial } from '@shared/utils/user-color';
import { getSocketUrl } from '@shared/lib/socket/socket-url';

const CONTENT_EMIT_MS = 120;

export function useDocumentSocket({ documentId, user, readOnly, onRemoteChange }) {
  const socketRef = useRef(null);
  const contentEmitTimer = useRef(null);
  const onRemoteChangeRef = useRef(onRemoteChange);

  const addCollaborator = useSyncStore((s) => s.addCollaborator);
  const removeCollaborator = useSyncStore((s) => s.removeCollaborator);
  const setCollaborators = useSyncStore((s) => s.setCollaborators);

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  }, [onRemoteChange]);

  const emitDocChange = useCallback(
    (payload) => {
      if (readOnly || !socketRef.current?.connected || !documentId || !user?.id) return;
      socketRef.current.emit('doc:change', {
        documentId,
        userId: user.id,
        updatedAt: new Date().toISOString(),
        ...payload,
      });
    },
    [documentId, user?.id, readOnly],
  );

  const emitContentChange = useCallback(
    (content) => {
      if (readOnly) return;
      clearTimeout(contentEmitTimer.current);
      contentEmitTimer.current = setTimeout(() => {
        emitDocChange({ operationType: 'CONTENT_UPDATE', content });
      }, CONTENT_EMIT_MS);
    },
    [emitDocChange, readOnly],
  );

  const emitTitleChange = useCallback(
    (title) => {
      if (readOnly) return;
      emitDocChange({ operationType: 'TITLE_UPDATE', title });
    },
    [emitDocChange, readOnly],
  );

  useEffect(() => {
    if (!documentId || !user?.id) return;

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    const displayName = user.name || user.email || '';
    const color = getUserColorFromInitial(displayName);

    const joinPresence = () => {
      socket.emit('presence:join', {
        documentId,
        userId: user.id,
        name: displayName,
        color,
      });
    };

    socket.on('connect', joinPresence);
    socket.on('reconnect', joinPresence);

    socket.on('presence:list', (list) => setCollaborators(list));
    socket.on('presence:joined', (collaborator) => addCollaborator(collaborator));
    socket.on('presence:left', ({ userId }) => removeCollaborator(userId));

    socket.on('doc:change', (payload) => {
      if (!payload || payload.documentId !== documentId) return;
      onRemoteChangeRef.current?.(payload);
    });

    return () => {
      clearTimeout(contentEmitTimer.current);
      socket.emit('presence:leave', { documentId, userId: user.id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, user, addCollaborator, removeCollaborator, setCollaborators]);

  return { emitContentChange, emitTitleChange };
}
