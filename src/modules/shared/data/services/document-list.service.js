import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentMember, Workspace } from '@shared/data/models';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function enrichDocument(doc, userId, ownedWorkspaceIdSet) {
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
}

function buildAccessQuery(userId, ownedWorkspaceIds, memberDocIds) {
  const clauses = [
    { createdBy: userId },
    { workspaceId: { $in: ownedWorkspaceIds } },
  ];

  if (memberDocIds.length) {
    clauses.push({ _id: { $in: memberDocIds } });
  }

  return { $or: clauses };
}

function buildFilterQuery(filter, userId, ownedWorkspaceIds, memberDocIds) {
  const accessQuery = buildAccessQuery(userId, ownedWorkspaceIds, memberDocIds);

  if (filter === 'owned') {
    return {
      $or: [{ createdBy: userId }, { workspaceId: { $in: ownedWorkspaceIds } }],
    };
  }

  if (filter === 'shared') {
    return {
      $and: [
        accessQuery,
        { createdBy: { $ne: userId } },
        { workspaceId: { $nin: ownedWorkspaceIds } },
      ],
    };
  }

  return accessQuery;
}

export async function listDocumentsForUser(userId, options = {}) {
  const {
    filter = 'all',
    search = '',
    page = 1,
    pageSize = 12,
  } = options;

  await connectDB();

  const ownedWorkspaces = await Workspace.find({ ownerId: userId }).select('_id').lean();
  const ownedWorkspaceIds = ownedWorkspaces.map((w) => w._id);
  const ownedWorkspaceIdSet = new Set(ownedWorkspaceIds.map((id) => id.toString()));

  const memberships = await DocumentMember.find({ userId }).select('documentId').lean();
  const memberDocIds = memberships.map((m) => m.documentId);

  let query = buildFilterQuery(filter, userId, ownedWorkspaceIds, memberDocIds);

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    const titleFilter = { title: { $regex: escapeRegex(trimmedSearch), $options: 'i' } };
    query = { $and: [query, titleFilter] };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 12));
  const skip = (safePage - 1) * safePageSize;

  const [docs, total] = await Promise.all([
    Document.find(query).sort({ updatedAt: -1 }).skip(skip).limit(safePageSize).lean(),
    Document.countDocuments(query),
  ]);

  const documents = docs.map((doc) => enrichDocument(doc, userId, ownedWorkspaceIdSet));

  return {
    documents,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
  };
}

export async function getDocumentCountsForUser(userId) {
  await connectDB();

  const ownedWorkspaces = await Workspace.find({ ownerId: userId }).select('_id').lean();
  const ownedWorkspaceIds = ownedWorkspaces.map((w) => w._id);

  const memberships = await DocumentMember.find({ userId }).select('documentId').lean();
  const memberDocIds = memberships.map((m) => m.documentId);

  const ownedQuery = buildFilterQuery('owned', userId, ownedWorkspaceIds, memberDocIds);
  const sharedQuery = buildFilterQuery('shared', userId, ownedWorkspaceIds, memberDocIds);

  const [owned, shared] = await Promise.all([
    Document.countDocuments(ownedQuery),
    Document.countDocuments(sharedQuery),
  ]);

  return { owned, shared, total: owned + shared };
}
