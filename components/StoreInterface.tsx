'use client'

import { useState, useMemo } from 'react'
import { ShoppingBag, RefreshCw, Tag, Search, X } from 'lucide-react'
import AddToCartBtn from '@/components/AddToCartBtn'
import FloatingCheckout from '@/components/FloatingCheckout'

interface Props {
  store: any
  products: any[]
  rates: any
}

export default function StoreInterface({ store, products, rates }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')

  // --- FUNCIÓN DE LIMPIEZA (NORMALIZACIÓN) ---
  // Convierte "  suplementos " -> "Suplementos"
  const normalizeCategory = (cat: string) => {
    if (!cat) return ''
    const trimmed = cat.trim().toLowerCase()
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  }

  // 1. Extraemos las categorías únicas y limpias
  const categories = useMemo(() => {
    // Mapeamos cada producto a su versión "Limpia"
    const cats = products.map(p => normalizeCategory(p.category)).filter(Boolean)
    // El Set elimina los duplicados exactos
    return ['Todos', ...Array.from(new Set(cats))]
  }, [products])

  // 2. Filtramos los productos en tiempo real
  const filteredProducts = products.filter(product => {
    // Filtro de Texto
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro de Categoría (Comparando versión limpia con versión limpia)
    const productCatClean = normalizeCategory(product.category)
    const matchesCategory = selectedCategory === 'Todos' || productCatClean === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Configuración de Moneda
  const currencyMode = store.currency_type === 'eur' ? 'eur' : 'usd'
  const activeRate = currencyMode === 'eur' ? rates?.eur_rate : rates?.usd_rate
  const symbol = '$' 

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans relative">
      
      {/* HEADER + BUSCADOR INTEGRADO */}
      <header className="bg-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
                <img src={store.logo_url} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="Logo" />
            ) : (
                <div className="bg-black p-2 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-white" />
                </div>
            )}
            <h1 className="text-lg font-bold tracking-tight text-gray-900 line-clamp-1">{store.name}</h1>
          </div>
          <div className={`flex-shrink-0 flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${
            currencyMode === 'eur' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-green-50 text-green-700 border-green-100'
          }`}>
             <RefreshCw className="w-3 h-3" />
             <span className="uppercase hidden md:inline">Tasa:</span> {activeRate} Bs
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="¿Qué estás buscando? (Ej: Creatina, Nike...)" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-black focus:ring-0 rounded-xl pl-10 pr-10 py-3 text-sm font-medium transition-all outline-none"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                        <X size={18}/>
                    </button>
                )}
            </div>

            {/* Chips de Categorías */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat as string)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            selectedCategory === cat 
                            ? 'bg-black text-white border-black shadow-md' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        {cat as string}
                    </button>
                ))}
            </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex justify-between items-end mb-4">
            <p className="text-sm text-gray-500">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'Producto' : 'Productos'}
                {selectedCategory !== 'Todos' && <span className="text-black font-bold"> en {selectedCategory}</span>}
            </p>
        </div>

        {filteredProducts.length === 0 ? (
           <div className="text-center py-20">
             <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900">No encontramos nada</h3>
             <p className="text-gray-500 text-sm mt-1">Intenta con otra palabra o categoría.</p>
             <button onClick={() => {setSearchTerm(''); setSelectedCategory('Todos')}} className="mt-4 text-blue-600 font-bold text-sm hover:underline">
                Ver todos los productos
             </button>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredProducts.map((product: any) => {
                const hasPenalty = product.usd_penalty > 0
                const totalRef = product.usd_cash_price + (product.usd_penalty || 0)
                const priceInBs = totalRef * (activeRate || 0)

                return (
                  <div key={product.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full">
                    
                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                        {product.image_url ? ( 
                            <img 
                                src={product.image_url} 
                                alt={product.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            /> 
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">Sin Foto</div>
                        )}
                        
                        {hasPenalty && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                <Tag size={10} /> DESC. EN DIVISAS
                            </div>
                        )}
                    </div>

                    <div className="p-3 md:p-4 flex flex-col flex-1">
                        <div className="mb-1">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{product.category}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
                            {product.name}
                        </h3>
                        {product.sizes && <p className="text-xs text-gray-500 mb-3">Tallas: {product.sizes}</p>}
                        
                        <div className="mt-auto pt-3 border-t border-gray-50">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-gray-900">{symbol}{product.usd_cash_price}</span>
                                    {hasPenalty && (
                                        <span className="text-xs text-gray-400 line-through font-medium">{symbol}{totalRef}</span>
                                    )}
                                </div>
                                {activeRate > 0 && (
                                    <p className="text-xs text-gray-500 font-medium mt-1">
                                        Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(priceInBs)}
                                    </p>
                                )}
                            </div>
                            
                            <div className="mt-3">
                                <AddToCartBtn product={product} />
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
        paymentMethods={store.payment_methods} 
      />
      
      <footer className="py-8 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
        <p>Precios calculados a tasa {currencyMode.toUpperCase()} BCV</p>
        <p className="mt-1">Powered by Quanzosai</p>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}