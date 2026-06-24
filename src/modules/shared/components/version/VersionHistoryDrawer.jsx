'use client';

import { useState, useEffect } from 'react';
import {
  Drawer,
  Timeline,
  Button,
  Typography,
  Space,
  Modal,
  Tag,
  Empty,
  Spin,
  Collapse,
  Avatar,
} from 'antd';
import { RollbackOutlined, DiffOutlined, UserOutlined } from '@ant-design/icons';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import { getUserColorFromInitial } from '@shared/utils/user-color';

const SNAPSHOT_TYPE_LABELS = {
  session_start: 'Session start',
  session_auto: 'Auto snapshot',
  session_end: 'Session end',
  restore: 'Restore',
  manual: 'Manual',
};

function ChangeLogPanel({ documentId, sessionId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/documents/${documentId}/edit-session/${sessionId}/changes`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [documentId, sessionId]);

  if (loading) return <Spin size="small" />;
  if (!data?.users?.length) return <Typography.Text type="secondary">No changes logged</Typography.Text>;

  return (
    <div className="mt-2 space-y-3">
      {data.users.map((user) => {
        const label = user.name || user.email || 'User';
        return (
          <div key={user.userId} className="rounded border border-gray-100 p-2">
            <div className="mb-1 flex items-center gap-2">
              <Avatar
                size="small"
                style={{ backgroundColor: getUserColorFromInitial(label) }}
                icon={<UserOutlined />}
              >
                {label[0]?.toUpperCase()}
              </Avatar>
              <Typography.Text strong className="text-xs">
                {label}
              </Typography.Text>
              <Tag className="!m-0">{user.changes.length} changes</Tag>
            </div>
            <ul className="m-0 list-none space-y-1 pl-1">
              {user.changes.map((change) => (
                <li key={change._id} className="text-xs text-gray-600">
                  <span className="font-medium">{change.operationType.replace('_', ' ').toLowerCase()}</span>
                  {change.payload?.preview && (
                    <span className="ml-1 text-gray-400">— {change.payload.preview}</span>
                  )}
                  {change.payload?.title && (
                    <span className="ml-1 text-gray-400">— {change.payload.title}</span>
                  )}
                  <div className="text-[10px] text-gray-400">
                    {new Date(change.createdAt).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function VersionHistoryDrawer({ documentId, onRestore, onCompare }) {
  const open = useDocumentStore((s) => s.versionDrawerOpen);
  const setOpen = useDocumentStore((s) => s.setVersionDrawerOpen);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compareModal, setCompareModal] = useState(null);

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    fetch(`/api/documents/${documentId}/versions`)
      .then((r) => (r.ok ? r.json() : { versions: [] }))
      .then((remote) => {
        setVersions((remote.versions || []).sort((a, b) => b.version - a.version));
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
        width={420}
        open={open}
        onClose={() => setOpen(false)}
      >
        {loading ? (
          <Spin />
        ) : versions.length === 0 ? (
          <Empty description="No versions yet. Snapshots are created automatically when you edit." />
        ) : (
          <Timeline
            items={versions.map((v) => ({
              children: (
                <div className="pb-2">
                  <Typography.Text strong>v{v.version}</Typography.Text>
                  {v.snapshotType && (
                    <Tag color="blue" className="ml-2">
                      {SNAPSHOT_TYPE_LABELS[v.snapshotType] || v.snapshotType}
                    </Tag>
                  )}
                  {v.label && v.snapshotType !== 'session_auto' && (
                    <Tag className="ml-1">{v.label}</Tag>
                  )}
                  {v.restoreOf && <Tag color="purple">Restored from v{v.restoreOf}</Tag>}
                  {v.createdBy && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Avatar
                        size={16}
                        style={{
                          backgroundColor: getUserColorFromInitial(
                            v.createdBy.name || v.createdBy.email,
                          ),
                        }}
                      >
                        {(v.createdBy.name || v.createdBy.email)?.[0]?.toUpperCase()}
                      </Avatar>
                      {v.createdBy.name || v.createdBy.email}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                  {v.changeSummary?.byUser?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {v.changeSummary.byUser.map((entry) => (
                        <Tag key={entry.email} className="!text-[10px]">
                          {entry.email}: {entry.count}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {v.sessionId && ['session_auto', 'session_end', 'session_start'].includes(v.snapshotType) && (
                    <Collapse
                      ghost
                      size="small"
                      className="!mt-1"
                      items={[
                        {
                          key: 'changes',
                          label: <span className="text-xs">Per-user change log</span>,
                          children: <ChangeLogPanel documentId={documentId} sessionId={v.sessionId} />,
                        },
                      ]}
                    />
                  )}
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
            dangerouslySetInnerHTML={{
              __html: compareModal.snapshot?.content || compareModal.content || '',
            }}
          />
        )}
      </Modal>
    </>
  );
}
