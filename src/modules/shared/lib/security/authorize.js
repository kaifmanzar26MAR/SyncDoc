import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentMember, Workspace, ROLES } from '@shared/data/models';

const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: ['read', 'edit', 'sync', 'version', 'restore', 'manage', 'delete'],
  [ROLES.EDITOR]: ['read', 'edit', 'sync', 'version', 'restore'],
  [ROLES.VIEWER]: ['read'],
};

export async function getDocumentMembership(documentId, userId) {
  await connectDB();
  const member = await DocumentMember.findOne({ documentId, userId }).lean();
  return member;
}

export async function getWorkspaceAccess(workspaceId, userId) {
  await connectDB();
  const workspace = await Workspace.findById(workspaceId).lean();
  if (!workspace) return null;
  if (workspace.ownerId.toString() === userId.toString()) {
    return { workspace, role: ROLES.OWNER };
  }
  return { workspace, role: null };
}

export async function authorizeDocument(userId, documentId, permission) {
  await connectDB();
  const doc = await Document.findById(documentId).lean();
  if (!doc) return { authorized: false, status: 404, error: 'Document not found' };

  const workspace = await Workspace.findById(doc.workspaceId).lean();
  if (workspace?.ownerId?.toString() === userId.toString()) {
    return { authorized: true, role: ROLES.OWNER, document: doc };
  }

  const member = await DocumentMember.findOne({ documentId, userId }).lean();
  if (!member) {
    return { authorized: false, status: 403, error: 'Access denied' };
  }

  const permissions = ROLE_PERMISSIONS[member.role] || [];
  if (!permissions.includes(permission)) {
    return { authorized: false, status: 403, error: `Permission '${permission}' denied` };
  }

  return { authorized: true, role: member.role, document: doc };
}

export function canSync(role) {
  return ROLE_PERMISSIONS[role]?.includes('sync') ?? false;
}

export function canEdit(role) {
  return ROLE_PERMISSIONS[role]?.includes('edit') ?? false;
}
