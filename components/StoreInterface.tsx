'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ShoppingBag, X, Tag, Info, Plus, ArrowUpRight } from 'lucide-react'
import ProductModal from './ProductModal' 
import FloatingCheckout from './FloatingCheckout'
import NumberTicker from './NumberTicker'

// --- COMPONENTES UI ---

const CategoryPill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className={`px-5 py-2 md:px-6 md:py-2.5 rounded-full text-[11px] md:text-xs font-medium tracking-wide transition-all duration-300 border active:scale-95 ${
      active 
        ? 'bg-black text-white border-black shadow-md' 
        : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    {label}
  </button>
)

interface Props { store: any; products: any[]; rates: any; }

export default function StoreInterface({ store, products, rates }: Props) {
  // Skeleton de carga minimalista
  if (!store) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium tracking-widest uppercase text-gray-400">Cargando Boutique...</p>
    </div>
  )

  // --- CONFIGURACIÓN & ESTADO ---
  const isEur = store.currency_type === 'eur'
  const activeRate = isEur ? Number(rates?.eur_rate || 0) : Number(rates?.usd_rate || 0)
  
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // --- LOGICA DE SCROLL ---
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY
        if (currentScrollY < 80) { setIsVisible(true); setLastScrollY(currentScrollY); return }
        setIsVisible(currentScrollY <= lastScrollY)
        setLastScrollY(currentScrollY)
      }
    }
    window.addEventListener('scroll', controlNavbar, { passive: true })
    return () => window.removeEventListener('scroll', controlNavbar)
  }, [lastScrollY])

  // --- FILTROS ---
  const normalizeCategory = (cat: string) => {
    if (!cat) return "";
    const trimmed = cat.trim().toLowerCase();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const categories = useMemo(() => {
    const cats = products.map(p => normalizeCategory(p.category)).filter(Boolean)
    return ['Todos', ...Array.from(new Set(cats))]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const productCatClean = normalizeCategory(p.category);
      const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  const handleOpenProduct = (product: any) => {
    setSelectedProductForModal(product)
    setIsModalOpen(true)
  }

  // --- ENGINE DE PRECIOS ---
  const getProductPricing = (product: any) => {
    const cashPrice = Number(product.usd_cash_price || 0)
    const markup = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + markup
    const priceInBs = listPrice * activeRate
    const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0

    return {
        cashPrice,
        priceInBs,
        discountPercent,
        hasDiscount: markup > 0
    }
  }

  return (
    <div className="min-h-screen bg-white pb-32 font-sans selection:bg-black selection:text-white">
      
      {/* --- HEADER FLOTANTE --- */}
      <header 
        className={`sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-gray-100/50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3 md:gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="relative shrink-0">
                {store.logo_url ? (
                  <img src={store.logo_url} className="w-9 h-9 md:w-10 md:h-10 object-contain rounded-full border border-gray-100 bg-gray-50" alt="Logo"/>
                ) : (
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-black rounded-full flex items-center justify-center text-white">
                    <ShoppingBag size={16} strokeWidth={1.5} />
                  </div>
                )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-gray-900 leading-none truncate max-w-[140px] md:max-w-none">
                {store.name}
              </h1>
              <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.15em] text-gray-400 mt-0.5 md:mt-0.5">
                Official Store
              </span>
            </div>
          </div>

          {/* Ticker Tasa */}
          <div className="flex items-center gap-2 pl-3 pr-4 py-1.5 bg-gray-50/80 rounded-full border border-gray-200/60 shadow-sm">
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wide hidden md:inline">
                 {isEur ? 'Tasa EUR' : 'Tasa BCV'}
               </span>
               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide md:hidden">
                 {isEur ? 'EUR' : 'BCV'}
               </span>
            </div>
            <div className="h-3 w-[1px] bg-gray-300"></div>
            <span className="font-mono text-xs font-semibold text-gray-900 tracking-tight">
               <NumberTicker value={activeRate} />
            </span>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="max-w-6xl mx-auto px-4 pb-3 md:pb-4">
           <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center">
                <div className="relative flex-1 w-full md:w-auto group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} strokeWidth={2} />
                    <input 
                      type="text" 
                      placeholder="Buscar..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                      className="w-full bg-gray-100/50 hover:bg-gray-100 focus:bg-white border-0 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-medium placeholder:text-gray-400 outline-none ring-1 ring-transparent focus:ring-gray-200 transition-all appearance-none"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={14} className="text-gray-500" />
                      </button>
                    )}
                </div>
                
                <div 
                  className="w-full md:w-auto flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)'
                  }}
                >
                    {categories.map(cat => (
                      <CategoryPill key={cat} label={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} />
                    ))}
                </div>
           </div>
        </div>
      </header>

      {/* --- GRID DE PRODUCTOS --- */}
      <main className="max-w-6xl mx-auto px-4 pt-6 md:pt-10 pb-24">
        <div className="flex justify-between items-end mb-6 px-1 border-b border-gray-100 pb-2">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Catálogo</h2>
          <span className="text-[10px] md:text-xs font-medium text-gray-400 tabular-nums">
            {filteredProducts.length} Items
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <Search className="text-gray-300 mb-4" size={32} strokeWidth={1.5} />
            <p className="font-medium text-gray-900 text-sm">Sin resultados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-8 md:gap-y-12">
             {filteredProducts.map(product => {
                const pricing = getProductPricing(product)

                return (
                  <div 
                    key={product.id} 
                    className="group cursor-pointer flex flex-col gap-3 relative active:scale-[0.98] transition-transform duration-200 md:active:scale-100"
                    onClick={() => handleOpenProduct(product)}
                  >
                      {/* Imagen Container */}
                      <div className="relative aspect-[4/5] md:aspect-square w-full bg-gray-50 rounded-[4px] overflow-hidden">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover md:object-contain p-0 md:p-4 mix-blend-multiply transition-transform duration-700 ease-out md:group-hover:scale-105 will-change-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                            <ShoppingBag size={24} strokeWidth={1} />
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
                            {pricing.hasDiscount && (
                                <span className="bg-black/90 backdrop-blur-md text-white text-[8px] md:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 md:px-2 md:py-1 rounded-sm shadow-sm">
                                    -{pricing.discountPercent}% OFF
                                </span>
                            )}
                            {product.stock <= 0 && (
                                <span className="bg-gray-200/90 backdrop-blur-md text-gray-500 text-[8px] md:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 md:px-2 md:py-1 rounded-sm">
                                    Agotado
                                </span>
                            )}
                        </div>

                        {/* BOTÓN ACCIÓN RÁPIDA */}
                        <div 
                          className="absolute bottom-2 right-2 z-20 
                                     opacity-100 translate-y-0 
                                     md:bottom-3 md:right-3 md:opacity-0 md:translate-y-4 md:group-hover:translate-y-0 md:group-hover:opacity-100 
                                     transition-all duration-300 ease-out"
                        >
                            <button 
                              className="bg-white text-black p-2 md:p-2.5 rounded-full shadow-sm hover:bg-black hover:text-white transition-colors border border-gray-100 active:scale-90"
                              onClick={(e) => {
                                e.stopPropagation(); 
                                handleOpenProduct(product);
                              }}
                            >
                                <Plus className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2} />
                            </button>
                        </div>
                      </div>

                      {/* Info del Producto */}
                      <div className="flex flex-col gap-0.5 md:gap-1 px-0.5">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="text-[13px] md:text-sm font-medium text-gray-900 tracking-tight leading-snug md:group-hover:text-gray-600 transition-colors line-clamp-2">
                              {product.name}
                            </h3>
                        </div>
                        
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 mt-1">
                           <span className="text-[15px] md:text-base font-bold text-gray-900 tracking-tight">
                             ${pricing.cashPrice.toFixed(2)}
                           </span>
                           
                           <span className="text-[10px] md:text-xs text-gray-400 font-medium whitespace-nowrap">
                              Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
                           </span>
                        </div>
                        
                        {pricing.hasDiscount && (
                            <span className="text-[9px] md:text-[10px] font-medium text-emerald-600 mt-0.5">
                                Precio efectivo divisa
                            </span>
                        )}
                      </div>
                  </div>
                )
             })}
          </div>
        )}
      </main>

      {/* --- FLOATING COMPONENTS --- */}
      <FloatingCheckout 
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }} 
        currency={isEur ? 'eur' : 'usd'} 
        phone={store.phone || '584120000000'}
        storeName={store.name}
        storeId={store.id}       
        storeConfig={store}    
      />
      
      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
        currency={isEur ? 'eur' : 'usd'} 
        rates={{ usd: Number(rates?.usd_rate || 0), eur: Number(rates?.eur_rate || 0) }} 
      />
    </div>
  )
}