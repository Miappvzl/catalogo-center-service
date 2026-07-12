'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ShoppingBag, X, Plus, ImageIcon, ShoppingCart, Zap, Circle, ArrowUpRight, Tag, FileText, ArrowRight, Receipt, ChevronRight, ChevronLeft, UserCircle } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Link from 'next/link'
import ProductModal from './ProductModal'
import FloatingCheckout from './FloatingCheckout'
import NumberTicker from './NumberTicker'
import ProductCard from './ProductCard'
import { getOptimizedUrl } from '@/utils/cdn'
import Image from 'next/image'
import { AnimatePresence, motion, useAnimation } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import CustomerAuth from '@/components/passport/CustomerAuth'
import { getTenantHref } from '@/utils/navigation' // 🚀 IMPORTACIÓN INTEGRADA




const CategoryPill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 md:px-6 md:py-2 rounded-full text-[11px] md:text-xs font-bold tracking-wide transition-all duration-300 border active:scale-95 whitespace-nowrap ${active
      ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]'
      : 'bg-[var(--store-surface)] text-[var(--store-text-main)] border-[var(--store-border)]/40 hover:bg-[var(--store-surface)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)]'
      }`}
  >
    {label}
  </button>
)

// 🚀 MICRO-COMPONENTE OPTIMIZADO: The Live Pill (Tabular Nums & Pulse)
const PromoCountdown = ({ expiresAt, color }: { expiresAt: string, color: string }) => {
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
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999999] pointer-events-none flex flex-col items-center justify-center w-36 h-36 bg-[var(--store-primary)]/80 backdrop-blur-2xl rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/10"
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

export default function StoreInterface({ store, products, rates, promotions = [] }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. TODOS LOS HOOKS DE ESTADO JUNTOS (INCONDICIONALES)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [activePromo, setActivePromo] = useState<any>(null)
  const [featuredScrollStatus, setFeaturedScrollStatus] = useState({ left: false, right: true })
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [liveConfig, setLiveConfig] = useState<any>(store?.theme_config || null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)
  const [isStickyVisible, setIsStickyVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isDarkHero, setIsDarkHero] = useState(true)
  const [visibleCount, setVisibleCount] = useState(12)
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null)
  const [showPromoModal, setShowPromoModal] = useState(false)

  // 2. REFS DE CONTROL DEL DOM
  const carouselRef = useRef<HTMLDivElement>(null)
  const featuredCarouselRef = useRef<HTMLDivElement>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const observerTarget = useRef<HTMLDivElement>(null)

  // 3. HOOKS DE PAQUETES EXTERNOS / ANIMACIÓN
  const supabase = useMemo(() => getSupabase(), [])
  const { items, orderHistory } = useCart()
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

  // 🚀 CLASIFICACIÓN (DECLARADA ANTES DE LOS EFFECTS QUE LA LEEN)
  const { featured: featuredProducts, standard: standardProducts } = useMemo(() => {
    const baseFiltered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      const productCatClean = normalizeCategory(p.category)
      const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory
      const matchesPromo = activePromo ? (activePromo.linked_products || []).some((id: any) => String(id) === String(p.id)) : true
      return matchesSearch && matchesCategory && matchesPromo
    })
    const featured = baseFiltered.filter(p => p.is_featured)
    return { featured, standard: baseFiltered }
  }, [products, debouncedSearch, selectedCategory, activePromo])

  // 6. TODOS LOS EFECTOS DE CICLO DE VIDA (UNIFICADOS ABAJO)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => setCurrentUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setCurrentUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // 🚀 OPTIMIZACIÓN: Onboarding Silencioso de Inquilino y Carga de Favoritos (Vía RPC Seguro)
  useEffect(() => {
    if (!currentUser || !store?.id) {
      setFavoriteIds(new Set())
      return
    }

    const initCustomerOnStore = async () => {
      try {
        // 1. Silent Onboarding Seguro: Invocamos el RPC con privilegios elevados en el servidor
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
      const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
      const isPrezisoDomain = event.origin.includes('preziso.shop');
      if (!isLocalhost && !isPrezisoDomain) return;
      if (event.data?.type === 'UPDATE_THEME') {
        setLiveConfig(event.data.config);
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

  useEffect(() => {
    setVisibleCount(12)
  }, [debouncedSearch, selectedCategory])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((prev) => prev + 12)
    }, { threshold: 0.1 })
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
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
    if (!promotions || promotions.length <= 1) return;
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) { carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' }); }
        else { carouselRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' }); }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [promotions]);

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

  const activeTheme = liveConfig || store?.theme_config || { colors: { primary: '#000000', primary_text: '#ffffff', background: '#ffffff' } };

  // Estado para controlar si el scroll ha avanzado hacia la derecha (activando la máscara izquierda)
  const [isScrolledLeft, setIsScrolledLeft] = useState(false);

  // Función atada al evento onScroll del contenedor
  const handleCategoryScroll = () => {
    if (categoryScrollRef.current) {
      // Si scrollLeft es mayor a 0, significa que nos hemos desplazado
      setIsScrolledLeft(categoryScrollRef.current.scrollLeft > 0);
    }
  };

  const dynamicMask = `linear-gradient(to right, ${isScrolledLeft ? 'transparent' : '#000'
    } 0%, #000 40px, #000 calc(100% - 40px), transparent 100%)`;


  // ==========================================
  // 🎨 PINTADO PRINCIPAL DE LA TIENDA VIVA
  // ==========================================
  return (
    <div className="min-h-screen bg-[var(--store-bg)] pb-8 font-sans selection:bg-[var(--store-primary)] selection:text-[var(--store-primary-text)]" style={{

      // Los 3 originales
      '--store-primary': activeTheme.colors?.primary || '#000000',
      '--store-primary-text': activeTheme.colors?.primary_text || '#ffffff',
      '--store-bg': activeTheme.colors?.background || '#ffffff',

      // 🚀 Los 4 nuevos que le dan soporte absoluto al Modo Oscuro y White-Label
      '--store-text-main': activeTheme.colors?.text_main || '#111111',
      '--store-surface': activeTheme.colors?.surface || '#ffffff',
      '--store-surface-text': activeTheme.colors?.surface_text || '#6b7280',
      '--store-border': activeTheme.colors?.border || '#d4d4d499',
      // 🚀 La nueva variable psicológica
      '--store-incentive': activeTheme.colors?.incentive || '#059669',

    } as React.CSSProperties}
    >

      {/* 🚀 INYECCIÓN: BANNER DE MEMORIA PERSISTENTE (Aparecerá hasta arriba de todo) */}
      <QuoteRecoveryBanner currentSlug={store.slug} />



      {/* --- 1. STORE INFO HEADER (CLEAN LOOK) --- */}
      <div className="bg-[var(--store-bg)] px-4 md:px-8 py-3.5 flex items-center justify-between border-b border-[var(--store-border)]/30">

        {/* Logo & Store Info */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative shrink-0">
            {store.logo_url ? (
              <Image src={getOptimizedUrl(store.logo_url)} width={44} height={44} className="w-10 h-10 md:w-11 md:h-11 object-contain rounded-full border border-[var(--store-border)] shadow-sm" alt="Logo" />
            ) : (
              <div className="w-10 h-10 md:w-11 md:h-11 bg-[var(--store-surface)] rounded-full flex items-center justify-center text-[var(--store-surface-text)] border border-[var(--store-border)] shadow-sm">
                <ShoppingBag size={18} strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-base md:text-lg font-black text-[var(--store-text-main)] tracking-tight leading-none truncate max-w-[150px] md:max-w-[250px]">
              {store.name}
            </h1>

          </div>
        </div>

        {/* Tasa BCV Minimalista */}
        <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--store-surface-text)] hidden sm:block">
              {isEur ? 'Tasa EUR' : 'Tasa BCV'}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--store-surface-text)] sm:hidden">
              {isEur ? 'EUR' : 'BCV'}
            </span>
          </div>
          <div className="h-3 w-[1px] bg-[var(--store-border)]"></div>
          <span className="font-mono text-xs font-bold tracking-tight text-[var(--store-text-main)]">
            <NumberTicker value={activeRate} />
          </span>
        </div>

      </div>

      {/* --- 2. HERO BANNER (ELITE NATURAL FLOW MASK) --- */}
      {store.hero_url && (
        <div className="w-full bg-[var(--store-bg)] border-b border-[var(--store-border)]/30 flex justify-center overflow-hidden">

          {/* La máscara envuelve a la imagen como una segunda piel */}
          <div className="relative w-full max-w-[1100px] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_15%,black_85%,transparent_100%)] [mask-image:linear-gradient(to_right,transparent_0%,black_15%,black_85%,transparent_100%)]">

            {/* Al quitar "fill" y usar "w-full h-auto", el navegador calcula la altura perfecta sin espacios vacíos y sin recortar NADA */}
            <Image
              src={getOptimizedUrl(store.hero_url)}
              alt={`Banner de ${store.name}`}
              width={1920}
              height={600}
              className="w-full h-auto block"
              crossOrigin="anonymous"
              priority
            />

          </div>
        </div>
      )}



      <div className={`sticky top-0 z-40 bg-[var(--store-bg)]/95 backdrop-blur-xl  pt-4 md:pt-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-[1500px] mx-auto px-4 md:px-8 pb-[2px]">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center mb-3 md:mb-5">

            {/* 1. BUSCADOR Y ACCIONES MOBILE (Izquierda) */}
            <div className="flex items-center w-full md:max-w-sm gap-1">
              <div className="relative flex-1 group min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] group-focus-within:text-[var(--store-primary)] transition-colors" size={16} strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[var(--store-surface)] focus:bg-[var(--store-bg)] border border-[var(--store-border)]/30 rounded-full pl-11 pr-4 py-3 text-sm font-medium text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)] outline-none focus:ring-1 focus:ring-[var(--store-primary)] transition-all"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] hover:text-[var(--store-primary)] transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* 🚀 GATILLO PERFIL (MOBILE)  */}
              <div className="md:hidden shrink-0 w-13 h-14">
                <button
                  // 🚀 CORREGIDO: Redirección consciente del subdominio / subcarpeta
                  onClick={() => currentUser ? router.push(getTenantHref('/passport', store.slug)) : setIsAuthModalOpen(true)}
                  className="w-full h-full flex items-center justify-center relative rounded-full text-[var(--store-text-main)] hover:text-[var(--store-text-main)] active:scale-95 transition-all duration-300"
                  title="Mi Perfil"
                >
                  <UserCircle size={26} strokeWidth={1} />
                </button>
              </div>


              {/* 🚀 GATILLO HISTORIAL (MOBILE ONLY) - Permite acceso al PDF limpiamente */}
              {orderHistory && orderHistory.length > 0 && (
                <div className="md:hidden shrink-0 w-13 h-14">
                  <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="w-full h-full flex items-center justify-center relative rounded-full text-[var(--store-text-main)] hover:text-[var(--store-text-main)] active:scale-95 transition-all duration-300"
                    title="Mis Pedidos"
                  >
                    <Receipt size={26} strokeWidth={1} />
                    <span className="absolute -top-[-2px] -right-[-4.5px] bg-[var(--store-primary)] text-[var(--store-bg)] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ">
                      {orderHistory.length}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* --- CONTENEDOR DE CATEGORÍAS (Con Máscara Alfa Anti-Líneas) --- */}
            <div className="w-full md:flex-1 min-w-0 relative group flex items-center">

              {/* Flecha Izquierda: Ahora es un contenedor limpio, sin degradados de fondo */}
              <div className="absolute left-2 z-20 hidden md:flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => scrollCategories('left')}
                  className="pointer-events-auto p-2 rounded-full bg-[var(--store-surface)] text-[var(--store-text-main)] shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all duration-150"
                  aria-label="Desplazar izquierda"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* 🚀 EL CAMBIO CLAVE: 
    Se aplican propiedades de máscara CSS para desvanecer los píxeles directamente.
    Esto hace que cualquier texto o pastilla se disuelva en la nada de forma fluida.
  */}
              {/* 🚀 EL CAMBIO CLAVE: Máscara reactiva vinculada al estado del scroll */}
              <div
                ref={categoryScrollRef}
                onScroll={handleCategoryScroll}
                className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
                style={{
                  WebkitMaskImage: dynamicMask,
                  maskImage: dynamicMask,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {categories.map((category) => (
                  <CategoryPill
                    key={category}
                    label={category}
                    active={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </div>

              {/* Flecha Derecha: Contenedor limpio, sin degradados de fondo */}
              <div className="absolute right-2 z-20 hidden md:flex items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => scrollCategories('right')}
                  className="pointer-events-auto p-2 rounded-full bg-[var(--store-surface)] text-[var(--store-text-main)] shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all duration-150"
                  aria-label="Desplazar derecha"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>

            </div>

            {/* 🚀 GATILLO DE PERFIL (DESKTOP)  */}
            <div className="hidden md:flex shrink-0 w-11 h-11 mr-0">
              <button
                // 🚀 CORREGIDO: Redirección consciente del subdominio / subcarpeta
                onClick={() => currentUser ? router.push(getTenantHref('/passport', store.slug)) : setIsAuthModalOpen(true)}
                className="cursor-pointer relative p-3 rounded-full  text-[var(--store-text-main)] hover:text-[var(--store-primary)] hover:border-[var(--store-primary)] transition-all duration-300"
                title="Mi Perfil"
              >
                <UserCircle size={25} strokeWidth={1.5} />
              </button>
            </div>


            {/* 🚀 GATILLO DE HISTORIAL DE COMPRAS */}
            {orderHistory && orderHistory.length > 0 && (
              <div className="hidden md:flex shrink-0 w-11 h-11 mr-0">
                <button
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="cursor-pointer relative p-3 rounded-full text-[var(--store-text-main)] hover:text-[var(--store-primary)] transition-all duration-300"
                  title="Mis Pedidos"
                >
                  <Receipt size={25} strokeWidth={1.5} />
                  <span className="absolute -top-[0.125rem] -right-[-0.1rem] bg-[var(--store-primary)] text-[var(--store-bg)] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {orderHistory.length}
                  </span>
                </button>
              </div>
            )}

            {/* 3. GATILLO DE CARRITO DESKTOP (Esquina Derecha + Animación Arreglada) */}
            <div className="hidden md:flex shrink-0 w-12 h-11">
              <button
                data-cart-target="true"
                onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))}
                className={`cursor-pointer relative p-3 rounded-full  transition-all duration-300 ${hasItems ? 'text-[var(--store-text-main)] border-[var(--store-primary)] hover:opacity-90' : 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)] hover:text-[var(--store-primary)] hover:border-[var(--store-primary)]'}`}
                title="Ver Bolsa"
              >
                {/* 🚀 BUMP MAGNÉTICO (Origen Superior por el golpe desde abajo) */}
                <motion.div
                  animate={cartControls}
                  className={hasItems ? "inline-block origin-top" : "inline-block origin-top"}
                >
                  <ShoppingCart size={25} strokeWidth={1.5} />
                </motion.div>

                {/* 🚀 BADGE EXPLOSIVO: Sincronizado con la física del móvil */}
                <AnimatePresence>
                  {hasItems && (
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0, y: 10, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 12,
                        mass: 1
                      }}
                      className="absolute -top-[0.1rem] -right-[-0.1rem] bg-[var(--store-primary)] text-[var(--store-primary-text)] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full "
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 🚀 EL CARRUSEL DE MACRO-PROMOCIONES (ÉLITE UI/UX) */}
      {promotions && promotions.length > 0 && (
        <div className="w-full bg-[var(--store-bg)] border-b border-[var(--store-border)] overflow-hidden relative z-30">
          <div ref={carouselRef} className="flex overflow-x-auto  rounded-[16px] snap-x snap-mandatory no-scrollbar m-3 md:m-9" style={{ scrollBehavior: 'smooth' }}>
            {promotions.map((promo: any) => {
              const isActive = activePromo?.id === promo.id;
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
                          {promo.expires_at && <PromoCountdown expiresAt={promo.expires_at} color={promo.text_color || '#fff'} />}
                        </div>
                      </div>
                    </div>

                    {/* 🚀 CTA INEQUÍVOCO (Botón Real de Alto Contraste) */}
                    <div className="shrink-0 pl-2">
                      <div
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 md:px-6 md:py-3 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-sm ${isActive ? 'scale-95' : 'group-hover:scale-105'}`}
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
          {featuredProducts.length > 0 && !debouncedSearch && (
            <section className="mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-end justify-between mb-6 px-1 border-b border-[var(--store-border)] pb-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-[var(--store-text-main)]">Lo más vendido</h2>
                </div>
              </div>

              {/* 🚀 SE CAMBIA 'group' A 'group/featured' PARA ELIMINAR LA COLISIÓN CON LOS CARRITOS */}
              <div className="relative group/featured">

                {/* 🚀 BOTÓN IZQUIERDO (Clean Look Apple Style - Control de Hover de Hardware) */}
                <button
                  onClick={() => scrollFeatured('left')}
                  className={`hidden md:flex absolute top-1/2 -translate-y-[calc(50%+12px)] -left-4 lg:-left-6 z-10 w-12 h-12 items-center justify-center rounded-full bg-[var(--store-surface)]/85 backdrop-blur-xl border border-[var(--store-border)]/60 text-[var(--store-text-main)] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover/featured:opacity-100 ${featuredScrollStatus.left ? 'pointer-events-auto scale-100' : 'md:!opacity-0 pointer-events-none scale-95'
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
                      <div key={`feat-${product.id}`} className="w-[280px] md:w-[320px] shrink-0 snap-start">
                        <ProductCard
                          product={product}
                          pricing={pricing}
                          onOpen={handleOpenProduct}
                          isOutOfStock={isCompletelyOutOfStock}
                          index={idx}
                          isFavorite={favoriteIds.has(String(product.id))}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* 🚀 BOTÓN DERECHO (Clean Look Apple Style - Control de Hover de Hardware) */}
                <button
                  onClick={() => scrollFeatured('right')}
                  className={`hidden md:flex absolute top-1/2 -translate-y-[calc(50%+12px)] -right-4 lg:-right-6 z-10 w-12 h-12 items-center justify-center rounded-full bg-[var(--store-surface)]/85 backdrop-blur-xl border border-[var(--store-border)]/60 text-[var(--store-text-main)] shadow-[0_15px_35px_-5px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all md:opacity-0 md:group-hover/featured:opacity-100 ${featuredScrollStatus.right || !featuredScrollStatus.left ? 'pointer-events-auto scale-100' : 'md:!opacity-0 pointer-events-none scale-95'
                    }`}
                  aria-label="Siguiente"
                >
                  <ChevronRight size={24} strokeWidth={2.5} className="-mr-0.5" />
                </button>

              </div>
            </section>
          )}

          {/* 🚀 DEVOLVEMOS EL DIV NORMAL AL PADRE */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
            {standardProducts.slice(0, visibleCount).map((product: any, index: number) => {
              const pricing = getProductPricing(product)
              const isCompletelyOutOfStock = product.product_variants && product.product_variants.length > 0
                ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0) <= 0
                : (product.stock || 0) <= 0;

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  pricing={pricing}
                  onOpen={handleOpenProduct}
                  isOutOfStock={isCompletelyOutOfStock}
                  index={index} // 🚀 CRÍTICO: Pasar el index
                  isFavorite={favoriteIds.has(String(product.id))}
                />
              )
            })}
          </div>

          {/* Indicador de Carga / Scroll Infinito */}
          {visibleCount < standardProducts.length && (
            <div ref={observerTarget} className="w-full py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-[var(--store-border)] border-t-[var(--store-text-main)] rounded-full animate-spin"></div>
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
              <div className="bg-[#1a1a1a] text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm w-full pointer-events-auto border border-gray-800">
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


      {/* 🚀 VIRAL LOOP 2: EL NUDGE DE ÉXITO (Tech Editorial - Strict Icon) */}
      <div className="mt-8 pb-20 pt-6 border-t border-[var(--store-border)]/30 w-full flex justify-center">
        <a
          href="https://preziso.shop?utm_source=tienda_cliente&utm_medium=success_screen&utm_campaign=viral_loop"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex flex-col items-center gap-1.5"
        >
          <span className="text-[10px] font-bold  text-[var(--store-surface-text)] uppercase tracking-widest group-hover:text-[var(--store-surface-text)] transition-colors">
            Experiencia de compra impulsada por
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-tight text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)] transition-colors">PREZISO</span>
            <ArrowUpRight size={15} strokeWidth={2} className="text-[var(--store-surface-text)] animate-pulse" />
          </div>
        </a>
      </div>
      <FloatingCheckout
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        currency={isEur ? 'eur' : 'usd'}
        phone={store.phone || '584120000000'}
        storeName={store.name}
        storeId={store.id}
        storeConfig={store}
        products={products}
        promotions={promotions} // 🚀 INYECCIÓN DEL MOTOR
        affiliateCode={affiliateCode} // 🚀 INYECCIÓN AQUÍ
        favoriteIds={favoriteIds} // 🚀 INYECCIÓN PARA CROSS-SELLING
      />
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        currency={isEur ? 'eur' : 'usd'}
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        promotions={promotions}
        activePromoContext={activePromo}
        storeConfig={store} // 🚀 NUEVO: Pasamos la configuración maestra
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
              className="relative bg-[var(--store-surface)] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-[var(--store-border)]"
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
                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--store-surface)] border border-[var(--store-border)]/50 hover:border-[var(--store-text-main)]/30 hover:shadow-md transition-all active:scale-95 group"
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
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}