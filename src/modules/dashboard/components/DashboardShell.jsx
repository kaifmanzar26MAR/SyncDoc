'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dropdown, Avatar, Typography, Button, Menu, Tooltip } from 'antd';
import {
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { RefreshCw } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppStore } from '@shared/stores/useAppStore';
import SyncStatusIndicator from '@shared/components/sync/SyncStatusIndicator';
import NetworkStatusBadge from '@shared/components/sync/NetworkStatusBadge';
import { DashboardShellProvider, useDashboardShell } from './DashboardShellContext';
import { getUserColorFromInitial } from '@shared/utils/user-color';

function getSelectedNavKey(pathname) {
  if (pathname.startsWith('/dashboard/documents')) return 'documents';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return 'dashboard';
}

function DashboardTopbar({ collapsed, toggleSidebar, userMenu, session }) {
  const { onRefresh, hasRefresh } = useDashboardShell();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!hasRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [hasRefresh, onRefresh, refreshing]);

  const userLabel = session?.user?.name || session?.user?.email || '';
  const userAvatarColor = getUserColorFromInitial(userLabel);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-header px-4">
      <Button
        type="text"
        className="dashboard-shell-btn"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={toggleSidebar}
      />
      <div className="flex items-center gap-3">
        {hasRefresh && (
          <Tooltip title="Refresh">
            <Button
              type="text"
              className="dashboard-shell-btn"
              icon={
                <RefreshCw
                  size={16}
                  className={refreshing ? 'animate-spin' : undefined}
                />
              }
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh page content"
            />
          </Tooltip>
        )}
        <NetworkStatusBadge />
        <SyncStatusIndicator />
        <Dropdown menu={userMenu} placement="bottomRight">
          <div className="flex cursor-pointer items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-[var(--sidebar-item-bg-hover)]">
            <Avatar
              size="small"
              icon={<UserOutlined />}
              style={{ backgroundColor: userAvatarColor }}
            >
              {userLabel[0]?.toUpperCase()}
            </Avatar>
            <span className="hidden max-w-[140px] truncate text-sm text-foreground sm:inline">
              {session?.user?.name}
            </span>
          </div>
        </Dropdown>
      </div>
    </header>
  );
}

function DashboardShellInner({ children, initialWorkspaces = [] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = router.pathname;
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const currentWorkspaceId = useAppStore((s) => s.currentWorkspaceId);

  useEffect(() => {
    if (initialWorkspaces.length && !currentWorkspaceId) {
      setWorkspace(initialWorkspaces[0]._id);
    }
  }, [initialWorkspaces, currentWorkspaceId, setWorkspace]);

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: session?.user?.email },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') signOut({ callbackUrl: '/login' });
    },
  };

  const navItems = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      key: 'documents',
      icon: <FolderOpenOutlined />,
      label: <Link href="/dashboard/documents">Documents</Link>,
    },
  ];

  const selectedKey = getSelectedNavKey(pathname);

  return (
    <div className="dashboard-root box-border h-dvh min-h-screen overflow-hidden bg-sidebar">
      <div className="flex h-full w-full overflow-hidden bg-sidebar">
        <aside
          className={`flex shrink-0 flex-col bg-sidebar transition-[width] duration-200 ease-out ${
            collapsed ? 'w-[72px]' : 'w-60'
          }`}
        >
          <div
            className={`flex h-14 shrink-0 items-center gap-2 ${
              collapsed ? 'justify-center px-0' : 'px-4'
            }`}
          >
            <FileTextOutlined className="shrink-0 text-[22px] text-[var(--gdocs-primary)]" />
            {!collapsed && (
              <Typography.Title level={4} className="dashboard-sider-brand-text">
                SyncDoc
              </Typography.Title>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={navItems}
            className="dashboard-nav-menu"
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-sidebar">
          <DashboardTopbar
            collapsed={collapsed}
            toggleSidebar={toggleSidebar}
            userMenu={userMenu}
            session={session}
          />
          <main className="min-h-0 flex-1 overflow-auto rounded-tl-3xl border-t border-[var(--preset-border-subtle)] bg-[var(--preset-bg-base)] p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardShell({ children, initialWorkspaces = [], onRefresh }) {
  return (
    <DashboardShellProvider onRefresh={onRefresh}>
      <DashboardShellInner initialWorkspaces={initialWorkspaces}>{children}</DashboardShellInner>
    </DashboardShellProvider>
  );
}
