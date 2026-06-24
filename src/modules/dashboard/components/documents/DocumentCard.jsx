'use client';

import Link from 'next/link';
import { Tag, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const cardBase =
  'block rounded-xl border border-border bg-card text-inherit no-underline transition-[border-color,box-shadow] duration-150 hover:border-[var(--gdocs-primary)] hover:shadow-sm';

const iconBase =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-item-bg-active)] text-lg text-[var(--gdocs-primary)]';

export default function DocumentCard({ document, view = 'grid' }) {
  const href = `/workspace/${document.workspaceId}/document/${document._id}`;
  const updatedLabel = document.updatedAt
    ? new Date(document.updatedAt).toLocaleString()
    : '—';

  if (view === 'list') {
    return (
      <Link href={href} className={`${cardBase} flex items-center gap-4 px-4 py-3`}>
        <div className={iconBase}>
          <FileTextOutlined />
        </div>
        <div className="min-w-0 flex-1">
          <Typography.Text className="mb-0.5 block font-medium text-foreground" ellipsis>
            {document.title}
          </Typography.Text>
          <Typography.Text type="secondary" className="block text-sm">
            Updated {updatedLabel}
          </Typography.Text>
        </div>
        <Tag className="!m-0 shrink-0" color={document.isOwned ? 'blue' : 'default'}>
          {document.isOwned ? 'Owned by me' : 'Shared with me'}
        </Tag>
      </Link>
    );
  }

  return (
    <Link href={href} className={`${cardBase} min-h-[148px] p-4`}>
      <div className={`${iconBase} mb-3`}>
        <FileTextOutlined />
      </div>
      <Typography.Text className="mb-1 block font-medium text-foreground" ellipsis>
        {document.title}
      </Typography.Text>
      <Typography.Text type="secondary" className="block text-sm" ellipsis>
        {updatedLabel}
      </Typography.Text>
      <Tag className="!m-0 !mt-3 shrink-0" color={document.isOwned ? 'blue' : 'default'}>
        {document.isOwned ? 'Owned' : 'Shared'}
      </Tag>
    </Link>
  );
}
