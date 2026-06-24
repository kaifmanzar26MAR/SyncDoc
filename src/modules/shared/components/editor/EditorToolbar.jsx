'use client';

import { Button, Space, Tooltip, Divider } from 'antd';
import {
  HistoryOutlined,
  CameraOutlined,
  RobotOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import NetworkStatusBadge from '@shared/components/sync/NetworkStatusBadge';
import SyncStatusIndicator from '@shared/components/sync/SyncStatusIndicator';
import CollaboratorsBar from '@shared/components/collaboration/CollaboratorsBar';

export default function EditorToolbar({ onSnapshot, onSave, readOnly }) {
  const toggleVersionDrawer = useDocumentStore((s) => s.toggleVersionDrawer);
  const toggleAiPanel = useDocumentStore((s) => s.toggleAiPanel);
  const isDirty = useDocumentStore((s) => s.isDirty);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <Space split={<Divider type="vertical" />}>
        <NetworkStatusBadge />
        <SyncStatusIndicator />
        <CollaboratorsBar />
      </Space>
      <Space>
        {!readOnly && (
          <>
            <Tooltip title="Save snapshot">
              <Button icon={<CameraOutlined />} onClick={onSnapshot}>
                Snapshot
              </Button>
            </Tooltip>
            <Tooltip title="Save locally">
              <Button type={isDirty ? 'primary' : 'default'} icon={<SaveOutlined />} onClick={onSave}>
                Save
              </Button>
            </Tooltip>
          </>
        )}
        <Tooltip title="Version history">
          <Button icon={<HistoryOutlined />} onClick={toggleVersionDrawer}>
            History
          </Button>
        </Tooltip>
        <Tooltip title="AI Assistant">
          <Button icon={<RobotOutlined />} onClick={toggleAiPanel}>
            AI
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}
