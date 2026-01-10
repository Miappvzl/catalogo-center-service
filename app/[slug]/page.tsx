// Esto obliga a Next.js a regenerar la página en cada visita
export const revalidate = 0; 
export const dynamic = 'force-dynamic';

import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js' 
import StoreInterface from '@/components/StoreInterface' // <--- Importamos el nuevo componente

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 1. Buscamos Tasas
async function getExchangeRates() {
  const { data } = await supabase.from('app_config').select('usd_rate, eur_rate').eq('id', 1).single()
  return data
}

// 2. Buscamos Tienda
async function getStoreOwner(slug: string) {
  const { data: store } = await supabase
    .from('stores')
    .select('user_id, name, currency_type, phone, payment_methods, logo_url') 
    .eq('slug', slug)
    .single()
  return store
}

// 3. Buscamos Productos 
async function getProducts(userId: string) {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: false })
  
  if (error) {
    console.error("Error SQL buscando productos:", error)
    return [] 
  }
  return products
}

// --- METADATA ---
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const store = await getStoreOwner(slug)

  if (!store) {
    return {
      title: 'Tienda no encontrada',
      description: 'El catálogo que buscas no existe o ha sido eliminado.'
    }
  }

  const images = store.logo_url ? [store.logo_url] : []

  return {
    title: `${store.name} | Catálogo Online`,
    description: `¡Hola! Revisa el catálogo de productos de ${store.name} y haz tu pedido directamente por WhatsApp.`,
    openGraph: {
      title: store.name,
      description: `Catálogo digital de ${store.name}. Precios actualizados y pedidos vía WhatsApp.`,
      type: 'website',
      images: images,
    }
  }
}

// --- COMPONENTE PRINCIPAL (SERVIDOR) ---
export default async function DynamicStore({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug

  // Ejecutamos las peticiones en paralelo para que cargue más rápido
  const [store, rates] = await Promise.all([
    getStoreOwner(slug),
    getExchangeRates()
  ])

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-gray-600">Tienda no encontrada.</p>
      </div>
    )
  }

  const products = await getProducts(store.user_id) || []

  // Le pasamos todo al componente Cliente para que maneje la interactividad
  return (
    <StoreInterface 
        store={store} 
        products={products} 
        rates={rates} 
    />
  )
}