import { requireApiSession } from '@shared/utils/api-auth';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, DocumentMember, ROLES } from '@shared/data/models';
import { documentCreateSchema } from '@shared/lib/validations/schemas';
import { getWorkspaceAccess } from '@shared/lib/security/authorize';
import { rateLimit } from '@shared/lib/security/rate-limit';
import { sanitizeHtml } from '@shared/lib/validations/schemas';
import { getClientIpFromReq, sendJson, methodNotAllowed } from '@shared/utils/api-response';

export default async function handler(req, res) {
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const workspaceId = req.query.workspaceId;
    if (!workspaceId) return sendJson(res, 400, { error: 'workspaceId required' });

    const access = await getWorkspaceAccess(workspaceId, session.user.id);
    if (!access) return sendJson(res, 404, { error: 'Workspace not found' });

    await connectDB();
    const docs = await Document.find({ workspaceId }).sort({ updatedAt: -1 }).limit(50).lean();
    return sendJson(res, 200, {
      documents: docs.map((d) => ({ ...d, _id: d._id.toString() })),
    });
  }

  if (req.method === 'POST') {
    const limit = await rateLimit(getClientIpFromReq(req));
    if (!limit.success) return sendJson(res, 429, { error: 'Rate limit exceeded' });

    const parsed = documentCreateSchema.safeParse(req.body);
    if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });

    const access = await getWorkspaceAccess(parsed.data.workspaceId, session.user.id);
    if (!access) return sendJson(res, 403, { error: 'Workspace not found' });

    await connectDB();
    const doc = await Document.create({
      title: parsed.data.title,
      workspaceId: parsed.data.workspaceId,
      content: sanitizeHtml(parsed.data.content),
      createdBy: session.user.id,
      currentVersion: 1,
    });

    await DocumentMember.create({
      documentId: doc._id,
      userId: session.user.id,
      role: ROLES.OWNER,
    });

    return sendJson(res, 200, { ...doc.toObject(), _id: doc._id.toString() });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
