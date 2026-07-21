import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const ref = request.nextUrl.searchParams.get('ref')

  // Si la URL trae un código de referido, lo guardamos en una cookie por 60 días
  if (ref) {
    response.cookies.set('preziso_ref', ref, {
      maxAge: 60 * 60 * 24 * 60, // 60 días
      httpOnly: true, // Invisible para el cliente (Seguridad)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    // Se ejecuta en todas las rutas excepto en archivos estáticos y APIs
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}