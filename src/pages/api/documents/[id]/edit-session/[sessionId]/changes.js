import { requireApiSession } from '@shared/utils/api-auth';
import { sendJson, methodNotAllowed } from '@shared/utils/api-response';
import { getSessionChangeLogs } from '@document/data/service/edit-session.service';

export default async function handler(req, res) {
  const { id, sessionId } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const data = await getSessionChangeLogs(sessionId);
    return sendJson(res, 200, { documentId: id, ...data });
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}
