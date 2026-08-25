'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ShoppingBag, X, Plus, ImageIcon, ShoppingCart, Zap, Circle, ArrowUpRight, Tag, FileText, ArrowRight, Receipt, ChevronRight, ChevronLeft, UserCircle, Sparkles, Clock } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import { normalizeThemeConfig, generateCssVariables } from '@/utils/themeAdapter'
import Link from 'next/link'
import ProductModal from './ProductModal'
import FloatingCheckout from './FloatingCheckout'
import { isValidUUID } from '@/utils/validations'
import NumberTicker from './NumberTicker'
import ProductCard from './ProductCard'
import { getOptimizedUrl } from '@/utils/cdn'
import { MOCK_DATA } from '@/lib/mock-data'
import { TEMPLATES_REGISTRY } from '@/lib/templates-registry'
import Image from 'next/image'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import CustomerAuth from '@/components/passport/CustomerAuth'
import { getTenantHref } from '@/utils/navigation' // 🚀 IMPORTACIÓN INTEGRADA
import BCVLogo from '@/components/icons/BCVLogo' // 🚀 Importación del logo modular
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import StoreHeader from './StoreHeader'




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

// 🚀 MICRO-COMPONENTE AISLADO: HUD Central (Zero React Overhead en la tienda)
const CartHUDIndicator = () => {
  const [hudData, setHudData] = useState({ visible: false, quantity: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleHUD = (e: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setHudData({ visible: true, quantity: e.detail.quantity });
      timeoutRef.current = setTimeout(() => setHudData({ visible: false, quantity: 0 }), 1500);
    };
    document.addEventListener('showCartHUD', handleHUD);
    return () => document.removeEventListener('showCartHUD', handleHUD);
  }, []);

  return (
    <AnimatePresence>
      {hudData.visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999999] pointer-events-none flex flex-col items-center justify-center w-36 h-36 bg-[var(--store-primary)]/80 backdrop-blur-2xl rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/10"
        >
          <svg className="w-14 h-14 text-[var(--store-primary-text)] mb-2 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }} d="M20 6L9 17l-5-5" />
          </svg>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, type: "spring", damping: 15 }} className="bg-white/20 px-3 py-1 rounded-full border border-white/10">
            <span className="text-[var(--store-primary-text)] font-black text-xs tracking-widest tabular-nums">+{hudData.quantity} UND</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};




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

interface Props { store: any; products: any[]; rates: any; promotions?: any[] } // 🚀 NUEVO

// 🚀 RENOMBRAMOS LOS PROPS INTERNOS PARA INTERCEPTARLOS
export default function StoreInterface({ store: initialStore, products: initialProducts, rates, promotions = [] }: Props) {
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
      
      if (isMockMode) {
          const template = TEMPLATES_REGISTRY.find(t => t.id === baseTheme.template_id);
          const niche = template ? template.niche : 'general';
          const mockData = MOCK_DATA[niche];
          
          if (mockData) {
              // Forzamos el modo transparente y los banners duales para el simulador
              baseTheme.layout = {
                  ...baseTheme.layout,
                  logo_type: 'png_transparent',
                  logo_url: initialStore?.logo_url || mockData.logo,
                  hero_desktop_url: initialStore?.theme_config?.layout?.hero_desktop_url || mockData.hero_desktop,
                  hero_mobile_url: initialStore?.theme_config?.layout?.hero_mobile_url || mockData.hero_mobile,
              };
          }
      }
      return baseTheme;
  }, [liveConfig, initialStore?.theme_config, initialStore?.logo_url, isMockMode]);

  const activeThemeVariables = useMemo(() => generateCssVariables(activeTheme), [activeTheme]);
  
  const currentNiche = useMemo(() => {
      const template = TEMPLATES_REGISTRY.find(t => t.id === activeTheme.template_id);
      return template ? template.niche : 'general';
  }, [activeTheme.template_id]);

  const products = isMockMode && MOCK_DATA[currentNiche] ? MOCK_DATA[currentNiche].products : initialProducts;
