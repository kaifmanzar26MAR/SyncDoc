'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Input,
  Select,
  Button,
  Typography,
  Divider,
  message,
  Space,
  Tag,
  List,
  Avatar,
  Popconfirm,
} from 'antd';
import { CopyOutlined, LinkOutlined, MailOutlined, LockOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ROLE_OPTIONS = [
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
];

function roleLabel(role) {
  if (role === 'OWNER') return 'Owner';
  if (role === 'EDITOR') return 'Editor';
  return 'Viewer';
}

function canManageCollaborator(actorRole, collaborator) {
  if (collaborator.role === 'OWNER') return false;
  if (actorRole === 'OWNER') return true;
  if (actorRole === 'EDITOR') {
    return collaborator.pending || collaborator.role === 'VIEWER';
  }
  return false;
}

export default function ShareDocumentModal({ open, onClose, documentId, canShare }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [actorRole, setActorRole] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadShareSettings = useCallback(async () => {
    if (!documentId) return;
    setListLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/share`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sharing settings');
      if (data.shareUrl) setShareUrl(data.shareUrl);
      setCollaborators(data.collaborators || []);
      setActorRole(data.actorRole || null);
    } catch (err) {
      message.error(err.message);
    } finally {
      setListLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!open || !documentId) return;
    loadShareSettings();
  }, [open, documentId, loadShareSettings]);

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
          : 'Invite sent — they can register and open the document',
      );
      setEmail('');
      setCollaborators(data.collaborators || []);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (collaborator, nextRole) => {
    setUpdatingId(collaborator.id);
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: collaborator.type,
          targetId: collaborator.id,
          role: nextRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update access');
      setCollaborators(data.collaborators || []);
      message.success('Access updated');
    } catch (err) {
      message.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (collaborator) => {
    setUpdatingId(collaborator.id);
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: collaborator.type,
          targetId: collaborator.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove access');
      setCollaborators(data.collaborators || []);
      message.success('Access removed');
    } catch (err) {
      message.error(err.message);
    } finally {
      setUpdatingId(null);
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
      width={560}
      className="gdocs-share-modal"
    >
      {canShare && (
        <>
          <Text type="secondary" className="text-sm">
            Add people
          </Text>
          <div className="mt-2 flex gap-2">
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
              className="w-[120px]"
              options={ROLE_OPTIONS}
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

          <Divider className="!my-4" />

          <Text type="secondary" className="text-sm">
            People with access
          </Text>
          <List
            className="mt-2 max-h-64 overflow-y-auto"
            loading={listLoading}
            dataSource={collaborators}
            locale={{ emptyText: 'No collaborators yet' }}
            renderItem={(person) => {
              const manageable = canShare && canManageCollaborator(actorRole, person);
              const displayName = person.name || person.email;
              const showEmailBelow = person.name && person.email;

              return (
                <List.Item
                  className="!px-0"
                  actions={
                    person.role === 'OWNER'
                      ? [<Tag key="owner">Owner</Tag>]
                      : manageable
                        ? [
                            <Select
                              key="role"
                              size="small"
                              value={person.role}
                              className="w-[100px]"
                              loading={updatingId === person.id}
                              disabled={updatingId === person.id}
                              options={ROLE_OPTIONS}
                              onChange={(value) => handleUpdateRole(person, value)}
                            />,
                            <Popconfirm
                              key="remove"
                              title="Remove access?"
                              description={`${displayName} will lose access to this document.`}
                              onConfirm={() => handleRemove(person)}
                              okText="Remove"
                              okButtonProps={{ danger: true }}
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={updatingId === person.id}
                                aria-label="Remove access"
                              />
                            </Popconfirm>,
                          ]
                        : [<Tag key="role">{roleLabel(person.role)}</Tag>]
                  }
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar icon={<UserOutlined />} className="bg-[var(--gdocs-primary)]">
                        {person.name?.[0]?.toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <Space size={6}>
                        <span>{displayName}</span>
                        {person.pending && (
                          <Tag color="gold" className="!m-0">
                            Pending
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      showEmailBelow ? (
                        <Text type="secondary" className="text-xs">
                          {person.email}
                        </Text>
                      ) : person.pending ? (
                        <Text type="secondary" className="text-xs">
                          Invited — not registered yet
                        </Text>
                      ) : null
                    }
                  />
                </List.Item>
              );
            }}
          />

          <Divider className="!my-4" />
        </>
      )}

      <div className="mb-2 flex items-center justify-between">
        <Space>
          <LinkOutlined />
          <Text strong>Get link</Text>
        </Space>
        <Tag icon={<LockOutlined />} color="blue">
          Viewer only
        </Tag>
      </div>
      <Text type="secondary" className="mb-3 block text-xs">
        Anyone with the link can view this document after signing in. Editors can share with edit
        access via email above.
      </Text>
      <div className="flex gap-2">
        <Input value={shareUrl} readOnly size="large" className="!text-sm" />
        <Button icon={<CopyOutlined />} size="large" onClick={copyLink} disabled={!shareUrl}>
          Copy
        </Button>
      </div>
    </Modal>
  );
}
