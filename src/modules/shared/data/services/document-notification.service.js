import mailService from '@shared/mail/mail.service';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, Workspace, User } from '@shared/data/models';

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
  const docUrl = `${appUrl()}/workspace/${document.workspaceId}/document/${documentId}`;

  return mailService.sendDocumentShared({
    to: recipientEmail,
    recipientName: recipientName || recipient?.name || recipientEmail,
    sharedByName: sharedBy?.name || 'A SyncDoc user',
    documentTitle: document.title,
    documentUrl: docUrl,
    workspaceId: document.workspaceId.toString(),
    workspaceName: workspace?.name,
    role,
  });
}

export async function notifyDocumentInvite({
  recipientEmail,
  invitedByUserId,
  documentId,
  documentTitle,
  role = 'VIEWER',
  callbackUrl,
}) {
  await connectDB();
  const invitedBy = await User.findById(invitedByUserId).lean();
  const registerUrl = `${appUrl()}/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return mailService.sendDocumentInvite({
    to: recipientEmail,
    recipientName: recipientEmail,
    invitedByName: invitedBy?.name || 'A SyncDoc user',
    documentTitle,
    role,
    inviteUrl: registerUrl,
  });
}
