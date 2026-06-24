'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { Layout, Input, Typography, Card } from 'antd';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import { useSyncStore } from '@shared/stores/useSyncStore';
import EditorToolbar from '@shared/components/editor/EditorToolbar';
import PresencePanel from '@shared/components/collaboration/PresencePanel';
import VersionHistoryDrawer from '@shared/components/version/VersionHistoryDrawer';
import { createSyncWorker } from '@shared/lib/sync-engine';
import { saveDocumentLocal, getDocumentLocal, saveVersionLocal } from '@shared/lib/db/dexie';
import { usePresence } from '@document/hooks/usePresence';

const QuillEditor = dynamic(() => import('@shared/components/editor/QuillEditor'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-gray-400">Loading editor...</div>,
});

const { Content } = Layout;

export default function DocumentShell({ documentId, workspaceId, initialDocument, userRole }) {
  const { data: session } = useSession();
  const readOnly = userRole === 'VIEWER';

  const title = useDocumentStore((s) => s.title);
  const content = useDocumentStore((s) => s.content);
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const setContent = useDocumentStore((s) => s.setContent);
  const markClean = useDocumentStore((s) => s.markClean);
  const aiPanelOpen = useDocumentStore((s) => s.aiPanelOpen);

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
    [documentId, setStatus, setPendingCount, setTitle, setContent, markClean]
  );

  usePresence(documentId, session?.user);

  useEffect(() => {
    async function loadLocal() {
      let doc = await getDocumentLocal(documentId);
      if (!doc && initialDocument) {
        doc = {
          id: documentId,
          workspaceId,
          title: initialDocument.title,
          content: initialDocument.content,
          currentVersion: initialDocument.currentVersion,
          updatedAt: initialDocument.updatedAt,
        };
        await saveDocumentLocal(doc);
      }
      if (doc) setActiveDocument(doc);
      else if (initialDocument) setActiveDocument(initialDocument);
    }
    loadLocal();
    syncWorker.init();
    return () => syncWorker.destroy();
  }, [documentId, workspaceId, initialDocument, setActiveDocument, syncWorker]);

  const handleContentChange = useCallback(
    (html) => {
      if (readOnly) return;
      setContent(html);
      syncWorker.recordEdit('CONTENT_UPDATE', { content: html });
    },
    [readOnly, setContent, syncWorker]
  );

  const handleTitleChange = useCallback(
    (e) => {
      if (readOnly) return;
      const newTitle = e.target.value;
      setTitle(newTitle);
      syncWorker.recordEdit('TITLE_UPDATE', { title: newTitle });
    },
    [readOnly, setTitle, syncWorker]
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
      const res = await fetch(`/api/documents/${documentId}/versions/${version._id || version.version}/restore`, {
        method: 'POST',
      });
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
    [documentId, setTitle, setContent, syncWorker]
  );

  return (
    <Layout className="min-h-screen flex flex-col">
      <EditorToolbar onSnapshot={handleSnapshot} onSave={handleSave} readOnly={readOnly} />
      <div className="flex flex-1 overflow-hidden">
        <Content className="flex flex-col flex-1 bg-white dark:bg-gray-900">
          <div className="px-8 pt-6 pb-2">
            <Input
              variant="borderless"
              value={title}
              onChange={handleTitleChange}
              readOnly={readOnly}
              className="!text-2xl !font-semibold !p-0"
              placeholder="Untitled"
            />
          </div>
          <div className="flex-1 px-8 pb-8 overflow-auto">
            <QuillEditor content={content} onChange={handleContentChange} readOnly={readOnly} />
          </div>
        </Content>
        <PresencePanel />
        {aiPanelOpen && (
          <Card title="AI Assistant" className="w-72 shrink-0 rounded-none border-l" size="small">
            <Typography.Paragraph type="secondary" className="text-sm">
              AI assistant panel — integrate your preferred LLM API here for summarization, rewriting, and suggestions.
            </Typography.Paragraph>
          </Card>
        )}
      </div>
      <VersionHistoryDrawer documentId={documentId} onRestore={handleRestore} />
    </Layout>
  );
}
