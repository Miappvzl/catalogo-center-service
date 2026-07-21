import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

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
    })
  }

  // ---------------------------------------------------------
  // 1. SUPABASE AUTH & CONEXIÓN VIA CLOUDFLARE WORKER
  // ---------------------------------------------------------
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

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // REGLAS DE SEGURIDAD (Protección de paneles)
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/boss') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (pathname.startsWith('/login') && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // ---------------------------------------------------------
  // 2. MOTOR DE SUBDOMINIOS (Wildcard Routing)
  // ---------------------------------------------------------
  const hostname = request.headers.get('host') || ''
  
  const currentEnvDomain = process.env.NODE_ENV === 'production' ? 'preziso.shop' : 'localhost:3000'
  
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