'use client';

import { Badge, Tooltip } from 'antd';
import { CloudOutlined, CloudSyncOutlined, DisconnectOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useSyncStore } from '@shared/stores/useSyncStore';

const STATUS_CONFIG = {
  idle: { icon: CloudOutlined, color: '#22c55e', label: 'Synced' },
  syncing: { icon: CloudSyncOutlined, color: '#6366f1', label: 'Syncing...' },
  offline: { icon: DisconnectOutlined, color: '#f59e0b', label: 'Offline' },
  error: { icon: ExclamationCircleOutlined, color: '#ef4444', label: 'Sync error' },
};

export default function SyncStatusIndicator() {
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const networkStatus = useSyncStore((s) => s.networkStatus);

  const effectiveStatus = networkStatus === 'offline' ? 'offline' : status;
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.idle;
  const Icon = config.icon;

  return (
    <Tooltip title={`${config.label}${pendingCount ? ` (${pendingCount} pending)` : ''}`}>
      <Badge count={pendingCount} size="small" offset={[-2, 2]}>
        <Icon style={{ fontSize: 18, color: config.color }} />
      </Badge>
    </Tooltip>
  );
}
