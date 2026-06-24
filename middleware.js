import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const { pathname } = req.nextUrl;
    const isPublic = ['/login', '/register'].some((p) => pathname.startsWith(p));

    if (token && isPublic) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const publicPaths = ['/login', '/register'];

        if (publicPaths.some((p) => pathname.startsWith(p))) return true;
        if (pathname.startsWith('/api/auth')) return true;

        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|socket.io).*)'],
};
