// app/[slug]/page.tsx
import { createPublicCachedClient } from '@/utils/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import StoreInterface from '@/components/StoreInterface'
import StoreTracker from '@/components/StoreTracker'
import { notFound } from 'next/navigation'
import { Suspense, cache } from 'react'
import StoreLoadingSkeleton from './StoreLoadingSkeleton'
import RestaurantInterface from '@/components/restaurant/RestaurantInterface'
import { Metadata } from 'next'
import { Rocket } from 'lucide-react'

export const revalidate = 60

// Helper para bypass de caché directo en previews
const createUncachedClient = () => 
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

// Consulta memoizada (Producción - 0ms CPU vía CDN/Cache)
const getStoreData = cache(async (slug: string) => {
  const supabase = createPublicCachedClient()
  const { data } = await supabase
    .from('stores')
    .select('*, payment_config, shipping_config, theme_config')
    .eq('slug', slug)
    .single()
  return data
})

// Consulta Zero-Cache (Modo Live Preview)
async function getLiveStoreData(slug: string) {
  const supabase = createUncachedClient()
  const { data } = await supabase
    .from('stores')
    .select('*, payment_config, shipping_config, theme_config')
    .eq('slug', slug)
    .single()
  return data
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const store = await getStoreData(slug)

  if (!store) {
    return { title: 'Tienda no encontrada | Preziso', description: 'Esta tienda no existe.' }
  }

  const ogImage = store.hero_url || store.logo_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop'
  const metaTitle = `${store.name} | Catálogo Oficial`
  const metaDescription = `Explora el catálogo de ${store.name}. Haz tu pedido en línea de forma rápida y segura.`

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: `https://${slug}.preziso.shop`,
      siteName: store.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: metaTitle }],
      locale: 'es_VE',
      type: 'website',
    },
    icons: { icon: store.logo_url || '/favicon.ico' }
  }
}

export default async function StorePage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>,
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const isPreview = resolvedSearchParams?.mode === 'preview'

  const store = isPreview ? await getLiveStoreData(slug) : await getStoreData(slug)
  if (!store) return notFound()

  // Escudo de Reputación / Suscripción
  const targetDateString = store.subscription_ends_at || store.trial_ends_at
  const expirationDate = targetDateString ? new Date(targetDateString) : new Date()

  if (expirationDate < new Date()) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
        <div className="bg-white p-10 md:p-14 rounded-3xl border border-gray-200 max-w-md w-full relative z-10">
          <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Rocket size={32} strokeWidth={2} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-3">Mantenimiento</h1>
          <p className="text-gray-500 text-sm font-medium leading-relaxed">
            La tienda <b className="text-black">{store.name}</b> está recibiendo mejoras estructurales.
          </p>
        </div>
      </div>
    )
  }

  // Tokens de diseño
  const theme = store.theme_config || {}
  const colors = theme.colors || {}
  const isRestaurant = store.store_type === 'restaurant'

  const dbBackground = colors.background || (isRestaurant ? '#fafafa' : '#ffffff')
  const bgHex = dbBackground.toLowerCase()
  const isDark = bgHex !== '#ffffff' && bgHex !== '#fafafa' && bgHex !== '#f8f9fa'

  const themeVariables = {
    '--store-background': dbBackground,
    '--store-surface': colors.surface || '#FFFFFF',
    '--store-border': colors.border || (isRestaurant ? 'transparent' : '#E4E4E7'),
    '--store-text-main': colors.text_main || '#000000',
    '--store-primary': colors.primary || '#000000',
  } as React.CSSProperties

  return (
    <div
      style={{ ...themeVariables, backgroundColor: 'var(--store-background)' }}
      className={`min-h-screen font-sans antialiased ${isDark ? 'dark text-neutral-50' : 'text-neutral-900'}`}
    >
      {/* 🚀 Ahorro de escrituras BD: Tracker desactivado en modo preview */}
      {!isPreview && <StoreTracker storeId={store.id} />}

      <Suspense fallback={<StoreLoadingSkeleton />}>
        <DeferredStoreContent store={store} isPreview={isPreview} />
      </Suspense>
    </div>
  )
}

async function DeferredStoreContent({ store, isPreview }: { store: any, isPreview: boolean }) {
  const supabase = isPreview ? createUncachedClient() : createPublicCachedClient()

  const [productsResponse, ratesResponse, promotionsResponse] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        product_variants(*),
        product_modifier_groups(
          display_order,
          modifier_groups(
            id, name, is_required, min_selections, max_selections,
            modifier_options(id, name, price_adjustment_usd, is_available, display_order)
          )
        )
      `)
      .eq('user_id', store.user_id)
      .eq('status', 'active')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false }),

    supabase.from('app_config').select('*').limit(1).single(),
    supabase.from('promotions').select('*').eq('store_id', store.id).eq('is_active', true)
  ])

  const props = {
    store,
    products: productsResponse.data || [],
    rates: ratesResponse.data || { usd_rate: 0, eur_rate: 0 },
    promotions: promotionsResponse.data || []
  }

  return store.store_type === 'restaurant' 
    ? <RestaurantInterface {...props} /> 
    : <StoreInterface {...props} />
}