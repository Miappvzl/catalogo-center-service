// lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr'

// Variable para guardar la conexión única
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export const getSupabase = () => {
  // Si ya existe una conexión, la reutilizamos (Singleton)
  if (supabaseInstance) return supabaseInstance

  // Si no existe, creamos una nueva
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabaseInstance
}