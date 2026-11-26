'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react'
import { Search, SearchX, ShoppingBag, X, Plus, ImageIcon, ShoppingCart, LayoutGrid, ShieldCheck, Zap, Circle, ArrowUpRight, Tag, FileText, ArrowRight, Receipt, ChevronRight, ChevronLeft, UserCircle, Sparkles, Clock, Gift, MapPin, CreditCard, Truck, MessageCircle, Store } from 'lucide-react'
import { Icon } from '@iconify/react'
import { MrwIcon } from '@/components/ui/icons/MrwIcon'
import { ZoomIcon } from '@/components/ui/icons/ZoomIcon'
import { TealcaIcon } from '@/components/ui/icons/TealcaIcon'
import { useCart } from '@/app/store/useCart'
import { normalizeThemeConfig, generateCssVariables } from '@/utils/themeAdapter'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { isValidUUID } from '@/utils/validations'
import NumberTicker from './NumberTicker'
import ProductCard from './ProductCard'
import { getOptimizedUrl } from '@/utils/cdn'
import { MOCK_DATA } from '@/lib/mock-data'
import { TEMPLATES_REGISTRY } from '@/lib/templates-registry'
import Image from 'next/image'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'

// 🚀 ELITE: Carga Diferida (Lazy Loading). Los modales pesados no consumen RAM hasta ser abiertos
const ProductModal = dynamic(() => import('./ProductModal'), { ssr: false })
const FloatingCheckout = dynamic(() => import('./FloatingCheckout'), { ssr: false })
const ProductFoodModal = dynamic(() => import('./ui/ProductFoodModal'), { ssr: false })
const CustomerAuth = dynamic(() => import('@/components/passport/CustomerAuth'), { ssr: false })
import { getTenantHref } from '@/utils/navigation' // 🚀 IMPORTACIÓN INTEGRADA
import BCVLogo from '@/components/icons/BCVLogo' // 🚀 Importación del logo modular
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import StoreHeader from './StoreHeader'
import PromotionBanner from './PromotionBanner'
import CollectionCard from './CollectionCard'
import PromotionShowroom from './PromotionShowroom'
import CatalogToolbar from './CatalogToolBar'




const CategoryPill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 md:px-6 md:py-2 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] text-[11px] md:text-xs font-bold tracking-wide transition-all duration-300 border active:scale-95 whitespace-nowrap ${active
      ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]'
      : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)]/40 hover:bg-[var(--store-surface)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
      }`}
  >
    {label}
  </button>
)

// 🚀 MICRO-COMPONENTE OPTIMIZADO: Reloj Polimórfico
const PromoCountdown = ({ expiresAt, color, variant = 'standard' }: { expiresAt: string, color: string, variant?: 'standard' | 'industrial' | 'editorial' }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const target = new Date(expiresAt).getTime()
      const distance = target - now

      if (distance < 0) {
        setTimeLeft('Expirado')
        clearInterval(interval)
        return
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!timeLeft) return null;

  if (variant === 'industrial') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 bg-black/10" style={{ borderColor: `${color}40`, color: color }}>
        <div className="w-2 h-2 shrink-0 animate-pulse" style={{ backgroundColor: timeLeft !== 'Expirado' ? color : 'transparent' }}></div>
        <span className="text-[11px] font-mono font-black tabular-nums tracking-widest leading-none mt-px">
          {timeLeft}
        </span>
      </div>
    )
  }

  if (variant === 'editorial') {
    return (
      <div className="inline-flex items-center gap-2 opacity-80" style={{ color: color }}>
        <Clock size={12} strokeWidth={1.5} />
        <span className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.15em] leading-none mt-px">
          {timeLeft !== 'Expirado' ? `Acceso expira en ${timeLeft}` : 'Acceso Expirado'}
        </span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md transition-all ml-1 md:ml-3" style={{ borderColor: `${color}30`, backgroundColor: `${color}10`, color: color }}>
      <div className="relative flex h-1.5 w-1.5 shrink-0">
        {timeLeft !== 'Expirado' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }}></span>}
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: color }}></span>
      </div>
      <span className="text-[10px] md:text-[11px] font-bold tabular-nums tracking-widest leading-none mt-[1px]">
        {timeLeft}
      </span>
    </div>
  )
}

// 🚀 MICRO-COMPONENTE AISLADO: HUD Central (120 FPS GPU Transform + Opacity, Zero Animated Filter Blur)
const CartHUDIndicator = memo(() => {
  const [hudData, setHudData] = useState({ visible: false, quantity: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleHUD = (e: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setHudData({ visible: true, quantity: e.detail.quantity });
      timeoutRef.current = setTimeout(() => setHudData({ visible: false, quantity: 0 }), 1400);
    };
    document.addEventListener('showCartHUD', handleHUD);
    return () => document.removeEventListener('showCartHUD', handleHUD);
  }, []);

  return (
    <AnimatePresence>
      {hudData.visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.84 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 24, stiffness: 340 }}
          onClick={() => {
            document.dispatchEvent(new CustomEvent('toggleCartDrawer'));
            setHudData({ visible: false, quantity: 0 });
          }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999999] pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 flex flex-col items-center justify-center w-36 h-36 bg-[var(--store-primary)]/95 backdrop-blur-md rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[0_24px_48px_rgba(0,0,0,0.35)] border border-white/20 transform-gpu"
        >
          <svg className="w-14 h-14 text-[var(--store-primary-text)] mb-2 drop-shadow-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }} d="M20 6L9 17l-5-5" />
          </svg>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, type: "spring", damping: 18 }} className="bg-white/20 px-3 py-1 rounded-full border border-white/10">
            <span className="text-[var(--store-primary-text)] font-black text-xs tracking-widest tabular-nums">+{hudData.quantity} UND</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
CartHUDIndicator.displayName = 'CartHUDIndicator';

// 🚀 MICRO-COMPONENTE AISLADO: Reloj de Campaña Flash (Evita re-renderizar toda la tienda cada 1s)
const FlashCampaignBanner = memo(({ isBoutiqueMode, expQuery }: { isBoutiqueMode: boolean; expQuery: string | null }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expQuery) return;
    const targetTime = parseInt(expQuery, 10);

    const updateTimer = () => {
      const distance = targetTime - Date.now();
      if (distance <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00:00');
        return;
      }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expQuery]);

  return (
    <AnimatePresence>
      {isBoutiqueMode && expQuery && !isExpired && timeLeft && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-center gap-3 overflow-hidden"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Venta Flash expira en:</span>
          <span className="font-mono font-black text-sm tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
            {timeLeft}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
FlashCampaignBanner.displayName = 'FlashCampaignBanner';




// 🚀 INYECCIÓN: BANNER DE RECUPERACIÓN DE PRESUPUESTO (CORREGIDO)
const QuoteRecoveryBanner = ({ currentSlug }: { currentSlug: string }) => {
  const [savedQuote, setSavedQuote] = useState<{ id: string, total: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('preziso_pending_quote')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        // Validamos que el presupuesto pertenezca a la tienda actual
        if (data.slug === currentSlug) {
          setSavedQuote(data)
          setIsVisible(true) // Dispara la animación de entrada
        }
      } catch (e) { }
    }
  }, [currentSlug])



  // Función manejadora para un cierre suave
  const handleClose = () => {
    setIsVisible(false) // 1. Dispara la animación de salida

    // 2. Espera 300ms a que termine la animación para destruir los datos
    setTimeout(() => {
      localStorage.removeItem('preziso_pending_quote')
      setSavedQuote(null)
    }, 300)
  }



  return (
    <AnimatePresence>
      {isVisible && savedQuote && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-[100] shadow-xl origin-top"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-full shrink-0"><FileText size={16} /></div>
            <div className="flex flex-col min-w-0">
              <p className="font-bold uppercase tracking-widest text-[9px] text-gray-400">Cotización Pendiente</p>
              <p className="font-medium text-xs truncate">Monto a pagar: <span className="font-black text-white">${Number(savedQuote.total).toFixed(2)}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/quote/${savedQuote.id}`} /* 🚀 CORRECCIÓN: Ruta relativa limpia sin duplicar el slug */
              className="bg-white text-black px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center gap-1 shadow-sm active:scale-95"
            >
              Retomar <ArrowRight size={12} strokeWidth={3} />
            </Link>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white transition-colors active:scale-90">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface Props {
  store: any;
  products: any[];
  rates: any;
  promotions?: any[];
  collections?: any[]; // 🚀 PROPS DE COLECCIONES ACTIVAS
}

