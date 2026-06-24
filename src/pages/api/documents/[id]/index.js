import { requireApiSession } from '@shared/utils/api-auth';
import { connectDB } from '@shared/lib/db/mongoose';
import { authorizeDocument } from '@shared/lib/security/authorize';
import { documentUpdateSchema, sanitizeHtml } from '@shared/lib/validations/schemas';
import { sendJson, methodNotAllowed } from '@shared/utils/api-response';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const authz = await authorizeDocument(session.user.id, id, 'read');
    if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });

    const doc = authz.document;
    return sendJson(res, 200, {
      ...doc,
      _id: doc._id.toString(),
      yjsState: doc.yjsState ? Buffer.from(doc.yjsState).toString('base64') : null,
      role: authz.role,
    });
  }

  if (req.method === 'PATCH') {
    const authz = await authorizeDocument(session.user.id, id, 'edit');
    if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });

    const parsed = documentUpdateSchema.safeParse(req.body);
    if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });

    await connectDB();
    const updates = {};
    if (parsed.data.title) updates.title = parsed.data.title;
    if (parsed.data.content !== undefined) updates.content = sanitizeHtml(parsed.data.content);

    const { Document } = await import('@shared/data/models');
    const doc = await Document.findByIdAndUpdate(id, updates, { new: true }).lean();
    return sendJson(res, 200, { ...doc, _id: doc._id.toString() });
  }

  return methodNotAllowed(res, ['GET', 'PATCH']);
}
