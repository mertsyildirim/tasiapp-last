import { NextResponse } from 'next/server';

export function middleware(request) {
  // Eğer doğrudan admin giriş sayfasına istek yaptıysa, izin ver
  if (request.nextUrl.pathname === '/admin') {
    return NextResponse.next();
  }
  
  // Admin sayfalarına istek için NextAuth session token kontrolü
  const sessionToken = 
    request.cookies.get('tasiapp-admin-auth-session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // Session yoksa giriş sayfasına yönlendir
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  // Session varsa, erişime izin ver
  return NextResponse.next();
}

// Admin altındaki tüm sayfalara bu middleware'i uygula
export const config = {
  matcher: ['/admin/:path*']
}; 