'use client';

import { Tag } from 'antd';
import { WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useSyncStore } from '@shared/stores/useSyncStore';

export default function NetworkStatusBadge() {
  const networkStatus = useSyncStore((s) => s.networkStatus);
  const isOnline = networkStatus === 'online';

  return (
    <Tag
      icon={isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
      color={isOnline ? 'success' : 'warning'}
      className="!m-0"
    >
      {isOnline ? 'Online' : 'Offline'}
    </Tag>
  );
}
