import { requireApiSession } from '@shared/utils/api-auth';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentVersion } from '@shared/data/models';
import { authorizeDocument } from '@shared/lib/security/authorize';
import { versionCreateSchema } from '@shared/lib/validations/schemas';
import { rateLimit } from '@shared/lib/security/rate-limit';
import { getClientIpFromReq, sendJson, methodNotAllowed } from '@shared/utils/api-response';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const authz = await authorizeDocument(session.user.id, id, 'read');
    if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });

    await connectDB();
    const versions = await DocumentVersion.find({ documentId: id }).sort({ version: -1 }).limit(50).lean();
    return sendJson(res, 200, {
      versions: versions.map((v) => ({
        ...v,
        _id: v._id.toString(),
        snapshot: { title: v.snapshot?.title, content: v.snapshot?.content },
      })),
    });
  }

  if (req.method === 'POST') {
    const authz = await authorizeDocument(session.user.id, id, 'version');
    if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });

    const limit = await rateLimit(getClientIpFromReq(req));
    if (!limit.success) return sendJson(res, 429, { error: 'Rate limit exceeded' });

    const parsed = versionCreateSchema.safeParse(req.body || {});
    if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });

    await connectDB();
    const doc = await Document.findById(id);
    if (!doc) return sendJson(res, 404, { error: 'Not found' });

    const newVersion = doc.currentVersion + 1;
    const version = await DocumentVersion.create({
      documentId: id,
      version: newVersion,
      snapshot: { title: doc.title, content: doc.content, yjsState: doc.yjsState },
      createdBy: session.user.id,
      label: parsed.data.label,
    });

    doc.currentVersion = newVersion;
    await doc.save();

    return sendJson(res, 200, {
      version: { ...version.toObject(), _id: version._id.toString() },
    });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
