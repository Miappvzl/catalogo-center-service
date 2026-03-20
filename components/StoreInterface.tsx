'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ShoppingBag, X, Plus, ImageIcon, ShoppingCart } from 'lucide-react'
import { useCart } from '@/app/store/useCart'
import ProductModal from './ProductModal'
import FloatingCheckout from './FloatingCheckout'
import NumberTicker from './NumberTicker'
import ProductCard from './ProductCard'

const CategoryPill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 md:px-6 md:py-2 rounded-full text-[11px] md:text-xs font-bold tracking-wide transition-all duration-300 border active:scale-95 whitespace-nowrap ${active
        ? 'bg-black text-white border-black'
        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
      }`}
  >
    {label}
  </button>
)

// 🚀 MICRO-COMPONENTE: Reloj FOMO (Fear Of Missing Out)
const PromoCountdown = ({ expiresAt, color }: { expiresAt: string, color: string }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const target = new Date(expiresAt).getTime()
      const distance = target - now
      
      if (distance < 0) {
        setTimeLeft('¡Expirado!')
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
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border shadow-sm text-[10px] font-mono font-bold tracking-widest ml-2" style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color: color }}>
      ⏳ {timeLeft}
    </span>
  )
}

interface Props { store: any; products: any[]; rates: any; promotions?: any[] } // 🚀 NUEVO

export default function StoreInterface({ store, products, rates, promotions = [] }: Props) {
  const carouselRef = useRef<HTMLDivElement>(null) // 🚀 Referencia para el auto-scroll
  const [activePromo, setActivePromo] = useState<any>(null) // 🚀 Estado del filtro de campaña
 if (!store) return (
    <div className="min-h-screen bg-white pb-32 font-sans w-full overflow-hidden pointer-events-none select-none">
      {/* SKELETON: HERO SECTION */}
      <div className="w-full h-[35vh] md:h-[25vh] bg-gray-100 animate-pulse relative flex items-start border-b border-gray-100/50">
        <div className="max-w-[1500px] w-full mx-auto px-4 md:px-8 pt-5 md:pt-6 flex items-start justify-between">
          {/* Logo & Info Skeleton */}
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200/80 rounded-full shrink-0"></div>
            <div className="flex flex-col gap-2">
              <div className="w-32 md:w-48 h-3.5 bg-gray-200/80 rounded-full"></div>
              <div className="w-20 h-2 bg-gray-200/80 rounded-full"></div>
            </div>
          </div>
          {/* Tasa Skeleton */}
          <div className="w-24 h-4 bg-gray-200/80 rounded-full mt-2 md:mt-3"></div>
        </div>
      </div>

      {/* SKELETON: NAVBAR (Buscador y Categorías) */}
      <div className="bg-white border-b border-gray-100/80 pt-4 md:pt-6">
        <div className="max-w-[1500px] mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center mb-3 md:mb-5">
            {/* Buscador Skeleton */}
            <div className="w-full md:max-w-md h-11 bg-gray-100 animate-pulse rounded-full shrink-0"></div>
            
            {/* Categorías Skeleton */}
            <div className="w-full md:flex-1 flex gap-2 overflow-hidden animate-pulse">
              <div className="w-16 h-8 bg-gray-100 rounded-full shrink-0"></div>
              <div className="w-24 h-8 bg-gray-100 rounded-full shrink-0"></div>
              <div className="w-20 h-8 bg-gray-100 rounded-full shrink-0 hidden sm:block"></div>
              <div className="w-28 h-8 bg-gray-100 rounded-full shrink-0 hidden md:block"></div>
            </div>

            {/* Gatillo Carrito Skeleton */}
            <div className="hidden md:block w-11 h-11 bg-gray-100 animate-pulse rounded-full shrink-0"></div>
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
              <div className="w-full aspect-square bg-gray-100 animate-pulse rounded-[var(--radius-card,1rem)]"></div>
              {/* Textos */}
              <div className="space-y-2 px-1">
                <div className="w-3/4 h-3 bg-gray-100 animate-pulse rounded-full"></div>
                <div className="w-1/2 h-2.5 bg-gray-100/70 animate-pulse rounded-full"></div>
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
      
      const img = new Image();
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
    const cats = products.map(p => normalizeCategory(p.category)).filter(Boolean)
    return ['Todos', ...Array.from(new Set(cats))]
  }, [products])

 const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Usamos debouncedSearch en lugar de search
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      const productCatClean = normalizeCategory(p.category)
      const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory
      
      // 🚀 BLINDAJE INT8: Coerción absoluta a String
      const matchesPromo = activePromo 
        ? (activePromo.linked_products || []).some((id: any) => String(id) === String(p.id)) 
        : true
      
      return matchesSearch && matchesCategory && matchesPromo
    })
  }, [products, debouncedSearch, selectedCategory, activePromo]) // Actualizamos las dependencias

  const displayedProducts = filteredProducts.slice(0, visibleCount)

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
    <div className="min-h-screen bg-white pb-32 font-sans selection:bg-black selection:text-white">

      

    {/* --- 1. STORE INFO HEADER (CLEAN LOOK) --- */}
      <div className="bg-white px-4 md:px-8 py-3.5 flex items-center justify-between border-b border-gray-100">
        
        {/* Logo & Store Info */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} className="w-10 h-10 md:w-11 md:h-11 object-contain rounded-full border border-gray-100 shadow-sm" alt="Logo" />
            ) : (
              <div className="w-10 h-10 md:w-11 md:h-11 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm">
                <ShoppingBag size={18} strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none truncate max-w-[150px] md:max-w-[250px]">
              {store.name}
            </h1>
            <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.15em] mt-1 text-gray-400">
              Tienda Oficial
            </span>
          </div>
        </div>

        {/* Tasa BCV Minimalista */}
        <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 hidden sm:block">
              {isEur ? 'Tasa EUR' : 'Tasa BCV'}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:hidden">
              {isEur ? 'EUR' : 'BCV'}
            </span>
          </div>
          <div className="h-3 w-[1px] bg-gray-300"></div>
          <span className="font-mono text-xs font-bold tracking-tight text-gray-900">
            <NumberTicker value={activeRate} />
          </span>
        </div>

      </div>

      {/* --- 2. HERO BANNER (BLUR-PAD TECHNIQUE) --- */}
      {store.hero_url && (
        <div className="w-full h-[22vh] md:h-[28vh] relative bg-gray-100 overflow-hidden flex items-center justify-center border-b border-gray-100">
          
          {/* Fondo difuminado (Rellena los vacíos con los colores de la marca) */}
          <img
            src={store.hero_url}
            className="absolute inset-0 w-full h-full object-cover blur-[20px] opacity-40 scale-110 pointer-events-none"
            crossOrigin="anonymous"
            alt=""
          />
          
          {/* Imagen real (Sin recortes agresivos) */}
          <img
            src={store.hero_url}
            alt={`Banner de ${store.name}`}
            className="relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-sm"
            crossOrigin="anonymous"
          />
        </div>
      )}

      

      <div className={`sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100/80 pt-4 md:pt-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${isStickyVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-[1500px] mx-auto px-4 md:px-8">
         <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center mb-3 md:mb-5">
            
            {/* 1. BUSCADOR (Izquierda) */}
            <div className="relative flex-1 w-full md:max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} strokeWidth={2} />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 focus:bg-white border border-gray-200 rounded-full pl-11 pr-4 py-3 text-sm font-medium placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-black transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>

           {/* 2. CATEGORÍAS (Centro) */}
            <div className="relative w-full md:flex-1 flex items-center">
              <div className="flex w-full gap-2 overflow-x-auto pb-1 no-scrollbar pr-10">
                {categories.map(cat => (
                  <CategoryPill key={cat} label={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} />
                ))}
              </div>
              
              {/* Fade Gradient a la derecha */}
              <div className="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10"></div>
            </div>

            {/* 3. GATILLO DE CARRITO DESKTOP (Esquina Derecha + Animación Arreglada) */}
            <div className="hidden md:flex shrink-0 w-12 h-11">
                <button 
                    onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))}
                    className={`relative p-3 rounded-full border transition-all duration-300 ${hasItems ? 'bg-gray-50  text-black border-gray-200 hover:bg-gray-800 hover:text-white' : 'bg-white text-gray-400 border-gray-200 hover:text-black hover:border-black'}`}
                    title="Ver Bolsa"
                >
                    {/* El div envoltorio hace que el SVG rote perfectamente */}
                    <div className={hasItems ? "animate-wiggle origin-bottom inline-block" : ""}>
                        <ShoppingCart size={18} strokeWidth={2.5} />
                    </div>

                    {hasItems && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                            {totalItems}
                        </span>
                    )}
                </button>
            </div>

          </div>
        </div>
      </div>

      {/* 🚀 EL CARRUSEL DE MACRO-PROMOCIONES (BUG ARREGLADO Y RELOJ INYECTADO) */}
      {promotions && promotions.length > 0 && (
        <div className="w-full bg-white border-b border-gray-100 overflow-hidden relative z-30">
           <div ref={carouselRef} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ scrollBehavior: 'smooth' }}>
               {promotions.map((promo: any) => (
                   <div key={promo.id}
                        onClick={() => {
                            setActivePromo(activePromo?.id === promo.id ? null : promo)
                            // Un pequeño scroll para que el usuario vea que la tienda se filtró
                            window.scrollTo({ top: 400, behavior: 'smooth' }) 
                        }}
                        className="w-full shrink-0 snap-center cursor-pointer transition-opacity hover:opacity-95"
                        style={{ backgroundColor: promo.bg_color || '#000' }}>
                        
                        <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
                             <div className="flex items-center gap-4 min-w-0">
                                 {/* La imagen optimizada si existe */}
                                 {promo.image_url && (
                                     <img src={promo.image_url} alt={promo.title} className="w-12 h-12 md:w-14 md:h-14 object-contain shrink-0 mix-blend-multiply" />
                                 )}
                                 <div className="flex flex-col min-w-0">
                                     <div className="flex items-center flex-wrap gap-1">
                                         <h4 className="font-black text-sm md:text-base tracking-tight leading-none truncate" style={{ color: promo.text_color || '#fff' }}>{promo.title}</h4>
                                         {/* 🚀 RELOJ FOMO */}
                                         {promo.expires_at && <PromoCountdown expiresAt={promo.expires_at} color={promo.text_color || '#fff'} />}
                                     </div>
                                     {promo.tagline && <p className="text-[10px] md:text-xs opacity-90 mt-1 truncate" style={{ color: promo.text_color || '#fff' }}>{promo.tagline}</p>}
                                 </div>
                             </div>
                             
                             <div className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all shadow-subtle ${activePromo?.id === promo.id ? 'bg-white text-black' : 'border border-white/30'}`} style={{ color: activePromo?.id === promo.id ? '#000' : (promo.text_color || '#fff') }}>
                                 {activePromo?.id === promo.id ? 'Filtro Activo ✕' : 'Ver Ofertas'}
                             </div>
                        </div>
                   </div>
               ))}
           </div>
        </div>
      )}

   
      <main className="max-w-[1500px] mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-24">
        
          
           <>
            {/* 🚀 ARQUITECTURA DE CUADRÍCULA ESTRICTA (CSS Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
              {displayedProducts.map(product => {
                const pricing = getProductPricing(product)
                
                
                // NUEVO: CÁLCULO DE INVENTARIO BLINDADO
const isCompletelyOutOfStock = product.product_variants && product.product_variants.length > 0 
  ? product.product_variants.reduce((acc: number, variant: any) => acc + (variant.stock || 0), 0) <= 0
  : (product.stock || 0) <= 0;

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pricing={pricing}
                    onOpen={handleOpenProduct}
                    isOutOfStock={isCompletelyOutOfStock} // NUEVO PROP A ENVIAR
                  />
                )
              })}
            </div>

            {visibleCount < filteredProducts.length && (
              <div ref={observerTarget} className="w-full py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            )}
          </>
        
      </main>

      <FloatingCheckout
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        currency={isEur ? 'eur' : 'usd'}
        phone={store.phone || '584120000000'}
        storeName={store.name}
        storeId={store.id}
        storeConfig={store}
        products={products}
        promotions={promotions} // 🚀 INYECCIÓN DEL MOTOR
      />

    <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        currency={isEur ? 'eur' : 'usd'}
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        promotions={promotions}
        activePromoContext={activePromo} // 🚀 NUEVO: Le pasamos el contexto visual del banner clickeado
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}