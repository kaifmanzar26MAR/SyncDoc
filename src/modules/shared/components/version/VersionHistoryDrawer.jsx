'use client';

import { useState, useEffect } from 'react';
import { Drawer, Timeline, Button, Typography, Space, Modal, Tag, Empty, Spin } from 'antd';
import { RollbackOutlined, DiffOutlined } from '@ant-design/icons';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import { getVersionsLocal } from '@shared/lib/db/dexie';

export default function VersionHistoryDrawer({ documentId, onRestore, onCompare }) {
  const open = useDocumentStore((s) => s.versionDrawerOpen);
  const setOpen = useDocumentStore((s) => s.setVersionDrawerOpen);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compareModal, setCompareModal] = useState(null);

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    Promise.all([
      getVersionsLocal(documentId),
      fetch(`/api/documents/${documentId}/versions`).then((r) => (r.ok ? r.json() : { versions: [] })),
    ])
      .then(([local, remote]) => {
        const merged = [...(remote.versions || []), ...local];
        const byVersion = new Map();
        merged.forEach((v) => byVersion.set(v.version, v));
        setVersions([...byVersion.values()].sort((a, b) => b.version - a.version));
      })
      .finally(() => setLoading(false));
  }, [open, documentId]);

  const handleRestore = (version) => {
    Modal.confirm({
      title: 'Restore this version?',
      content: 'A new revision will be created. Current collaborative state is preserved in history.',
      onOk: () => onRestore?.(version),
    });
  };

  return (
    <>
      <Drawer
        title="Version History"
        placement="right"
        width={380}
        open={open}
        onClose={() => setOpen(false)}
      >
        {loading ? (
          <Spin />
        ) : versions.length === 0 ? (
          <Empty description="No versions yet" />
        ) : (
          <Timeline
            items={versions.map((v) => ({
              children: (
                <div className="pb-2">
                  <Typography.Text strong>v{v.version}</Typography.Text>
                  {v.label && <Tag className="ml-2">{v.label}</Tag>}
                  {v.restoreOf && <Tag color="purple">Restored from v{v.restoreOf}</Tag>}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                  <Space className="mt-2">
                    <Button
                      size="small"
                      icon={<RollbackOutlined />}
                      onClick={() => handleRestore(v)}
                    >
                      Restore
                    </Button>
                    <Button
                      size="small"
                      icon={<DiffOutlined />}
                      onClick={() => {
                        setCompareModal(v);
                        onCompare?.(v);
                      }}
                    >
                      Compare
                    </Button>
                  </Space>
                </div>
              ),
            }))}
          />
        )}
      </Drawer>

      <Modal
        title={`Version ${compareModal?.version} Preview`}
        open={!!compareModal}
        onCancel={() => setCompareModal(null)}
        footer={null}
        width={600}
      >
        {compareModal && (
          <div
            className="prose max-w-none p-4 border rounded"
            dangerouslySetInnerHTML={{ __html: compareModal.snapshot?.content || compareModal.content || '' }}
          />
        )}
      </Modal>
    </>
  );
}
