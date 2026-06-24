import { requireApiSession } from '@shared/utils/api-auth';
import { getWorkspacesForUser } from '@shared/data/services/workspace.service';
import { connectDB } from '@shared/lib/db/mongoose';
import { Workspace } from '@shared/data/models';
import { rateLimit } from '@shared/lib/security/rate-limit';
import { getClientIpFromReq, sendJson, methodNotAllowed } from '@shared/utils/api-response';

export default async function handler(req, res) {
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const limit = await rateLimit(getClientIpFromReq(req));
    if (!limit.success) return sendJson(res, 429, { error: 'Rate limit exceeded' });

    const workspaces = await getWorkspacesForUser(session.user.id);
    return sendJson(res, 200, { workspaces });
  }

  if (req.method === 'POST') {
    await connectDB();
    const ws = await Workspace.create({
      name: req.body?.name || 'New Workspace',
      ownerId: session.user.id,
    });
    return sendJson(res, 200, { ...ws.toObject(), _id: ws._id.toString() });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
