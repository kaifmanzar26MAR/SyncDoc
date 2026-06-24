import { requireApiSession } from '@shared/utils/api-auth';
import { sendJson, methodNotAllowed } from '@shared/utils/api-response';
import {
  getOrJoinActiveSession,
  leaveEditSession,
  commitSessionSnapshot,
  getSessionChangeLogs,
} from '@document/data/service/edit-session.service';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'POST') {
    try {
      const editSession = await getOrJoinActiveSession(id, session.user.id);
      if (!editSession) {
        return sendJson(res, 403, { error: 'Viewers cannot start edit sessions' });
      }
      return sendJson(res, 200, { session: editSession });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const sessionId = req.body?.sessionId;
    if (!sessionId) return sendJson(res, 400, { error: 'sessionId required' });

    try {
      const result = await leaveEditSession(id, session.user.id, sessionId);
      return sendJson(res, 200, { session: result });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  return methodNotAllowed(res, ['POST', 'DELETE']);
}
