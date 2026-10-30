'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  Package, 
  Clock, 
  SearchX
} from 'lucide-react'
import { normalizeThemeConfig, generateCssVariables } from '@/utils/themeAdapter'
import { getTenantHref } from '@/utils/navigation'
import { useCart } from '@/app/store/useCart'
import StoreHeader from '@/components/StoreHeader'
import ProductCard from '@/components/ProductCard'
import dynamic from 'next/dynamic'
import { getOptimizedUrl } from '@/utils/cdn'

const FloatingCheckout = dynamic(() => import('@/components/FloatingCheckout'), { ssr: false })
const ProductModal = dynamic(() => import('@/components/ProductModal'), { ssr: false })
const ProductFoodModal = dynamic(() => import('@/components/ui/ProductFoodModal'), { ssr: false })

interface DedicatedPromoClientProps {
  store: any
  promo: any
  allProducts: any[]
  rates: any
  allPromotions: any[]
}

// Micro-reloj minimalista que utiliza variables de la tienda
const MinimalCountdown = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calculate = () => {
      const now = Date.now()
      const diff = new Date(expiresAt).getTime() - now
      if (diff <= 0) {
        setTimeLeft('Expirado')
        return
      }
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60)) / (1000 * 60))
      const s = Math.floor((diff % 1000) / 1000)
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!timeLeft) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--store-surface-text)] border border-[var(--store-border)]/60 px-2.5 py-0.5 rounded-md">
      <Clock size={11} strokeWidth={1.5} />
      <span>{timeLeft}</span>
    </span>
  )
}

