import crypto from 'crypto';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentMember, DocumentInvite, User, ROLES } from '@shared/data/models';
import { authorizeDocument } from '@shared/lib/security/authorize';
import {
  notifyDocumentShared,
  notifyDocumentInvite,
} from '@shared/data/services/document-notification.service';

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function getDocumentUrl(workspaceId, documentId) {
  return `${appUrl()}/workspace/${workspaceId}/document/${documentId}`;
}

export function getShareLinkUrl(token) {
  return `${appUrl()}/share/${token}`;
}

function assertCanShare(authz) {
  if (!authz.authorized || authz.role === ROLES.VIEWER) {
    throw new Error('Only owners and editors can manage sharing');
  }
}

function canManageTarget(actorRole, targetRole, targetPending = false) {
  if (targetRole === ROLES.OWNER) return false;
  if (actorRole === ROLES.OWNER) return true;
  if (actorRole === ROLES.EDITOR) {
    return targetRole === ROLES.VIEWER;
  }
  return false;
}

export async function ensureShareToken(documentId) {
  await connectDB();
  const doc = await Document.findById(documentId);
  if (!doc) throw new Error('Document not found');
  if (!doc.shareLinkToken) {
    doc.shareLinkToken = crypto.randomUUID();
    doc.shareLinkEnabled = true;
    await doc.save();
  }
  return doc;
}

export async function listCollaborators(documentId) {
  const [members, invites] = await Promise.all([
    DocumentMember.find({ documentId }).populate('userId', 'name email').lean(),
    DocumentInvite.find({ documentId }).lean(),
  ]);

  const collaborators = members.map((member) => ({
    id: member._id.toString(),
    type: 'member',
    userId: member.userId?._id?.toString() || null,
    email: member.userId?.email || '',
    name: member.userId?.name || null,
    role: member.role,
    pending: false,
  }));

  invites.forEach((invite) => {
    collaborators.push({
      id: invite._id.toString(),
      type: 'invite',
      userId: null,
      email: invite.email,
      name: null,
      role: invite.role,
      pending: true,
    });
  });

  const roleOrder = { OWNER: 0, EDITOR: 1, VIEWER: 2 };
  collaborators.sort((a, b) => {
    const roleDiff = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
    if (roleDiff !== 0) return roleDiff;
    return (a.name || a.email).localeCompare(b.name || b.email);
  });

  return collaborators;
}

export async function getShareSettings(documentId, userId) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  if (!authz.authorized || authz.role === ROLES.VIEWER) {
    throw new Error('Permission denied');
  }

  await connectDB();
  const doc = await ensureShareToken(documentId);
  const collaborators = await listCollaborators(documentId);

  return {
    linkEnabled: doc.shareLinkEnabled,
    linkRole: doc.shareLinkRole,
    shareUrl: getShareLinkUrl(doc.shareLinkToken),
    collaborators,
    canManage: authz.role === ROLES.OWNER || authz.role === ROLES.EDITOR,
    actorRole: authz.role,
  };
}

export async function applyPendingInvitesForUser(userId, email) {
  await connectDB();
  const normalizedEmail = email.toLowerCase();
  const invites = await DocumentInvite.find({ email: normalizedEmail }).lean();
  if (!invites.length) return;

  for (const invite of invites) {
    await DocumentMember.findOneAndUpdate(
      { documentId: invite.documentId, userId },
      { role: invite.role },
      { upsert: true, new: true },
    );
    await DocumentInvite.deleteOne({ _id: invite._id });
  }
}

