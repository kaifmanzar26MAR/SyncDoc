'use client';

import { Input, Select } from 'antd';
import { SearchOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Owned by me', value: 'owned' },
  { label: 'Not owned by me', value: 'shared' },
];

const toggleWrap =
  'inline-flex h-[42px] items-stretch gap-0.5 rounded-[8px] border-2 border-[var(--preset-border-subtle)] bg-card p-1.5';

function toggleBtn(active) {
  return [
    'inline-flex h-full min-w-8 items-center justify-center rounded-[4px] border-0 p-0 text-sm transition-colors cursor-pointer',
    active
      ? '!bg-[var(--sidebar-item-bg-active)] !text-[var(--gdocs-primary)] font-medium shadow-sm'
      : 'bg-transparent text-[var(--preset-text-secondary)] hover:bg-[var(--sidebar-item-bg-hover)] hover:text-[var(--preset-text-primary)]',
  ].join(' ');
}

export default function DocumentsToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  view,
  onViewChange,
  showFilter = true,
  className = '',
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch ${className}`}>
      <Input
        allowClear
        size="middle"
        prefix={<SearchOutlined className="text-muted" />}
        placeholder="Search documents"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-60! shrink-0 "
      />

      <div className="ml-auto flex shrink-0 items-center gap-2 max-sm:ml-0 max-sm:flex-wrap max-sm:justify-end">
        {showFilter && (
          <Select
            size="middle"
            value={filter}
            onChange={onFilterChange}
            options={FILTER_OPTIONS}
            className="w-40"
            popupMatchSelectWidth={false}
          />
        )}

        <div className={toggleWrap} role="group" aria-label="View mode">
          <button
            type="button"
            className={toggleBtn(view === 'list')}
            onClick={() => onViewChange('list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
          >
            <UnorderedListOutlined />
          </button>
          <button
            type="button"
            className={toggleBtn(view === 'grid')}
            onClick={() => onViewChange('grid')}
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
          >
            <AppstoreOutlined />
          </button>
        </div>
      </div>
    </div>
  );
}
