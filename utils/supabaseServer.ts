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

// 2. CLIENTE CACHEADO CON TAGS (ON-DEMAND PURGE): Habilita revalidación instantánea por tienda
export function createPublicCachedClient(tags: string[] = []) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {}
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            next: {
              revalidate: 60, // Fallback TTL en segundos
              tags: tags.length > 0 ? tags : undefined // 🚀 Tag dinámico para purgado por evento
            }
          })
        }
      }
    }
  )
}