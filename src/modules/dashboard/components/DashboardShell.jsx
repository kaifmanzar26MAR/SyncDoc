'use client';

import { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Typography, Button, Input, List, Spin } from 'antd';
import {
  FileTextOutlined,
  FolderOutlined,
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAppStore } from '@shared/stores/useAppStore';
import SyncStatusIndicator from '@shared/components/sync/SyncStatusIndicator';
import NetworkStatusBadge from '@shared/components/sync/NetworkStatusBadge';

const { Sider, Header, Content } = Layout;

export default function DashboardShell({ children, initialWorkspaces = [] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = router.pathname;
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const currentWorkspaceId = useAppStore((s) => s.currentWorkspaceId);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  useEffect(() => {
    if (initialWorkspaces.length && !currentWorkspaceId) {
      setWorkspace(initialWorkspaces[0]._id);
    }
  }, [initialWorkspaces, currentWorkspaceId, setWorkspace]);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    fetch(`/api/documents?workspaceId=${currentWorkspaceId}`)
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents || []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [currentWorkspaceId]);

  const createDocument = async () => {
    if (!currentWorkspaceId) return;
    const title = newDocTitle.trim() || 'Untitled';
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, workspaceId: currentWorkspaceId }),
    });
    if (res.ok) {
      const doc = await res.json();
      setNewDocTitle('');
      router.push(`/workspace/${currentWorkspaceId}/document/${doc._id}`);
    }
  };

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

  const sidebarMenu = [
    {
      key: 'dashboard',
      icon: <HomeOutlined />,
      label: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      key: 'workspaces',
      icon: <FolderOutlined />,
      label: 'Workspaces',
      children: workspaces.map((ws) => ({
        key: ws._id,
        label: ws.name,
        onClick: () => setWorkspace(ws._id),
      })),
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={toggleSidebar}
        trigger={null}
        width={260}
        className="syncdoc-sidebar !border-r"
      >
        <div
          className="flex items-center gap-2 px-4 h-16 border-b"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <FileTextOutlined className="syncdoc-brand text-xl" />
          {!collapsed && (
            <Typography.Title level={4} className="!mb-0 syncdoc-brand">
              SyncDoc
            </Typography.Title>
          )}
        </div>
        <Menu mode="inline" items={sidebarMenu} selectedKeys={[pathname.includes('dashboard') ? 'dashboard' : currentWorkspaceId]} className="border-none" />
        {!collapsed && currentWorkspaceId && (
          <div className="px-3 mt-4">
            <Typography.Text type="secondary" className="text-xs uppercase">Documents</Typography.Text>
            <div className="flex gap-1 mt-2">
              <Input
                size="small"
                placeholder="New doc title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onPressEnter={createDocument}
              />
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={createDocument} />
            </div>
            {loading ? (
              <Spin className="mt-4" />
            ) : (
              <List
                size="small"
                className="mt-2"
                dataSource={documents}
                locale={{ emptyText: 'No documents' }}
                renderItem={(doc) => (
                  <List.Item
                    className="!px-2 !py-1 cursor-pointer rounded"
                    style={{ transition: 'background var(--duration-fast)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-item-bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Link href={`/workspace/${currentWorkspaceId}/document/${doc._id}`} className="text-sm truncate">
                      {doc.title}
                    </Link>
                  </List.Item>
                )}
              />
            )}
          </div>
        )}
      </Sider>
      <Layout>
        <Header className="syncdoc-header !px-4 flex items-center justify-between !border-b">
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={toggleSidebar} />
          <div className="flex items-center gap-4">
            <Button
              type="text"
              aria-label="Toggle theme"
              icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
            />
            <NetworkStatusBadge />
            <SyncStatusIndicator />
            <Dropdown menu={userMenu} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar icon={<UserOutlined />} />
                <span className="hidden sm:inline text-sm">{session?.user?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="syncdoc-content p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
