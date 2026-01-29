import { createClient } from '@/utils/supabaseServer'
import StoreInterface from '@/components/StoreInterface'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. OBTENER TIENDA
  const { data: store } = await supabase
    .from('stores')
    .select('*, payment_config, shipping_config') 
    .eq('slug', slug)
    .single()

  if (!store) {
    return notFound()
  }

  // 2. OBTENER PRODUCTOS
  const { data: products } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('user_id', store.user_id)
    .order('created_at', { ascending: false })

  // 3. OBTENER TASAS (CORREGIDO: Usando 'app_config')
  const { data: rates } = await supabase
    .from('app_config') // <--- AQUÍ ESTABA EL ERROR
    .select('*')
    .limit(1)
    .single()

  return (
    <StoreInterface 
      store={store} 
      products={products || []} 
      rates={rates || { usd_rate: 0, eur_rate: 0 }}
    />
  )
}