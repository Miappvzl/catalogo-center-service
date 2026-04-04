import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'


export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 1. SUPABASE AUTH (Mantenemos tu lógica de seguridad intacta)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
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
  
  // Definimos cuál es el dominio base (Localhost para pruebas, preziso.shop para Producción)
  const currentEnvDomain = process.env.NODE_ENV === 'production' ? 'preziso.shop' : 'localhost:3000'
  
  // Verificamos si la petición viene de un subdominio (Ej: zapatos.preziso.shop)
  const isSubdomain = hostname !== currentEnvDomain && 
                      hostname !== `www.${currentEnvDomain}` && 
                      hostname.endsWith(`.${currentEnvDomain}`)

  if (isSubdomain) {
    // Extraemos el nombre de la tienda ('zapatos')
    const subdomain = hostname.replace(`.${currentEnvDomain}`, '')
    
    // Evitamos interceptar archivos del sistema (Next.js assets, API, etc.)
    if (!pathname.startsWith('/_next') && !pathname.startsWith('/api') && !pathname.includes('.')) {
        // MAGIA DE VERCEL: Reescribimos silenciosamente la ruta.
        // Si entran a zapatos.preziso.shop/, internamente carga preziso.shop/zapatos (app/[slug]/page.tsx)
        return NextResponse.rewrite(new URL(`/${subdomain}${pathname === '/' ? '' : pathname}`, request.url))
    }
  }

  return response
}

// Si tenías un config, déjalo así:
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}