'use server'
// 1. Asegúrate de tener esta importación al inicio de app/admin/actions.ts:
import { triggerCriticalStockAlert } from '@/utils/notificationTriggers';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TEMPLATES_REGISTRY } from '@/lib/templates-registry' // 🚀 FUENTE ÚNICA DE VERDAD

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
          } catch { }
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

// 2. Añade esta Server Action al final del archivo:
export async function checkAndTriggerStockAlert(data: {
  storeId: string;
  productId: number;
  productName: string;
  newStock: number;
  variantName?: string | null;
}) {
  await triggerCriticalStockAlert({
    storeId: data.storeId,
    productId: data.productId,
    productName: data.productName,
    newStock: data.newStock,
    variantName: data.variantName
  });
}

// 🚀 NUEVO CACHE BUSTER GENÉRICO
// Exponemos esta función para que otros componentes puedan matar la caché
// sin necesidad de enviar formularios ni recargar la moneda.
export async function revalidateStoreCache() {
  revalidatePath('/', 'layout')
}

// 🚀 NUEVA ACCIÓN: Alternar visibilidad del IVA en el catálogo
export async function toggleCatalogTaxVisibility(storeId: string, showTax: boolean): Promise<ActionState> {
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
          } catch { }
        },
      },
    }
  )

  // 1. Auth Check (Gatekeeper)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'No autorizado' }

  try {
    // 2. Mutación Zero-Trust: Actualizamos validando estrictamente el user_id
    const { error } = await supabase
      .from('stores')
      .update({ show_tax_in_catalog: showTax })
      .eq('id', storeId)
      .eq('user_id', user.id) // 🔒 CRÍTICO: Evita mutaciones cruzadas entre tenants

    if (error) throw error


    revalidatePath('/', 'layout')

    return {
      success: true,
      message: showTax ? 'Etiqueta de IVA activada' : 'Etiqueta de IVA oculta',
      timestamp: Date.now()
    }

  } catch (error) {
    return { success: false, message: 'Error al actualizar la configuración fiscal' }
  }
}

export async function switchStoreTypeAction(
  storeId: string,
  targetType: 'retail' | 'restaurant'
): Promise<ActionState> {
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
          } catch { }
        },
      },
    }
  )

  // 1. Verificacion de Autorizacion Estricta
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'No autorizado' }

  try {
    // 2. Obtener estado actual de la tienda
    const { data: currentStore, error: fetchErr } = await supabase
      .from('stores')
      .select('id, theme_config, store_hours, store_type')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !currentStore) {
      return { success: false, message: 'Tienda no encontrada o acceso denegado' }
    }

    if (currentStore.store_type === targetType) {
      return { success: true, message: 'El modelo de negocio ya está activo' }
    }

    const currentTheme = currentStore.theme_config || {}
    const currentLayout = currentTheme.layout || {}
    const currentColors = currentTheme.colors || {}
    
    let updatedStoreHours = currentStore.store_hours

    // 🚀 LECTURA DE LA PLANTILLA OBJETIVO DESDE EL REGISTRO MAESTRO
    const targetTemplateId = targetType === 'restaurant' ? 'gourmet_flow' : 'classic'
    const targetTemplateDef = TEMPLATES_REGISTRY.find(t => t.id === targetTemplateId) || TEMPLATES_REGISTRY[0]
    const baseDefaultConfig = targetTemplateDef.default_config

   // 🚀 HERENCIA SELECTIVA ESTRICTA: Clonamos la Identidad (Colores/Textos) y aplicamos la Estructura (Shapes/Layout)
    const updatedThemeConfig = {
      ...baseDefaultConfig,
      // 1. Clonación absoluta de colores y tipografías actuales
      colors: currentColors && Object.keys(currentColors).length > 0 ? currentColors : baseDefaultConfig.colors,
      typography: currentTheme.typography || baseDefaultConfig.typography,
      
      // 2. Inyección de las Formas (Pill, Sin bordes, etc.) obligatorias de la nueva plantilla
      shapes: baseDefaultConfig.shapes,
      
      // 3. Fusión Híbrida del Layout
      layout: {
        ...baseDefaultConfig.layout,
        // Preservamos el branding multimedia e institucional
        logo_url: currentLayout.logo_url || '',
        logo_type: currentLayout.logo_type || 'png_transparent',
        hero_desktop_url: currentLayout.hero_desktop_url || '',
        hero_mobile_url: currentLayout.hero_mobile_url || '',
        hero_subtitle: currentLayout.hero_subtitle || baseDefaultConfig.layout.hero_subtitle,
        greeting_text: currentLayout.greeting_text || baseDefaultConfig.layout.greeting_text,
        slogan_text: currentLayout.slogan_text || baseDefaultConfig.layout.slogan_text,
        hero_button_text: currentLayout.hero_button_text || baseDefaultConfig.layout.hero_button_text,
      }
    }
    if (targetType === 'restaurant') {
      // Inicializar horarios si no existen
      if (!updatedStoreHours || !updatedStoreHours.schedule) {
        updatedStoreHours = {
          timezone: 'America/Caracas',
          is_temporarily_closed: false,
          schedule: {
            monday: { isOpen: true, open: '09:00', close: '22:00' },
            tuesday: { isOpen: true, open: '09:00', close: '22:00' },
            wednesday: { isOpen: true, open: '09:00', close: '22:00' },
            thursday: { isOpen: true, open: '09:00', close: '22:00' },
            friday: { isOpen: true, open: '09:00', close: '23:59' },
            saturday: { isOpen: true, open: '09:00', close: '23:59' },
            sunday: { isOpen: false, open: '00:00', close: '00:00' }
          }
        }
      }
    }

    // 3. Mutacion Atomica en Base de Datos
    const { error: updateErr } = await supabase
      .from('stores')
      .update({
        store_type: targetType,
        theme_config: updatedThemeConfig,
        store_hours: updatedStoreHours
      })
      .eq('id', storeId)
      .eq('user_id', user.id)

    if (updateErr) throw updateErr

    // 4. Purgar Cache del Servidor en Next.js
    revalidatePath('/', 'layout')

    return {
      success: true,
      message: targetType === 'restaurant' 
        ? 'Modo Restaurante activado con éxito' 
        : 'Modo Comercio General activado con éxito',
      timestamp: Date.now()
    }

  } catch (error: any) {
    console.error('Error en switchStoreTypeAction:', error)
    return { success: false, message: error.message || 'Error al cambiar modelo de negocio' }
  }
}