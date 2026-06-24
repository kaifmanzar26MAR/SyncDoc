'use client';

import { Avatar, Tooltip, Space } from 'antd';
import { useSyncStore } from '@shared/stores/useSyncStore';

export default function CollaboratorsBar() {
  const collaborators = useSyncStore((s) => s.collaborators);

  if (!collaborators.length) return null;

  return (
    <Space size={4}>
      <Avatar.Group max={{ count: 4 }} size="small">
        {collaborators.map((c) => (
          <Tooltip key={c.userId} title={c.name}>
            <Avatar style={{ backgroundColor: c.color }}>{c.name?.[0]?.toUpperCase()}</Avatar>
          </Tooltip>
        ))}
      </Avatar.Group>
    </Space>
  );
}
