'use client';

import { useState } from 'react';
import { Button, Input, Dropdown, Avatar, Tooltip, Divider } from 'antd';
import {
  FileTextOutlined,
  HistoryOutlined,
  CameraOutlined,
  SaveOutlined,
  ShareAltOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useDocumentStore } from '@shared/stores/useDocumentStore';
import SyncStatusIndicator from '@shared/components/sync/SyncStatusIndicator';
import NetworkStatusBadge from '@shared/components/sync/NetworkStatusBadge';
import CollaboratorsBar from '@shared/components/collaboration/CollaboratorsBar';
import ShareDocumentModal from '@document/components/ShareDocumentModal';
import { getUserColorFromInitial } from '@shared/utils/user-color';

export default function DocumentHeader({
  title,
  onTitleChange,
  readOnly,
  onSnapshot,
  onSave,
  documentId,
  workspaceId,
}) {
  const { data: session } = useSession();
  const [shareOpen, setShareOpen] = useState(false);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const toggleVersionDrawer = useDocumentStore((s) => s.toggleVersionDrawer);
  const canShare = !readOnly;
  const userLabel = session?.user?.name || session?.user?.email || '';
  const userAvatarColor = getUserColorFromInitial(userLabel);

  const userMenu = {
    items: [
      { key: 'dashboard', label: <Link href="/dashboard">Dashboard</Link> },
      { key: 'profile', icon: <UserOutlined />, label: session?.user?.email },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') signOut({ callbackUrl: '/login' });
    },
  };

  return (
    <>
      <header className="gdocs-header">
        <div className="gdocs-header-row">
          <div className="gdocs-header-left">
            <Link href="/dashboard" className="gdocs-doc-icon">
              <FileTextOutlined />
            </Link>
            <Input
              variant="borderless"
              value={title}
              onChange={onTitleChange}
              readOnly={readOnly}
              className="gdocs-title-input"
              placeholder="Untitled document"
            />
          </div>

          <div className="gdocs-header-right">
            <div className="gdocs-header-meta hidden sm:flex">
              <NetworkStatusBadge />
              <SyncStatusIndicator />
              <CollaboratorsBar />
            </div>

            {!readOnly && (
              <div className="gdocs-toolbar-actions hidden md:flex">
                <Tooltip title="Save snapshot">
                  <Button type="text" icon={<CameraOutlined />} onClick={onSnapshot} />
                </Tooltip>
                <Tooltip title="Save">
                  <Button
                    type="text"
                    icon={<SaveOutlined />}
                    onClick={onSave}
                    className={isDirty ? 'gdocs-save-dirty' : ''}
                  />
                </Tooltip>
                <Tooltip title="Version history">
                  <Button type="text" icon={<HistoryOutlined />} onClick={toggleVersionDrawer} />
                </Tooltip>
              </div>
            )}

            {readOnly && (
              <Tooltip title="Version history">
                <Button type="text" icon={<HistoryOutlined />} onClick={toggleVersionDrawer} />
              </Tooltip>
            )}

            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              className="gdocs-share-button"
              onClick={() => setShareOpen(true)}
            >
              Share
            </Button>

            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar
                className="cursor-pointer"
                style={{ backgroundColor: userAvatarColor }}
                icon={<UserOutlined />}
              >
                {userLabel[0]?.toUpperCase()}
              </Avatar>
            </Dropdown>
          </div>
        </div>

        <Divider className="!my-0" />
      </header>

      <ShareDocumentModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={documentId}
        canShare={canShare}
      />
    </>
  );
}
