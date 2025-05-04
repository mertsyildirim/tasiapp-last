import { NextResponse } from 'next/server';

export function middleware(request) {
  // Eğer doğrudan admin giriş sayfasına istek yaptıysa, izin ver
  if (request.nextUrl.pathname === '/admin') {
    return NextResponse.next();
  }
  
  // Admin sayfalarına istek için token kontrolü yap
  const token = request.cookies.get('token')?.value;
  
  // Token yoksa giriş sayfasına yönlendir
  if (!token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  // Token varsa, erişime izin ver (rol kontrolü yapmadan)
  return NextResponse.next();
}

// Admin altındaki tüm sayfalara bu middleware'i uygula
export const config = {
  matcher: ['/admin/:path*']
}; 