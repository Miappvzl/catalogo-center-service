import { createBrowserClient } from '@supabase/ssr'

// Definimos el tipo global para evitar errores de TypeScript
declare global {
  var __supabaseInstance: ReturnType<typeof createBrowserClient> | undefined
}

export const getSupabase = () => {
  // 1. En el servidor (SSR), siempre creamos una nueva instancia limpia.
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // 2. En el cliente (Navegador), usamos una variable global única.
  // Si no existe, la creamos. Si ya existe, la reutilizamos.
  if (!globalThis.__supabaseInstance) {
    globalThis.__supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return globalThis.__supabaseInstance
}