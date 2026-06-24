import { requireApiSession } from '@shared/utils/api-auth';
import { authorizeDocument } from '@shared/lib/security/authorize';
import { sendJson, methodNotAllowed } from '@shared/utils/api-response';
import { getVersionsWithSessions } from '@document/data/service/edit-session.service';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const authz = await authorizeDocument(session.user.id, id, 'read');
    if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });

    const versions = await getVersionsWithSessions(id);
    return sendJson(res, 200, { versions });
  }

  if (req.method === 'POST') {
    return sendJson(res, 403, {
      error: 'Manual snapshots are disabled. Versions are created automatically per edit session.',
    });
  }

  return methodNotAllowed(res, ['GET']);
}
