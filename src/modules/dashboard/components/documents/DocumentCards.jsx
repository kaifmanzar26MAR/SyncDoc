'use client';

import { Empty, Pagination, Spin, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import DocumentCard from './DocumentCard';

export default function DocumentCards({
  documents,
  view,
  loading,
  pagination,
  onPageChange,
  onAddClick,
  emptyDescription = 'No documents found',
}) {
  if (loading && !documents.length) {
    return (
      <div className="py-10 text-center">
        <Spin />
      </div>
    );
  }

  if (!documents.length) {
    return (
      <Empty description={emptyDescription} className="py-10">
        {/* <Button type="primary" size="middle" icon={<PlusOutlined />} onClick={onAddClick}>
          Create your first document
        </Button> */}
      </Empty>
    );
  }

  return (
    <div className="relative">
      <div
        className={`grid gap-3 ${
          view === 'grid'
            ? 'grid-cols-[repeat(auto-fill,minmax(220px,1fr))]'
            : 'grid-cols-1'
        } ${loading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {documents.map((doc) => (
          <DocumentCard key={doc._id} document={doc} view={view} />
        ))}
      </div>

      {pagination.total > pagination.pageSize && (
        <div className="mt-6 flex justify-center">
          <Pagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger={false}
            onChange={onPageChange}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total}`}
          />
        </div>
      )}
    </div>
  );
}
