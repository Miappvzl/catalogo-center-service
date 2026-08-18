import { createClient } from '@/utils/supabaseServer'
import { redirect, notFound } from 'next/navigation'
import ProductEditor from '@/components/ProductEditor'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 1. ESCUDO DE PARÁMETROS: Validamos que el ID sea estrictamente un número entero (BigInt)
  const numericId = Number(id)
  if (!id || isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
    return notFound() // Si el bot pasa "undefined" o texto, lo cortamos en 0ms
  }

  // 2. Cliente de Supabase estandarizado
  const supabase = await createClient()

  // 3. Verificación de Autenticación con Redirección real (Corta rastreo de bots)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 4. Consultas en paralelo protegidas
  const [configRes, storeRes] = await Promise.all([
    supabase.from('app_config').select('usd_rate, eur_rate').eq('id', 1).single(),
    supabase.from('stores').select('id, currency_type, fiscal_profile').eq('user_id', user.id).single()
  ])

  // Si el usuario no tiene tienda vinculada, no lo dejamos pasar al editor
  if (!storeRes.data) {
    redirect('/admin')
  }

  return (
    <ProductEditor 
      productId={id} 
      rates={{ 
        usd: configRes.data?.usd_rate || 0, 
        eur: configRes.data?.eur_rate || 0 
      }}
      storeSettings={{
        id: storeRes.data.id,
        currency: storeRes.data.currency_type || 'usd',
        fiscalProfile: storeRes.data.fiscal_profile || 'informal'
      }}
    />
  )
}