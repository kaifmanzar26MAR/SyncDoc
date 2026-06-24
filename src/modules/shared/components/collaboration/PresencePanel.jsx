'use client';

import { List, Typography } from 'antd';
import { useSyncStore } from '@shared/stores/useSyncStore';

export default function PresencePanel() {
  const collaborators = useSyncStore((s) => s.collaborators);

  return (
    <div className="p-3 border-l border-gray-200 dark:border-gray-700 w-48 shrink-0">
      <Typography.Text type="secondary" className="text-xs uppercase tracking-wide">
        Active now
      </Typography.Text>
      <List
        size="small"
        className="mt-2"
        dataSource={collaborators}
        locale={{ emptyText: 'Only you' }}
        renderItem={(item) => (
          <List.Item className="!px-0 !py-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">{item.name}</span>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
