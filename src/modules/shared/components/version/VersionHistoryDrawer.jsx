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
  Avatar,
  Tooltip,
  message,
} from 'antd';
import { RollbackOutlined, DiffOutlined } from '@ant-design/icons';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import { getUserColorFromInitial } from '@shared/utils/user-color';
import { formatSnapshotDate } from '@shared/utils/content-diff';

function EditorAvatars({ editors = [] }) {
  if (!editors.length) return null;

  return (
    <Avatar.Group max={{ count: 5 }} size={18}>
      {editors.map((editor) => {
        const label = editor.name || editor.email || 'User';
        return (
          <Tooltip key={editor.userId || label} title={label}>
            <Avatar
              size={18}
              className="!text-[10px] !leading-[18px]"
              style={{ backgroundColor: getUserColorFromInitial(label) }}
            >
              {label[0]?.toUpperCase()}
            </Avatar>
          </Tooltip>
        );
      })}
    </Avatar.Group>
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Typography.Text strong>{formatSnapshotDate(v.createdAt)}</Typography.Text>
                  <EditorAvatars editors={v.editors} />
                </div>
                {(v.snapshotType === 'restore' || v.restoreOf) && (
                  <div className="mt-1">
                    <Tag color="purple" className="!m-0">
                      Restored
                      {(() => {
                        const fromDate = versions.find((x) => x.version === v.restoreOf)?.createdAt;
                        return fromDate ? ` from ${formatSnapshotDate(fromDate)}` : '';
                      })()}
                    </Tag>
                  </div>
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
