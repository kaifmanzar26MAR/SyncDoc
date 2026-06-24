import { requireApiSession } from '@shared/utils/api-auth';
import { sendJson, methodNotAllowed, getClientIpFromReq } from '@shared/utils/api-response';
import { rateLimit } from '@shared/lib/security/rate-limit';
import {
  documentShareEmailSchema,
  documentShareLinkSchema,
  documentShareUpdateSchema,
  documentShareRemoveSchema,
} from '@shared/lib/validations/schemas';
import {
  getShareSettings,
  shareDocumentByEmail,
  updateShareLink,
  updateCollaboratorAccess,
  removeCollaboratorAccess,
} from '@document/data/service/share.service';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const settings = await getShareSettings(id, session.user.id);
      return sendJson(res, 200, settings);
    } catch (err) {
      return sendJson(res, 403, { error: err.message });
    }
  }

  if (req.method === 'POST') {
    const limit = await rateLimit(getClientIpFromReq(req));
    if (!limit.success) return sendJson(res, 429, { error: 'Rate limit exceeded' });

    const parsed = documentShareEmailSchema.safeParse(req.body);
    if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });

    try {
      const result = await shareDocumentByEmail({
        documentId: id,
        userId: session.user.id,
        email: parsed.data.email,
        role: parsed.data.role,
      });
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    if (req.body?.linkEnabled !== undefined) {
      const parsed = documentShareLinkSchema.safeParse(req.body);
      if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });

      try {
        const result = await updateShareLink({
          documentId: id,
          userId: session.user.id,
          linkEnabled: parsed.data.linkEnabled,
        });
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    const parsed = documentShareUpdateSchema.safeParse(req.body);
    if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });

    try {
      const result = await updateCollaboratorAccess({
        documentId: id,
        userId: session.user.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        role: parsed.data.role,
      });
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const parsed = documentShareRemoveSchema.safeParse(req.body);
    if (!parsed.success) return sendJson(res, 400, { error: parsed.error.flatten() });

    try {
      const result = await removeCollaboratorAccess({
        documentId: id,
        userId: session.user.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      });
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}
