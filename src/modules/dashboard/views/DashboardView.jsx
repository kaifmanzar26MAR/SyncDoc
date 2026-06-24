'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Spin } from 'antd';
import {
  FileTextOutlined,
  CloudSyncOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useAppStore } from '@shared/stores/useAppStore';
import { useSyncStore } from '@shared/stores/useSyncStore';
import { useRegisterDashboardRefresh } from '@dashboard/components/DashboardShellContext';
import { fetchDocumentCounts } from '@dashboard/data/service/DashboardApis';
import DocumentsToolbar from '@dashboard/components/documents/DocumentsToolbar';
import DocumentCards from '@dashboard/components/documents/DocumentCards';
import {
  getRecentDocuments,
  filterRecentDocuments,
} from '@shared/utils/recent-documents';

function KpiTile({ icon, label, value, accent }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-5 py-4 sm:px-6">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: accent.bg, color: accent.fg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <Typography.Text type="secondary" className="block text-xs uppercase tracking-wide">
          {label}
        </Typography.Text>
        <Typography.Title level={3} className="!mb-0 !mt-0.5 !leading-none">
          {value}
        </Typography.Title>
      </div>
    </div>
  );
}

export default function DashboardView({ workspaces = [] }) {
  const currentWorkspaceId = useAppStore((s) => s.currentWorkspaceId);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const workspace = workspaces.find((w) => w._id === currentWorkspaceId) || workspaces[0];

  const [counts, setCounts] = useState({ owned: 0, shared: 0, total: 0 });
  const [countsLoading, setCountsLoading] = useState(true);
  const [recentDocs, setRecentDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');

  const loadDashboardData = useCallback(async () => {
    setCountsLoading(true);
    setRecentDocs(getRecentDocuments());

    try {
      const data = await fetchDocumentCounts();
      setCounts(data.counts || { owned: 0, shared: 0, total: 0 });
    } catch {
      setCounts({ owned: 0, shared: 0, total: 0 });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useRegisterDashboardRefresh(loadDashboardData);

  const filteredRecent = useMemo(
    () => filterRecentDocuments(recentDocs, search),
    [recentDocs, search],
  );

  return (
    <div>
      <div className="mb-6">
        <Typography.Title level={3} className="!mb-1">
          Welcome back{workspace ? `, ${workspace.name}` : ''}
        </Typography.Title>
        <Typography.Text type="secondary">
          Your documents sync automatically. Pick up where you left off below.
        </Typography.Text>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-1 divide-y border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {countsLoading ? (
            <div className="col-span-full flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            <>
              <KpiTile
                icon={<FileTextOutlined />}
                label="Owned documents"
                value={counts.owned}
                accent={{ bg: 'rgba(26, 115, 232, 0.12)', fg: 'var(--gdocs-primary, #1a73e8)' }}
              />
              <KpiTile
                icon={<ShareAltOutlined />}
                label="Not owned by me"
                value={counts.shared}
                accent={{ bg: 'rgba(95, 99, 104, 0.12)', fg: 'var(--preset-text-secondary, #5f6368)' }}
              />
              <KpiTile
                icon={<CloudSyncOutlined />}
                label="Pending sync"
                value={pendingCount}
                accent={{ bg: 'rgba(52, 168, 83, 0.12)', fg: '#188038' }}
              />
            </>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Typography.Title level={4} className="!mb-1">
                Recently viewed
              </Typography.Title>
              <Typography.Text type="secondary" className="text-sm">
                Documents you opened most recently on this device
              </Typography.Text>
            </div>
            <Link href="/dashboard/documents" className="text-sm font-medium text-[var(--gdocs-primary)]">
              View all documents
            </Link>
          </div>

          <DocumentsToolbar
            search={search}
            onSearchChange={setSearch}
            filter="all"
            onFilterChange={() => {}}
            view={view}
            onViewChange={setView}
            showFilter={false}
            className="mb-6"
          />

          <DocumentCards
            documents={filteredRecent}
            view={view}
            loading={false}
            pagination={{ page: 1, pageSize: filteredRecent.length || 12, total: filteredRecent.length }}
            onPageChange={() => {}}
            emptyDescription="Open a document to see it in your recent list"
          />
        </div>
      </section>
    </div>
  );
}
