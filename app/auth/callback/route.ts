import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Si viene una ruta "next", la usamos; si no, vamos al admin
  const next = searchParams.get('next') ?? '/admin'

  if (code) {
    // 1. Creamos la respuesta ANTES para poder inyectarle las cookies
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.headers.get('Cookie')?.split('; ').find((row) => row.startsWith(`${name}=`))?.split('=')[1]
          },
          set(name: string, value: string, options: CookieOptions) {
            // 2. Aquí conectamos Supabase con la Respuesta de Next.js
            // Cuando Supabase cree la sesión, escribirá la cookie en 'response'
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            // Igual para borrar
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    
    // 3. Intercambiamos el código por la sesión
    // (Esto disparará automáticamente los métodos 'set' de arriba)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return response
    }
  }

  // Si algo falla, devolvemos al login con error
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}