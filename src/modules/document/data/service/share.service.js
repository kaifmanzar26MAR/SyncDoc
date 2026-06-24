import crypto from 'crypto';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentMember, User, ROLES } from '@shared/data/models';
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

export async function getShareSettings(documentId, userId) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  if (!authz.authorized || authz.role === ROLES.VIEWER) {
    throw new Error('Permission denied');
  }

  await connectDB();
  const doc = await ensureShareToken(documentId);
  const members = await DocumentMember.find({ documentId })
    .populate('userId', 'name email')
    .lean();

  return {
    linkEnabled: doc.shareLinkEnabled,
    linkRole: doc.shareLinkRole,
    shareUrl: getShareLinkUrl(doc.shareLinkToken),
    members: members.map((m) => ({
      email: m.userId?.email,
      name: m.userId?.name,
      role: m.role,
    })),
  };
}

export async function shareDocumentByEmail({ documentId, userId, email, role }) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  if (!authz.authorized || authz.role === ROLES.VIEWER) {
    throw new Error('Only owners and editors can share');
  }

  await connectDB();
  const doc = await Document.findById(documentId).lean();
  if (!doc) throw new Error('Document not found');

  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    await DocumentMember.findOneAndUpdate(
      { documentId, userId: existingUser._id },
      { role },
      { upsert: true, new: true }
    );

    await notifyDocumentShared({
      recipientEmail: normalizedEmail,
      recipientName: existingUser.name,
      sharedByUserId: userId,
      documentId,
      role,
    });
  } else {
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

  return { success: true, userExists: !!existingUser };
}

export async function updateShareLink({ documentId, userId, linkEnabled }) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  if (!authz.authorized || authz.role === ROLES.VIEWER) {
    throw new Error('Only owners and editors can change link settings');
  }

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
