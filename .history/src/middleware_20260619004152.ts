export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const publicPaths = [
  '/login',
  '/api/auth/login',
  '/api/auth/register',
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('auth-token')?.value;
  if (!token && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
