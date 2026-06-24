'use client';

import { Card, Typography, Row, Col, Statistic, Button, Empty } from 'antd';
import { FileTextOutlined, CloudSyncOutlined, TeamOutlined, PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAppStore } from '@shared/stores/useAppStore';
import { useRouter } from 'next/router';
import { useSyncStore } from '@shared/stores/useSyncStore';

export default function DashboardView({ workspaces = [] }) {
  const currentWorkspaceId = useAppStore((s) => s.currentWorkspaceId);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const networkStatus = useSyncStore((s) => s.networkStatus);
  const router = useRouter();

  const workspace = workspaces.find((w) => w._id === currentWorkspaceId) || workspaces[0];

  return (
    <div>
      <Typography.Title level={3}>
        Welcome back{workspace ? ` — ${workspace.name}` : ''}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Your documents sync automatically. Edit offline anytime — changes queue locally.
      </Typography.Paragraph>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Workspaces" value={workspaces.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Pending Sync" value={pendingCount} prefix={<CloudSyncOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Network" value={networkStatus} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card className="mt-6" title="Quick Start">
        {workspaces.length === 0 ? (
          <Empty description="No workspaces yet">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.refresh()}>
              Refresh
            </Button>
          </Empty>
        ) : (
          <Typography.Paragraph>
            Browse all your documents from the{' '}
            <Link href="/dashboard/documents" className="text-[var(--gdocs-primary)]">
              Documents
            </Link>{' '}
            page — filter by owned or shared. SyncDoc works fully offline.
          </Typography.Paragraph>
        )}
      </Card>
    </div>
  );
}
