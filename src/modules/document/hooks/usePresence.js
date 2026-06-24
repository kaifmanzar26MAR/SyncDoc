'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSyncStore } from '@shared/stores/useSyncStore';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

export function usePresence(documentId, user) {
  const socketRef = useRef(null);
  const addCollaborator = useSyncStore((s) => s.addCollaborator);
  const removeCollaborator = useSyncStore((s) => s.removeCollaborator);
  const setCollaborators = useSyncStore((s) => s.setCollaborators);

  useEffect(() => {
    if (!documentId || !user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    const socket = io(socketUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    socket.on('connect', () => {
      socket.emit('presence:join', {
        documentId,
        userId: user.id,
        name: user.name || user.email,
        color,
      });
    });

    socket.on('presence:list', (list) => setCollaborators(list));
    socket.on('presence:joined', (collaborator) => addCollaborator(collaborator));
    socket.on('presence:left', ({ userId }) => removeCollaborator(userId));

    socket.on('doc:update', (update) => {
      if (update.documentId === documentId && update.userId !== user.id) {
        // Remote update handled by sync worker pull
      }
    });

    return () => {
      socket.emit('presence:leave', { documentId, userId: user.id });
      socket.disconnect();
    };
  }, [documentId, user, addCollaborator, removeCollaborator, setCollaborators]);
}
