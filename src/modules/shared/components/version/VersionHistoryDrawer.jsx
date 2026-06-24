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
  message,
} from 'antd';
import { RollbackOutlined, DiffOutlined, UserOutlined } from '@ant-design/icons';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import { getUserColorFromInitial } from '@shared/utils/user-color';
import { formatSnapshotDate } from '@shared/utils/content-diff';

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

export default function VersionHistoryDrawer({ documentId, onRestore }) {
  const open = useDocumentStore((s) => s.versionDrawerOpen);
  const setOpen = useDocumentStore((s) => s.setVersionDrawerOpen);
  const setCompareVersion = useDocumentStore((s) => s.setCompareVersion);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const loadVersions = () => {
    if (!documentId) return;
    setLoading(true);
    fetch(`/api/documents/${documentId}/versions`)
      .then((r) => (r.ok ? r.json() : { versions: [] }))
      .then((remote) => {
        setVersions((remote.versions || []).sort((a, b) => b.version - a.version));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !documentId) return;
    loadVersions();
  }, [open, documentId]);

  const handleRestore = (version) => {
    Modal.confirm({
      title: 'Restore this snapshot?',
      content: 'The document will revert to this snapshot. A new restore entry will be added to history.',
      okText: 'Restore',
      onOk: async () => {
        setRestoringId(version._id);
        try {
          await onRestore?.(version);
          message.success('Snapshot restored');
          loadVersions();
        } catch (err) {
          message.error(err.message || 'Restore failed');
        } finally {
          setRestoringId(null);
        }
      },
    });
  };

  const handleCompare = (version) => {
    setCompareVersion(version);
    setOpen(false);
  };

  return (
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
        <Empty description="No snapshots yet. Versions are created automatically when you edit." />
      ) : (
        <Timeline
          items={versions.map((v) => ({
            children: (
              <div className="pb-2">
                <Typography.Text strong>{formatSnapshotDate(v.createdAt)}</Typography.Text>
                {v.snapshotType && (
                  <Tag color="blue" className="ml-2">
                    {SNAPSHOT_TYPE_LABELS[v.snapshotType] || v.snapshotType}
                  </Tag>
                )}
                {v.restoreOf && (
                  <Tag color="purple" className="ml-1">
                    Restored from {formatSnapshotDate(
                      versions.find((x) => x.version === v.restoreOf)?.createdAt,
                    ) || `v${v.restoreOf}`}
                  </Tag>
                )}
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
                {v.changeSummary?.byUser?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {v.changeSummary.byUser.map((entry) => (
                      <Tag key={entry.email} className="!text-[10px]">
                        {entry.email}: {entry.count}
                      </Tag>
                    ))}
                  </div>
                )}
                {v.sessionId &&
                  ['session_auto', 'session_end', 'session_start'].includes(v.snapshotType) && (
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
                    loading={restoringId === v._id}
                    onClick={() => handleRestore(v)}
                  >
                    Restore
                  </Button>
                  <Button size="small" icon={<DiffOutlined />} onClick={() => handleCompare(v)}>
                    Compare
                  </Button>
                </Space>
              </div>
            ),
          }))}
        />
      )}
    </Drawer>
  );
}
