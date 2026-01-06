import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Creamos un cliente de Supabase temporal solo para verificar la sesión
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 2. Verificamos si hay usuario
  const { data: { user } } = await supabase.auth.getUser()

  // 3. REGLA DE SEGURIDAD:
  // Si intenta entrar a una ruta que empieza por '/admin' Y no hay usuario...
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    // ...lo mandamos al Login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Si intenta ir al Login PERO ya tiene usuario...
  if (request.nextUrl.pathname.startsWith('/login') && user) {
     // ...lo mandamos directo al Admin (para que no se loguee dos veces)
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

// Configuración: En qué rutas se ejecuta este portero
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}