import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Public paths that don't require authentication
  const publicPaths = ['/signin', '/signup']
  const isPublicPath = publicPaths.includes(path)

  // Get authentication status from session storage
  const authSession = request.cookies.get('auth')?.value

  // Redirect authenticated users away from signin/signup pages
  if (isPublicPath && authSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect API routes - require authentication
  if (path.startsWith('/api/') && !authSession) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/signin', '/api/:path*']
} 