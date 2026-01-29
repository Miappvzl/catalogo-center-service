'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ShoppingBag, X } from 'lucide-react'
import ProductModal from './ProductModal' 
import FloatingCheckout from './FloatingCheckout'
import NumberTicker from './NumberTicker'

// --- CATEGORY PILL COMPONENT ---
const CategoryPill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 border ${active ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
  >
    {label}
  </button>
)

interface Props {
  store: any;
  products: any[];
  rates: any;
}

export default function StoreInterface({ store, products, rates }: Props) {
  
  if (!store) return <div className="min-h-screen bg-white flex items-center justify-center text-sm font-bold text-gray-400">Cargando tienda...</div>

  // LÓGICA DE MONEDA
  const currencyMode = store.currency_symbol === '€' ? 'eur' : 'usd'
  const activeRate = currencyMode === 'eur' 
      ? (store.eur_price > 0 ? store.eur_price : (rates?.eur_rate || 0))
      : (store.usd_price > 0 ? store.usd_price : (rates?.usd_rate || 0))

  // ESTADOS
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)

  // --- LÓGICA SCROLL ELITE (Show/Hide Header) ---
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY
        
        // Zona segura superior (Bounce area): Siempre mostrar si estamos casi arriba (menos de 80px)
        if (currentScrollY < 80) {
            setIsVisible(true)
            setLastScrollY(currentScrollY)
            return
        }

        // Lógica de dirección
        if (currentScrollY > lastScrollY) { 
          // Bajando -> Ocultar
          setIsVisible(false) 
        } else { 
          // Subiendo -> Mostrar
          setIsVisible(true)  
        }

        setLastScrollY(currentScrollY)
      }
    }

    // Usamos un pequeño 'passive listener' para rendimiento extremo
    window.addEventListener('scroll', controlNavbar, { passive: true })
    return () => window.removeEventListener('scroll', controlNavbar)
  }, [lastScrollY])

  // --- NORMALIZACIÓN ---
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

  return (
    <div className="min-h-screen bg-white pb-32 font-sans relative">
      
      {/* HEADER DINÁMICO CON ANIMACIÓN GPU */}
      <header 
        className={`sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200 supports-[backdrop-filter]:bg-white/60 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
            isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-24 flex items-center justify-between">
          
          {/* IDENTIDAD */}
          <div className="flex items-center gap-3 md:gap-4 group cursor-default">
            <div className="relative">
                {store.logo_url ? (
                <img
                    src={store.logo_url}
                    className="w-9 h-9 md:w-14 md:h-14 object-contain rounded-lg border border-gray-100 bg-white shadow-sm group-hover:scale-105 transition-transform duration-500"
                    alt="Logo"
                />
                ) : (
                <div className="w-9 h-9 md:w-14 md:h-14 bg-gray-900 rounded-lg flex items-center justify-center shadow-lg">
                    <ShoppingBag className="text-white w-4 h-4 md:w-6 md:h-6" />
                </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            
            <div className="flex flex-col justify-center">
              <h1 className="text-base md:text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">
                {store.name}
              </h1>
              <div className="hidden md:flex items-center gap-1.5 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                  Official Store
                </p>
              </div>
            </div>
          </div>

          {/* TASA DE CAMBIO */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-full pl-1 pr-3 py-1 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">TASA</span>
                <span className="font-mono text-xs font-black text-gray-900 tracking-tight tabular-nums">
                    <NumberTicker value={activeRate} />
                </span>
                <span className="text-[9px] font-bold text-gray-400">Bs</span>
            </div>
          </div>
        </div>

        {/* BUSCADOR Y FILTROS (Parte del Header que se esconde) */}
        <div className="max-w-6xl mx-auto px-4 py-2 md:py-4 border-t border-gray-100">
           <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar producto..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium transition-all outline-none placeholder:text-gray-400"
                    />
                     {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={14} className="text-gray-500" />
                        </button>
                    )}
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center mask-linear-fade">
                    {categories.map(cat => (
                      <CategoryPill 
                        key={cat} 
                        label={cat} 
                        active={selectedCategory === cat} 
                        onClick={() => setSelectedCategory(cat)} 
                      />
                    ))}
                </div>
           </div>
        </div>
      </header>

      {/* GRID DE PRODUCTOS */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-end mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {filteredProducts.length} {filteredProducts.length === 1 ? "Item" : "Items"}
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="text-gray-400" size={24}/></div>
             <p className="font-bold text-gray-900">Sin resultados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {filteredProducts.map(product => {
                const penalty = product.usd_penalty || 0
                const priceInBs = (product.usd_cash_price + penalty) * activeRate
                const hasPenalty = penalty > 0

                return (
                  <div 
                    key={product.id} 
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-black/30 hover:shadow-lg transition-all duration-300 relative flex flex-col h-full cursor-pointer"
                    onClick={() => handleOpenProduct(product)}
                  >
                     <div className="relative aspect-square bg-white border-b border-gray-50 overflow-hidden">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 mix-blend-multiply"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300"><span className="font-bold text-4xl opacity-20">P.</span></div>
                        )}
                        {hasPenalty && <div className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-md">Desc Divisa</div>}
                     </div>

                     <div className="p-4 flex flex-col flex-1 gap-2">
                        <div className="flex-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{product.category || 'General'}</span>
                          <h3 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-black line-clamp-2">{product.name}</h3>
                        </div>

                        <div className="pt-3 border-t border-dashed border-gray-100 flex items-end justify-between gap-2">
                           <div className="flex flex-col">
                              <div className="flex items-center">
                                <span className="text-sm font-bold text-gray-400 mr-0.5">$</span>
                                <span className="text-xl font-black text-gray-900 tracking-tight">{product.usd_cash_price}</span>
                              </div>
                              {activeRate > 0 && (
                                 <span className="font-mono text-[10px] text-gray-500 font-medium">Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(priceInBs)}</span>
                              )}
                           </div>
                           
                           <div className="shrink-0">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenProduct(product) }}
                                className="bg-black text-white p-2.5 rounded-lg hover:bg-gray-800 transition-colors shadow-sm active:scale-95"
                              >
                                <ShoppingBag size={16} strokeWidth={2.5} />
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
                )
             })}
          </div>
        )}
      </main>

     <FloatingCheckout 
  rate={activeRate} 
  currency={currencyMode} 
  phone={store.phone || '584120000000'}
  storeName={store.name}
  storeId={store.id}      // <--- Asegúrate de pasar esto
  storeConfig={store}     // <--- NUEVO: Pasamos el objeto completo de la tienda
/>
      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProductForModal}
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}