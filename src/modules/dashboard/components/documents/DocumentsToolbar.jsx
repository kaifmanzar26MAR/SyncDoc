'use client';

import { Input, Select } from 'antd';
import { SearchOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Owned by me', value: 'owned' },
  { label: 'Not owned by me', value: 'shared' },
];

const toggleBtnBase =
  'inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border-0 bg-transparent p-1.5 text-sm text-[var(--preset-text-secondary)] transition-colors cursor-pointer';
const toggleBtnActive =
  'bg-[var(--sidebar-item-bg-active)] text-[var(--gdocs-primary)] hover:bg-[var(--sidebar-item-bg-active)] hover:text-[var(--gdocs-primary)]';
const toggleBtnIdle =
  'hover:bg-[var(--sidebar-item-bg-hover)] hover:text-[var(--preset-text-primary)]';

export default function DocumentsToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  view,
  onViewChange,
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
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
        <Select
          size="middle"
          value={filter}
          onChange={onFilterChange}
          options={FILTER_OPTIONS}
          className="w-40"
          popupMatchSelectWidth={false}
        />

        <div
          className="inline-flex items-center gap-0.5 rounded-[8px] border-2 border-[var(--preset-border-subtle)] bg-card p-[4px]"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            className={`${toggleBtnBase} ${view === 'list' ? toggleBtnActive : toggleBtnIdle}`}
            onClick={() => onViewChange('list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
          >
            <UnorderedListOutlined />
          </button>
          <button
            type="button"
            className={`${toggleBtnBase} ${view === 'grid' ? toggleBtnActive : toggleBtnIdle}`}
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