export default function StoreInterface({ store: initialStore, products: initialProducts, rates, promotions = [], collections = [] }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() // 👈 1. Inyecta este nuevo hook
  // ... (tus hooks de searchParams) ...

  // 🚀 1. EL INTERCEPTOR DE HOLOGRAMAS (MOCK HYDRATION)
  const isPreviewMode = searchParams?.get('mode') === 'preview';
  const isMockMode = initialProducts.length === 0 && isPreviewMode;

  // 🚀 2. CEREBRO DE TOKENS (Con Inyección Dinámica de Banners Duales)
  const [liveConfig, setLiveConfig] = useState<any>(() => normalizeThemeConfig(initialStore?.theme_config))

  const activeTheme = useMemo(() => {
    const baseTheme = normalizeThemeConfig(liveConfig || initialStore?.theme_config);

    // 🚀 PRIORIDAD EN VIVO (0ms vía postMessage): Lo que se edita en el Customizador manda sobre todo
    const resolvedLogoUrl = liveConfig?.layout?.logo_url || baseTheme.layout?.logo_url || initialStore?.theme_config?.layout?.logo_url || initialStore?.logo_url;
    const resolvedLogoType = liveConfig?.layout?.logo_type || baseTheme.layout?.logo_type || initialStore?.theme_config?.layout?.logo_type || 'png_transparent';
    const resolvedHeroDesktop = liveConfig?.layout?.hero_desktop_url || baseTheme.layout?.hero_desktop_url || initialStore?.theme_config?.layout?.hero_desktop_url || initialStore?.hero_url;
    const resolvedHeroMobile = liveConfig?.layout?.hero_mobile_url || baseTheme.layout?.hero_mobile_url || initialStore?.theme_config?.layout?.hero_mobile_url;
    const resolvedHeroCta = liveConfig?.layout?.hero_cta || baseTheme.layout?.hero_cta || initialStore?.theme_config?.layout?.hero_cta;
    const resolvedCardMedia = liveConfig?.layout?.card_media || baseTheme.layout?.card_media || initialStore?.theme_config?.layout?.card_media;

    if (isMockMode) {
      const template = TEMPLATES_REGISTRY.find(t => t.id === baseTheme.template_id);
      const niche = template ? template.niche : 'general';
      const mockData = MOCK_DATA[niche];

      if (mockData) {
        const bg = (baseTheme.colors?.background || '#ffffff').toLowerCase();
        const isDarkTheme = bg === '#000000' || bg === '#0d0d0d' || bg === '#1f1f1f' || bg === '#171717' || baseTheme.template_id === 'hardware_dense' || baseTheme.template_id === 'streetwear_bold';

        baseTheme.layout = {
          ...baseTheme.layout,
          logo_type: resolvedLogoType,
          logo_url: resolvedLogoUrl || mockData.logo || (isDarkTheme ? '/tu-logo-transparente-claro.webp' : '/tu-logo-transparente-oscuro.webp'),
          hero_desktop_url: resolvedHeroDesktop || mockData.hero_desktop,
          hero_mobile_url: resolvedHeroMobile || mockData.hero_mobile,
          hero_cta: resolvedHeroCta,
          card_media: resolvedCardMedia || baseTheme.layout.card_media,
        };
      }
    } else {
      baseTheme.layout = {
        ...baseTheme.layout,
        logo_type: resolvedLogoType,
        logo_url: resolvedLogoUrl || '',
        hero_desktop_url: resolvedHeroDesktop || '',
        hero_mobile_url: resolvedHeroMobile || '',
        hero_cta: resolvedHeroCta,
        card_media: resolvedCardMedia || baseTheme.layout.card_media,
      };
    }
    return baseTheme;
  }, [liveConfig, initialStore?.theme_config, initialStore?.logo_url, initialStore?.hero_url, isMockMode]);

  const activeThemeVariables = useMemo(() => generateCssVariables(activeTheme), [activeTheme]);

  const currentNiche = useMemo(() => {
    const template = TEMPLATES_REGISTRY.find(t => t.id === activeTheme.template_id);
    return template ? template.niche : 'general';
  }, [activeTheme.template_id]);

  const products = isMockMode && MOCK_DATA[currentNiche] ? MOCK_DATA[currentNiche].products : initialProducts;

  // 🚀 3. INTERCEPTOR DE PROMOCIONES VIGENTES (AUTO-OCULTA VENCIDAS)
  const displayPromotions = useMemo(() => {
    if (isMockMode && MOCK_DATA[currentNiche]?.promotion) {
      return [{
        ...MOCK_DATA[currentNiche].promotion,
        id: 'mock-promo-1',
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toString(),
      }];
    }
    const now = Date.now();
    return (promotions || []).filter((p: any) => {
      if (!p.is_active) return false;
      if (p.expires_at && new Date(p.expires_at).getTime() <= now) return false;
      return true;
    });
  }, [isMockMode, currentNiche, promotions]);

  // 🚀 CONEXIÓN EN TIEMPO REAL UNIVERSAL CON STOREHEADER (Con o sin MockMode)
  const store = useMemo(() => {
    if (!initialStore) return initialStore;
    return {
      ...initialStore,
      logo_url: activeTheme.layout.logo_url || initialStore.logo_url,
      hero_url: activeTheme.layout.hero_desktop_url || initialStore.hero_url,
      theme_config: activeTheme,
    };
  }, [initialStore, activeTheme]);



  // LÓGICA BOUTIQUE, CAMPAÑAS Y COLECCIONES (SINCRONIZACIÓN REACTIVA)
  const pasilloQuery = searchParams?.get('pasillo')
  const expQuery = searchParams?.get('exp')
  const collectionQuery = searchParams?.get('c')
  const promoQuery = searchParams?.get('promo')
  const catQuery = searchParams?.get('cat') // 🚀 Nuevo lector de navegación silenciosa

  const [isBoutiqueMode, setIsBoutiqueMode] = useState(!!pasilloQuery)
  const [campaignContext, setCampaignContext] = useState<string | null>(pasilloQuery || null)

  // FUENTE DE LA VERDAD REACTIVA
  const [activeCollectionSlug, setActiveCollectionSlug] = useState<string | null>(collectionQuery || null)
  const [activePromoId, setActivePromoId] = useState<string | null>(promoQuery || null)

  useEffect(() => {
    setActiveCollectionSlug(searchParams?.get('c') || null)
  }, [searchParams, collectionQuery])

  useEffect(() => {
    setActivePromoId(searchParams?.get('promo') || null)
  }, [searchParams, promoQuery])



  // 🚀 RESOLUCIÓN EXACTA DE LA CAMPAÑA ACTIVA
  const selectedPromoData = useMemo(() => {
    if (!activePromoId || !displayPromotions || displayPromotions.length === 0) return null
    return displayPromotions.find((p: any) => String(p.id) === String(activePromoId)) || null
  }, [activePromoId, displayPromotions])

  // 🚀 PROMOCIONES RESTANTES (Excluye la que ya está abierta para cross-selling limpio)
  const remainingPromotions = useMemo(() => {
    if (!selectedPromoData) return displayPromotions
    return displayPromotions.filter((p: any) => String(p.id) !== String(selectedPromoData.id))
  }, [displayPromotions, selectedPromoData])

  // Función de escape de la campaña hacia el catálogo general
  const exitPromoMode = () => {
    setActivePromoId(null)
    setCurrentPage(1)
    const url = new URL(window.location.href)
    url.searchParams.delete('promo')
    window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''))
    if (catalogTopRef.current) {
      const y = catalogTopRef.current.getBoundingClientRect().top + window.scrollY - 130
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
    }
  }

  // Navegación hacia una campaña dedicada
  const handleSelectPromo = (promoId: string) => {
    setActivePromoId(promoId)
    setCurrentPage(1)
    const url = new URL(window.location.href)
    url.searchParams.set('promo', promoId)
    window.history.pushState(null, '', url.pathname + url.search)
    setTimeout(() => {
      const anchor = document.getElementById('promo-view-anchor') || catalogTopRef.current
      if (anchor) {
        const yOffset = -130
        const y = anchor.getBoundingClientRect().top + window.scrollY + yOffset
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
      }
    }, 60)
  }

 // 🚀 ESTADO DE MONTAJE SEGURO
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const isDarkTheme = store?.theme === "dark" || store?.isDark === true;
  const [activePromo, setActivePromo] = useState<any>(null)
  const [featuredScrollStatus, setFeaturedScrollStatus] = useState({ left: false, right: true })
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const initialCat = pasilloQuery || catQuery
    return initialCat ? (initialCat.charAt(0).toUpperCase() + initialCat.slice(1).toLowerCase()) : 'Todos'
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)
  const [isStickyVisible, setIsStickyVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const forceHeaderVisibleRef = useRef(0)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured')
  const [isMobile, setIsMobile] = useState(true)
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null)
  const [showPromoModal, setShowPromoModal] = useState(false)

  // 🚀 LECTURA DE CONFIGURACIÓN FISCAL PARA EL CATÁLOGO
  const showTaxInCatalog = store?.show_tax_in_catalog === true && store?.fiscal_profile !== 'informal';
  const taxPercentage = store?.default_tax_percentage || 16;

  const exitBoutiqueMode = useCallback(() => {
    router.replace(pathname, { scroll: false })
    setIsBoutiqueMode(false)
    setSelectedCategory('Todos')
    setSearch('')
  }, [router, pathname])

  // 2. REFS DE CONTROL DEL DOM
  const carouselRef = useRef<HTMLDivElement>(null)
  const isCarouselPausedRef = useRef(false)
  const featuredCarouselRef = useRef<HTMLDivElement>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const catalogTopRef = useRef<HTMLDivElement>(null)

  // 3. HOOKS DE PAQUETES EXTERNOS / SELECTORES ATÓMICOS DE ZUSTAND
  const supabase = useMemo(() => getSupabase(), [])
  const totalItems = useCart(state => state.items.reduce((acc, i) => acc + i.quantity, 0))
  const orderHistory = useCart(state => state.orderHistory)
  const addItem = useCart(state => state.addItem)

  const [giftNotification, setGiftNotification] = useState<{
    show: boolean;
    type: 'success' | 'exhausted';
    title: string;
    description: string;
  } | null>(null);
  const cartControls = useAnimation()

  // 4. MEMOS Y CONSTANTES DE DERIVACIÓN
  const hasItems = totalItems > 0
  const isEur = store?.currency_type === 'eur'
  const activeRate = isEur ? Number(rates?.eur_rate || 0) : Number(rates?.usd_rate || 0)
  const normalizedRates = useMemo(() => ({
    usd: Number(rates?.usd_rate || 0),
    eur: Number(rates?.eur_rate || 0)
  }), [rates?.usd_rate, rates?.eur_rate])

  // 5. MÉTODOS DE AYUDA Y AUXILIARES (CON GUARDIÁN DE IGUALDAD EN SCROLL)
  const checkFeaturedScrollStatus = useCallback(() => {
    if (!featuredCarouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = featuredCarouselRef.current;
    const canScrollLeft = scrollLeft > 4;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - 4;
    setFeaturedScrollStatus(prev =>
      prev.left === canScrollLeft && prev.right === canScrollRight
        ? prev
        : { left: canScrollLeft, right: canScrollRight }
    );
  }, []);

  const scrollFeatured = useCallback((dir: 'left' | 'right') => {
    if (featuredCarouselRef.current) {
      const container = featuredCarouselRef.current;
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: dir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }, []);

  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const container = categoryScrollRef.current;
    const scrollAmount = (container.clientWidth * 0.6) || 300;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  const normalizeCategory = (cat: string) => {
    if (!cat) return ""
    const trimmed = cat.trim().toLowerCase()
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }

  const categories = useMemo(() => {
    const rawCats = products.map(p => normalizeCategory(p.category)).filter(Boolean)
    const uniqueCats = Array.from(new Set(rawCats))
    const savedOrder = store?.categories_order || []
    const sortedCats = uniqueCats.sort((a, b) => {
      const indexA = savedOrder.indexOf(a)
      const indexB = savedOrder.indexOf(b)
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.localeCompare(b)
    })
    return ['Todos', ...sortedCats]
  }, [products, store?.categories_order])

  // 🚀 RESOLUCIÓN ESTRICTA Y SANEADA DE COLECCIÓN ACTIVA
  const selectedCollectionData = useMemo(() => {
    if (!activeCollectionSlug || !collections || collections.length === 0) return null;
    return collections.find((c: any) => String(c.slug).toLowerCase() === String(activeCollectionSlug).toLowerCase()) || null;
  }, [activeCollectionSlug, collections]);

  // 🚀 FILTRADO REACTIVO EN VIVO: COLECCIONES, CAMPAÑAS, PRIORIZACIÓN DE STOCK Y ORDENAMIENTO
  const { featured: featuredProducts, standard: standardProducts } = useMemo(() => {
    let sourcePool = products;

    // Helper determinista para conocer el stock real (producto simple o suma de variantes)
    const getAvailableStock = (item: any): number => {
      if (Array.isArray(item.product_variants) && item.product_variants.length > 0) {
        return item.product_variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
      }
      return Number(item.stock || 0);
    };

    // A. Filtro si hay una colección activa
    if (selectedCollectionData && Array.isArray(selectedCollectionData.collection_items)) {
      const allowedProductIds = new Set<string>();
      const allowedCategories = new Set<string>();
      const allowedPromoIds = new Set<string>();

      selectedCollectionData.collection_items.forEach((it: any) => {
        if (it.item_type === 'product' && it.product_id !== null && it.product_id !== undefined) {
          allowedProductIds.add(String(it.product_id));
        }
        if (it.item_type === 'category' && it.category_name) {
          allowedCategories.add(String(it.category_name).toLowerCase().trim());
        }
        if (it.item_type === 'promotion' && it.promotion_id) {
          allowedPromoIds.add(String(it.promotion_id));
        }
      });

      displayPromotions.forEach((pr: any) => {
        if (allowedPromoIds.has(String(pr.id))) {
          (pr.linked_products || []).forEach((pid: any) => allowedProductIds.add(String(pid)));
        }
      });

      sourcePool = products.filter((p: any) => {
        const pid = String(p.id);
        const pcat = String(p.category || '').toLowerCase().trim();
        return allowedProductIds.has(pid) || allowedCategories.has(pcat);
      });
    }

    // B. Filtro si hay una campaña promocional activa (?promo=ID)
    if (selectedPromoData) {
      const linkedProductIds = new Set((selectedPromoData.linked_products || []).map((id: any) => String(id)));
      sourcePool = products.filter((p: any) => linkedProductIds.has(String(p.id)));
    }

    const baseFiltered = sourcePool.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const productCatClean = normalizeCategory(p.category);
      const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // C. Ordenamiento inteligente: Productos con stock siempre primero + Criterio del comprador
    const sortedStandard = [...baseFiltered].sort((a: any, b: any) => {
      const aHasStock = getAvailableStock(a) > 0;
      const bHasStock = getAvailableStock(b) > 0;

      // Regla de Oro CRO: Nunca mostrar agotados antes que productos disponibles
      if (aHasStock !== bHasStock) {
        return aHasStock ? -1 : 1;
      }

      if (sortBy === 'price_asc') {
        return Number(a.usd_cash_price || 0) - Number(b.usd_cash_price || 0);
      }
      if (sortBy === 'price_desc') {
        return Number(b.usd_cash_price || 0) - Number(a.usd_cash_price || 0);
      }

      return 0;
    });

    // Ocultamos "Lo más vendido" cuando el cliente está en una colección o campaña dedicada
    const featured = (selectedCollectionData || selectedPromoData)
      ? []
      : baseFiltered
        .filter((p: any) => p.is_featured)
        .sort((a: any, b: any) => (getAvailableStock(b) > 0 ? 1 : 0) - (getAvailableStock(a) > 0 ? 1 : 0));

    return { featured, standard: sortedStandard };
  }, [products, debouncedSearch, selectedCategory, selectedCollectionData, selectedPromoData, displayPromotions, sortBy]);


// 🚀 INTERCEPTOR NATIVO: ENLACE MÁGICO (?add=ID)
  useEffect(() => {
    const magicProductId = searchParams?.get('add');
    if (magicProductId && products && products.length > 0 && isMounted) {
      const giftProduct = products.find((p) => String(p.id) === String(magicProductId));

      if (giftProduct) {
        const hasVariants = giftProduct.product_variants && giftProduct.product_variants.length > 0;
        const totalStock = hasVariants
          ? giftProduct.product_variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0)
          : Number(giftProduct.stock || 0);

        if (totalStock <= 0) {
          setGiftNotification({
            show: true,
            type: 'exhausted',
            title: 'Promoción Finalizada',
            description: 'Las unidades de este regalo se han agotado.',
          });
        } else {
          const currentCartItems = useCart.getState().items;
          const alreadyInCart = currentCartItems.some((i) => String(i.productId) === String(giftProduct.id));

          if (!alreadyInCart) {
            addItem(giftProduct, null, 1);
            setGiftNotification({
              show: true,
              type: 'success',
              title: 'Regalo Añadido a tu Bolsa',
              description: giftProduct.name,
            });
            document.dispatchEvent(new CustomEvent('showCartHUD', { detail: { quantity: 1 } }));
          }
        }
      }

      const url = new URL(window.location.href);
      url.searchParams.delete('add');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, products, isMounted, addItem]);

  // Auto-cierre de la notificación flotante tras 4.5 segundos
  useEffect(() => {
    if (giftNotification?.show) {
      const timer = setTimeout(() => {
        setGiftNotification(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [giftNotification]);

  // 6. TODOS LOS EFECTOS DE CICLO DE VIDA (UNIFICADOS ABAJO)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => setCurrentUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setCurrentUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // 🚀 OPTIMIZACIÓN: Onboarding Silencioso y Carga de Favoritos Blindado contra UUIDs nulos/"undefined"
  useEffect(() => {
    // Si no hay sesión, o los UUIDs no son sintácticamente válidos, cancelamos la llamada a la BD
    if (!currentUser?.id || !store?.id || !isValidUUID(currentUser.id) || !isValidUUID(store.id)) {
      setFavoriteIds(new Set())
      return
    }

    const initCustomerOnStore = async () => {
      try {
        // 1. Silent Onboarding Seguro
        await supabase.rpc('onboard_customer', { p_store_id: store.id });

        // 2. Cargar los favoritos locales del cliente de forma normal
        const { data } = await supabase
          .from('favorites')
          .select('product_id')
          .eq('store_id', store.id)
          .eq('customer_id', currentUser.id)

        if (data) {
          setFavoriteIds(new Set(data.map((f: any) => String(f.product_id))))
        }
      } catch (err) {
        console.error('Alerta silenciosa: Falló el onboarding de inquilino para el cliente:', err);
      }
    }

    initCustomerOnStore();
  }, [currentUser, store?.id, supabase])

  useEffect(() => {
    const handleToggleFavorite = async (e: any) => {
      const product = e.detail
      if (!currentUser) {
        setIsAuthModalOpen(true)
        return
      }
      const productId = String(product.id)
      const isFav = favoriteIds.has(productId)

      setFavoriteIds(prev => {
        const newSet = new Set(prev)
        if (isFav) newSet.delete(productId)
        else newSet.add(productId)
        return newSet
      })

      try {
        if (isFav) {
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('store_id', store.id)
            .eq('customer_id', currentUser.id)
            .eq('product_id', product.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('favorites')
            .insert({ store_id: store.id, customer_id: currentUser.id, product_id: product.id })
          if (error) throw error
        }
      } catch (error) {
        console.error('Error mutando favorito:', error)
        setFavoriteIds(prev => {
          const newSet = new Set(prev)
          if (isFav) newSet.add(productId)
          else newSet.delete(productId)
          return newSet
        })
      }
    }
    const handleOpenAuth = () => setIsAuthModalOpen(true)
    document.addEventListener('toggleFavorite', handleToggleFavorite)
    document.addEventListener('openAuthModal', handleOpenAuth)
    return () => {
      document.removeEventListener('toggleFavorite', handleToggleFavorite)
      document.removeEventListener('openAuthModal', handleOpenAuth)
    }
  }, [currentUser, favoriteIds, store?.id, supabase])

  // 🚀 AHORA EL EFFECT ENCUENTRA A featuredProducts YA INICIALIZADO SIN ERRORES DE TDZ
  useEffect(() => {
    const timer = setTimeout(() => { checkFeaturedScrollStatus(); }, 300);
    window.addEventListener('resize', checkFeaturedScrollStatus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkFeaturedScrollStatus);
    };
  }, [featuredProducts]);

  useEffect(() => {
    const handleImpact = () => {
      cartControls.start({
        y: [0, -5, 3, 0],
        scale: [1, 0.85, 1.15, 1],
        transition: { duration: 0.4, ease: "easeInOut", times: [0, 0.2, 0.6, 1] }
      });
    };
    const handleFly = (e: any) => {
      // 🚀 INYECCIÓN MAGNÉTICA: Forzamos la bajada de la cabecera instantáneamente y la bloqueamos por 3 segundos
      setIsStickyVisible(true);
      forceHeaderVisibleRef.current = Date.now() + 3000;

      const targets = document.querySelectorAll('[data-cart-target="true"]');
      let destNode = targets[0];
      for (let i = 0; i < targets.length; i++) {
        const rect = targets[i].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) { destNode = targets[i]; break; }
      }
      if (!destNode) { handleImpact(); return; }

      const startRect = e.detail.startRect;
      const destRect = destNode.getBoundingClientRect();
      const size = Math.min(startRect.width, startRect.height);
      const offsetX = (startRect.width - size) / 2;
      const offsetY = (startRect.height - size) / 2;

      // 🚀 MATEMÁTICA PREDICTIVA: Si la cabecera está escondida (top negativo), predecimos dónde caerá 
      // para que la imagen vuele hacia el punto visible correcto en la pantalla, no hacia el éter.
      const adjustedDestTop = destRect.top < 0 ? 25 : destRect.top;

      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.top = `${startRect.top}px`;
      wrapper.style.left = `${startRect.left}px`;
      wrapper.style.width = `${size}px`;
      wrapper.style.height = `${size}px`;
      wrapper.style.zIndex = '999999';
      wrapper.style.pointerEvents = 'none';

      const img = document.createElement('img');
      img.src = e.detail.src;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.borderRadius = '22%';
      img.style.objectFit = 'cover';
      img.style.willChange = 'transform, opacity';
      img.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.4), 0 10px 25px -5px rgba(0,0,0,0.2)';
      img.style.backgroundColor = '#ffffff';

      wrapper.appendChild(img);
      document.body.appendChild(wrapper);
      const startCenterX = startRect.left + offsetX + size / 2;
      const startCenterY = startRect.top + offsetY + size / 2;
      const destCenterX = destRect.left + destRect.width / 2;
      const destCenterY = adjustedDestTop + destRect.height / 2; // 🚀 Usa la Y ajustada matemáticamente
      const deltaX = destCenterX - startCenterX;
      const deltaY = destCenterY - startCenterY;

      wrapper.animate([
        { transform: `translate(${offsetX}px, ${offsetY}px)` },
        { transform: `translate(${offsetX + deltaX}px, ${offsetY}px)` }
      ], { duration: 550, easing: 'linear', fill: 'forwards' });

      const yAnim = img.animate([
        { transform: `translateY(0px) scale(1) rotate(0deg)`, opacity: 1, offset: 0 },
        { transform: `translateY(${deltaY * 0.6}px) scale(0.6) rotate(-15deg)`, opacity: 1, offset: 0.6 },
        { transform: `translateY(${deltaY}px) scale(0) rotate(0deg)`, opacity: 0, offset: 1 }
      ], { duration: 550, easing: 'ease-in', fill: 'forwards' });

      yAnim.onfinish = () => {
        wrapper.remove();
        document.dispatchEvent(new CustomEvent('cartImpact'));
      };
    };
    document.addEventListener('cartImpact', handleImpact);
    document.addEventListener('flyToCart', handleFly);
    return () => {
      document.removeEventListener('cartImpact', handleImpact);
      document.removeEventListener('flyToCart', handleFly);
    };
  }, [cartControls]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 🚀 Permite comunicación en localhost, vercel.app y preziso.shop
      const origin = event.origin || '';
      const isAllowed = origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('vercel.app') ||
        origin.includes('preziso');

      if (!isAllowed) return;

      if (event.data?.type === 'UPDATE_THEME') {
        setLiveConfig(normalizeThemeConfig(event.data.config));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search) }, 300)
    return () => clearTimeout(timer)
  }, [search])



  // 🚀 REINICIO DE PÁGINA AL BUSCAR, CAMBIAR CATEGORÍA, ORDENAR O ACTIVAR COLECCIÓN
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, selectedCategory, activeCollectionSlug, sortBy])
  // 🚀 DETECCIÓN ULTRA-LIGERA DEL DISPOSITIVO
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile() // Comprobación inicial
    window.addEventListener('resize', checkMobile, { passive: true })
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 🚀 SCROLL ULTRA-OPTIMIZADO: Solo muta el estado cuando hay un cambio real de dirección
  useEffect(() => {
    let ticking = false;
    const controlNavbar = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // 🚀 ESCUDO MAGNÉTICO: Si acabamos de añadir un producto, ignoramos el scroll para no esconder la cabecera
          if (Date.now() < forceHeaderVisibleRef.current) {
            lastScrollYRef.current = currentScrollY;
            ticking = false;
            return;
          }

          if (currentScrollY < 250) {
            setIsStickyVisible(true);
          } else {
            const isScrollingUp = currentScrollY < lastScrollYRef.current;
            setIsStickyVisible(isScrollingUp);
          }
          lastScrollYRef.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', controlNavbar, { passive: true });
    return () => window.removeEventListener('scroll', controlNavbar);
  }, []);

  useEffect(() => {
    const handleOpenFromCart = (e: any) => {
      const product = e.detail;
      if (product) { setSelectedProductForModal(product); setIsModalOpen(true); }
    };
    document.addEventListener('openProductModal', handleOpenFromCart);
    return () => document.removeEventListener('openProductModal', handleOpenFromCart);
  }, []);

  useEffect(() => {
    if (!displayPromotions || displayPromotions.length <= 1) return;
    const interval = setInterval(() => {
      if (isCarouselPausedRef.current) return;
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: clientWidth * 0.9, behavior: 'smooth' });
        }
      }
    }, 5500);
    return () => clearInterval(interval);
  }, [displayPromotions]);

  useEffect(() => {
    const ref = searchParams?.get('ref');
    const storedRef = sessionStorage.getItem('preziso_ref');
    if (ref && store?.affiliate_config?.active) {
      setAffiliateCode(ref);
      if (storedRef !== ref) {
        sessionStorage.setItem('preziso_ref', ref);
        setShowPromoModal(true);
        setTimeout(() => setShowPromoModal(false), 5000);
      }
    } else if (storedRef) {
      setAffiliateCode(storedRef);
    }
  }, [searchParams, store]);

  useEffect(() => {
    handleCategoryScroll();
  }, []);

 const handleOpenProduct = useCallback((product: any) => {
    if (store?.store_type === 'restaurant' || (product.product_modifier_groups && product.product_modifier_groups.length > 0)) {
      const foodProduct = {
        ...product,
        modifier_groups: product.product_modifier_groups
          ?.map((pmg: any) => pmg.modifier_groups)
          .filter(Boolean) || []
      };
      setSelectedProductForModal(foodProduct);
      setIsFoodModalOpen(true);
    } else {
      setSelectedProductForModal(product);
      setIsModalOpen(true);
    }
  }, [store?.store_type]);

  const getProductPricing = useCallback((product: any) => {
    const cashPrice = Number(product.usd_cash_price || 0)
    const markup = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + markup
    const priceInBs = listPrice * activeRate
    const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0
    return { cashPrice, priceInBs, discountPercent, hasDiscount: markup > 0 }
  }, [activeRate]);

  // 🚀 DETECCIÓN INFALIBLE V2: Superposición de estados (Base de Datos + Motor de Luminancia)
  const isStoreDark = useMemo(() => {
    if (store?.theme === "dark" || store?.isDark === true) return true;
    try {
      const rawBg = activeTheme.colors?.background || '#ffffff';
      if (rawBg.toLowerCase() === 'black' || rawBg.includes('0, 0, 0')) return true;
      const bgHex = rawBg.replace('#', '');
      const r = parseInt(bgHex.length === 3 ? bgHex[0] + bgHex[0] : bgHex.substring(0, 2), 16);
      const g = parseInt(bgHex.length === 3 ? bgHex[1] + bgHex[1] : bgHex.substring(2, 4), 16);
      const b = parseInt(bgHex.length === 3 ? bgHex[2] + bgHex[2] : bgHex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
      }
    } catch (e) { }
    return false;
  }, [store, activeTheme]);

  const [isScrolledLeft, setIsScrolledLeft] = useState(false);

  const handleCategoryScroll = useCallback(() => {
    if (categoryScrollRef.current) {
      const nextScrolled = categoryScrollRef.current.scrollLeft > 0;
      setIsScrolledLeft(prev => (prev === nextScrolled ? prev : nextScrolled));
    }
  }, []);

  const handleHeaderSelectCategory = useCallback((cat: string) => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCategory(cat);
    setCurrentPage(1);
  }, []);

  const handleProfileClick = useCallback(() => {
    if (currentUser) {
      router.push(getTenantHref('/passport', store.slug));
    } else {
      setIsAuthModalOpen(true);
    }
  }, [currentUser, router, store?.slug]);

  const dynamicMask = "linear-gradient(to right, " + (isScrolledLeft ? 'transparent' : '#000') + " 0%, #000 40px, #000 calc(100% - 40px), transparent 100%)";

  // ==========================================
  // 🚀 MOTOR MATEMÁTICO DE PAGINACIÓN INTELIGENTE
  // ==========================================
  const itemsPerPage = isMobile ? 12 : 24;
  const totalPages = Math.ceil(standardProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = standardProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (catalogTopRef.current) {
      // Calculamos la posición exacta restando 140px para no tapar el navbar sticky
      const y = catalogTopRef.current.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Algoritmo que genera los números de página con elipsis "..." si hay más de 5 páginas
  const getPaginationRange = () => {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  // ==========================================
  // 🚀 MOTOR DE EXPLORACIÓN DE CATEGORÍAS (CRO & Fallback Determinista)
  // ==========================================
  const explorableCategories = useMemo(() => {
    // 1. Tomamos todas las categorías excepto 'Todos' y la que el usuario ya está viendo
    const availableCats = categories.filter(c => c !== 'Todos' && c !== selectedCategory);

    const computed = availableCats.map(catName => {
      // 2. Buscamos todos los productos de esta categoría específica
      const catProducts = products.filter(p => normalizeCategory(p.category) === catName);

      // 3. (CRO Killer) Si la categoría está vacía, no la mostramos para evitar el rebote
      if (catProducts.length === 0) return null;

      let coverUrl = null;
      let useSolidColor = false;

      // Prioridad A: Imagen subida por el Admin (Tolerante a fallos si la columna no existe)
      if (store?.category_images && store.category_images[catName]) {
        coverUrl = store.category_images[catName];
      } else {
        // Prioridad B: Fallback Determinista (Primer producto con foto válido)
        const sortedProducts = [...catProducts].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        const productWithImage = sortedProducts.find(p => p.image_url);

        if (productWithImage) {
          coverUrl = productWithImage.image_url;
        } else {
          // Prioridad C: No hay fotos en toda la categoría. Usamos el color de la marca.
          useSolidColor = true;
        }
      }

      return {
        name: catName,
        coverUrl,
        useSolidColor,
        count: catProducts.length
      };
    }).filter(Boolean); // Limpiamos los nulls de categorías vacías

    return computed;
  }, [categories, selectedCategory, products, store?.category_images]);

  // Manejador de transición ultra-rápida al elegir una nueva categoría (Limpia búsquedas activas)
  const handleExploreCategory = (catName: string) => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCategory(catName);
    setCurrentPage(1);
    if (catalogTopRef.current) {
      const y = catalogTopRef.current.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };
  // 💎 BÓVEDA DE MEMOIZACIÓN DEL CATÁLOGO: Hook en nivel superior para blindar la lista enlazada de React (Zero Error #300)
  const renderedProductGrid = useMemo(() => {
    return paginatedProducts.map((product: any, index: number) => {
      const pricing = getProductPricing(product)

      const variantStockSum = product.product_variants && product.product_variants.length > 0
        ? product.product_variants.reduce((acc: number, variant: any) => acc + (Number(variant.stock) || 0), 0)
        : null

      const isCompletelyOutOfStock = variantStockSum !== null ? variantStockSum <= 0 : (product.stock || 0) <= 0
      const totalStock = variantStockSum !== null ? variantStockSum : (product.stock || 0)
      const isCritical = totalStock > 0 && totalStock <= 3

      const productCard = (
        <ProductCard
          key={product.id}
          product={product}
          pricing={pricing}
          onOpen={handleOpenProduct}
          isOutOfStock={isCompletelyOutOfStock}
          index={index}
          isFavorite={favoriteIds.has(String(product.id))}
          isCriticalStock={isCritical}
          showTaxIndicator={showTaxInCatalog}
          taxPercentage={taxPercentage}
          cardStyle={activeTheme.layout?.card_style || 'standard'}
          mediaConfig={activeTheme.layout?.card_media} // 🚀 INYECTADO AQUÍ
        />
      )

      // 🚀 CONMUTACIÓN INTELIGENTE: Solo inyectamos el banner en el 4to producto si la tienda TIENE colecciones activas.
      // Si NO tiene colecciones activas, el banner ya se exhibe en posición protagonista justo debajo del Hero.
      const hasActiveCollections = Boolean(collections && collections.length > 0)
      const injectAfterIndex = paginatedProducts.length < 4 ? paginatedProducts.length - 1 : 3

      if (hasActiveCollections && index === injectAfterIndex && displayPromotions && displayPromotions.length > 0) {
        const hasMultiple = displayPromotions.length > 1

        return (
          <React.Fragment key={`promo-injection-${product.id}`}>
            {productCard}
            <div
              className="col-span-full w-full py-3 md:py-5 overflow-hidden min-w-0"
              onMouseEnter={() => { isCarouselPausedRef.current = true }}
              onMouseLeave={() => { isCarouselPausedRef.current = false }}
              onTouchStart={() => { isCarouselPausedRef.current = true }}
              onTouchEnd={() => { isCarouselPausedRef.current = false }}
            >
              <div
                ref={carouselRef}
                className="flex items-stretch overflow-x-auto snap-x snap-mandatory no-scrollbar w-full gap-3.5 sm:gap-4"
                style={{ scrollBehavior: 'smooth' }}
              >
                {displayPromotions.map((promo: any) => {
                  return (
                    <div
                      key={promo.id}
                      className={`shrink-0 snap-start flex flex-col transition-all ${hasMultiple
                          ? 'w-[88%] sm:w-[90%] md:w-[92%] lg:w-[94%]'
                          : 'w-full'
                        }`}
                    >
                      <PromotionBanner
                        promo={promo}
                        themeConfig={activeTheme}
                        isActive={false}
                        onToggle={() => {
                          const isSubdomain = typeof window !== 'undefined' &&
                            (window.location.host.startsWith(`${store.slug}.`) ||
                              (window.location.host.includes('.') && !window.location.host.startsWith('www.')))

                          const targetUrl = isSubdomain
                            ? `/promo/${promo.id}`
                            : `/${store.slug}/promo/${promo.id}`

                          router.push(targetUrl)
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </React.Fragment>
        )
      }
      return productCard
    })
  }, [paginatedProducts, displayPromotions, collections, isBoutiqueMode, favoriteIds, showTaxInCatalog, taxPercentage, activeTheme, activeRate, store?.slug, router, getProductPricing, handleOpenProduct])
  // ==========================================
  // 🎨 PINTADO PRINCIPAL DE LA TIENDA VIVA
  // ==========================================
  return (
    <div
      className="min-h-screen bg-[var(--pz-bg)] pb-8 selection:bg-[var(--pz-primary)] selection:text-[var(--pz-primary-text)]"
      style={{
        ...activeThemeVariables,
        fontFamily: 'var(--font-body, var(--font-inter), sans-serif)',
      }}
    >

      {/* 1. NOTIFICACIÓN DE COTIZACIÓN PENDIENTE (Hasta arriba de todo) */}
      <QuoteRecoveryBanner currentSlug={store.slug} />

      {/* 🚀 NOTIFICACIÓN FLOTANTE EDITORIAL: REGALO / GIVEAWAY (?add=ID) */}
      <AnimatePresence>
        {giftNotification?.show && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-4 inset-x-0 mx-auto z-[999999] max-w-[92vw] sm:max-w-md w-full px-2 pointer-events-auto"
          >
            <div
              className={`p-3 sm:p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 ${giftNotification.type === 'success'
                  ? 'bg-neutral-950/95 text-white border-neutral-800'
                  : 'bg-white/95 text-neutral-950 border-neutral-200 shadow-lg'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Icono animado con micro-pulso elástico */}
                <motion.div
                  initial={{ rotate: -20, scale: 0.7 }}
                  animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${giftNotification.type === 'success'
                      ? 'bg-white/10 text-emerald-400 border border-white/10 shadow-2xs'
                      : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                    }`}
                >
                  <Gift size={16} strokeWidth={2} />
                </motion.div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-semibold tracking-tight truncate leading-tight">
                    {giftNotification.title}
                  </p>
                  <p
                    className={`text-[11px] truncate font-normal ${giftNotification.type === 'success' ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                  >
                    {giftNotification.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {giftNotification.type === 'success' && (
                  <button
                    type="button"
                    onClick={() => {
                      setGiftNotification(null);
                      document.dispatchEvent(new CustomEvent('toggleCartDrawer'));
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-xs"
                  >
                    Bolsa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setGiftNotification(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors active:scale-90"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    {/* 2. BANNER DE CAMPAÑA FLASH AISLADO */}
      <FlashCampaignBanner isBoutiqueMode={isBoutiqueMode} expQuery={expQuery || null} />

      <StoreHeader
        layoutStyle={activeTheme.layout?.header_style || 'classic'}
        store={store}
        products={products}
        promotions={displayPromotions}
        activeRate={activeRate}
        isEur={isEur}
        search={search}
        setSearch={setSearch}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={handleHeaderSelectCategory}
        isBoutiqueMode={isBoutiqueMode}
        exitBoutiqueMode={exitBoutiqueMode}
        currentUser={currentUser}
        orderHistory={orderHistory}
        hasItems={hasItems}
        totalItems={totalItems}
        cartControls={cartControls}
        setIsAuthModalOpen={setIsAuthModalOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        setIsRateModalOpen={setIsRateModalOpen}
        isStickyVisible={isStickyVisible}
        categoryScrollRef={categoryScrollRef}
        handleCategoryScroll={handleCategoryScroll}
        dynamicMask={dynamicMask}
        scrollCategories={scrollCategories}
        onProfileClick={handleProfileClick}
      />







      <main className={`max-w-[1500px] mx-auto pt-6 md:pt-8 pb-24 ${activeTheme.layout?.card_style === 'modular_tech'
          ? 'px-2 md:px-8'
          : 'px-4 md:px-8'
        }`}>
        <>
          {/* 🚀 ESCAPARATE DEDICADO DE CAMPAÑA (AUTÓNOMO Y DESACOPLADO) */}
          {selectedPromoData && (
            <div id="promo-view-anchor" className="mb-10 animate-in fade-in duration-500">
              <PromotionShowroom
                promo={selectedPromoData}
                themeConfig={activeTheme}
                productCount={standardProducts.length}
                onExit={exitPromoMode}
              />
            </div>
          )}

          {/* 🚀 ESCAPARATE DE COLECCIÓN ACTIVA (SHOWROOM LOOKBOOK) */}
          {selectedCollectionData && (
            <div id="collection-view-anchor" className="mb-10 relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] animate-in fade-in duration-500">

              {/* Fondo sutil con imagen desenfocada si existe portada */}
              {selectedCollectionData.image_url && (
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                  <Image
                    src={getOptimizedUrl(selectedCollectionData.image_url)}
                    alt=""
                    fill
                    className="object-cover blur-md"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--store-surface)] via-[var(--store-surface)]/90 to-transparent" />
                </div>
              )}

              <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl text-left">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--store-primary-text)] bg-[var(--store-primary)] px-2.5 py-0.5 rounded-full shadow-xs">
                      {selectedCollectionData.settings?.badge_text || "Curaduría Especial"}
                    </span>
                    <span className="text-xs font-mono font-medium text-[var(--store-surface-text)]">
                      {standardProducts.length} {standardProducts.length === 1 ? 'artículo en este drop' : 'artículos en este drop'}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-4xl font-black text-[var(--store-text-main)] tracking-tight leading-none pt-0.5">
                    {selectedCollectionData.name}
                  </h2>

                  {selectedCollectionData.description && (
                    <p className="text-xs md:text-sm text-[var(--store-surface-text)] leading-relaxed font-normal pt-1">
                      {selectedCollectionData.description}
                    </p>
                  )}
                </div>

                {/* Botón de Salida Rápida con Estilo de Pastilla */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveCollectionSlug(null);
                    setCurrentPage(1);
                    window.history.replaceState(null, '', pathname);
                    if (catalogTopRef.current) {
                      catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="px-4 py-2.5 rounded-[var(--radius-btn)] bg-[var(--store-bg)] border-[length:var(--border-width-ui)] border-[var(--store-border)] text-xs font-bold text-[var(--store-text-main)] hover:border-[var(--store-primary)] transition-all shrink-0 active:scale-95 shadow-xs flex items-center gap-2 group"
                >
                  <X size={14} className="group-hover:rotate-90 transition-transform duration-200" />
                  <span>Ver Catálogo General</span>
                </button>
              </div>
            </div>
          )}

        {/* 🚀 POSICIÓN PROTAGONISTA POST-HERO: COLECCIONES ACTIVAS O BANNERS DE PROMOCIÓN */}
          {collections && collections.length > 0 ? (
            !selectedCollectionData && !debouncedSearch && (
              <section className="mb-14 animate-in fade-in">
                <div className="flex items-end justify-between mb-5 px-1">
                  <div className="flex flex-col text-left">
                    <h2 className={`text-xl md:text-2xl tracking-tight text-[var(--store-text-main)] ${activeTheme.template_id === 'hardware_dense' ? 'font-mono font-bold uppercase' : 'font-semibold'
                      }`}>
                      Colecciones Destacadas
                    </h2>
                  </div>
                </div>

                <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-6 snap-x snap-mandatory scroll-px-4 md:scroll-px-8 items-stretch">
                  {collections.map((col: any, idx: number) => (
                    <CollectionCard
                      key={col.id}
                      index={idx}
                      collection={col}
                      products={products}
                      themeConfig={activeTheme}
                      onClick={() => {
                        setActiveCollectionSlug(col.slug)
                        setSelectedCategory('Todos')
                        setCurrentPage(1)
                        window.history.replaceState(null, '', `${pathname}?c=${col.slug}`)

                        setTimeout(() => {
                          const anchor = document.getElementById('collection-view-anchor') || catalogTopRef.current
                          if (anchor) {
                            const yOffset = -130
                            const y = anchor.getBoundingClientRect().top + window.scrollY + yOffset
                            window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
                          }
                        }, 60)
                      }}
                    />
                  ))}
                </div>
              </section>
            )
          ) : (
            /* 💎 SI LA TIENDA NO TIENE COLECCIONES ACTIVAS: El Banner de Promociones sube justo debajo del Hero */
            displayPromotions && displayPromotions.length > 0 && !selectedPromoData && !selectedCollectionData && !debouncedSearch && (
              <section
                className="mb-10 md:mb-12 w-full overflow-hidden min-w-0 animate-in fade-in duration-500"
                onMouseEnter={() => { isCarouselPausedRef.current = true }}
                onMouseLeave={() => { isCarouselPausedRef.current = false }}
                onTouchStart={() => { isCarouselPausedRef.current = true }}
                onTouchEnd={() => { isCarouselPausedRef.current = false }}
              >
                <div
                  ref={carouselRef}
                  className="flex items-stretch overflow-x-auto snap-x snap-mandatory no-scrollbar w-full gap-3.5 sm:gap-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {displayPromotions.map((promo: any) => {
                    const hasMultiple = displayPromotions.length > 1
                    return (
                      <div
                        key={`hero-promo-${promo.id}`}
                        className={`shrink-0 snap-start flex flex-col transition-all ${
                          hasMultiple
                            ? 'w-[88%] sm:w-[90%] md:w-[92%] lg:w-[94%]'
                            : 'w-full'
                        }`}
                      >
                        <PromotionBanner
                          promo={promo}
                          themeConfig={activeTheme}
                          isActive={false}
                          onToggle={() => {
                            const isSubdomain = typeof window !== 'undefined' &&
                              (window.location.host.startsWith(`${store.slug}.`) ||
                                (window.location.host.includes('.') && !window.location.host.startsWith('www.')))

                            const targetUrl = isSubdomain
                              ? `/promo/${promo.id}`
                              : `/${store.slug}/promo/${promo.id}`

                            router.push(targetUrl)
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          )}

          {/* 🚀 ESCAPARATE EDITORIAL (Lo más vendido - Agnóstico) */}
          {featuredProducts.length > 0 && !debouncedSearch && !isBoutiqueMode && (
            <section id="bestsellers-section" className="mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className={`flex items-end justify-between mb-6 px-1 ${activeTheme.layout?.card_style === 'dense_hardware' ? 'pb-2' : ''}`}>
                {activeTheme.layout?.card_style === 'dense_hardware' ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-1">Selección Destacada</span>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--store-text-main)] uppercase">Lo más vendido</h2>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tighter text-[var(--store-text-main)]">Lo más vendido</h2>
                  </div>
                )}
              </div>

              {/* 🚀 SE CAMBIA 'group' A 'group/featured' PARA ELIMINAR LA COLISIÓN CON LOS CARRITOS */}
              <div className="relative group/featured">

                {/* 🚀 BOTÓN IZQUIERDO (Clean Look Apple Style - Control de Hover de Hardware) */}
                <button
                  onClick={() => scrollFeatured('left')}
                  className={`hidden md:flex absolute top-1/2 -translate-y-[calc(50%+12px)] -left-4 lg:-left-6 z-10 w-12 h-12 items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] bg-[var(--store-surface)]/85 backdrop-blur-xl border border-[var(--store-border)]/60 text-[var(--store-text-main)] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover/featured:opacity-100 ${featuredScrollStatus.left ? 'pointer-events-auto scale-100' : 'md:!opacity-0 pointer-events-none scale-95'
                    }`}
                  aria-label="Anterior"
                >
                  <ChevronLeft size={24} strokeWidth={2.5} className="-ml-0.5" />
                </button>

                <div
                  ref={featuredCarouselRef}
                  onScroll={checkFeaturedScrollStatus}
                  className="flex gap-3.5 md:gap-5 overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 md:-mx-8 md:px-8 snap-x snap-mandatory scroll-px-4 md:scroll-px-8 scroll-smooth items-stretch"
                >
                  {featuredProducts.map((product: any, idx: number) => {
                    const pricing = getProductPricing(product)
                    const isCompletelyOutOfStock = product.product_variants && product.product_variants.length > 0
                      ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0) <= 0
                      : (product.stock || 0) <= 0;

                    return (
                      <div key={`feat-${product.id}`} className="w-[220px] sm:w-[240px] md:w-[260px] lg:w-[280px] shrink-0 snap-start flex flex-col h-auto">
                        <ProductCard
                          product={product}
                          pricing={pricing}
                          onOpen={handleOpenProduct}
                          isOutOfStock={isCompletelyOutOfStock}
                          index={idx}
                          isFavorite={favoriteIds.has(String(product.id))}
                          showTaxIndicator={showTaxInCatalog}
                          taxPercentage={taxPercentage}
                          cardStyle={activeTheme.layout?.card_style || 'standard'}
                          isFeatured={true} // 🚀 INYECCIÓN DEL PROP PARA DISEÑO ESPECIAL
                          mediaConfig={activeTheme.layout?.card_media} // 🚀 INYECTADO AQUÍ
                        />
                      </div>
                    )
                  })}
                </div>

                {/* 🚀 BOTÓN DERECHO (Clean Look Apple Style - Control de Hover de Hardware) */}
                <button
                  onClick={() => scrollFeatured('right')}
                  className={`hidden md:flex absolute top-1/2 -translate-y-[calc(50%+12px)] -right-4 lg:-right-6 z-10 w-12 h-12 items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] bg-[var(--store-surface)]/85 backdrop-blur-xl border border-[var(--store-border)]/60 text-[var(--store-text-main)] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover/featured:opacity-100 ${featuredScrollStatus.right || !featuredScrollStatus.left ? 'pointer-events-auto scale-100' : 'md:!opacity-0 pointer-events-none scale-95'
                    }`}
                  aria-label="Siguiente"
                >
                  <ChevronRight size={24} strokeWidth={2.5} className="-mr-0.5" />
                </button>

              </div>
            </section>
          )}

          {/* 🚀 ANCLAJE DE SCROLL INVISIBLE */}
          <div id="catalog-grid-start" ref={catalogTopRef} className="w-full h-px mt-2"></div>

          {/* 🚀 BARRA CONTEXTUAL DE BÚSQUEDA ACTIVA CON CTA DE RETORNO */}
          {debouncedSearch.trim() !== '' && standardProducts.length > 0 && (
            <div className="mb-6 p-3.5 sm:px-5 sm:py-4 rounded-[var(--radius-card)] bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--store-bg)] border border-[var(--store-border)]/60 flex items-center justify-center shrink-0 text-[var(--store-text-main)]">
                  <Search size={14} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[var(--store-text-main)] truncate">
                    Resultados para &quot;{debouncedSearch}&quot;
                  </p>
                  <p className="text-[10px] font-mono tabular-nums font-medium text-[var(--store-surface-text)]">
                    {standardProducts.length} {standardProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
                    {selectedCategory !== 'Todos' ? ` en ${selectedCategory}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setSelectedCategory('Todos');
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-[var(--radius-btn)] bg-[var(--store-primary)] text-[var(--store-primary-text)] text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-all shrink-0 active:scale-95 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <X size={14} strokeWidth={2.5} />
                <span>Ver todo el catálogo</span>
              </button>
            </div>
          )}

         {/* 🚀 CABECERA EDITORIAL DEL CATÁLOGO + SELECTOR PERSONALIZADO POLIMÓRFICO */}
          {standardProducts.length > 0 && debouncedSearch.trim() === '' && (
            <CatalogToolbar
              selectedCategory={selectedCategory}
              totalCount={standardProducts.length}
              sortBy={sortBy}
              onSortChange={(val) => setSortBy(val)}
              onResetCategory={() => {
                setSelectedCategory('Todos');
                setCurrentPage(1);
              }}
              isBoutiqueMode={isBoutiqueMode}
              cardStyle={activeTheme.layout?.card_style || 'standard'}
              templateId={activeTheme.template_id || 'classic'}
            />
          )}

       {/* 🚀 ENRUTADOR DE ESTADO (VACÍO VS CATÁLOGO - 100% AGNÓSTICO) */}
          {standardProducts.length === 0 ? (
            <div className="w-full min-h-[40vh] flex flex-col items-center justify-center py-16 px-4 animate-in fade-in zoom-in-95 duration-500">
              {activeTheme.layout?.card_style === 'brutalist' ? (
                <div className="flex flex-col items-center text-center p-8 md:p-12 border-2 border-[var(--store-border)] shadow-[var(--shadow-ui)] bg-[var(--store-surface)] max-w-lg w-full mx-auto">
                  <SearchX size={48} strokeWidth={1.5} className="mb-4 text-[var(--store-text-main)]" />
                  <h3 className="font-mono font-black text-2xl uppercase mb-2 text-[var(--store-text-main)]">SIN RESULTADOS</h3>
                  <p className="font-mono text-xs uppercase text-[var(--store-surface-text)] mb-8">NO ENCONTRAMOS COINCIDENCIAS PARA &quot;{debouncedSearch}&quot;</p>
                  <button onClick={() => { setSearch(''); setDebouncedSearch(''); setSelectedCategory('Todos'); }} className="px-6 py-3 bg-[var(--store-primary)] text-[var(--store-primary-text)] font-mono font-black text-xs uppercase tracking-widest border border-[var(--store-primary)] hover:opacity-90 transition-all active:scale-95">
                    VER TODO EL CATÁLOGO
                  </button>
                </div>
              ) : activeTheme.layout?.card_style === 'editorial' ? (
                <div className="flex flex-col items-center text-center p-8 max-w-lg w-full mx-auto">
                  <SearchX size={32} strokeWidth={1} className="mb-6 text-[var(--store-surface-text)] opacity-50" />
                  <h3 className="font-heading text-2xl md:text-3xl mb-3 text-[var(--store-text-main)]">Sin resultados</h3>
                  <p className="font-sans text-sm text-[var(--store-surface-text)] mb-8">No encontramos artículos que coincidan con tu búsqueda actual.</p>
                  <button onClick={() => { setSearch(''); setDebouncedSearch(''); setSelectedCategory('Todos'); }} className="border-b border-[var(--store-text-main)] pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--store-text-main)] hover:opacity-70 transition-opacity">
                    Ver todo el catálogo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-8 md:p-12 bg-[var(--store-surface)] rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 shadow-[var(--shadow-ui)] max-w-lg w-full mx-auto">
                  <div className="bg-[var(--store-bg)] p-4 rounded-full mb-5 border border-[var(--store-border)]/50 shadow-2xs">
                    <SearchX size={28} strokeWidth={1.5} className="text-[var(--store-text-main)] opacity-70" />
                  </div>
                  <h3 className="font-black text-xl text-[var(--store-text-main)] mb-2">No encontramos lo que buscas</h3>
                  <p className="text-sm font-medium text-[var(--store-surface-text)] mb-8">Intenta con otros términos o explora todas las categorías disponibles.</p>
                  <button onClick={() => { setSearch(''); setDebouncedSearch(''); setSelectedCategory('Todos'); }} className="bg-[var(--store-primary)] text-[var(--store-primary-text)] px-8 py-3.5 rounded-[var(--radius-btn)] font-bold text-sm shadow-[var(--shadow-ui)] active:scale-95 transition-transform border border-[var(--store-border)]">
                    Ver todo el catálogo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`grid grid-flow-dense min-h-[40vh] ${activeTheme.layout?.card_style === 'dense_hardware'
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3.5'
                : activeTheme.layout?.card_style === 'editorial'
                  ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3.5 gap-y-8 md:gap-x-7 md:gap-y-12'
                  : activeTheme.layout?.card_style === 'modular_tech'
                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-6 lg:gap-8'
                    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 lg:gap-8'
              }`}>
              {renderedProductGrid}
            </div>
          )}

          {/* 🚀 CONTROLES DE PAGINACIÓN PREMIUM */}
          {totalPages > 1 && (
            <div className="mt-14 mb-4 flex items-center justify-center gap-1.5 md:gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 md:px-4 md:py-2 flex items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] text-[11px] md:text-xs font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] hover:bg-[var(--store-surface)] active:scale-95"
              >
                <ChevronLeft size={16} strokeWidth={2.5} className="md:mr-1" />
                <span className="hidden md:inline">Ant</span>
              </button>

              <div className="flex items-center gap-1 md:gap-1.5">
                {getPaginationRange().map((page, idx) => (
                  page === "..." ? (
                    <span key={`dots-${idx}`} className="w-6 md:w-8 flex justify-center text-[var(--store-surface-text)] text-xs font-bold tracking-widest select-none">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] text-[11px] md:text-xs font-bold transition-all duration-300 active:scale-95 ${currentPage === page
                        ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)]'
                        : 'bg-transparent text-[var(--store-text-main)] hover:bg-[var(--store-surface)] border-[var(--store-border)]/60 hover:border-[var(--store-border)]/50'
                        }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 md:px-4 md:py-2 flex items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] text-[11px] md:text-xs font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] hover:bg-[var(--store-surface)] active:scale-95"
              >
                <span className="hidden md:inline">Sig</span>
                <ChevronRight size={16} strokeWidth={2.5} className="md:ml-1" />
              </button>
            </div>
          )}

          {/* ========================================== */}
          {/* 🚀 COMPONENTE: BOTTOM NAVIGATION GRID (Polimórfico y 100% Agnóstico) */}
          {/* ========================================== */}
          {explorableCategories.length > 0 && (
            <div className="mt-8 md:mt-12 pt-8 border-t border-[var(--store-border)]/40 w-full animate-in fade-in duration-500">

              {activeTheme.layout?.card_style === 'dense_hardware' ? (
                <>
                  <div className="flex items-center justify-between mb-4 md:mb-5 px-1 border-b border-[var(--store-border)] pb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-1">Directorio del Catálogo</span>
                      <h3 className="text-lg md:text-xl font-black tracking-tight text-[var(--store-text-main)] uppercase">Explorar Categorías</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                    {explorableCategories.map((cat: any) => (
                      <button key={cat.name} onClick={() => handleExploreCategory(cat.name)} className="group flex items-center gap-3 p-3 bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] hover:border-[var(--store-primary)] transition-all active:scale-[0.98] text-left shadow-[var(--shadow-ui)] rounded-[var(--radius-card)]">
                        {cat.coverUrl && !cat.useSolidColor ? (
                          <div className="w-12 h-12 shrink-0 relative bg-[var(--store-bg)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 overflow-hidden rounded-[var(--radius-btn)]">
                            <Image src={getOptimizedUrl(cat.coverUrl)} alt={cat.name} fill sizes="48px" className="object-cover transition-all duration-300" loading="lazy" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 shrink-0 bg-[var(--store-bg)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 flex items-center justify-center rounded-[var(--radius-btn)]">
                            <span className="font-mono text-[10px] font-bold text-[var(--store-surface-text)]">00</span>
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-xs text-[var(--store-text-main)] uppercase tracking-wide truncate group-hover:text-[var(--store-primary)] transition-colors">{cat.name}</span>
                          <span className="font-mono text-[10px] text-[var(--store-surface-text)] mt-0.5">{cat.count} {cat.count === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}</span>
                        </div>
                        <ChevronRight size={16} className="text-[var(--store-surface-text)] group-hover:text-[var(--store-primary)] shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </>
              ) : activeTheme.layout?.card_style === 'editorial' ? (
                <>
                  <div className="flex flex-col items-center text-center mb-8 md:mb-10 px-1">
                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-[0.25em] mb-2">Descubrir</span>
                    <h3 className="text-2xl md:text-4xl font-black tracking-tight text-[var(--store-text-main)] font-heading">
                      Explorar Categorías
                    </h3>
                  </div>
                  <div className="flex gap-4 ml-2 md:gap-6 overflow-x-auto no-scrollbar pb-8 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {explorableCategories.map((cat: any) => (
                      <button key={cat.name} onClick={() => handleExploreCategory(cat.name)} className="group relative shrink-0 w-[220px] md:w-[300px] aspect-[3/4] overflow-hidden snap-start flex flex-col justify-center items-center text-center active:scale-[0.98] transition-transform duration-700 rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/30 shadow-[var(--shadow-ui)]">
                        {cat.coverUrl && !cat.useSolidColor ? (
                          <Image src={getOptimizedUrl(cat.coverUrl)} alt={cat.name} fill sizes="300px" className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110" loading="lazy" />
                        ) : (
                          <div className="absolute inset-0 bg-[var(--store-surface)]" />
                        )}
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors duration-700" />
                        <div className="relative z-10 p-6 w-full flex flex-col items-center">
                          <span className="block font-heading font-black text-white text-2xl md:text-3xl tracking-wide mb-2 drop-shadow-md">{cat.name}</span>
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/90 border-b border-white/40 pb-1">
                            Ver {cat.count} {cat.count === 1 ? 'artículo' : 'artículos'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : activeTheme.layout?.card_style === 'brutalist' ? (
                <>
                  <div className="flex items-center justify-between mb-4 md:mb-6 px-1 border-b border-[var(--store-border)]/40 pb-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono font-bold text-[var(--store-surface-text)] uppercase tracking-wider mb-0.5">// DIRECTORIO</span>
                      <h3 className="text-base md:text-lg font-black tracking-tight text-[var(--store-text-main)] uppercase">Explorar Categorías</h3>
                    </div>
                  </div>
                  <div className="flex gap-3 ml-2 md:gap-4 overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {explorableCategories.map((cat: any, idx: number) => (
                      <button
                        key={cat.name}
                        onClick={() => handleExploreCategory(cat.name)}
                        className="group relative shrink-0 w-[150px] md:w-[190px] aspect-[4/5] rounded-[var(--radius-card)] border border-[var(--store-border)]/60 overflow-hidden snap-start flex flex-col justify-between p-3.5 text-left active:scale-[0.98] transition-all duration-300 bg-[var(--store-surface)] hover:border-[var(--store-text-main)] shadow-2xs"
                      >
                        {!cat.useSolidColor && cat.coverUrl ? (
                          <Image src={getOptimizedUrl(cat.coverUrl)} alt={cat.name} fill sizes="200px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="absolute inset-0 bg-[var(--store-surface)]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

                        <span className="relative z-10 text-[9px] font-mono font-bold text-white/70 uppercase tracking-widest">
                          {(idx + 1).toString().padStart(2, '0')} //
                        </span>

                        <div className="relative z-10 w-full">
                          <span className="block font-bold tracking-tight text-white text-sm md:text-base leading-tight uppercase truncate">
                            {cat.name}
                          </span>
                          <span className="text-[9px] font-mono text-white/70 uppercase tracking-wider block mt-1">
                            {cat.count} {cat.count === 1 ? 'Artículo' : 'Artículos'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4 md:mb-5 px-1">
                    <h3 className="text-sm md:text-base font-medium tracking-tight text-[var(--store-text-main)] uppercase">Explora más categorías</h3>
                  </div>
                  <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar ml-2 pb-6 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {explorableCategories.map((cat: any) => (
                      <button key={cat.name} onClick={() => handleExploreCategory(cat.name)} className="group relative shrink-0 w-[140px] h-[140px] md:w-[170px] md:h-[170px] rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] overflow-hidden snap-start flex flex-col justify-end text-left active:scale-95 transition-transform duration-300 border border-[var(--store-border)]/30" style={{ backgroundColor: cat.useSolidColor ? 'var(--store-primary)' : 'var(--store-surface)' }}>
                        {!cat.useSolidColor && cat.coverUrl && <Image src={getOptimizedUrl(cat.coverUrl)} alt={cat.name} fill sizes="170px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />}
                        {!cat.useSolidColor && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />}
                        <div className="relative z-10 p-3 md:p-4 w-full">
                          <span className={`block font-medium tracking-tight leading-none line-clamp-1 ${cat.useSolidColor ? 'text-[var(--store-primary-text)] text-lg md:text-xl' : 'text-white text-base md:text-lg'}`}>{cat.name}</span>
                          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1.5 opacity-90 ${cat.useSolidColor ? 'text-[var(--store-primary-text)]/80' : 'text-gray-300'}`}>{cat.count} {cat.count === 1 ? 'Artículo' : 'Artículos'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </>

        {/* 🚀 MODAL CLEAN LOOK DE AFILIADO */}
        <AnimatePresence>
          {showPromoModal && affiliateCode && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
            >
              <div className="bg-[var(--store-surface)] text-[var(--store-text-main)] px-5 py-4 rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] border-[var(--store-border)] shadow-[var(--shadow-ui)] flex items-center gap-4 max-w-sm w-full pointer-events-auto">
                <div className="bg-[var(--store-incentive)]/15 text-[var(--store-incentive)] p-2 rounded-full shrink-0">
                  <Tag size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-0.5">Beneficio Activado</p>
                  <p className="text-sm font-black leading-tight">
                    Descuento aplicado con el código <span className="text-[var(--store-incentive)]">{affiliateCode.toUpperCase()}</span>
                  </p>
                </div>
                <button onClick={() => setShowPromoModal(false)} className="text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

    {/* ========================================================================= */}
      {/* 💎 FOOTER ARQUITECTÓNICO ABIERTO (Cero Cajas, Logos Reales & Hilos Finos) */}
      {/* ========================================================================= */}
      {(() => {
        const sc = store?.shipping_config || {};
        const sm = sc.methods || {};
        const pc = store?.payment_config || {};
        const isFormalTax = store?.fiscal_profile && store.fiscal_profile !== 'informal';
        const isMonoTheme = activeTheme.layout?.card_style === 'brutalist' || activeTheme.layout?.card_style === 'dense_hardware';
        const isLuxuryTheme = activeTheme.layout?.card_style === 'editorial';

        // 1. Métodos de Pago Activos con su Logo Oficial de Checkout
        const activePayments: { label: string; icon: string }[] = [];
        if (pc.pago_movil?.active || pc.skylink?.active || pc.pago_flash?.active) {
          activePayments.push({ label: 'Pago Móvil', icon: 'fluent:phone-checkmark-24-regular' });
        }
        if (pc.zelle?.active) activePayments.push({ label: 'Zelle', icon: 'simple-icons:zelle' });
        if (pc.binance?.active) activePayments.push({ label: 'Binance', icon: 'simple-icons:binance' });
        if (pc.cash?.active) activePayments.push({ label: 'Efectivo', icon: 'bi:cash' });
        if (pc.transferencia?.active) activePayments.push({ label: 'Transferencia', icon: 'ph:bank-bold' });
        if (pc.zinli?.active) activePayments.push({ label: 'Zinli', icon: 'mdi:wallet-bifold' });
        if (pc.wally?.active) activePayments.push({ label: 'Wally', icon: 'solar:wallet-bold' });
        if (pc.paypal?.active) activePayments.push({ label: 'PayPal', icon: 'simple-icons:paypal' });

     // 2. Opciones de Entrega Activas (Lectura resiliente en .methods y raíz)
        const hasPickup = Boolean(sm.pickup ?? sc.pickup);
        const hasLocalDelivery = Boolean(sm.delivery ?? sc.delivery);
        const hasMrw = Boolean(sm.mrw ?? sm.MRW ?? sc.mrw ?? sc.MRW);
        const hasZoom = Boolean(sm.zoom ?? sm.ZOOM ?? sc.zoom ?? sc.ZOOM);
        const hasTealca = Boolean(sm.tealca ?? sm.TEALCA ?? sc.tealca ?? sc.TEALCA);
        const hasAnyShipping = hasPickup || hasLocalDelivery || hasMrw || hasZoom || hasTealca;

        const physicalAddress = sc.main_address?.trim() || (Array.isArray(sc.pickup_locations) && sc.pickup_locations[0]?.trim()) || (isFormalTax ? store?.fiscal_address?.trim() : '');
        const cleanPhone = (store?.phone || '').replace(/\D/g, '');
        const hasAnyRealFooterData = activePayments.length > 0 || hasAnyShipping || Boolean(physicalAddress) || Boolean(cleanPhone) || Boolean(isFormalTax && (store?.legal_name || store?.legal_id));

        if (!hasAnyRealFooterData) return null;

        return (
          <footer className="w-full border-t border-[var(--store-border)]/40 mt-12">
            <div className="max-w-[1500px] mx-auto px-4 md:px-8">
              <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[var(--store-border)]/35">

                {/* COLUMNA 1: IDENTIDAD, TASA INFORMANTE SUBRAYADA, UBICACIÓN Y CONTACTO */}
                <div className="md:col-span-5 py-8 md:py-10 md:pr-8 space-y-4">
                  <div className="flex items-center flex-wrap gap-3">
                    <span className={`text-base md:text-lg font-bold tracking-tight text-[var(--store-text-main)] ${
                      isLuxuryTheme ? 'font-heading font-normal text-xl' : isMonoTheme ? 'font-mono uppercase' : ''
                    }`}>
                      {store?.name}
                    </span>

                    <span className="h-3.5 w-px bg-[var(--store-border)]/70" />

                    <button
                      type="button"
                      onClick={() => setIsRateModalOpen(true)}
                      className="inline-flex items-baseline gap-1.5 text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {isEur ? 'Tasa EUR' : 'Tasa BCV'}
                      </span>
                      <span className="font-mono font-bold text-xs text-[var(--store-text-main)] tabular-nums border-b border-[var(--store-text-main)]/35 group-hover:border-[var(--store-text-main)] pb-[1px] leading-none transition-colors">
                        Bs. {Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(activeRate)}
                      </span>
                    </button>
                  </div>

                  {physicalAddress && (
                    <div className="flex items-start gap-2 text-xs text-[var(--store-surface-text)] leading-relaxed max-w-md">
                      <MapPin size={14} strokeWidth={1.75} className="shrink-0 mt-0.5 text-[var(--store-text-main)] opacity-80" />
                      <span>{physicalAddress}</span>
                    </div>
                  )}

                  {isFormalTax && (store?.legal_name || store?.legal_id) && (
                    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-[var(--store-surface-text)] ${isMonoTheme ? 'font-mono' : ''}`}>
                      {store?.legal_name && <span className="font-medium text-[var(--store-text-main)]">{store.legal_name}</span>}
                      {store?.legal_name && store?.legal_id && <span className="opacity-40">·</span>}
                      {store?.legal_id && <span className="font-mono">RIF: {store.legal_id}</span>}
                    </div>
                  )}

                  {cleanPhone && (
                    <div className="pt-1">
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola, vengo de su catálogo web (${store?.name}) y quisiera realizar una consulta.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 text-xs font-semibold text-[var(--store-text-main)] hover:opacity-75 transition-opacity group ${
                          isMonoTheme ? 'font-mono text-[11px] uppercase tracking-wider' : ''
                        }`}
                      >
                        <MessageCircle size={14} strokeWidth={2} className="shrink-0" />
                        <span className="border-b border-[var(--store-text-main)]/35 group-hover:border-[var(--store-text-main)] pb-0.5 transition-colors">
                          Atención al cliente por WhatsApp
                        </span>
                        <ArrowUpRight size={13} className="text-[var(--store-surface-text)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    </div>
                  )}
                </div>

                {/* COLUMNA 2: ENVÍOS Y ENTREGAS (Wordmarks SVG Forzados & Contraste Adaptativo) */}
                {hasAnyShipping && (
                  <div className="md:col-span-3 py-8 md:py-10 md:px-8 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--store-surface-text)]">
                        Envíos y Entregas
                      </span>
                      {sc.national_shipping_is_free && (hasMrw || hasZoom || hasTealca) && (
                        <span className="text-[10px] font-mono font-bold text-[var(--store-incentive)] border-b border-[var(--store-incentive)]/40 pb-[1px]">
                          Envío Gratis
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                      {hasPickup && (
                        <div className={`inline-flex items-center gap-2 text-xs font-medium text-[var(--store-text-main)] ${isMonoTheme ? 'font-mono text-[11px]' : ''}`}>
                          <Store size={16} strokeWidth={1.75} className="text-[var(--store-text-main)] opacity-85 shrink-0" />
                          <span>Retiro en tienda</span>
                        </div>
                      )}

                      {hasLocalDelivery && (
                        <div className={`inline-flex items-center gap-2 text-xs font-medium text-[var(--store-text-main)] ${isMonoTheme ? 'font-mono text-[11px]' : ''}`}>
                          <Truck size={16} strokeWidth={1.75} className="text-[var(--store-text-main)] opacity-85 shrink-0" />
                          <span>Delivery local</span>
                        </div>
                      )}

                      {hasMrw && (
                        <div
                          className={`h-6 w-[68px] flex items-center justify-start shrink-0 text-[var(--store-text-main)] [&_svg]:h-full [&_svg]:w-full [&_svg]:block ${
                            isStoreDark ? 'brightness-125 contrast-125' : ''
                          }`}
                          title="Envíos por MRW"
                        >
                          <MrwIcon className="h-full w-full object-contain" />
                        </div>
                      )}

                      {hasZoom && (
                        <div
                          className={`h-6 w-[68px] flex items-center justify-start shrink-0 text-[var(--store-text-main)] [&_svg]:h-full [&_svg]:w-full [&_svg]:block ${
                            isStoreDark ? 'brightness-125 contrast-125' : ''
                          }`}
                          title="Envíos por Zoom"
                        >
                          <ZoomIcon className="h-full w-full object-contain" />
                        </div>
                      )}

                      {hasTealca && (
                        <div
                          className={`h-6 w-[68px] flex items-center justify-start shrink-0 text-[var(--store-text-main)] [&_svg]:h-full [&_svg]:w-full [&_svg]:block ${
                            isStoreDark ? 'brightness-125 contrast-125' : ''
                          }`}
                          title="Envíos por Tealca"
                        >
                          <TealcaIcon className="h-full w-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* COLUMNA 3: MÉTODOS DE PAGO (Logos Reales de Checkout, Sin Cajas) */}
                {activePayments.length > 0 && (
                  <div className={`${hasAnyShipping ? 'md:col-span-4' : 'md:col-span-7'} py-8 md:py-10 md:pl-8 space-y-4`}>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--store-surface-text)] block">
                      Métodos de Pago
                    </span>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3.5">
                      {activePayments.map((pm) => (
                        <div
                          key={pm.label}
                          className={`inline-flex items-center gap-2 text-xs font-medium text-[var(--store-text-main)] ${
                            isMonoTheme ? 'font-mono text-[11px]' : ''
                          }`}
                        >
                          <Icon icon={pm.icon} width={16} height={16} className="text-[var(--store-text-main)] opacity-85 shrink-0" />
                          <span>{pm.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </footer>
        );
      })()}

      {/* 🚀 VIRAL LOOP 2: EL NUDGE DE ÉXITO (Brutalist Structural Grid - Auto-Ticker Mobile & UTM Optimized) */}
      <div className="mt-16 pb-24 pt-8 w-full flex justify-center relative z-20 border-t border-[var(--store-border)]/40">
        <motion.a
          /* ⚡ UTM optimizado para atribución exacta en Footer Global */
          href="https://preziso.shop?utm_source=tienda_cliente&utm_medium=store_footer&utm_campaign=viral_loop"
          target="_blank"
          rel="noopener noreferrer"
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          variants={{
            rest: { scale: 1 },
            hover: { scale: 1 },
            tap: { scale: 0.96 }
          }}
          className="group relative inline-grid grid-cols-[auto_auto_auto] items-stretch border border-[var(--store-border)] bg-transparent overflow-hidden max-w-[95vw] sm:max-w-none shadow-none"
        >
          {/* Celda 1: Copy con Sistema Mecánico de Rodillo Automático (Funciona en Mobile sin Hover + Zero Layout Shift) */}
          <div className="relative overflow-hidden flex items-center justify-center px-3 md:px-5 py-2.5 md:py-3 border-r border-[var(--store-border)] bg-[var(--store-surface)]/30">
            <motion.div
              /* ⚡ Ticker automático de baja fricción: Cambia cada 2.5s automáticamente para impactar tráfico de IG Mobile */
              animate={{ y: ["0%", "0%", "-50%", "-50%", "0%"] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: [0.76, 0, 0.24, 1],
                times: [0, 0.4, 0.5, 0.9, 1]
              }}
              className="absolute top-0 left-0 w-full flex flex-col justify-between pointer-events-none"
              style={{ height: "200%" }}
            >
              {/* Texto Original - Reposo (Arriba) | Micro-copy Filtro de Ego */}
              <span className="h-1/2 flex items-center justify-center text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.15em] md:tracking-[0.2em] text-[var(--store-text-main)] whitespace-nowrap px-3 md:px-5">
                <span className="sm:hidden">¿Tienes una marca? Usa</span>
                <span className="hidden sm:block">Crea tu catálogo web con</span>
              </span>

              {/* Texto Contraste - Beneficio (Abajo) | Micro-copy Gatillo de Dolor */}
              <span className="h-1/2 flex items-center justify-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[var(--store-text-main)] whitespace-nowrap px-3 md:px-5">
                <span className="sm:hidden">Tasa BCV y pedidos por</span>
                <span className="hidden sm:block">Automatiza tus pedidos con</span>
              </span>
            </motion.div>

            {/* Spacer estructural rígido (Contiene el texto más largo para evitar Layout Shifts) */}
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] opacity-0 whitespace-nowrap pointer-events-none px-3 md:px-5">
              <span className="sm:hidden">¿Tienes una marca? Usa</span>
              <span className="hidden sm:block">Automatiza tus pedidos con</span>
            </span>
          </div>

          {/* Celda 2: Logo Reactivo (Adaptación automática de Luminancia/Tema) */}
          <div className="relative flex items-center justify-center px-4 md:px-6 py-2.5 md:py-3 border-r border-[var(--store-border)] bg-transparent overflow-hidden">
            <motion.div
              variants={{
                rest: { scaleY: 0, originY: 1 },
                hover: { scaleY: 1, originY: 1 },
                tap: { scaleY: 1, originY: 1 }
              }}
              transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
              className="absolute inset-0 bg-[var(--store-text-main)]/[0.04]"
            />
            <div className="relative z-10 h-[25px] md:h-[30px] w-auto flex items-center justify-center shrink-0 transition-transform duration-500 ease-out group-hover:scale-[1.03] group-active:scale-[1.03]">
              <img
                src={isStoreDark ? "/pezisologow.png" : "/pezisologo.png"}
                alt="Preziso"
                className="h-full w-auto object-contain transition-opacity duration-300"
                loading="lazy"
              />
            </div>
          </div>

          {/* Celda 3: Gatillo de Escape (Física Diagonal Hardware) */}
          <div className="relative flex items-center justify-center w-11 md:w-14 h-full bg-transparent overflow-hidden text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] group-active:text-[var(--store-text-main)] transition-colors duration-300">
            <motion.div
              variants={{
                rest: { x: 0, y: 0 },
                hover: { x: 24, y: -24 },
                tap: { x: 24, y: -24 }
              }}
              transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
              className="absolute"
            >
              <ArrowUpRight size={16} strokeWidth={1.5} />
            </motion.div>

            <motion.div
              variants={{
                rest: { x: -24, y: 24 },
                hover: { x: 0, y: 0 },
                tap: { x: 0, y: 0 }
              }}
              transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1], delay: 0.04 }}
              className="absolute"
            >
              <ArrowUpRight size={16} strokeWidth={2.5} />
            </motion.div>
          </div>
        </motion.a>
      </div>

      {/* 🚀 MODAL MINIMALISTA DE TASA DE CAMBIO */}
      <AnimatePresence>
        {isRateModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop desenfocado */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsRateModalOpen(false)}
            />

            {/* Tarjeta Modal Estilo Apple/Brutalista */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-[var(--store-bg)] border border-[var(--store-border)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] w-full max-w-[280px] p-6 flex flex-col items-center text-center overflow-hidden"
            >
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors active:scale-90"
              >
                <X size={16} strokeWidth={2.5} />
              </button>

              {/* Icono Grande en el Modal */}
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[var(--store-surface)] border border-[var(--store-border)]/50 text-[var(--store-text-main)] mb-4 shadow-sm">
                <BCVLogo className="w-7 h-auto" />
              </div>

              <h4 className="text-sm font-black text-[var(--store-text-main)] tracking-tight mb-1.5 uppercase">
                Tasa Oficial BCV
              </h4>

              <p className="text-xs text-[var(--store-surface-text)] leading-relaxed px-2 font-medium">
                Esta tienda cotiza sus precios basándose en la tasa oficial <strong className="text-[var(--store-text-main)] font-black uppercase">{isEur ? 'EUR' : 'USD'}</strong> del Banco Central de Venezuela.
              </p>

              <div className="mt-5 pt-4 border-t border-[var(--store-border)]/40 w-full flex justify-center">
                <span className="font-mono text-xl font-black tracking-tight text-[var(--store-text-main)]">
                  Bs. {activeRate.toFixed(2)}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    <FloatingCheckout
        rates={normalizedRates}
        currency={isEur ? 'eur' : 'usd'}
        phone={store.phone || '584120000000'}
        storeName={store.name}
        storeId={store.id}
        storeConfig={store}
        products={products}
        promotions={displayPromotions}
        affiliateCode={affiliateCode}
        favoriteIds={favoriteIds}
        campaignContext={campaignContext}
      />
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        currency={isEur ? 'eur' : 'usd'}
        rates={normalizedRates}
        promotions={displayPromotions}
        activePromoContext={activePromo}
        storeConfig={store}
        isFavorite={selectedProductForModal ? favoriteIds.has(String(selectedProductForModal.id)) : false}
      />

      <ProductFoodModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        product={selectedProductForModal}
      />

      {/* 🚀 MODAL DE HISTORIAL DE PEDIDOS (CLEAN LOOK) */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[var(--store-surface)] w-full max-w-sm rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] overflow-hidden flex flex-col max-h-[80vh] border border-[var(--store-border)]"
            >
              <div className="p-6 pb-4 flex justify-between items-start shrink-0 border-b border-[var(--store-border)]/50">
                <div>
                  <h3 className="font-black text-xl text-[var(--store-text-main)] tracking-tight leading-tight">Mis Pedidos</h3>
                  <p className="text-[11px] font-medium text-[var(--store-surface-text)] mt-1">Historial guardado en este dispositivo</p>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 bg-[var(--store-bg)] rounded-full text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div className="overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar bg-[var(--store-bg)]">
                {orderHistory.map((order) => (
                  <a
                    key={order.id}
                    href={`/quote/${order.id}`} // 🚀 Ruta relativa limpia (Evita el 404 por slug duplicado)
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-[var(--radius-card)] bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 shadow-[var(--shadow-ui)]
 hover:border-[var(--store-text-main)]/30 hover:shadow-md transition-all active:scale-95 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-[var(--store-bg)] p-2.5 rounded-full text-[var(--store-text-main)] border border-[var(--store-border)]/50 group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] transition-colors">
                        <FileText size={18} strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-[var(--store-text-main)]">Pedido #{order.number}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--store-surface-text)] mt-0.5">
                          {new Date(order.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight size={16} className="text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] transition-colors" />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 MODAL GLOBAL DE AUTENTICACIÓN (PASSPORT)   */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsAuthModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md z-10"
            >
              <div className="absolute top-4 right-4 z-20">
                <button onClick={() => setIsAuthModalOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors active:scale-95">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <CustomerAuth storeName={store.name} onSuccess={() => setIsAuthModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      <CartHUDIndicator />


    </div>
  )
}
