import { getPageSession } from '@shared/utils/session';
import { authOptions } from '@shared/lib/auth/auth-options';

export { authOptions };

export async function getApiSession(req, res) {
  return getPageSession(req, res);
}

export async function requireApiSession(req, res) {
  const session = await getPageSession(req, res);
  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}
