'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ShoppingBag, X, Plus, ImageIcon, ShoppingCart, Zap, Circle, ArrowUpRight, Tag, FileText, ArrowRight } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import Link from 'next/link'
import ProductModal from './ProductModal'
import FloatingCheckout from './FloatingCheckout'
import NumberTicker from './NumberTicker'
import ProductCard from './ProductCard'
import { getOptimizedUrl } from '@/utils/cdn'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'



const CategoryPill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 md:px-6 md:py-2 rounded-full text-[11px] md:text-xs font-bold tracking-wide transition-all duration-300 border active:scale-95 whitespace-nowrap ${active
      ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)]'
      : 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)]/30 hover:bg-[var(--store-surface)] hover:text-[var(--store-text-main)]'
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
  const carouselRef = useRef<HTMLDivElement>(null) // 🚀 Referencia para el auto-scroll
  const [activePromo, setActivePromo] = useState<any>(null) // 🚀 Estado del filtro de campaña

const searchParams = useSearchParams()
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null)
  const [showPromoModal, setShowPromoModal] = useState(false)

 useEffect(() => {
    const ref = searchParams?.get('ref');
    const storedRef = sessionStorage.getItem('preziso_ref');

    if (ref && store?.affiliate_config?.active) {
      setAffiliateCode(ref);
      if (storedRef !== ref) {
        sessionStorage.setItem('preziso_ref', ref);
        setShowPromoModal(true); // 🚀 REEMPLAZO AQUÍ
        // Cerramos el modal automáticamente después de 5 segundos
        setTimeout(() => setShowPromoModal(false), 5000); 
      }
    } else if (storedRef) {
      setAffiliateCode(storedRef);
    }
  }, [searchParams, store]);

  if (!store) return (
    
    <div className="min-h-screen bg-[var(--store-surface)] pb-32 font-sans w-full overflow-hidden no-scrollbar [scrollbar-gutter:auto] [&::-webkit-scrollbar]:hidden pointer-events-none select-none">
      {/* SKELETON: HERO SECTION */}
      <div className="w-full h-[35vh] md:h-[25vh] bg-[var(--store-border)] animate-pulse relative flex items-start border-b border-[var(--store-border)]">
        <div className="max-w-[1500px] w-full mx-auto px-4 md:px-8 pt-5 md:pt-6 flex items-start justify-between">
          {/* Logo & Info Skeleton */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--store-border)] rounded-full shrink-0"></div>
            <div className="flex flex-col gap-2">
              <div className="w-32 md:w-48 h-3.5 bg-[var(--store-border)] rounded-full"></div>
              <div className="w-20 h-2 bg-[var(--store-border)] rounded-full"></div>
            </div>
          </div>
          {/* Tasa Skeleton */}
          <div className="w-24 h-4 bg-[var(--store-border)] rounded-full mt-2 md:mt-3"></div>
        </div>
      </div>

      {/* SKELETON: NAVBAR (Buscador y Categorías) */}
      <div className="bg-[var(--store-surface)] border-b border-[var(--store-border)] pb-4 pt-4 md:pt-6">
        <div className="max-w-[1500px] mx-auto px-4  md:px-8 ">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center mb-3 md:mb-5">
            {/* Buscador Skeleton */}
            <div className="w-full md:max-w-md h-11 bg-[var(--store-border)] animate-pulse rounded-full shrink-0"></div>

            {/* Categorías Skeleton */}
            <div className="w-full md:flex-1 flex gap-2 overflow-hidden animate-pulse">
              <div className="w-16 h-8 bg-[var(--store-border)] rounded-full shrink-0"></div>
              <div className="w-24 h-8 bg-[var(--store-border)] rounded-full shrink-0"></div>
              <div className="w-20 h-8 bg-[var(--store-border)] rounded-full shrink-0 hidden sm:block"></div>
              <div className="w-28 h-8 bg-[var(--store-border)] rounded-full shrink-0 hidden md:block"></div>
            </div>

            {/* Gatillo Carrito Skeleton */}
            <div className="hidden md:block w-11 h-11 bg-[var(--store-border)] animate-pulse rounded-full shrink-0"></div>
          </div>
        </div>
      </div>

      {/* SKELETON: GRID DE PRODUCTOS */}
      <main className="max-w-[1500px] mx-auto px-4 md:px-8 pt-6 md:pt-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {/* Generamos 10 tarjetas fantasma en memoria dinámicamente */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              {/* Foto del producto */}
              <div className="w-full aspect-square bg-[var(--store-border)] animate-pulse rounded-[var(--radius-card,1rem)]"></div>
              {/* Textos */}
              <div className="space-y-2 px-1">
                <div className="w-3/4 h-3 bg-[var(--store-border)] animate-pulse rounded-full"></div>
                <div className="w-1/2 h-2.5 bg-[var(--store-border)]/70 animate-pulse rounded-full"></div>
                <div className="w-1/3 h-4 bg-gray-200 animate-pulse rounded-full mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )

  const { items } = useCart() // <--- TRAEMOS LOS ITEMS PARA EL GATILLO DESKTOP
  const hasItems = items.length > 0;
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);

  const isEur = store.currency_type === 'eur'
  const activeRate = isEur ? Number(rates?.eur_rate || 0) : Number(rates?.usd_rate || 0)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('') // 🚀 NUEVO: Estado retrasado
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  // 🚀 RECEPTOR DE TELEMETRÍA (Iframe PostMessage)
  const [liveConfig, setLiveConfig] = useState<any>(store?.theme_config || null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('2. TIENDA RECIBIÓ ALGO:', event.origin, event.data)
      // Validación robusta: Aceptamos mensajes de tu dominio local o tu dominio de producción
      const isLocalhost = event.origin.includes('localhost') || event.origin.includes('127.0.0.1');
      const isPrezisoDomain = event.origin.includes('preziso.shop');

      if (!isLocalhost && !isPrezisoDomain) return;

      if (event.data?.type === 'UPDATE_THEME') {
        setLiveConfig(event.data.config);
      }
    };

    // Encendemos el receptor SIEMPRE. Es seguro porque ya filtramos por 'origin' arriba,
    // y evitamos que los middlewares de Next.js rompan el editor al borrar los parámetros de la URL.
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const activeTheme = liveConfig || store?.theme_config || { colors: { primary: '#000000', primary_text: '#ffffff', background: '#ffffff' } };
  // 🚀 NUEVO: Motor de Debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    // Función de limpieza: destruye el timer si el usuario teclea antes de los 300ms
    return () => clearTimeout(timer)
  }, [search])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)

  const [isStickyVisible, setIsStickyVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isDarkHero, setIsDarkHero] = useState(true) // Por defecto oscuro (texto blanco)

  const [visibleCount, setVisibleCount] = useState(12)
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleCount(12)
  }, [debouncedSearch, selectedCategory]) // Cambiamos 'search' por 'debouncedSearch'

  useEffect(() => {
    if (!store?.hero_url) return;

    const img = new window.Image()
    img.crossOrigin = "Anonymous"; // Crucial para evitar bloqueos CORS
    img.src = store.hero_url;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height * 0.2; // Analizamos solo el 20% superior donde vive el header

        ctx.drawImage(img, 0, 0, img.width, img.height * 0.2, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2];
        }

        const pixels = data.length / 4;
        // Fórmula de Luminancia Relativa (YIQ)
        const luminance = ((r / pixels) * 299 + (g / pixels) * 587 + (b / pixels) * 114) / 1000;

        // Si luminancia es menor a 128, es oscuro -> texto blanco. Si es mayor, es claro -> texto oscuro.
        setIsDarkHero(luminance < 128);
      } catch (e) {
        console.warn("No se pudo analizar el contraste por CORS, usando default oscuro.");
        setIsDarkHero(true);
      }
    };
  }, [store?.hero_url]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12)
        }
      },
      { threshold: 0.1 }
    )
    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY
        if (currentScrollY < 350) {
          setIsStickyVisible(true)
          setLastScrollY(currentScrollY)
          return
        }
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
      if (product) {
        setSelectedProductForModal(product);
        setIsModalOpen(true);
      }
    };
    document.addEventListener('openProductModal', handleOpenFromCart);
    return () => document.removeEventListener('openProductModal', handleOpenFromCart);
  }, []);

  // 🚀 Auto-Scroll del Carrusel de Promociones
  useEffect(() => {
    if (!promotions || promotions.length <= 1) return;
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }
    }, 5000); // Cambia cada 5 segundos
    return () => clearInterval(interval);
  }, [promotions]);

  const normalizeCategory = (cat: string) => {
    if (!cat) return ""
    const trimmed = cat.trim().toLowerCase()
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }

  const categories = useMemo(() => {
    // 1. Extraemos todas las categorías únicas de los productos actuales
    const rawCats = products.map(p => normalizeCategory(p.category)).filter(Boolean)
    const uniqueCats = Array.from(new Set(rawCats))

    // 2. Leemos el orden guardado por el admin (si existe)
    const savedOrder = store?.categories_order || []

    // 3. Ordenamos las categorías respetando el arreglo del admin
    const sortedCats = uniqueCats.sort((a, b) => {
      const indexA = savedOrder.indexOf(a)
      const indexB = savedOrder.indexOf(b)

      // Si ambas están en la lista guardada, respetamos su orden
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      // Si solo A está en la lista, A va primero
      if (indexA !== -1) return -1
      // Si solo B está en la lista, B va primero
      if (indexB !== -1) return 1
      // Si ninguna está (ej: categorías nuevas), las ordenamos alfabéticamente al final
      return a.localeCompare(b)
    })

    // 4. "Todos" siempre va de primero indiscutiblemente
    return ['Todos', ...sortedCats]
  }, [products, store?.categories_order])

 // 🚀 MOTOR DE CLASIFICACIÓN UNIVERSAL (Respeta el orden del servidor)
  const { featured:featuredProducts, standard:standardProducts } = useMemo(() => {
    // 1. Aplicamos búsqueda y filtros de categoría
    const baseFiltered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      const productCatClean = normalizeCategory(p.category)
      const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory
      
      const matchesPromo = activePromo
        ? (activePromo.linked_products || []).some((id: any) => String(id) === String(p.id))
        : true

      return matchesSearch && matchesCategory && matchesPromo
    })

    // 2. Clasificación simple: el orden ya viene perfecto desde el servidor
    const featured = baseFiltered.filter(p => p.is_featured)
    const standard = baseFiltered // La cuadrícula completa muestra todo en el orden maestro

    return { featured, standard }
  }, [products, debouncedSearch, selectedCategory, activePromo])

  const handleOpenProduct = (product: any) => {
    setSelectedProductForModal(product)
    setIsModalOpen(true)
  }

  const getProductPricing = (product: any) => {
    const cashPrice = Number(product.usd_cash_price || 0)
    const markup = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + markup
    const priceInBs = listPrice * activeRate
    const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0
    return { cashPrice, priceInBs, discountPercent, hasDiscount: markup > 0 }
  }

  return (
    // ✅ AHORA:
    <div
      className="min-h-screen bg-[var(--store-bg)] pb-8 font-sans selection:bg-[var(--store-primary)] selection:text-[var(--store-primary-text)]"
      style={{
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
            <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.15em] mt-1 text-[var(--store-surface-text)]">
              Tienda Oficial
            </span>
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

      {/* --- 2. HERO BANNER (BLUR-PAD TECHNIQUE) --- */}
      {store.hero_url && (
        <div className="w-full h-[22vh] md:h-[28vh] relative bg-[var(--store-border)] overflow-hidden flex items-center justify-center border-b border-[var(--store-border)]">

          {/* Fondo difuminado optimizado */}
          <Image
            src={getOptimizedUrl(store.hero_url)}
            className="absolute inset-0 object-cover blur-[20px] opacity-40 scale-110 pointer-events-none"
            crossOrigin="anonymous"
            alt=""
            fill
            sizes="100vw"
            quality={30} // Bajamos la calidad de la compresión porque solo es un fondo difuminado
          />

          {/* Imagen real optimizada */}
          <Image
            src={getOptimizedUrl(store.hero_url)}
            alt={`Banner de ${store.name}`}
            className="relative z-10 object-contain pointer-events-none drop-shadow-sm"
            crossOrigin="anonymous"
            fill
            sizes="100vw"
          />
        </div>
      )}



      <div className={`sticky top-0 z-40 bg-[var(--store-bg)]/95 backdrop-blur-xl  pt-4 md:pt-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-[1500px] mx-auto px-4 md:px-8 pb-[2px]">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center mb-3 md:mb-5">

            {/* 1. BUSCADOR (Izquierda) */}
            {/* 🚀 INYECCIÓN: min-w-0 para evitar desbordamiento del flex-1 */}
            <div className="relative flex-1 w-full md:max-w-md group min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] group-focus-within:text-[var(--store-primary)] transition-colors" size={16} strokeWidth={2} />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--store-surface)] focus:bg-[var(--store-bg)] border border-[var(--store-border)]/30 rounded-full pl-11 pr-4 py-3 text-sm font-medium placeholder:text-[var(--store-surface-text)] outline-none focus:ring-1 focus:ring-[var(--store-primary)] transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] hover:text-[var(--store-primary)] transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 2. CATEGORÍAS (Centro) */}
            {/* 🚀 INYECCIÓN: min-w-0 es el cinturón de seguridad que ancla la UI */}
            <div className="relative w-full md:flex-1 min-w-0 flex items-center">
              <div className="flex w-full gap-2 overflow-x-auto pb-1 no-scrollbar pr-10">
                {categories.map(cat => (
                  <CategoryPill key={cat} label={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} />
                ))}
              </div>

              {/* Fade Gradient a la derecha */}
              <div className="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-[var(--store-bg)] via-[var(--store-bg)]/80 to-transparent pointer-events-none z-10"></div>
            </div>

            {/* 3. GATILLO DE CARRITO DESKTOP (Esquina Derecha + Animación Arreglada) */}
            <div className="hidden md:flex shrink-0 w-12 h-11">
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))}
                className={`relative p-3 rounded-full border transition-all duration-300 ${hasItems ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] hover:opacity-90' : 'bg-[var(--store-surface)] text-[var(--store-surface-text)] border-[var(--store-border)] hover:text-[var(--store-primary)] hover:border-[var(--store-primary)]'}`}
                title="Ver Bolsa"
              >
                {/* El div envoltorio hace que el SVG rote perfectamente */}
                <div className={hasItems ? "animate-wiggle origin-bottom inline-block" : ""}>
                  <ShoppingCart size={18} strokeWidth={2.5} />
                </div>

                {hasItems && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[var(--store-surface)]">
                    {totalItems}
                  </span>
                )}
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
                  
                  {/* Carrusel Horizontal */}
                  <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-6 -mx-4 ml-2 md:ml-0 px-4 snap-x snap-mandatory">
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
                                  />
                              </div>
                          )
                      })}
                  </div>
              </section>
          )}

          {/* 🚀 ARQUITECTURA DE CUADRÍCULA ESTRICTA (CSS Grid Estándar) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
            {standardProducts.slice(0, visibleCount).map((product: any, index: number) => { // 🚀 Usamos standardProducts
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
                  index={index}
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
      <div className="mt-8 pb-20 pt-6 border-t border-[var(--store-border)] w-full flex justify-center">
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
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}