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

interface Props { store: any; products: any[]; rates: any; }

export default function StoreInterface({ store, products, rates }: Props) {
  if (!store) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  const { items } = useCart() // <--- TRAEMOS LOS ITEMS PARA EL GATILLO DESKTOP
  const hasItems = items.length > 0;
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);

  const isEur = store.currency_type === 'eur'
  const activeRate = isEur ? Number(rates?.eur_rate || 0) : Number(rates?.usd_rate || 0)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)

  const [isStickyVisible, setIsStickyVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isDarkHero, setIsDarkHero] = useState(true) // Por defecto oscuro (texto blanco)

  const [visibleCount, setVisibleCount] = useState(12)
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleCount(12)
  }, [search, selectedCategory])

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
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const productCatClean = normalizeCategory(p.category)
      const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

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

      

     {/* --- HERO SECTION WITH SMART HEADER --- */}
      {store.hero_url && (
        <div className="w-full h-[35vh] md:h-[50vh] relative bg-gray-100 flex items-end border-b border-gray-100">
          <img
            src={store.hero_url}
            alt={`Banner de ${store.name}`}
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous" // Requisito para que el canvas lo pueda leer
          />
          {/* Un gradiente base muy sutil solo para que no muera la imagen si es 100% blanca */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10"></div>

          {/* HEADER FLOTANTE INTELIGENTE */}
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="max-w-[1500px] mx-auto px-4 md:px-8 pt-5 md:pt-6 flex items-start justify-between">
              
              {/* Logo & Info */}
              <div className="flex items-center gap-3 md:gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="relative shrink-0">
                  {store.logo_url ? (
                    <img src={store.logo_url} className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-full bg-white/20 backdrop-blur-md border border-white/20 shadow-sm" alt="Logo" />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
                      <ShoppingBag size={18} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className={`flex flex-col transition-colors duration-500 drop-shadow-sm ${isDarkHero ? 'text-white' : 'text-gray-900'}`}>
                  <h1 className="text-base md:text-lg font-black tracking-tight leading-none truncate max-w-[140px] md:max-w-[250px]">
                    {store.name}
                  </h1>
                  <span className={`text-[9px] md:text-[10px] uppercase font-bold tracking-[0.15em] mt-1 transition-colors duration-500 ${isDarkHero ? 'text-white/80' : 'text-gray-600'}`}>
                    Tienda Oficial
                  </span>
                </div>
              </div>

              {/* Tasa del Día Minimalista */}
              <div className={`flex items-center gap-2 pl-3 pr-4 py-1.5 transition-colors duration-500 drop-shadow-sm ${isDarkHero ? 'text-white' : 'text-gray-900'}`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider hidden md:inline transition-colors duration-500 ${isDarkHero ? 'text-white/80' : 'text-gray-600'}`}>
                    {isEur ? 'Tasa EUR' : 'Tasa BCV'}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider md:hidden transition-colors duration-500 ${isDarkHero ? 'text-white/80' : 'text-gray-600'}`}>
                    {isEur ? 'EUR' : 'BCV'}
                  </span>
                </div>
                <div className={`h-3 w-[1px] transition-colors duration-500 ${isDarkHero ? 'bg-white/40' : 'bg-gray-400'}`}></div>
                <span className="font-mono text-xs font-bold tracking-tight">
                  <NumberTicker value={activeRate} />
                </span>
              </div>

            </div>
          </div>
          
          
          
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
            <div className="w-full md:flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <CategoryPill key={cat} label={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} />
              ))}
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

      <main className="max-w-[1500px] mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-200 rounded-none bg-gray-50">
            <Search className="text-gray-300 mb-4" size={32} strokeWidth={1.5} />
            <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Sin resultados</p>
          </div>
        ) : (
          <>
            <div className="columns-2 gap-3 space-y-3 md:columns-auto md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-6 md:space-y-0">
              {displayedProducts.map(product => {
                const pricing = getProductPricing(product)
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pricing={pricing}
                    onOpen={handleOpenProduct}
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
        )}
      </main>

      <FloatingCheckout
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
        currency={isEur ? 'eur' : 'usd'}
        phone={store.phone || '584120000000'}
        storeName={store.name}
        storeId={store.id}
        storeConfig={store}
        products={products} 
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        currency={isEur ? 'eur' : 'usd'}
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}