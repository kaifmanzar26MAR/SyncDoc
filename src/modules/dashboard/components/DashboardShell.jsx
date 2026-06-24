'use client';

import { useEffect } from 'react';
import { Dropdown, Avatar, Typography, Button, Menu } from 'antd';
import {
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppStore } from '@shared/stores/useAppStore';
import SyncStatusIndicator from '@shared/components/sync/SyncStatusIndicator';
import NetworkStatusBadge from '@shared/components/sync/NetworkStatusBadge';

function getSelectedNavKey(pathname) {
  if (pathname.startsWith('/dashboard/documents')) return 'documents';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return 'dashboard';
}

export default function DashboardShell({ children, initialWorkspaces = [] }) {
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
    <div className="dashboard-root">
      <div className="dashboard-frame">
        <aside className={`dashboard-sider ${collapsed ? 'dashboard-sider--collapsed' : ''}`}>
          <div className="dashboard-sider-brand">
            <FileTextOutlined className="dashboard-sider-brand-icon" />
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

        <div className="dashboard-main">
          <header className="dashboard-topbar">
            <Button
              type="text"
              className="dashboard-menu-toggle"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
            />
            <div className="dashboard-topbar-actions">
              <NetworkStatusBadge />
              <SyncStatusIndicator />
              <Dropdown menu={userMenu} placement="bottomRight">
                <div className="dashboard-user-chip">
                  <Avatar size="small" icon={<UserOutlined />} className="dashboard-avatar" />
                  <span className="dashboard-user-name">{session?.user?.name}</span>
                </div>
              </Dropdown>
            </div>
          </header>

          <main className="dashboard-content-panel">{children}</main>
        </div>
      </div>
    </div>
  );
}
