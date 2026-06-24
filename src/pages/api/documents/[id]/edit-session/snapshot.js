import { requireApiSession } from '@shared/utils/api-auth';
import { sendJson, methodNotAllowed } from '@shared/utils/api-response';
import { commitSessionSnapshot } from '@document/data/service/edit-session.service';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const sessionId = req.body?.sessionId;
  if (!sessionId) return sendJson(res, 400, { error: 'sessionId required' });

  try {
    const result = await commitSessionSnapshot(id, sessionId, session.user.id);
    if (!result) return sendJson(res, 404, { error: 'Active session not found' });
    return sendJson(res, 200, result);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}
