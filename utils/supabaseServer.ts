import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 1. CLIENTE DINÁMICO (MANTENIDO): Usado para Auth, perfiles y acciones privadas.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // El método 'setAll' fue llamado desde un Server Component.
          }
        },
      },
    }
  )
}

// 2. CLIENTE CACHEADO (NUEVO): Usado EXCLUSIVAMENTE para datos públicos (Catálogo, Tasas, Promos).
export function createPublicCachedClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return [] }, // Ignoramos cookies para no romper la caché estática de Next.js
        setAll() {}
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            next: { revalidate: 60 } // Cachea la respuesta en RAM por 60 segundos
          })
        }
      }
    }
  )
}