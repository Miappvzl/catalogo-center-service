import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================================
// 🛡️ MOTOR DE CIBERSEGURIDAD EN MEMORIA (EDGE)
// ============================================================================
const rateLimitMap = new Map<string, { count: number; startTime: number }>()
const bannedIPs = new Map<string, boolean>()

const WINDOW_MS = 10000 // Ventana de 10 segundos
const MAX_REQUESTS = 30 // Máximo 30 peticiones en 10 segundos

export async function proxy(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown_ip'
  const pathname = request.nextUrl.pathname

  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/boss')
  const isLoginRoute = pathname.startsWith('/login')
  const isSensitiveRoute = isProtectedRoute || isLoginRoute

  // --------------------------------------------------------------------------
  // 0. ESCUDO DE LISTA NEGRA Y RATE LIMITER (SOLO PARA RUTAS SENSIBLES)
  // --------------------------------------------------------------------------
  // 🚀 CORRECCIÓN: Ahora el escudo NO evalúa a los clientes que visitan las tiendas
  if (isSensitiveRoute) {
    if (bannedIPs.has(ip)) {
      return new NextResponse('Military Shield: IP Banned for malicious activity on admin routes.', { status: 429 })
    }

    const now = Date.now()
    const ipData = rateLimitMap.get(ip)

    if (!ipData) {
      rateLimitMap.set(ip, { count: 1, startTime: now })
    } else {
      if (now - ipData.startTime > WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, startTime: now })
      } else {
        ipData.count++
        if (ipData.count > MAX_REQUESTS) {
          bannedIPs.set(ip, true)
          logThreatToSupabase(ip, request.headers.get('user-agent') || 'unknown', pathname)
          return new NextResponse('Military Shield: Attack detected and IP Banned.', { status: 429 })
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // LÓGICA ORIGINAL DE PREZISO
  // --------------------------------------------------------------------------
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const hostname = request.headers.get('host') || ''
  const currentEnvDomain = process.env.NODE_ENV === 'production' ? 'preziso.shop' : 'localhost:3000'
  const cookieDomain = process.env.NODE_ENV === 'production' ? '.preziso.shop' : undefined

  // Captura de código de afiliado (?ref=)
  const ref = request.nextUrl.searchParams.get('ref')
  if (ref) {
    response.cookies.set('preziso_ref', ref, {
      maxAge: 60 * 60 * 24 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: cookieDomain,
    })
  }

  // 1. ESCUDO ANTI-BOTS (Fast Path para Auth)
  const hasSessionCookie = request.cookies.getAll().some(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
  )

  if (isProtectedRoute && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. SUPABASE LAZY AUTH
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

    const { data: { user } } = await supabase.auth.getUser()

    if (isProtectedRoute && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (isLoginRoute && user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // 3. MOTOR DE SUBDOMINIOS
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

// 📡 FUNCIÓN DE AUDITORÍA ASÍNCRONA
function logThreatToSupabase(ip: string, userAgent: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return

  fetch(`${supabaseUrl}/rest/v1/security_blocked_ips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      ip_address: ip,
      user_agent: userAgent,
      path_attempted: path,
      threat_level: 'high'
    }),
    keepalive: true 
  }).catch(err => console.error('Error logging threat:', err))
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}