import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const hostname = request.headers.get('host') || ''
  const currentEnvDomain = process.env.NODE_ENV === 'production' ? 'preziso.shop' : 'localhost:3000'
  const cookieDomain = process.env.NODE_ENV === 'production' ? '.preziso.shop' : undefined

  // ---------------------------------------------------------
  // 🚀 INYECCIÓN: CAPTURA DE CÓDIGO DE AFILIADO (?ref=)
  // ---------------------------------------------------------
  const ref = request.nextUrl.searchParams.get('ref')
  if (ref) {
    response.cookies.set('preziso_ref', ref, {
      maxAge: 60 * 60 * 24 * 60, // 60 días
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: cookieDomain,
    })
  }

  const pathname = request.nextUrl.pathname

  // ---------------------------------------------------------
  // 1. ESCUDO ANTI-BOTS (Fast Path)
  // ---------------------------------------------------------
  // Verificamos si hay indicios de sesión en las cookies SIN hacer peticiones de red
  const hasSessionCookie = request.cookies.getAll().some(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
  )

  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/boss')
  const isLoginRoute = pathname.startsWith('/login')

  // Si un bot intenta entrar a /admin sin cookies, lo rebotamos en 1ms. Cero CPU.
  if (isProtectedRoute && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ---------------------------------------------------------
  // 2. SUPABASE LAZY AUTH (Solo si es estrictamente necesario)
  // ---------------------------------------------------------
  if ((isProtectedRoute && hasSessionCookie) || (isLoginRoute && hasSessionCookie)) {
    const proxyUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wandering-surf-2d0c.quanzosinc-179.workers.dev";

    const supabase = createServerClient(
      proxyUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value, ...options })
            
            if (ref) {
              response.cookies.set('preziso_ref', ref, {
                maxAge: 60 * 60 * 24 * 60,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                domain: cookieDomain,
              })
            }
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Solo hacemos la petición de red si pasaron el escudo
    const { data: { user } } = await supabase.auth.getUser()

    if (isProtectedRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (isLoginRoute && user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // ---------------------------------------------------------
  // 3. MOTOR DE SUBDOMINIOS (Wildcard Routing)
  // ---------------------------------------------------------
  const isSubdomain = hostname !== currentEnvDomain && 
                      hostname !== `www.${currentEnvDomain}` && 
                      hostname.endsWith(`.${currentEnvDomain}`)

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${currentEnvDomain}`, '')
    
    if (!pathname.startsWith('/_next') && !pathname.startsWith('/api') && !pathname.includes('.')) {
        const rewriteResponse = NextResponse.rewrite(new URL(`/${subdomain}${pathname === '/' ? '' : pathname}`, request.url))
        
        if (ref) {
          rewriteResponse.cookies.set('preziso_ref', ref, {
            maxAge: 60 * 60 * 24 * 60,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: cookieDomain,
          })
        }
        return rewriteResponse
    }
  }

  return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}