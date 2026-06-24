import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@shared/lib/auth/auth-options';

const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

export async function getPageSession(req, res) {
  if (req && res) {
    return getServerSession(req, res, authOptions);
  }

  const token = await getToken({ req, secret });
  if (!token) return null;

  return {
    user: {
      id: token.id,
      email: token.email,
      name: token.name,
      mustResetPassword: token.mustResetPassword,
    },
  };
}

export function requireSession(session, destination = '/login') {
  if (!session?.user?.id) {
    return { redirect: { destination, permanent: false } };
  }
  return null;
}
