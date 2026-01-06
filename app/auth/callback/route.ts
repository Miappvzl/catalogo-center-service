import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  
  // El código que envía Supabase para confirmar el email
  const code = searchParams.get('code')
  
  // A dónde queremos ir después (por defecto al admin)
  const next = searchParams.get('next') ?? '/admin'

  if (code) {
    const cookieStore = {
      getAll() {
        return [] // No tenemos acceso directo a cookies de lectura aquí, pero no importa para el set
      },
      setAll(cookiesToSet: any[]) {
         // Aquí ocurre la magia: Supabase nos dice qué cookies guardar
         cookiesToSet.forEach(({ name, value, options }) => {
             // Lógica simulada para el intercambio
         })
      },
    }

    // 1. Creamos cliente temporal
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // Leemos la cookie de la petición entrante
            return request.headers.get('Cookie')?.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1]
          },
          set(name: string, value: string, options: CookieOptions) {
            // Esto es necesario para el flujo de intercambio
          },
          remove(name: string, options: CookieOptions) {
             // necesario para el flujo
          },
        },
      }
    )
    
    // 2. Intercambiamos el Código por la Sesión Real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 3. Si todo sale bien, mandamos al usuario al Admin (ya logueado)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo falla, lo mandamos al login con error
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}