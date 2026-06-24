'use client';

import { Avatar, Tooltip, Space } from 'antd';
import { useSyncStore } from '@shared/stores/useSyncStore';
import { getUserColorFromInitial } from '@shared/utils/user-color';

export default function CollaboratorsBar() {
  const collaborators = useSyncStore((s) => s.collaborators);

  if (!collaborators.length) return null;

  return (
    <Space size={4}>
      <Avatar.Group max={{ count: 4 }} size="small">
        {collaborators.map((c) => {
          const label = c.name || c.email || '';
          return (
            <Tooltip key={c.userId} title={label}>
              <Avatar style={{ backgroundColor: getUserColorFromInitial(label) }}>
                {label[0]?.toUpperCase()}
              </Avatar>
            </Tooltip>
          );
        })}
      </Avatar.Group>
    </Space>
  );
}