// 🚀 3. INTERCEPTOR DE PROMOCIONES (Holograma Promocional)
  const displayPromotions = useMemo(() => {
      if (isMockMode && MOCK_DATA[currentNiche]?.promotion) {
          return [{
              ...MOCK_DATA[currentNiche].promotion,
              id: 'mock-promo-1',
              is_active: true,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +24 horas de urgencia viva
          }];
      }
      return promotions || [];
  }, [isMockMode, currentNiche, promotions]);

  const store = useMemo(() => {
      if (!isMockMode || !MOCK_DATA[currentNiche]) return initialStore;
      return {
          ...initialStore,
          // Mantenemos esto por retrocompatibilidad con componentes legacy
          logo_url: activeTheme.layout.logo_url,
          hero_url: activeTheme.layout.hero_desktop_url,
          // 🚀 INYECCIÓN CRÍTICA: Pasamos el holograma a la cabecera
          theme_config: activeTheme,
      }
  }, [initialStore, isMockMode, currentNiche, activeTheme]);

 
  // LÓGICA BOUTIQUE Y CAMPAÑAS
  // LÓGICA BOUTIQUE Y CAMPAÑAS
  const pasilloQuery = searchParams?.get('pasillo')
  const expQuery = searchParams?.get('exp') // 👈 Obtenemos la expiración
  const [isBoutiqueMode, setIsBoutiqueMode] = useState(!!pasilloQuery)
  const [campaignContext, setCampaignContext] = useState<string | null>(pasilloQuery || null)

  // 🚀 ESTADOS DEL RELOJ FLASH
  const [isMounted, setIsMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    setIsMounted(true);
    if (!expQuery) return;

    const targetTime = parseInt(expQuery, 10);

    const updateTimer = () => {
      const now = Date.now();
      const distance = targetTime - now;

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


  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  // Ajusta 'storeData.theme' o 'storeData.isDark' según la estructura real de tu objeto
  const isDarkTheme = store?.theme === "dark" || store?.isDark === true;
  const [activePromo, setActivePromo] = useState<any>(null)
  const [featuredScrollStatus, setFeaturedScrollStatus] = useState({ left: false, right: true })
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // 🚀 El selectedCategory arranca en el pasillo (si existe) o en 'Todos'
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return pasilloQuery ? (pasilloQuery.charAt(0).toUpperCase() + pasilloQuery.slice(1).toLowerCase()) : 'Todos'
  })


  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)
  const [isStickyVisible, setIsStickyVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isDarkHero, setIsDarkHero] = useState(true)
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1) // 🚀 NUEVO ESTADO DE PAGINACIÓN
  const [isMobile, setIsMobile] = useState(true) // 🚀 NUEVO ESTADO RESPONSIVO
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null)
  const [showPromoModal, setShowPromoModal] = useState(false)

  // 🚀 LECTURA DE CONFIGURACIÓN FISCAL PARA EL CATÁLOGO
  const showTaxInCatalog = store?.show_tax_in_catalog === true && store?.fiscal_profile !== 'informal';
  const taxPercentage = store?.default_tax_percentage || 16;





  // 🚀 2. REEMPLAZA LA FUNCIÓN CON ESTA NUEVA LÓGICA:
  const exitBoutiqueMode = () => {
    // Reemplazamos la URL usando el pathname actual, eliminando el query param de forma segura
    router.replace(pathname, { scroll: false })
    setIsBoutiqueMode(false)
    setSelectedCategory('Todos')
    setSearch('')
  }

  // 2. REFS DE CONTROL DEL DOM
  const carouselRef = useRef<HTMLDivElement>(null)
  const featuredCarouselRef = useRef<HTMLDivElement>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const catalogTopRef = useRef<HTMLDivElement>(null) // 🚀 NUEVA REFERENCIA DE ANCLAJE

  // 3. HOOKS DE PAQUETES EXTERNOS / ANIMACIÓN
  const supabase = useMemo(() => getSupabase(), [])
  // 🚀 OPTIMIZACIÓN: El componente padre solo se re-renderizará si cambian los ítems o el historial.
  const items = useCart(state => state.items)
  const orderHistory = useCart(state => state.orderHistory)
  const cartControls = useAnimation()
  const badgeControls = useAnimation()

  // 4. MEMOS Y CONSTANTES DE DERIVACIÓN (Usando ? por seguridad si store es nulo)
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0)
  const hasItems = items.length > 0
  const isEur = store?.currency_type === 'eur'
  const activeRate = isEur ? Number(rates?.eur_rate || 0) : Number(rates?.usd_rate || 0)

  // 5. MÉTODOS DE AYUDA Y AUXILIARES
  const checkFeaturedScrollStatus = () => {
    if (!featuredCarouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = featuredCarouselRef.current;
    const canScrollLeft = scrollLeft > 4;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - 4;
    setFeaturedScrollStatus({ left: canScrollLeft, right: canScrollRight });
  }

  const scrollFeatured = (dir: 'left' | 'right') => {
    if (featuredCarouselRef.current) {
      const container = featuredCarouselRef.current;
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: dir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const container = categoryScrollRef.current;
    const scrollAmount = (container.clientWidth * 0.6) || 300;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }

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

  const { featured: featuredProducts, standard: standardProducts } = useMemo(() => {
    let baseFiltered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      const productCatClean = normalizeCategory(p.category)
      const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory
      const matchesPromo = activePromo ? (activePromo.linked_products || []).some((id: any) => String(id) === String(p.id)) : true
      return matchesSearch && matchesCategory && matchesPromo
    })

    // 🚀 SMART MERCHANDISING: Ordena stock crítico a la cima en Modo Boutique
    if (isBoutiqueMode) {
      baseFiltered.sort((a, b) => {
        const stockA = a.product_variants?.length > 0 ? a.product_variants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) : (a.stock || 0);
        const stockB = b.product_variants?.length > 0 ? b.product_variants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) : (b.stock || 0);
        const isCriticalA = stockA > 0 && stockA <= 3 ? 1 : 0;
        const isCriticalB = stockB > 0 && stockB <= 3 ? 1 : 0;
        return isCriticalB - isCriticalA;
      });
    }

    const featured = baseFiltered.filter(p => p.is_featured)
    return { featured, standard: baseFiltered }
  }, [products, debouncedSearch, selectedCategory, activePromo, isBoutiqueMode])


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
      const destCenterY = destRect.top + destRect.height / 2;
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

  useEffect(() => {
    if (!store?.hero_url) return;
    const img = new window.Image()
    img.crossOrigin = "Anonymous";
    img.src = store.hero_url;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width; canvas.height = img.height * 0.2;
        ctx.drawImage(img, 0, 0, img.width, img.height * 0.2, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
        const pixels = data.length / 4;
        const luminance = ((r / pixels) * 299 + (g / pixels) * 587 + (b / pixels) * 114) / 1000;
        setIsDarkHero(luminance < 128);
      } catch (e) {
        setIsDarkHero(true);
      }
    };
  }, [store?.hero_url]);

  // 🚀 REINICIO DE PÁGINA AL BUSCAR O FILTRAR
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, selectedCategory])

  // 🚀 DETECCIÓN ULTRA-LIGERA DEL DISPOSITIVO
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile() // Comprobación inicial
    window.addEventListener('resize', checkMobile, { passive: true })
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY
        if (currentScrollY < 350) { setIsStickyVisible(true); setLastScrollY(currentScrollY); return; }
        setIsStickyVisible(currentScrollY <= lastScrollY)
        setLastScrollY(currentScrollY)
      }
    }
    window.addEventListener('scroll', controlNavbar, { passive: true })
    return () => window.removeEventListener('scroll', controlNavbar)
  }, [lastScrollY])

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
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) { carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' }); }
        else { carouselRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' }); }
      }
    }, 5000);
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

  const handleOpenProduct = (product: any) => { setSelectedProductForModal(product); setIsModalOpen(true); }

  const getProductPricing = (product: any) => {
    const cashPrice = Number(product.usd_cash_price || 0)
    const markup = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + markup
    const priceInBs = listPrice * activeRate
    const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0
    return { cashPrice, priceInBs, discountPercent, hasDiscount: markup > 0 }
  }



  // 🚀 DETECCIÓN INFALIBLE V2: Superposición de estados (Base de Datos + Motor de Luminancia)
  const isStoreDark = useMemo(() => {
    // 1. Validamos si hay una bandera explícita de modo oscuro en la BD original
    if (store?.theme === "dark" || store?.isDark === true) return true;

    // 2. Si no la hay, analizamos matemáticamente el color hexadecimal inyectado
    try {
      const rawBg = activeTheme.colors?.background || '#ffffff';

      // Control de errores por si el usuario guardó palabras en lugar de HEX
      if (rawBg.toLowerCase() === 'black' || rawBg.includes('0, 0, 0')) return true;

      const bgHex = rawBg.replace('#', '');
      const r = parseInt(bgHex.length === 3 ? bgHex[0] + bgHex[0] : bgHex.substring(0, 2), 16);
      const g = parseInt(bgHex.length === 3 ? bgHex[1] + bgHex[1] : bgHex.substring(2, 4), 16);
      const b = parseInt(bgHex.length === 3 ? bgHex[2] + bgHex[2] : bgHex.substring(4, 6), 16);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return (r * 0.299 + g * 0.587 + b * 0.114) < 128; // Menor a 128 = Fondo oscuro
      }
    } catch (e) { }

    return false; // Por defecto es claro
  }, [store, activeTheme]);

  // Estado para controlar si el scroll ha avanzado hacia la derecha (activando la máscara izquierda)
  const [isScrolledLeft, setIsScrolledLeft] = useState(false);

  // Función atada al evento onScroll del contenedor
  const handleCategoryScroll = () => {
    if (categoryScrollRef.current) {
      // Si scrollLeft es mayor a 0, significa que nos hemos desplazado
      setIsScrolledLeft(categoryScrollRef.current.scrollLeft > 0);
    }
  };

  // 🚀 ESTA ES LA LÍNEA QUE SE HABÍA BORRADO:
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

  // Manejador de transición ultra-rápida al elegir una nueva categoría
  const handleExploreCategory = (catName: string) => {
    setSelectedCategory(catName);
    setCurrentPage(1);
    if (catalogTopRef.current) {
      const y = catalogTopRef.current.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

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

      {/* 2. BANNER DE CAMPAÑA FLASH */}
      <AnimatePresence>
        {isMounted && isBoutiqueMode && expQuery && !isExpired && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-center gap-3 overflow-hidden"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Venta Flash expira en:</span>
            <span className="font-mono font-black text-sm tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              {timeLeft}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 3. ENCABEZADO PROTAGÓNICO (AHORA MANEJA EL HERO INTERNAMENTE) */}
      <StoreHeader
        layoutStyle={activeTheme.layout?.header_style || 'classic'}
        store={store}
        activeRate={activeRate}
        isEur={isEur}
        search={search}
        setSearch={setSearch}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
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
        onProfileClick={() => currentUser ? router.push(getTenantHref('/passport', store.slug)) : setIsAuthModalOpen(true)}
      />




     {/* 5. PROMOCIONES Y CONTENIDO PRINCIPAL */}
      {displayPromotions && displayPromotions.length > 0 && (
        <div className="w-full bg-[var(--store-bg)] border-b border-[var(--store-border)] overflow-hidden relative z-30">
          <div ref={carouselRef} className="flex overflow-x-auto  rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] snap-x snap-mandatory no-scrollbar m-3 md:m-9" style={{ scrollBehavior: 'smooth' }}>
            {displayPromotions.map((promo: any) => {
              const isActive = activePromo?.id === promo.id;
              const cardStyle = activeTheme.layout?.card_style || 'standard';

              // ==========================================
              // 🛠️ VARIANTE 1: INDUSTRIAL (El HUD Logístico)
              // ==========================================
              if (cardStyle === 'dense_hardware') {
                  return (
                      <div key={promo.id}
                          onClick={() => { setActivePromo(isActive ? null : promo); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                          className={`w-full shrink-0 snap-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${isActive ? 'opacity-100' : 'opacity-95 hover:opacity-100'}`}
                          style={{ backgroundColor: promo.bg_color || '#000' }}>
                          
                          {/* Patrón de Cinta de Precaución Industrial */}
                          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 2px, transparent 2px, transparent 12px)', color: promo.text_color || '#fff' }}></div>
                          
                          <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row relative z-10 h-full">
                              {promo.image_url && (
                                  <div className="p-4 md:p-6 flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r" style={{ borderColor: `${promo.text_color}30`, backgroundColor: `${promo.text_color}05` }}>
                                      <div className="w-16 h-16 md:w-24 md:h-24 relative">
                                          <Image src={getOptimizedUrl(promo.image_url)} alt={promo.title} fill sizes="100px" className="object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-500" />
                                      </div>
                                  </div>
                              )}
                              <div className="p-4 md:p-6 flex-1 flex flex-col justify-center border-b md:border-b-0 md:border-r" style={{ borderColor: `${promo.text_color}30` }}>
                                  {promo.tagline && <span className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1 opacity-80" style={{ color: promo.text_color || '#fff' }}>[ {promo.tagline} ]</span>}
                                  <h4 className="font-sans font-black text-2xl md:text-3xl uppercase tracking-tighter leading-none line-clamp-2" style={{ color: promo.text_color || '#fff' }}>{promo.title}</h4>
                              </div>
                              <div className="p-4 md:p-6 flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 shrink-0 min-w-[220px]" style={{ backgroundColor: `${promo.text_color}05` }}>
                                 <div className={`px-4 py-2.5 font-mono font-black text-[10px] md:text-xs uppercase tracking-widest border-2 w-full flex items-center justify-center gap-1.5 transition-all ${isActive ? 'scale-95' : 'group-hover:scale-105'}`} style={{ backgroundColor: isActive ? 'transparent' : (promo.text_color || '#fff'), color: isActive ? (promo.text_color || '#fff') : (promo.bg_color || '#000'), borderColor: promo.text_color || '#fff' }}>
                                      {isActive ? '✕ CANCELAR' : <><Zap size={14} className="fill-current" /> RECLAMAR</>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              }

              // ==========================================
              // 💎 VARIANTE 2: LUXURY (La Invitación VIP)
              // ==========================================
              if (cardStyle === 'editorial') {
                  return (
                      <div key={promo.id}
                          onClick={() => { setActivePromo(isActive ? null : promo); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                          className={`w-full shrink-0 snap-center cursor-pointer transition-all duration-700 relative group overflow-hidden ${isActive ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                          style={{ backgroundColor: promo.bg_color || '#000' }}>
                          
                          {/* Gradiente sutil de iluminación */}
                          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 80% 50%, ${promo.text_color} 0%, transparent 60%)` }}></div>

                          <div className="max-w-[1500px] mx-auto px-6 md:px-16 py-8 md:py-12 flex flex-col-reverse md:flex-row items-center justify-between gap-8 md:gap-16 relative z-10">
                              <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                                  {promo.tagline && <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] mb-3" style={{ color: promo.text_color || '#fff', opacity: 0.7 }}>{promo.tagline}</span>}
                                  <h4 className="font-heading text-3xl md:text-5xl tracking-wide leading-tight mb-4" style={{ color: promo.text_color || '#fff' }}>{promo.title}</h4>
                                  
                                  {promo.expires_at && <PromoCountdown expiresAt={promo.expires_at} color={promo.text_color || '#fff'} variant="editorial" />}
                                  
                                  <div className="mt-6 flex items-center gap-3">
                                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] border-b pb-1 transition-all" style={{ color: promo.text_color || '#fff', borderColor: isActive ? 'transparent' : `${promo.text_color}40` }}>
                                          {isActive ? 'Cerrar Colección' : 'Descubrir Colección'}
                                      </span>
                                      <ArrowRight size={14} className={`transition-transform duration-500 ${isActive ? 'rotate-45' : 'group-hover:translate-x-2'}`} style={{ color: promo.text_color || '#fff' }} />
                                  </div>
                              </div>
                              {promo.image_url && (
                                  <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 relative flex items-center justify-center">
                                      <Image src={getOptimizedUrl(promo.image_url)} alt={promo.title} fill sizes="200px" className="object-contain drop-shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105" />
                                  </div>
                              )}
                          </div>
                      </div>
                  );
              }

              // ==========================================
              // 🌟 VARIANTE 3: UNIVERSAL (El Bloque Comercial)
              // ==========================================
              return (
                <div key={promo.id}
                  onClick={() => {
                    setActivePromo(isActive ? null : promo)
                    window.scrollTo({ top: 400, behavior: 'smooth' })
                  }}
                  className={`w-full shrink-0 snap-center cursor-pointer transition-all duration-500 relative group overflow-hidden ${isActive ? 'opacity-100' : 'opacity-95 hover:opacity-100'}`}
                  style={{ backgroundColor: promo.bg_color || '#000' }}>

                  {/* Brillo interno (Glassmorphism / Hardware feel) */}
                  <div className="absolute inset-0 border-[0.5px] pointer-events-none" style={{ borderColor: `${promo.text_color}15` }}></div>

                  <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-5 md:py-6 flex flex-row items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                      {/* La imagen optimizada flotante */}
                      {promo.image_url && (
                        <div className="w-14 h-14 md:w-20 md:h-20 shrink-0 relative flex items-center justify-center">
                          <Image src={getOptimizedUrl(promo.image_url)} alt={promo.title} fill sizes="80px" className="object-contain  drop-shadow-xl transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-translate-y-0.5" />
                        </div>
                      )}

                      {/* Jerarquía Tipográfica Estricta */}
                      <div className="flex flex-col min-w-0 justify-center">
                        {promo.tagline && (
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate" style={{ color: promo.text_color || '#fff', opacity: 0.8 }}>
                            {promo.tagline}
                          </span>
                        )}
                        <div className="flex items-center flex-wrap gap-1 md:gap-2">
                          {/* 🚀 TÍTULO BLINDADO: line-clamp-2 para que envuelva elegante y pr-2 para evitar el corte de fuente */}
                          <h4 className="font-black text-xl md:text-3xl tracking-tighter leading-none line-clamp-2 pr-2 pb-0.5" style={{ color: promo.text_color || '#fff' }}>
                            {promo.title}
                          </h4>

                          {/* 🚀 RELOJ FOMO INTEGRADO */}
                          {promo.expires_at && <PromoCountdown expiresAt={promo.expires_at} color={promo.text_color || '#fff'} variant="standard" />}
                        </div>
                      </div>
                    </div>

                    {/* 🚀 CTA INEQUÍVOCO (Botón Real de Alto Contraste) */}
                    <div className="shrink-0 pl-2">
                      <div
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 md:px-6 md:py-3 rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-sm ${isActive ? 'scale-95' : 'group-hover:scale-105'}`}
                        style={{
                          backgroundColor: isActive ? 'transparent' : (promo.text_color || '#fff'),
                          color: isActive ? (promo.text_color || '#fff') : (promo.bg_color || '#000'),
                          border: `1px solid ${isActive ? promo.text_color : 'transparent'}`
                        }}
                      >
                        <span>{isActive ? 'Quitar Filtro ✕' : 'Ver Oferta'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <main className="max-w-[1500px] mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-24">

        <>
          {/* 🚀 ESCAPARATE EDITORIAL (Lo más vendido) */}
          {featuredProducts.length > 0 && !debouncedSearch && !isBoutiqueMode && (
            <section className="mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className={`flex items-end justify-between mb-6 px-1 ${activeTheme.layout?.card_style === 'dense_hardware' ? ' pb-2' : ''}`}>
                {activeTheme.layout?.card_style === 'dense_hardware' ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-1">Stock de Alta Rotación</span>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight text-[var(--store-text-main)] uppercase">Top Ventas</h2>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-[var(--store-text-main)]">Lo más vendido</h2>
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

                {/* Carrusel Horizontal */}
                <div
                  ref={featuredCarouselRef} // 🚀 CONECTAMOS LA REFERENCIA
                  onScroll={checkFeaturedScrollStatus} // 🚀 DETECTA EL MOVIMIENTO REACTIVAMENTE
                  className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-6 -mx-4 ml-2 md:ml-0 px-4 snap-x snap-mandatory scroll-smooth"
                >
                  {featuredProducts.map((product: any, idx: number) => {
                    const pricing = getProductPricing(product)
                    const isCompletelyOutOfStock = product.product_variants && product.product_variants.length > 0
                      ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0) <= 0
                      : (product.stock || 0) <= 0;

                    return (
                      <div key={`feat-${product.id}`} className="w-[280px] md:w-[320px] shrink-0 snap-start flex">
                        <ProductCard
                          product={product}
                          pricing={pricing}
                          onOpen={handleOpenProduct}
                          isOutOfStock={isCompletelyOutOfStock}
                          index={idx}
                          isFavorite={favoriteIds.has(String(product.id))}
                          showTaxIndicator={showTaxInCatalog}
                          taxPercentage={taxPercentage}
                          cardStyle={activeTheme.layout?.card_style || 'standard'} // 🚀 AÑADIR ESTA LÍNEA
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
          <div ref={catalogTopRef} className="w-full h-px mt-2"></div>

          {/* 🚀 REJILLA PAGINADA DE PRODUCTOS (Carga diferida solucionada) */}
          <div className={`grid min-h-[40vh] ${activeTheme.layout?.card_style === 'dense_hardware'
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3.5'
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8'
            }`}>
            {paginatedProducts.map((product: any, index: number) => {
              const pricing = getProductPricing(product)
              const isCompletelyOutOfStock = product.product_variants && product.product_variants.length > 0
                ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0) <= 0
                : (product.stock || 0) <= 0;

              // 🚀 SMART MERCHANDISING: Evaluamos si el stock es crítico (1 a 3 unidades)
              const totalStock = product.product_variants && product.product_variants.length > 0
                ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0)
                : (product.stock || 0);
              const isCritical = isBoutiqueMode && totalStock > 0 && totalStock <= 3;

              return (
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
                  cardStyle={activeTheme.layout?.card_style || 'standard'} // 🚀 AÑADIR ESTA LÍNEA
                />
              )
            })}
          </div>

          {/* 🚀 CONTROLES DE PAGINACIÓN PREMIUM (Estilo Clean UI Cero Sombras) */}
          {totalPages > 1 && (
            <div className="mt-14 mb-4 flex items-center justify-center gap-1.5 md:gap-2">
              {/* Botón Anterior */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 md:px-4 md:py-2 flex items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] text-[11px] md:text-xs font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] hover:bg-[var(--store-surface)] active:scale-95"
              >
                <ChevronLeft size={16} strokeWidth={2.5} className="md:mr-1" />
                <span className="hidden md:inline">Ant</span>
              </button>

              {/* Números de Página Inteligentes */}
              <div className="flex items-center gap-1 md:gap-1.5">
                {getPaginationRange().map((page, idx) => (
                  page === "..." ? (
                    <span key={`dots-${idx}`} className="w-6 md:w-8 flex justify-center text-[var(--store-surface-text)] text-xs font-bold tracking-widest select-none">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] text-[11px] md:text-xs font-bold transition-all duration-300 active:scale-95 ${currentPage === page
                        ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)]'
                        : 'bg-transparent text-[var(--store-text-main)] hover:bg-[var(--store-surface)] border border-transparent hover:border-[var(--store-border)]/50'
                        }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              {/* Botón Siguiente */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 md:px-4 md:py-2 flex items-center justify-center rounded-[var(--radius-btn)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] text-[11px] md:text-xs font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] hover:bg-[var(--store-surface)] active:scale-95"
              >
                <span className="hidden md:inline">Sig</span>
                <ChevronRight size={16} strokeWidth={2.5} className="md:ml-1" />
              </button>
            </div>
          )}

         {/* ========================================== */}
          {/* 🚀 COMPONENTE: BOTTOM NAVIGATION GRID (Polimórfico) */}
          {/* ========================================== */}
          {explorableCategories.length > 0 && (
            <div className="mt-8 md:mt-12 pt-8 border-t border-[var(--store-border)]/40 w-full animate-in fade-in duration-500">
              
              {activeTheme.layout?.card_style === 'dense_hardware' ? (
                /* 🛠️ TEMA 2 (INDUSTRIAL): Directorio de Partes */
                <>
                  <div className="flex items-center justify-between mb-4 md:mb-5 px-1 border-b border-[var(--store-border)] pb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-[var(--store-surface-text)] uppercase tracking-widest mb-1">Directorio de Inventario</span>
                      <h3 className="text-lg md:text-xl font-black tracking-tight text-[var(--store-text-main)] uppercase">Categorías Técnicas</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                    {explorableCategories.map((cat: any) => (
                      <button key={cat.name} onClick={() => handleExploreCategory(cat.name)} className="group flex items-center gap-3 p-3 bg-[var(--store-surface)] border-[length:var(--border-width-ui)] border-[var(--store-border)] hover:border-[var(--store-primary)] transition-all active:scale-[0.98] text-left shadow-[var(--shadow-ui)] rounded-[var(--radius-card)]">
                        {cat.coverUrl && !cat.useSolidColor ? (
                          <div className="w-12 h-12 shrink-0 relative bg-[var(--store-bg)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 overflow-hidden rounded-[var(--radius-btn)]">
                            <Image src={getOptimizedUrl(cat.coverUrl)} alt={cat.name} fill sizes="48px" className="object-cover grayscale group-hover:grayscale-0 transition-all duration-300" loading="lazy" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 shrink-0 bg-[var(--store-bg)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/50 flex items-center justify-center rounded-[var(--radius-btn)]">
                            <span className="font-mono text-[10px] font-bold text-[var(--store-surface-text)]">00</span>
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-xs text-[var(--store-text-main)] uppercase tracking-wide truncate group-hover:text-[var(--store-primary)] transition-colors">{cat.name}</span>
                          <span className="font-mono text-[10px] text-[var(--store-surface-text)] mt-0.5">{cat.count} ITEMS</span>
                        </div>
                        <ChevronRight size={16} className="text-[var(--store-surface-text)] group-hover:text-[var(--store-primary)] shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </>
              ) : activeTheme.layout?.card_style === 'editorial' ? (
                /* 💎 TEMA 3 (LUXURY): Lookbook Editorial */
                <>
                  <div className="flex flex-col items-center text-center mb-8 md:mb-10 px-1">
                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] uppercase tracking-[0.25em] mb-2">Descubrir</span>
                    <h3 className="text-2xl md:text-4xl font-black tracking-tight text-[var(--store-text-main)] font-heading">
                      Explorar Colecciones
                    </h3>
                  </div>
                  <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-8 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {explorableCategories.map((cat: any) => (
                      <button key={cat.name} onClick={() => handleExploreCategory(cat.name)} className="group relative shrink-0 w-[220px] md:w-[300px] aspect-[3/4] overflow-hidden snap-start flex flex-col justify-center items-center text-center active:scale-[0.98] transition-transform duration-700 rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] border-[var(--store-border)]/30 shadow-[var(--shadow-ui)]">
                        {cat.coverUrl && !cat.useSolidColor ? (
                          <Image src={getOptimizedUrl(cat.coverUrl)} alt={cat.name} fill sizes="300px" className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110" loading="lazy" />
                        ) : (
                          <div className="absolute inset-0 bg-[var(--store-surface)]" />
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-700" />
                        <div className="relative z-10 p-6 w-full flex flex-col items-center">
                          <span className="block font-heading font-black text-white text-2xl md:text-3xl tracking-wide mb-2 drop-shadow-md">{cat.name}</span>
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/90 border-b border-white/40 pb-1">Ver {cat.count} piezas</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* 🌟 TEMA 1 (UNIVERSAL): Carrusel Lifestyle B2C */
                <>
                  <div className="flex items-center justify-between mb-4 md:mb-5 px-1">
                    <h3 className="text-sm md:text-base font-black tracking-tight text-[var(--store-text-main)] uppercase">Explora más categorías</h3>
                  </div>
                  <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth">
                    {explorableCategories.map((cat: any) => (
                      <button key={cat.name} onClick={() => handleExploreCategory(cat.name)} className="group relative shrink-0 w-[140px] h-[140px] md:w-[170px] md:h-[170px] rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] overflow-hidden snap-start flex flex-col justify-end text-left active:scale-95 transition-transform duration-300 border border-[var(--store-border)]/30" style={{ backgroundColor: cat.useSolidColor ? 'var(--store-primary)' : 'var(--store-surface)' }}>
                        {!cat.useSolidColor && cat.coverUrl && <Image src={getOptimizedUrl(cat.coverUrl)} alt={cat.name} fill sizes="170px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />}
                        {!cat.useSolidColor && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />}
                        <div className="relative z-10 p-3 md:p-4 w-full">
                          <span className={`block font-black tracking-tight leading-none line-clamp-1 ${cat.useSolidColor ? 'text-[var(--store-primary-text)] text-lg md:text-xl' : 'text-white text-base md:text-lg'}`}>{cat.name}</span>
                          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1.5 opacity-90 ${cat.useSolidColor ? 'text-[var(--store-primary-text)]/80' : 'text-gray-300'}`}>{cat.count} Productos</span>
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
              <div className="bg-[#1a1a1a] text-white px-5 py-4 rounded-[var(--radius-card)] border-[length:var(--border-width-ui)] shadow-[var(--shadow-ui)] flex items-center gap-4 max-w-sm w-full pointer-events-auto border border-gray-800">
                <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full shrink-0">
                  <Tag size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Beneficio Desbloqueado</p>
                  <p className="text-sm font-black leading-tight">
                    Descuento activado gracias a <span className="text-emerald-400">{affiliateCode.toUpperCase()}</span>
                  </p>
                </div>
                <button onClick={() => setShowPromoModal(false)} className="text-gray-500 hover:text-white transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

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
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        currency={isEur ? 'eur' : 'usd'}
        phone={store.phone || '584120000000'}
        storeName={store.name}
        storeId={store.id}
        storeConfig={{ ...store, theme_config: activeTheme }}
        products={products}
        promotions={displayPromotions}
        affiliateCode={affiliateCode}
        favoriteIds={favoriteIds}
        campaignContext={campaignContext} // 👈 INYECTA ESTA LÍNEA
      />
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        currency={isEur ? 'eur' : 'usd'}
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        promotions={displayPromotions}
        activePromoContext={activePromo}
       storeConfig={{ ...store, theme_config: activeTheme }}
        isFavorite={selectedProductForModal ? favoriteIds.has(String(selectedProductForModal.id)) : false}
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
                      <div className="bg-[var(--store-bg)] p-2.5 rounded-full text-[var(--store-primary)] border border-[var(--store-border)]/50 group-hover:bg-[var(--store-primary)] group-hover:text-[var(--store-primary-text)] transition-colors">
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