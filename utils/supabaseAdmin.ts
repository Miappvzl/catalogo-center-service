// utils/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// ADVERTENCIA: Este cliente NUNCA debe usarse en componentes del Frontend 
// ni exponerse al cliente. Solo usar en Route Handlers (/api) y Edge Functions.
export const getSupabaseAdmin = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Faltan variables de entorno para el Service Role de Supabase.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};