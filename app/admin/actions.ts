'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionState = {
  success: boolean
  message: string
  timestamp?: number
}

// Validación simple: solo permitimos 'usd' o 'eur'
const CurrencySchema = z.object({
  currency: z.enum(['usd', 'eur']),
})

export async function updateStoreCurrency(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
            try {
                cookiesToSet.forEach(({ name, value, options }) => 
                    cookieStore.set(name, value, options)
                )
            } catch {}
        },
      },
    }
  )

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'No autorizado' }

  // 2. Validación
  const currency = formData.get('currency')
  const validated = CurrencySchema.safeParse({ currency })

  if (!validated.success) {
    return { success: false, message: 'Moneda no válida' }
  }

  try {
    // 3. Actualizar la preferencia de la tienda (Tabla 'stores')
    const { error } = await supabase
      .from('stores')
      .update({ currency_type: validated.data.currency })
      .eq('user_id', user.id)

    if (error) throw error

    revalidatePath('/', 'layout') 
    
    return { 
      success: true, 
      message: `Moneda base cambiada a ${validated.data.currency.toUpperCase()}`,
      timestamp: Date.now()
    }

  } catch (error) {
    return { success: false, message: 'Error al actualizar preferencia' }
  }
}