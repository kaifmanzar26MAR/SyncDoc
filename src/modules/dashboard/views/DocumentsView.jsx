'use client';

import { useState, useEffect, useCallback } from 'react';
import { Typography, Modal, Input, message, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { fetchAllDocuments, createDocument } from '@dashboard/data/service/DashboardApis';
import { useAppStore } from '@shared/stores/useAppStore';
import { useRegisterDashboardRefresh } from '@dashboard/components/DashboardShellContext';
import DocumentsToolbar from '@dashboard/components/documents/DocumentsToolbar';
import DocumentCards from '@dashboard/components/documents/DocumentCards';

const DEFAULT_PAGINATION = { page: 1, pageSize: 12, total: 0, totalPages: 1 };

export default function DocumentsView({ workspaces = [] }) {
  const router = useRouter();
  const currentWorkspaceId = useAppStore((s) => s.currentWorkspaceId);
  const setWorkspace = useAppStore((s) => s.setWorkspace);

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllDocuments({
        filter,
        search: debouncedSearch,
        page,
        pageSize: DEFAULT_PAGINATION.pageSize,
      });
      setDocuments(data.documents || []);
      setPagination(data.pagination || DEFAULT_PAGINATION);
    } catch {
      setDocuments([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch, page]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useRegisterDashboardRefresh(loadDocuments);

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

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
          <div>
            <Typography.Title level={3} className="!mb-1">
              Documents
            </Typography.Title>
            <Typography.Text type="secondary">
              Browse and manage all documents you can access
            </Typography.Text>
          </div>
          <Button
            type="primary"
            size="middle"
            icon={<PlusOutlined />}
            className="shrink-0 max-sm:self-start"
            onClick={() => setModalOpen(true)}
          >
            Add New
          </Button>
        </div>
      </div>

      <DocumentsToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        view={view}
        onViewChange={setView}
      />

      <DocumentCards
        documents={documents}
        view={view}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onAddClick={() => setModalOpen(true)}
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
          autoFocus
        />
      </Modal>
    </div>
  );
}
