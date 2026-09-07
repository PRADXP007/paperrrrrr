import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

// Routes that require authentication
const PROTECTED_ROUTES = ["/history", "/profile"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Apply Security Headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 2. Check Authentication for Protected Routes
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const token = request.cookies.get("auth_token")?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    
    // In Edge Runtime, jose jwtVerify works fine
    const user = await verifySessionToken(token);
    if (!user) {
      // Invalid token, clear it and redirect
      const redirectResponse = NextResponse.redirect(new URL("/", request.url));
      redirectResponse.cookies.delete("auth_token");
      return redirectResponse;
    }
  }

  return response;
}

// Only run middleware on non-static routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes have their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
