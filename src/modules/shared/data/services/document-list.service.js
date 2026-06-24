import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentMember, Workspace } from '@shared/data/models';

export async function listDocumentsForUser(userId, filter = 'all') {
  await connectDB();

  const ownedWorkspaces = await Workspace.find({ ownerId: userId }).select('_id').lean();
  const ownedWorkspaceIds = ownedWorkspaces.map((w) => w._id);

  const memberships = await DocumentMember.find({ userId }).select('documentId role').lean();
  const memberDocIds = memberships.map((m) => m.documentId);

  const baseQuery = {
    $or: [
      { workspaceId: { $in: ownedWorkspaceIds } },
      { _id: { $in: memberDocIds } },
      { createdBy: userId },
    ],
  };

  let docs = await Document.find(baseQuery)
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const ownedWorkspaceIdSet = new Set(ownedWorkspaceIds.map((id) => id.toString()));

  const enriched = docs.map((doc) => {
    const isOwned =
      doc.createdBy?.toString() === userId.toString() ||
      ownedWorkspaceIdSet.has(doc.workspaceId?.toString());
    return {
      ...doc,
      _id: doc._id.toString(),
      workspaceId: doc.workspaceId.toString(),
      createdBy: doc.createdBy?.toString(),
      isOwned,
    };
  });

  if (filter === 'owned') {
    return enriched.filter((d) => d.isOwned);
  }
  if (filter === 'shared') {
    return enriched.filter((d) => !d.isOwned);
  }
  return enriched;
}
