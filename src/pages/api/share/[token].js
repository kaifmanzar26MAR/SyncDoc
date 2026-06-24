import { sendJson, methodNotAllowed } from '@shared/utils/api-response';
import { resolveShareToken } from '@document/data/service/share.service';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const { token } = req.query;
  const resolved = await resolveShareToken(token);

  if (!resolved) return sendJson(res, 404, { error: 'Invalid or disabled share link' });

  return sendJson(res, 200, resolved);
}
