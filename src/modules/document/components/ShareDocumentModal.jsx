'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Button, Typography, Divider, message, Space, Tag } from 'antd';
import { CopyOutlined, LinkOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ShareDocumentModal({ open, onClose, documentId, canShare }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [linkEnabled, setLinkEnabled] = useState(true);

  useEffect(() => {
    if (!open || !documentId) return;
    fetch(`/api/documents/${documentId}/share`)
      .then((r) => r.json())
      .then((data) => {
        if (data.shareUrl) setShareUrl(data.shareUrl);
        if (data.linkEnabled !== undefined) setLinkEnabled(data.linkEnabled);
      })
      .catch(() => {});
  }, [open, documentId]);

  const handleShareEmail = async () => {
    if (!email.trim()) {
      message.warning('Enter an email address');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Share failed');
      message.success(
        data.userExists
          ? 'Document shared — email sent with link'
          : 'Invite sent — they can register and open the document'
      );
      setEmail('');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    message.success('Link copied to clipboard');
  };

  return (
    <Modal
      title="Share document"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      className="gdocs-share-modal"
    >
      {canShare && (
        <>
          <Text type="secondary" className="text-sm">Add people</Text>
          <div className="flex gap-2 mt-2">
            <Input
              prefix={<MailOutlined className="text-gray-400" />}
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onPressEnter={handleShareEmail}
              size="large"
            />
            <Select
              value={role}
              onChange={setRole}
              size="large"
              style={{ width: 120 }}
              options={[
                { value: 'VIEWER', label: 'Viewer' },
                { value: 'EDITOR', label: 'Editor' },
              ]}
            />
          </div>
          <Button
            type="primary"
            className="gdocs-share-btn mt-3"
            loading={loading}
            onClick={handleShareEmail}
            block
            size="large"
          >
            Send
          </Button>
          <Divider />
        </>
      )}

      <div className="flex items-center justify-between mb-2">
        <Space>
          <LinkOutlined />
          <Text strong>Get link</Text>
        </Space>
        <Tag icon={<LockOutlined />} color="blue">Viewer only</Tag>
      </div>
      <Text type="secondary" className="text-xs block mb-3">
        Anyone with the link can view this document after signing in. Editors can share with edit access via email above.
      </Text>
      <div className="flex gap-2">
        <Input value={shareUrl} readOnly size="large" className="!text-sm" />
        <Button
          icon={<CopyOutlined />}
          size="large"
          onClick={copyLink}
          disabled={!shareUrl}
        >
          Copy
        </Button>
      </div>
    </Modal>
  );
}