export default function DedicatedPromoClient({
  store,
  promo,
  allProducts,
  rates,
  allPromotions,
}: DedicatedPromoClientProps) {
  const router = useRouter()

  // 1. ELIMINACIÓN DEL HERO DE LA TIENDA PRINCIPAL
  // Sanitizamos el objeto store para que StoreHeader NO pinte el banner de portada
  const storeWithoutHero = useMemo(() => ({
    ...store,
    hero_url: '',
    theme_config: {
      ...store?.theme_config,
      layout: {
        ...store?.theme_config?.layout,
        hero_desktop_url: '',
        hero_mobile_url: '',
      }
    }
  }), [store])

  // Configuración de Tema
  const activeTheme = useMemo(() => normalizeThemeConfig(store.theme_config), [store.theme_config])
  const activeThemeVariables = useMemo(() => generateCssVariables(activeTheme), [activeTheme])

  // Moneda
  const isEur = store?.currency_type === 'eur'
  const activeRate = isEur ? Number(rates?.eur_rate || 0) : Number(rates?.usd_rate || 0)

  // Carrito y Modales
  const items = useCart(state => state.items)
  const orderHistory = useCart(state => state.orderHistory)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [favoriteIds] = useState<Set<string>>(new Set())

  // Filtrado de productos vinculados exclusivamente a esta campaña
  const promoProducts = useMemo(() => {
    const linkedIds = new Set((promo.linked_products || []).map((id: any) => String(id)))
    return allProducts.filter((p: any) => linkedIds.has(String(p.id)))
  }, [allProducts, promo.linked_products])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return promoProducts
    const term = search.toLowerCase().trim()
    return promoProducts.filter((p: any) => p.name?.toLowerCase().includes(term))
  }, [promoProducts, search])

  // Campañas restantes (excluye la campaña activa)
  const remainingPromotions = useMemo(() => {
    return allPromotions.filter((p: any) => String(p.id) !== String(promo.id))
  }, [allPromotions, promo.id])

  // Precios
  const getProductPricing = (product: any) => {
    const cashPrice = Number(product.usd_cash_price || 0)
    const markup = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + markup
    const priceInBs = listPrice * activeRate
    const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0
    return { cashPrice, priceInBs, discountPercent, hasDiscount: markup > 0 }
  }

  const handleOpenProduct = (product: any) => {
    if (store?.store_type === 'restaurant' || (product.product_modifier_groups && product.product_modifier_groups.length > 0)) {
      setSelectedProductForModal(product)
      setIsFoodModalOpen(true)
    } else {
      setSelectedProductForModal(product)
      setIsModalOpen(true)
    }
  }

  // Categorías
  const categories = useMemo(() => {
    const rawCats = allProducts.map(p => p.category?.trim()).filter(Boolean)
    return ['Todos', ...Array.from(new Set(rawCats))]
  }, [allProducts])

  // Helper de URL limpia inmune al doble slug
  const getCleanTenantUrl = (path: string) => {
    const isSubdomain = typeof window !== 'undefined' && 
      (window.location.host.startsWith(`${store.slug}.`) || 
      (window.location.host.includes('.') && !window.location.host.startsWith('www.')))
    return isSubdomain ? path : `/${store.slug}${path === '/' ? '' : path}`
  }

  return (
    <div
      className="min-h-screen bg-[var(--pz-bg)] pb-16 selection:bg-[var(--pz-primary)] selection:text-[var(--pz-primary-text)]"
      style={{
        ...activeThemeVariables,
        fontFamily: 'var(--font-body, var(--font-inter), sans-serif)',
      }}
    >
      {/* 1. STORE HEADER (Sin Hero) */}
      <StoreHeader
        layoutStyle={activeTheme.layout?.header_style || 'classic'}
        store={storeWithoutHero}
        products={allProducts}
        promotions={allPromotions}
        activeRate={activeRate}
        isEur={isEur}
        search={search}
        setSearch={setSearch}
        categories={categories}
        selectedCategory={'Todos'}
         setSelectedCategory={(cat) => {
          if (cat === 'Todos') {
            router.push(getCleanTenantUrl('/'))
          } else {
            // Usamos ?cat= en lugar de ?pasillo= para no disparar la interfaz VIP por error
            router.push(getCleanTenantUrl(`/?cat=${encodeURIComponent(cat.toLowerCase())}`))
          }
        }}
        isBoutiqueMode={false}
        exitBoutiqueMode={() => {}}
        currentUser={null}
        orderHistory={orderHistory}
        hasItems={items.length > 0}
        totalItems={items.reduce((acc, i) => acc + i.quantity, 0)}
        cartControls={null}
        setIsAuthModalOpen={setIsAuthModalOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        setIsRateModalOpen={setIsRateModalOpen}
        isStickyVisible={true}
        categoryScrollRef={null}
        handleCategoryScroll={() => {}}
        dynamicMask=""
        scrollCategories={() => {}}
        onProfileClick={() => router.push(getCleanTenantUrl('/passport'))}
      />

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="max-w-[1500px] mx-auto px-4 md:px-8 pt-6 md:pt-10 space-y-8">
        
        {/* 🚀 3. CABECERA EDITORIAL MINIMALISTA (SIN CAJAS GIGANTESCAS) */}
        <div className="border-b border-[var(--store-border)]/50 pb-6 space-y-3.5 text-left">
          
          {/* Botón de escape limpio */}
          <div>
            <Link
              href={getCleanTenantUrl('/')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors active:scale-95 group"
            >
              <ArrowLeft size={13} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Volver a la tienda</span>
            </Link>
          </div>

          <div className="space-y-2">
            {/* Badges y Reloj integrados con los colores del tema */}
            <div className="flex items-center gap-2 flex-wrap">
              {promo.promo_type === 'percentage' && promo.discount_percentage && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--store-primary)] text-[var(--store-primary-text)]">
                  -{promo.discount_percentage}% OFF
                </span>
              )}
              {promo.promo_type === 'bogo' && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--store-primary)] text-[var(--store-primary-text)]">
                  Lleva {promo.bogo_buy}, Paga {promo.bogo_pay}
                </span>
              )}
              <span className="text-xs font-mono text-[var(--store-surface-text)]">
                {promoProducts.length} {promoProducts.length === 1 ? 'artículo en oferta' : 'artículos en oferta'}
              </span>
              {promo.expires_at && (
                <MinimalCountdown expiresAt={promo.expires_at} />
              )}
            </div>

            {/* Título de Campaña en Tipografía del Tema */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--store-text-main)] leading-tight">
              {promo.title}
            </h1>

            {/* Subtítulo ligero */}
            {promo.tagline && (
              <p className="text-xs sm:text-sm text-[var(--store-surface-text)] font-normal leading-relaxed max-w-2xl">
                {promo.tagline}
              </p>
            )}
          </div>
        </div>

        {/* 4. GRILLA PURA DE PRODUCTOS */}
        <section className="space-y-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-[var(--store-surface)] rounded-2xl border border-[var(--store-border)]/50 p-8 space-y-3">
              <SearchX size={32} strokeWidth={1.5} className="mx-auto text-[var(--store-surface-text)] opacity-60" />
              <h3 className="text-sm font-semibold text-[var(--store-text-main)]">No hay productos que coincidan</h3>
              <p className="text-xs text-[var(--store-surface-text)]">Prueba con otro término de búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 lg:gap-8">
              {filteredProducts.map((product: any, idx: number) => {
                const pricing = getProductPricing(product)
                const isOutOfStock = (product.stock || 0) <= 0
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pricing={pricing}
                    onOpen={handleOpenProduct}
                    isOutOfStock={isOutOfStock}
                    index={idx}
                    isFavorite={favoriteIds.has(String(product.id))}
                    cardStyle={activeTheme.layout?.card_style || 'standard'}
                  />
                )
              })}
            </div>
          )}
        </section>

         {/* 🚀 5. MÁS CAMPAÑAS EN FORMATO MINI-BENTO (DISEÑO AWWWARDS / VISUAL DISCOVERY) */}
        {remainingPromotions.length > 0 && (
          <section className="pt-12 border-t border-[var(--store-border)]/40 space-y-6 text-left">
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] mb-1">
                Continúa explorando
              </span>
              <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--store-text-main)]">
                Más campañas de la tienda
              </h3>
            </div>

            {/* Grilla Mini-Bento: 2 cols en móvil, 3 en tablet, 4 en escritorio */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {remainingPromotions.map((otherPromo: any) => {
                // 🎨 Extracción inteligente de la paleta (Soporta colores antiguos HEX o nuevos JSON)
                let bg = otherPromo.bg_color || '#09090b';
                let titleColor = otherPromo.text_color || '#ffffff';
                let badgeBg = '#ffffff';
                let badgeText = '#09090b';

                if (typeof otherPromo.text_color === 'string' && otherPromo.text_color.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(otherPromo.text_color);
                    titleColor = parsed.title || titleColor;
                    badgeBg = parsed.badgeBg || badgeBg;
                    badgeText = parsed.badgeText || badgeText;
                  } catch {}
                }

                // Generación limpia del texto de descuento
                const discountText = otherPromo.promo_type === 'percentage' 
                  ? `-${otherPromo.discount_percentage}% OFF` 
                  : (otherPromo.promo_type === 'bogo' ? `${otherPromo.bogo_buy}x${otherPromo.bogo_pay}` : 'OFERTA');

                return (
                  <div
                    key={otherPromo.id}
                    onClick={() => router.push(getCleanTenantUrl(`/promo/${otherPromo.id}`))}
                    className="group relative w-full aspect-[4/5] sm:aspect-square rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-500 shadow-sm hover:shadow-xl"
                    style={{ backgroundColor: bg }}
                  >
                    {/* Imagen con Velo Inmersivo */}
                    {otherPromo.image_url ? (
                      <div className="absolute inset-0 z-0">
                        <Image
                          src={getOptimizedUrl(otherPromo.image_url)}
                          alt={otherPromo.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover opacity-70 group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                        {/* El degradado asegura que el texto se lea sin importar la foto */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/5 to-black/30 pointer-events-none" />
                    )}

                    {/* Micro-Badge Superior (Esquina izquierda) */}
                    <div className="absolute top-0 left-0 right-0 p-3.5 sm:p-4 z-10 flex justify-between items-start">
                      <span 
                        className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm backdrop-blur-md border border-white/20"
                        style={{ backgroundColor: badgeBg, color: badgeText }}
                      >
                        {discountText}
                      </span>
                    </div>

                    {/* Contenido Inferior: Título y Botón Magnético */}
                    <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-5 z-10 flex items-end justify-between gap-3">
                      <h4 
                        className="font-semibold text-sm sm:text-base md:text-lg leading-tight tracking-tight line-clamp-2 drop-shadow-md flex-1"
                        style={{ color: titleColor }}
                      >
                        {otherPromo.title}
                      </h4>
                      
                      <div 
                        className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 backdrop-blur-md border shadow-sm"
                        style={{ backgroundColor: `${titleColor}15`, borderColor: `${titleColor}40`, color: titleColor }}
                      >
                        <ArrowRight size={14} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </main>

      {/* Floating Checkout y Modales Globales */}
      <FloatingCheckout
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        currency={isEur ? 'eur' : 'usd'}
        phone={store.phone || '584120000000'}
        storeName={store.name}
        storeId={store.id}
        storeConfig={{ ...store, theme_config: activeTheme }}
        products={allProducts}
        promotions={allPromotions}
        affiliateCode={null}
        favoriteIds={favoriteIds}
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        currency={isEur ? 'eur' : 'usd'}
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        promotions={allPromotions}
        storeConfig={{ ...store, theme_config: activeTheme }}
        isFavorite={false}
      />

      <ProductFoodModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        product={selectedProductForModal}
      />
    </div>
  )
}