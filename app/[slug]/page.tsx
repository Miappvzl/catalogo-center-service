

// app/[slug]/page.tsx
import { createClient } from '@/utils/supabaseServer'
import StoreInterface from '@/components/StoreInterface'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import StoreLoadingSkeleton from './StoreLoadingSkeleton' // 👈 Moveremos tu esqueleto aquí
import { Metadata } from 'next'
import { Rocket, Sparkle } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ... (Tu función generateMetadata se queda exactamente igual) ...

// ------------------------------------------------------------------
// 🚀 GENERADOR DINÁMICO DE OPENGRAPH Y METADATOS (SEO)
// ------------------------------------------------------------------
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  // Solo pedimos lo estrictamente necesario para el SEO (Súper rápido)
  const { data: store } = await supabase
    .from('stores')
    .select('name, logo_url, hero_url')
    .eq('slug', slug)
    .single()

  if (!store) {
    return {
      title: 'Tienda no encontrada | Preziso',
      description: 'Esta tienda no existe o no está disponible.',
    }
  }

  // Prioridad de imagen: 1. Banner (Hero) -> 2. Logo -> 3. Imagen por defecto de Preziso
  const ogImage = store.hero_url || store.logo_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop'

  return {

    
    title: `${store.name} | Catálogo Oficial`,
    description: `Explora el catálogo de ${store.name}. Haz tu pedido en línea de forma rápida, segura y sin fricciones.`,
    openGraph: {
      title: `${store.name} | Catálogo Oficial`,
      description: `Explora el catálogo de ${store.name}. Haz tu pedido en línea de forma rápida y segura.`,
      url: `https://${slug}.preziso.shop`, // <-- SEO de Élite con el subdominio
      siteName: store.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Catálogo de ${store.name}`,
        },
      ],
      locale: 'es_VE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${store.name} | Catálogo Oficial`,
      description: `Explora el catálogo oficial de ${store.name}.`,
      images: [ogImage],
    },
    icons: {
      icon: store.logo_url || '/favicon.ico',
    }
  }
}
// ------------------------------------------------------------------


export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // ------------------------------------------------------------------
  // ⚡ FASE 1: OBTENER IDENTIDAD DE LA TIENDA (Ultra Rápido)
  // ------------------------------------------------------------------
  const { data: store } = await supabase
    .from('stores')
    .select('*, payment_config, shipping_config, theme_config')
    .eq('slug', slug)
    .single()

  if (!store) return notFound()

  // ... (Tu lógica del Escudo de Reputación / Caducidad se queda exactamente igual) ...

 // ------------------------------------------------------------------
  // 🛡️ EL ESCUDO DE REPUTACIÓN (LA LÓGICA DE CADUCIDAD CORREGIDA)
  // ------------------------------------------------------------------
  // 1. Tomamos la fecha real de vencimiento (prioridad a suscripción paga, fallback a trial)
  const targetDateString = store.subscription_ends_at || store.trial_ends_at;
  const expirationDate = targetDateString ? new Date(targetDateString) : new Date();
  const now = new Date();

  // 2. Evaluamos caducidad pura: si la fecha ya pasó, se bloquea (sea trial o active)
  const isExpired = expirationDate < now;

  if (isExpired) {
    return (

      
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-black selection:text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gray-200/40 rounded-full blur-3xl -z-10"></div>

        <div className="bg-white p-10 md:p-14 rounded-3xl border border-gray-200 max-w-md w-full relative z-10">
          <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-gray-100 rounded-2xl animate-ping opacity-50"></div>
            <Rocket size={32} strokeWidth={2} className="text-black relative z-10 -mt-1 -mr-1" />
            <Sparkle size={16} className="text-gray-400 absolute bottom-4 left-4" />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-3">
            Mantenimiento
          </h1>
          <p className="text-gray-500 text-sm font-medium leading-relaxed">
            La tienda <b className="text-black">{store.name}</b> está recibiendo mejoras estructurales en su plataforma.
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
              Volveremos a estar en línea pronto
            </p>
          </div>
        </div>
      </div>
    )
  }

 // ------------------------------------------------------------------
  // 🎨 SISTEMA DE COLOR DINÁMICO (Mapeo exacto del Schema de Supabase)
  // ------------------------------------------------------------------
  const theme = store.theme_config || {}
  const colors = theme.colors || {}

  // Extraemos los colores reales del payload o aplicamos fallbacks limpios
  const dbBackground = colors.background || '#F8F9FA'
  const dbSurface = colors.surface || '#FFFFFF'
  const dbBorder = colors.border || '#E4E4E7'
  const dbText = colors.text_main || '#09090B'
  const dbPrimary = colors.primary || '#00cd61'

  // 🧠 DETECCIÓN INTELIGENTE DE MODO OSCURO:
  // Evaluamos si el fondo de la base de datos no es una tonalidad clara estándar.
  const bgHex = dbBackground.toLowerCase()
  const isDark = bgHex !== '#ffffff' && bgHex !== '#f8f9fa' && bgHex !== '#f9fafb'

  const themeVariables = {
    '--store-background': dbBackground,
    '--store-surface': dbSurface,
    '--store-border': dbBorder,
    '--store-text-main': dbText,
    '--store-primary': dbPrimary,
  } as React.CSSProperties

  return (
    <div 
      style={{
        ...themeVariables,
        backgroundColor: 'var(--store-background)', // Fuerza el color de fondo exacto (#0d0d0d) desde el primer frame
      }} 
      className={`min-h-screen font-sans antialiased ${isDark ? 'dark text-neutral-50' : 'text-neutral-900'}`}
    >
      <Suspense fallback={<StoreLoadingSkeleton />}>
        <DeferredStoreContent supabase={supabase} store={store} />
      </Suspense>
    </div>
  )
}

// ------------------------------------------------------------------
// 🛡️ COMPONENTE ASÍNCRONO DIFERIDO (Carga pesada en segundo plano)
// ------------------------------------------------------------------
async function DeferredStoreContent({ supabase, store }: { supabase: any, store: any }) {
  // Disparamos la carga pesada en paralelo en el servidor mientras el cliente ya ve el esqueleto inteligente
  const [productsResponse, ratesResponse, promotionsResponse] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('user_id', store.user_id)
      .eq('status', 'active')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false }),

    supabase
      .from('app_config')
      .select('*')
      .limit(1)
      .single(),

    supabase
      .from('promotions')
      .select('*')
      .eq('store_id', store.id)
      .eq('is_active', true)
  ])

  const products = productsResponse.data || []
  const rates = ratesResponse.data || { usd_rate: 0, eur_rate: 0 }
  const promotions = promotionsResponse.data || []

  return (
    <StoreInterface
      store={store}
      products={products}
      rates={rates}
      promotions={promotions}
    />
  )
}