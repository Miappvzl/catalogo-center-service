import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  if (code) {
    // 1. Preparamos la respuesta vacía donde pegaremos las cookies
    const response = NextResponse.redirect(`${origin}${next}`)

    // 2. Usamos el adaptador MODERNO (getAll / setAll)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Leemos las cookies de la petición
            const cookieHeader = request.headers.get('Cookie') ?? ''
            return parseCookieHeader(cookieHeader)
          },
          setAll(cookiesToSet) {
            // AQUÍ ESTÁ EL TRUCO: Supabase nos da las cookies y las pegamos en la respuesta
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({
                name,
                value,
                ...options,
              })
            })
          },
        },
      }
    )

    // 3. Canjeamos el código. Esto disparará 'setAll' automáticamente.
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Devolvemos la respuesta CON las cookies pegadas
      return response
    }
  }

  // Si falla, al login
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}

// Pequeña utilidad para leer cookies manuales (necesaria para getAll)
function parseCookieHeader(header: string) {
  const list: any[] = []
  if (!header) return list
  header.split(';').forEach((cookie) => {
    const parts = cookie.split('=')
    if (parts.length >= 2) {
      const name = parts.shift()?.trim()
      const value = parts.join('=')
      list.push({ name, value })
    }
  })
  return list
}