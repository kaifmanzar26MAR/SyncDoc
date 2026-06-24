'use client';

import { useEffect, useCallback, useMemo, useLayoutEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Spin } from 'antd';
import { useSession } from 'next-auth/react';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import { useSyncStore } from '@shared/stores/useSyncStore';
import DocumentHeader from '@document/components/DocumentHeader';
import VersionHistoryDrawer from '@shared/components/version/VersionHistoryDrawer';
import { createSyncWorker } from '@shared/lib/sync-engine';
import { saveDocumentLocal, getDocumentLocal, saveVersionLocal } from '@shared/lib/db/dexie';
import { usePresence } from '@document/hooks/usePresence';

const QuillEditor = dynamic(() => import('@shared/components/editor/QuillEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[297mm] items-center justify-center">
      <Spin />
    </div>
  ),
});

function normalizeDocument(documentId, workspaceId, source) {
  if (!source) return null;

  return {
    id: documentId,
    workspaceId,
    title: source.title ?? '',
    content: source.content ?? '',
    currentVersion: source.currentVersion ?? 1,
    updatedAt: source.updatedAt,
  };
}

function pickPreferredDocument(localDoc, serverDoc) {
  if (!localDoc) return serverDoc;
  if (!serverDoc) return localDoc;

  const localTime = new Date(localDoc.updatedAt || 0).getTime();
  const serverTime = new Date(serverDoc.updatedAt || 0).getTime();

  if (localTime >= serverTime) {
    return { ...serverDoc, ...localDoc };
  }

  return serverDoc;
}

export default function DocumentShell({ documentId, workspaceId, initialDocument, userRole }) {
  const { data: session } = useSession();
  const readOnly = userRole === 'VIEWER';
  const [isDocumentReady, setIsDocumentReady] = useState(false);

  const title = useDocumentStore((s) => s.title);
  const content = useDocumentStore((s) => s.content);
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const setContent = useDocumentStore((s) => s.setContent);
  const markClean = useDocumentStore((s) => s.markClean);

  const setStatus = useSyncStore((s) => s.setStatus);
  const setPendingCount = useSyncStore((s) => s.setPendingCount);
  const setLastSyncedAt = useSyncStore((s) => s.setLastSyncedAt);

  const syncWorker = useMemo(
    () =>
      createSyncWorker(documentId, {
        onStatusChange: setStatus,
        onPendingChange: setPendingCount,
        onNetworkChange: (status) => useSyncStore.getState().setNetworkStatus(status),
        onDocumentMerged: (merged) => {
          setTitle(merged.title);
          setContent(merged.content);
          markClean();
        },
      }),
    [documentId, setStatus, setPendingCount, setTitle, setContent, markClean],
  );

  usePresence(documentId, session?.user);

  useLayoutEffect(() => {
    const serverDoc = normalizeDocument(documentId, workspaceId, initialDocument);
    if (serverDoc) {
      setActiveDocument(serverDoc);
    }
  }, [documentId, workspaceId, initialDocument, setActiveDocument]);

  useEffect(() => {
    let active = true;

    async function loadDocument() {
      setIsDocumentReady(false);

      const serverDoc = normalizeDocument(documentId, workspaceId, initialDocument);
      const localDoc = await getDocumentLocal(documentId);
      const resolvedDoc = pickPreferredDocument(localDoc, serverDoc);

      if (!active) return;

      if (resolvedDoc) {
        setActiveDocument(resolvedDoc);
        await saveDocumentLocal(resolvedDoc);
      }

      setIsDocumentReady(true);
    }

    loadDocument();
    syncWorker.init();

    return () => {
      active = false;
      syncWorker.destroy();
      setActiveDocument(null);
    };
  }, [documentId, workspaceId, initialDocument, setActiveDocument, syncWorker]);

  const handleContentChange = useCallback(
    (html) => {
      if (readOnly || !isDocumentReady) return;
      setContent(html);
      syncWorker.recordEdit('CONTENT_UPDATE', { content: html });
    },
    [readOnly, isDocumentReady, setContent, syncWorker],
  );

  const handleTitleChange = useCallback(
    (e) => {
      if (readOnly || !isDocumentReady) return;
      setTitle(e.target.value);
      syncWorker.recordEdit('TITLE_UPDATE', { title: e.target.value });
    },
    [readOnly, isDocumentReady, setTitle, syncWorker],
  );

  const handleSave = useCallback(async () => {
    await saveDocumentLocal({
      id: documentId,
      workspaceId,
      title,
      content,
      updatedAt: new Date().toISOString(),
    });
    markClean();
  }, [documentId, workspaceId, title, content, markClean]);

  const handleSnapshot = useCallback(async () => {
    const snapshot = { title, content };
    await saveVersionLocal({
      documentId,
      version: Date.now(),
      snapshot,
      createdAt: new Date().toISOString(),
      localOnly: true,
      label: 'Manual snapshot',
    });
    if (!readOnly) {
      await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Manual snapshot' }),
      });
    }
    setLastSyncedAt(new Date().toISOString());
  }, [documentId, title, content, readOnly, setLastSyncedAt]);

  const handleRestore = useCallback(
    async (version) => {
      const res = await fetch(
        `/api/documents/${documentId}/versions/${version._id || version.version}/restore`,
        { method: 'POST' },
      );
      if (res.ok) {
        const data = await res.json();
        setTitle(data.document.title);
        setContent(data.document.content);
        syncWorker.recordEdit('RESTORE', {
          title: data.document.title,
          content: data.document.content,
          restoreOf: version.version,
        });
      }
    },
    [documentId, setTitle, setContent, syncWorker],
  );

  return (
    <div className="flex h-dvh min-h-screen flex-col bg-[var(--gdocs-canvas-bg)]">
      <DocumentHeader
        title={title}
        onTitleChange={handleTitleChange}
        readOnly={readOnly}
        onSnapshot={handleSnapshot}
        onSave={handleSave}
        documentId={documentId}
        workspaceId={workspaceId}
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--gdocs-canvas-bg)] px-4 py-6">
        <div className="document-editor-page mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white px-10 py-12 sm:px-16 sm:py-16">
          {isDocumentReady ? (
            <QuillEditor
              key={documentId}
              content={content}
              onChange={handleContentChange}
              readOnly={readOnly}
            />
          ) : (
            <div className="flex min-h-[240mm] items-center justify-center">
              <Spin />
            </div>
          )}
        </div>
      </div>

      <VersionHistoryDrawer documentId={documentId} onRestore={handleRestore} />
    </div>
  );
}
