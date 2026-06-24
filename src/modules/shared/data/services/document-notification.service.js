import mailService from '@shared/mail/mail.service';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, Workspace, User } from '@shared/data/models';

/**
 * Notify a user that a document was shared with them.
 * Call after creating/updating a DocumentMember record.
 */
export async function notifyDocumentShared({
  recipientEmail,
  recipientName,
  sharedByUserId,
  documentId,
  role,
}) {
  await connectDB();

  const [document, sharedBy, recipient] = await Promise.all([
    Document.findById(documentId).lean(),
    User.findById(sharedByUserId).lean(),
    User.findOne({ email: recipientEmail.toLowerCase() }).lean(),
  ]);

  if (!document) throw new Error('Document not found');

  const workspace = await Workspace.findById(document.workspaceId).lean();

  return mailService.sendDocumentShared({
    to: recipientEmail,
    recipientName: recipientName || recipient?.name || recipientEmail,
    sharedByName: sharedBy?.name || 'A SyncDoc user',
    documentTitle: document.title,
    documentId: document._id.toString(),
    workspaceId: document.workspaceId.toString(),
    workspaceName: workspace?.name,
    role,
  });
}

/**
 * Invite a non-registered user to collaborate on a document.
 */
export async function notifyDocumentInvite({
  recipientEmail,
  recipientName,
  invitedByUserId,
  documentTitle,
  role = 'EDITOR',
  message,
  inviteToken,
}) {
  await connectDB();
  const invitedBy = await User.findById(invitedByUserId).lean();

  return mailService.sendDocumentInvite({
    to: recipientEmail,
    recipientName,
    invitedByName: invitedBy?.name || 'A SyncDoc user',
    documentTitle,
    role,
    message,
    inviteToken,
  });
}
