import { NextResponse } from 'next/server';

// Middleware artık admin koruması yapmıyor
// Admin sayfaları kendi içlerinde useSession hook'u ile koruma sağlıyor
export function middleware(request) {
  // Eski admin koruması kaldırıldı
  return NextResponse.next();
}

// Admin matcher kaldırıldı
export const config = {
  matcher: [] // Şu an middleware hiçbir sayfaya uygulanmıyor
}; 