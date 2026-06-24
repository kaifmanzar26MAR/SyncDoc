import { requireApiSession } from '@shared/utils/api-auth';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentVersion } from '@shared/data/models';
import { authorizeDocument } from '@shared/lib/security/authorize';
import { rateLimit } from '@shared/lib/security/rate-limit';
import { getClientIpFromReq, sendJson, methodNotAllowed } from '@shared/utils/api-response';
import { broadcastDocumentChange } from '@shared/lib/socket/broadcast';

function isObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function formatSnapshotDate(date) {
  if (!date) return 'snapshot';
  return new Date(date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function handler(req, res) {
  const { id, versionId } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const authz = await authorizeDocument(session.user.id, id, 'restore');
  if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });

  const limit = await rateLimit(getClientIpFromReq(req));
  if (!limit.success) return sendJson(res, 429, { error: 'Rate limit exceeded' });

  await connectDB();

  const versionQuery = isObjectId(versionId)
    ? { documentId: id, _id: versionId }
    : { documentId: id, version: Number(versionId) };

  const sourceVersion = await DocumentVersion.findOne(versionQuery);
  if (!sourceVersion) return sendJson(res, 404, { error: 'Version not found' });

  const doc = await Document.findById(id);
  if (!doc) return sendJson(res, 404, { error: 'Document not found' });

  const newVersionNum = doc.currentVersion + 1;
  const restoredAt = formatSnapshotDate(sourceVersion.createdAt);

  await DocumentVersion.create({
    documentId: id,
    version: newVersionNum,
    snapshot: sourceVersion.snapshot,
    createdBy: session.user.id,
    label: `Restored from ${restoredAt}`,
    snapshotType: 'restore',
    restoreOf: sourceVersion.version,
  });

  doc.title = sourceVersion.snapshot?.title ?? doc.title;
  doc.content = sourceVersion.snapshot?.content ?? doc.content;
  if (sourceVersion.snapshot?.yjsState) doc.yjsState = sourceVersion.snapshot.yjsState;
  doc.currentVersion = newVersionNum;
  await doc.save();

  broadcastDocumentChange(id, session.user.id, {
    operationType: 'RESTORE',
    title: doc.title,
    content: doc.content,
  });

  return sendJson(res, 200, {
    document: {
      _id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      currentVersion: doc.currentVersion,
    },
    newVersion: newVersionNum,
    restoredFrom: sourceVersion.version,
  });
}
