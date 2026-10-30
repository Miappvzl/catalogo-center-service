import { createPublicCachedClient } from '@/utils/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Metadata } from 'next'
import DedicatedPromoClient from '@/components/promo/DedicatedPromoClient'

export const revalidate = 60

const createUncachedClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

const getStoreData = cache(async (slug: string) => {
  const supabase = createPublicCachedClient()
  const { data } = await supabase
    .from('stores')
    .select('*, payment_config, shipping_config, theme_config')
    .eq('slug', slug)
    .single()
  return data
})

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string; id: string }>
}): Promise<Metadata> {
  const { slug, id } = await params
  const store = await getStoreData(slug)
  if (!store) return { title: 'Tienda no encontrada | Preziso' }

  const supabase = createPublicCachedClient()
  const { data: promo } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .eq('store_id', store.id)
    .single()

  if (!promo) return { title: `${store.name} | Catálogo Oficial` }

  const ogImage = promo.image_url || store.logo_url || '/favicon.ico'
  const metaTitle = `${promo.title} | ${store.name}`
  const metaDescription = promo.tagline || `Aprovecha esta promoción exclusiva en ${store.name}.`

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: metaTitle }],
      type: 'website',
    },
    icons: { icon: store.logo_url || '/favicon.ico' }
  }
}

export default async function PromoPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string; id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug, id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const isPreview = resolvedSearchParams?.mode === 'preview'

  const store = await getStoreData(slug)
  if (!store) return notFound()

  const supabase = isPreview ? createUncachedClient() : createPublicCachedClient()

  // Carga paralela: Promoción activa, productos del comercio, tasas y demás campañas
  const [promoRes, productsRes, ratesRes, allPromosRes] = await Promise.all([
    supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .eq('store_id', store.id)
      .single(),
    supabase
      .from('products')
      .select(`
        *,
        product_variants(*),
        product_modifier_groups(
          display_order,
          modifier_groups(
            *,
            modifier_options(*)
          )
        )
      `)
      .eq('user_id', store.user_id)
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
    supabase.from('app_config').select('*').limit(1).single(),
    supabase.from('promotions').select('*').eq('store_id', store.id).eq('is_active', true)
  ])

  const currentPromo = promoRes.data
  if (!currentPromo || !currentPromo.is_active) return notFound()

  const resolvedGoogleMapsKey = ratesRes.data?.google_maps_api_key || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const storeWithMapsKey = {
    ...store,
    google_maps_api_key: resolvedGoogleMapsKey,
  }

  return (
    <DedicatedPromoClient
      store={storeWithMapsKey}
      promo={currentPromo}
      allProducts={productsRes.data || []}
      rates={ratesRes.data || { usd_rate: 0, eur_rate: 0 }}
      allPromotions={allPromosRes.data || []}
    />
  )
}