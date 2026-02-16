import { getSupabase } from './supabase-client'

// En lugar de crear un cliente nuevo con createClient(),
// reutilizamos la instancia única que ya creamos en el otro archivo.
export const supabase = getSupabase()