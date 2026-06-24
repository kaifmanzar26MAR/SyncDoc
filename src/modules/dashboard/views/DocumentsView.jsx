'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Segmented,
  Button,
  Table,
  Tag,
  Modal,
  Input,
  Empty,
  message,
} from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { fetchAllDocuments, createDocument } from '@dashboard/data/service/DashboardApis';
import { useAppStore } from '@shared/stores/useAppStore';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Owned by me', value: 'owned' },
  { label: 'Not owned by me', value: 'shared' },
];

export default function DocumentsView({ workspaces = [] }) {
  const router = useRouter();
  const currentWorkspaceId = useAppStore((s) => s.currentWorkspaceId);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const [filter, setFilter] = useState('all');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const workspaceId = currentWorkspaceId || workspaces[0]?._id;

  useEffect(() => {
    if (workspaces.length && !currentWorkspaceId) {
      setWorkspace(workspaces[0]._id);
    }
  }, [workspaces, currentWorkspaceId, setWorkspace]);

  const loadDocuments = useCallback(() => {
    setLoading(true);
    fetchAllDocuments(filter)
      .then((data) => setDocuments(data.documents || []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreate = async () => {
    if (!workspaceId) {
      message.error('No workspace available');
      return;
    }
    setCreating(true);
    try {
      const doc = await createDocument({
        title: newTitle.trim() || 'Untitled',
        workspaceId,
      });
      setModalOpen(false);
      setNewTitle('');
      message.success('Document created');
      router.push(`/workspace/${workspaceId}/document/${doc._id}`);
    } catch {
      message.error('Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <Link
          href={`/workspace/${record.workspaceId}/document/${record._id}`}
          className="font-medium text-[var(--gdocs-primary)] hover:underline"
        >
          <FileTextOutlined className="mr-2" />
          {title}
        </Link>
      ),
    },
    {
      title: 'Ownership',
      key: 'ownership',
      width: 140,
      render: (_, record) => (
        <Tag color={record.isOwned ? 'blue' : 'default'}>
          {record.isOwned ? 'Owned by me' : 'Shared with me'}
        </Tag>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date) => (date ? new Date(date).toLocaleString() : '—'),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Typography.Title level={3} className="!mb-1">
            Documents
          </Typography.Title>
          <Typography.Text type="secondary">
            All documents you can access — filter by ownership
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="gdocs-share-button !h-10"
          onClick={() => setModalOpen(true)}
        >
          Add document
        </Button>
      </div>

      <Segmented
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        className="mb-4"
        block
      />

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={documents}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Empty description="No documents found">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                Create your first document
              </Button>
            </Empty>
          ),
        }}
        className="dashboard-documents-table"
      />

      <Modal
        title="New document"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        okText="Create"
        confirmLoading={creating}
      >
        <Input
          placeholder="Document title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onPressEnter={handleCreate}
          size="large"
          autoFocus
        />
      </Modal>
    </div>
  );
}