export async function shareDocumentByEmail({ documentId, userId, email, role }) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  assertCanShare(authz);

  await connectDB();
  const doc = await Document.findById(documentId).lean();
  if (!doc) throw new Error('Document not found');

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const existingMember = await DocumentMember.findOne({
      documentId,
      userId: existingUser._id,
    }).lean();

    if (existingMember?.role === ROLES.OWNER) {
      throw new Error('Cannot change access for the document owner');
    }

    await DocumentMember.findOneAndUpdate(
      { documentId, userId: existingUser._id },
      { role },
      { upsert: true, new: true },
    );

    await DocumentInvite.deleteOne({ documentId, email: normalizedEmail });

    await notifyDocumentShared({
      recipientEmail: normalizedEmail,
      recipientName: existingUser.name,
      sharedByUserId: userId,
      documentId,
      role,
    });
  } else {
    await DocumentInvite.findOneAndUpdate(
      { documentId, email: normalizedEmail },
      { role, invitedBy: userId },
      { upsert: true, new: true },
    );

    const docUrl = getDocumentUrl(doc.workspaceId.toString(), documentId);
    await notifyDocumentInvite({
      recipientEmail: normalizedEmail,
      invitedByUserId: userId,
      documentId,
      documentTitle: doc.title,
      role,
      callbackUrl: docUrl,
    });
  }

  const collaborators = await listCollaborators(documentId);

  return { success: true, userExists: !!existingUser, collaborators };
}

export async function updateCollaboratorAccess({
  documentId,
  userId,
  targetType,
  targetId,
  role,
}) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  assertCanShare(authz);

  await connectDB();

  if (targetType === 'member') {
    const member = await DocumentMember.findOne({ _id: targetId, documentId });
    if (!member) throw new Error('Collaborator not found');
    if (member.role === ROLES.OWNER) throw new Error('Cannot change owner access');
    if (!canManageTarget(authz.role, member.role)) {
      throw new Error('You cannot update this collaborator');
    }

    member.role = role;
    await member.save();
  } else {
    const invite = await DocumentInvite.findOne({ _id: targetId, documentId });
    if (!invite) throw new Error('Invite not found');
    if (!canManageTarget(authz.role, invite.role, true)) {
      throw new Error('You cannot update this invite');
    }

    invite.role = role;
    await invite.save();
  }

  return { success: true, collaborators: await listCollaborators(documentId) };
}

export async function removeCollaboratorAccess({ documentId, userId, targetType, targetId }) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  assertCanShare(authz);

  await connectDB();

  if (targetType === 'member') {
    const member = await DocumentMember.findOne({ _id: targetId, documentId });
    if (!member) throw new Error('Collaborator not found');
    if (member.role === ROLES.OWNER) throw new Error('Cannot remove the document owner');
    if (!canManageTarget(authz.role, member.role)) {
      throw new Error('You cannot remove this collaborator');
    }

    await DocumentMember.deleteOne({ _id: targetId, documentId });
  } else {
    const invite = await DocumentInvite.findOne({ _id: targetId, documentId });
    if (!invite) throw new Error('Invite not found');
    if (!canManageTarget(authz.role, invite.role, true)) {
      throw new Error('You cannot remove this invite');
    }

    await DocumentInvite.deleteOne({ _id: targetId, documentId });
  }

  return { success: true, collaborators: await listCollaborators(documentId) };
}

export async function updateShareLink({ documentId, userId, linkEnabled }) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  assertCanShare(authz);

  await connectDB();
  const doc = await ensureShareToken(documentId);
  doc.shareLinkEnabled = linkEnabled;
  await doc.save();

  return {
    linkEnabled: doc.shareLinkEnabled,
    shareUrl: getShareLinkUrl(doc.shareLinkToken),
    linkRole: doc.shareLinkRole,
  };
}

export async function grantViewerAccessFromShareLink(userId, documentId) {
  await connectDB();
  const existing = await DocumentMember.findOne({ documentId, userId });
  if (!existing) {
    await DocumentMember.create({ documentId, userId, role: ROLES.VIEWER });
  }
}

export async function resolveShareToken(token) {
  await connectDB();
  const doc = await Document.findOne({
    shareLinkToken: token,
    shareLinkEnabled: true,
  }).lean();

  if (!doc) return null;

  return {
    documentId: doc._id.toString(),
    workspaceId: doc.workspaceId.toString(),
    title: doc.title,
    role: doc.shareLinkRole,
  };
}
