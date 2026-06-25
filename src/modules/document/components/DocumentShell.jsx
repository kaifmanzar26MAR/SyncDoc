'use client';

import { useEffect, useCallback, useLayoutEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button, Spin, Modal, message, Space } from 'antd';
import { CloseOutlined, RollbackOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import { useSyncStore } from '@shared/stores/useSyncStore';
import DocumentHeader from '@document/components/DocumentHeader';
import VersionHistoryDrawer from '@shared/components/version/VersionHistoryDrawer';
import { createSyncWorker } from '@shared/lib/sync-engine';
import { saveDocumentLocal, getDocumentLocal } from '@shared/lib/db/dexie';
import { recordRecentDocument } from '@shared/utils/recent-documents';
import { useDocumentSocket } from '@document/hooks/useDocumentSocket';
import { useEditSession } from '@document/hooks/useEditSession';
import { buildCompareHtml, formatSnapshotDate } from '@shared/utils/content-diff';

const CompareEditorView = dynamic(() => import('@shared/components/editor/CompareEditorView'), {
  ssr: false,
});

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

export default function DocumentShell({
  documentId,
  workspaceId,
  initialDocument,
  userRole,
  pageLoadWarning,
}) {
  const { data: session } = useSession();
  const readOnly = userRole === 'VIEWER';
  const [isDocumentReady, setIsDocumentReady] = useState(false);

  const title = useDocumentStore((s) => s.title);
  const content = useDocumentStore((s) => s.content);
  const setActiveDocument = useDocumentStore((s) => s.setActiveDocument);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const setContent = useDocumentStore((s) => s.setContent);
  const applyRemoteUpdate = useDocumentStore((s) => s.applyRemoteUpdate);
  const markClean = useDocumentStore((s) => s.markClean);
  const compareVersion = useDocumentStore((s) => s.compareVersion);
  const clearCompare = useDocumentStore((s) => s.clearCompare);
  const compareActiveRef = useRef(false);

  const [compareChangeLogs, setCompareChangeLogs] = useState([]);
  const [compareLogsLoading, setCompareLogsLoading] = useState(false);
  const [restoringCompare, setRestoringCompare] = useState(false);

  useEffect(() => {
    compareActiveRef.current = Boolean(compareVersion);
  }, [compareVersion]);

  const setStatus = useSyncStore((s) => s.setStatus);
  const setPendingCount = useSyncStore((s) => s.setPendingCount);
  const lastSyncToastAt = useRef(0);

  const syncCallbacksRef = useRef({
    onStatusChange: () => {},
    onPendingChange: () => {},
    onNetworkChange: () => {},
    onDocumentMerged: () => {},
    onSyncError: () => {},
  });

  syncCallbacksRef.current = {
    onStatusChange: setStatus,
    onPendingChange: setPendingCount,
    onNetworkChange: (status) => useSyncStore.getState().setNetworkStatus(status),
    onDocumentMerged: (merged) => {
      if (compareActiveRef.current) return;
      applyRemoteUpdate({ title: merged.title, content: merged.content });
      markClean();
    },
    onSyncError: (text) => {
      const now = Date.now();
      if (!text || now - lastSyncToastAt.current < 4000) return;
      lastSyncToastAt.current = now;
      message.warning(text, 4);
    },
  };

  const syncWorkerRef = useRef(null);

  useEffect(() => {
    const worker = createSyncWorker(documentId, {
      onStatusChange: (...args) => syncCallbacksRef.current.onStatusChange(...args),
      onPendingChange: (...args) => syncCallbacksRef.current.onPendingChange(...args),
      onNetworkChange: (...args) => syncCallbacksRef.current.onNetworkChange(...args),
      onDocumentMerged: (...args) => syncCallbacksRef.current.onDocumentMerged(...args),
      onSyncError: (...args) => syncCallbacksRef.current.onSyncError(...args),
    });

    syncWorkerRef.current = worker;
    worker.init();

    return () => {
      worker.destroy();
      if (syncWorkerRef.current === worker) {
        syncWorkerRef.current = null;
      }
    };
  }, [documentId]);

  const { sessionId, onEditActivity } = useEditSession(documentId, readOnly);

  useEffect(() => {
    syncWorkerRef.current?.setEditSession(sessionId);
  }, [sessionId]);

  const handleRemoteChange = useCallback(
    async (payload) => {
      if (compareActiveRef.current) return;

      const patch = {};
      if (payload.title !== undefined) patch.title = payload.title;
      if (payload.content !== undefined) patch.content = payload.content;
      if (!Object.keys(patch).length) return;

      applyRemoteUpdate(patch);

      const local = await getDocumentLocal(documentId);
      if (local) {
        await saveDocumentLocal({
          ...local,
          ...patch,
          updatedAt: payload.updatedAt || new Date().toISOString(),
        });
      }
    },
    [applyRemoteUpdate, documentId],
  );

  const { emitContentChange, emitTitleChange } = useDocumentSocket({
    documentId,
    user: session?.user,
    readOnly,
    onRemoteChange: handleRemoteChange,
  });

  useLayoutEffect(() => {
    if (!initialDocument) return;
    const serverDoc = normalizeDocument(documentId, workspaceId, initialDocument);
    if (serverDoc) {
      setActiveDocument(serverDoc);
    }
  }, [documentId, workspaceId, initialDocument, setActiveDocument]);

  useEffect(() => {
    if (pageLoadWarning) {
      message.info(pageLoadWarning, 5);
    }
  }, [pageLoadWarning]);

  useEffect(() => {
    let active = true;

    async function loadDocument() {
      setIsDocumentReady(false);

      const serverDoc = initialDocument
        ? normalizeDocument(documentId, workspaceId, initialDocument)
        : null;
      const localDoc = await getDocumentLocal(documentId);
      const resolvedDoc = serverDoc ? pickPreferredDocument(localDoc, serverDoc) : localDoc;

      if (!active) return;

      if (resolvedDoc) {
        setActiveDocument(resolvedDoc);
        await saveDocumentLocal(resolvedDoc);
        recordRecentDocument({
          _id: documentId,
          title: resolvedDoc.title,
          workspaceId,
          updatedAt: resolvedDoc.updatedAt,
          isOwned: userRole === 'OWNER',
        });
      } else if (!serverDoc) {
        message.warning('No local copy found. Reconnect to load this document.', 5);
      }

      setIsDocumentReady(true);
    }

    loadDocument();

    return () => {
      active = false;
      setActiveDocument(null);
    };
  }, [documentId, workspaceId, initialDocument, setActiveDocument]);

  useEffect(() => {
    if (!compareVersion) {
      setCompareChangeLogs([]);
      setCompareLogsLoading(false);
      return;
    }

    let active = true;
    setCompareLogsLoading(true);

    if (!compareVersion.sessionId) {
      setCompareChangeLogs([]);
      setCompareLogsLoading(false);
      return () => {
        active = false;
      };
    }

    fetch(`/api/documents/${documentId}/edit-session/${compareVersion.sessionId}/changes`, {
      credentials: 'same-origin',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setCompareChangeLogs(data?.logs || []);
      })
      .catch(() => {
        if (active) setCompareChangeLogs([]);
      })
      .finally(() => {
        if (active) setCompareLogsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [compareVersion, documentId]);

  const compareHtml = useMemo(() => {
    if (!compareVersion) return '';
    return buildCompareHtml(
      compareVersion.snapshot?.content || '',
      content,
      compareChangeLogs,
      compareVersion.createdAt,
    );
  }, [compareVersion, content, compareChangeLogs]);

  const handleContentChange = useCallback(
    (html) => {
      if (readOnly || !isDocumentReady || compareActiveRef.current) return;
      setContent(html);
      syncWorkerRef.current?.recordEdit('CONTENT_UPDATE', { content: html });
      emitContentChange(html);
      onEditActivity();
    },
    [readOnly, isDocumentReady, setContent, emitContentChange, onEditActivity],
  );

  const handleTitleChange = useCallback(
    (e) => {
      if (readOnly || !isDocumentReady || compareActiveRef.current) return;
      setTitle(e.target.value);
      syncWorkerRef.current?.recordEdit('TITLE_UPDATE', { title: e.target.value });
      emitTitleChange(e.target.value);
      onEditActivity();
    },
    [readOnly, isDocumentReady, setTitle, emitTitleChange, onEditActivity],
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

  const handleRestore = useCallback(
    async (version) => {
      if (!version?._id) {
        throw new Error('Invalid snapshot');
      }

      const res = await fetch(`/api/documents/${documentId}/versions/${version._id}/restore`, {
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Restore failed');
      }

      setTitle(data.document.title);
      setContent(data.document.content);
      clearCompare();

      await saveDocumentLocal({
        id: documentId,
        workspaceId,
        title: data.document.title,
        content: data.document.content,
        currentVersion: data.document.currentVersion,
        updatedAt: new Date().toISOString(),
      });

      markClean();
      syncWorkerRef.current?.recordEdit('RESTORE', {
        title: data.document.title,
        content: data.document.content,
        restoreOf: version.version,
      });
      onEditActivity();
    },
    [
      documentId,
      workspaceId,
      setTitle,
      setContent,
      onEditActivity,
      markClean,
      clearCompare,
    ],
  );

  const handleCompareRestore = useCallback(() => {
    if (!compareVersion || readOnly) return;

    Modal.confirm({
      title: 'Restore this snapshot?',
      content: 'The document will revert to this snapshot. A new restore entry will be added to history.',
      okText: 'Restore',
      onOk: async () => {
        setRestoringCompare(true);
        try {
          await handleRestore(compareVersion);
          message.success('Snapshot restored');
        } catch (err) {
          message.error(err.message || 'Restore failed');
        } finally {
          setRestoringCompare(false);
        }
      },
    });
  }, [compareVersion, readOnly, handleRestore]);

  return (
    <div className="flex h-dvh min-h-screen flex-col bg-[var(--gdocs-canvas-bg)]">
      <DocumentHeader
        title={title}
        onTitleChange={handleTitleChange}
        readOnly={readOnly}
        isOwner={userRole === 'OWNER'}
        onSave={handleSave}
        documentId={documentId}
        workspaceId={workspaceId}
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--gdocs-canvas-bg)] px-4 py-6">
        {compareVersion && (
          <div className="document-compare-banner mx-auto mb-4 max-w-[210mm] rounded-md">
            <span>
              Comparing <strong>{formatSnapshotDate(compareVersion.createdAt)}</strong> with current
              document
              <span className="ml-2 text-xs opacity-75">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#34a853] align-middle" /> added
                <span className="ml-2 inline-block h-2 w-2 rounded-sm bg-[#ea4335] align-middle" /> removed
              </span>
            </span>
            <Space size="small">
              {!readOnly && (
                <Button
                  size="small"
                  type="primary"
                  icon={<RollbackOutlined />}
                  loading={restoringCompare}
                  onClick={handleCompareRestore}
                >
                  Restore
                </Button>
              )}
              <Button size="small" icon={<CloseOutlined />} onClick={clearCompare}>
                Exit compare
              </Button>
            </Space>
          </div>
        )}

        <div className="document-editor-page mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white px-10 py-12 sm:px-16 sm:py-16">
          {compareVersion ? (
            compareLogsLoading ? (
              <div className="flex min-h-[240mm] items-center justify-center">
                <Spin />
              </div>
            ) : (
              <CompareEditorView key={compareVersion._id} html={compareHtml} />
            )
          ) : isDocumentReady ? (
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
