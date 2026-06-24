import { connectDB } from '@shared/lib/db/mongoose';
import { Document } from '@shared/data/models';
import { authorizeDocument } from '@shared/lib/security/authorize';

export async function getDocumentForPage(documentId, userId) {
  const authz = await authorizeDocument(userId, documentId, 'read');
  if (!authz.authorized) return null;

  await connectDB();
  const doc = await Document.findById(documentId).lean();
  return {
    document: {
      _id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      workspaceId: doc.workspaceId.toString(),
      currentVersion: doc.currentVersion,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
    },
    role: authz.role,
  };
}
