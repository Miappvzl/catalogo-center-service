

// Esto obliga a Next.js a regenerar la página en cada visita
export const revalidate = 0; 
export const dynamic = 'force-dynamic';
import AddToCartBtn from '@/components/AddToCartBtn' // <--- IMPORTANTE
import FloatingCheckout from '@/components/FloatingCheckout' // <--- IMPORTANTE


import { createClient } from '@supabase/supabase-js' 
import { ShoppingBag, RefreshCw } from 'lucide-react'



// ... resto de tus imports

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 1. Buscamos AMBAS tasas (Dólar y Euro)
async function getExchangeRates() {
  const { data } = await supabase
    .from('app_config')
    .select('usd_rate, eur_rate')
    .eq('id', 1)
    .single()
  return data
}

// 2. Buscamos la tienda y SU PREFERENCIA DE MONEDA
async function getStoreOwner(slug: string) {
  const { data: store } = await supabase
    .from('stores')
    .select('user_id, name, currency_type, phone') // <--- IMPORTANTE: Traer 'phone'
    .eq('slug', slug)
    .single()
  return store
}

// 3. Buscamos productos
async function getProducts(userId: string) {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: false })
  return products
}

// Función para formatear Bolívares bonitos (Ej: 1.250,00)
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export default async function DynamicStore({ params }: { params: Promise<{ slug: string }> }) {
  
  // Desempaquetamos params (Requisito de Next.js 15)
  const resolvedParams = await params
  const slug = resolvedParams.slug

  // Ejecutamos búsquedas en paralelo para que cargue rápido
  const [store, rates] = await Promise.all([
    getStoreOwner(slug),
    getExchangeRates()
  ])

  // Validación 404
  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-gray-600 mb-8">Tienda no encontrada.</p>
      </div>
    )
  }

  // --- LÓGICA DE MONEDA INTELIGENTE 🧠 ---
  // 1. ¿Qué moneda quiere el dueño? (Si es null, usamos 'usd' por defecto)
  const currencyMode = store.currency_type === 'eur' ? 'eur' : 'usd'
  
  // 2. ¿Qué tasa usamos?
  const activeRate = currencyMode === 'eur' ? rates?.eur_rate : rates?.usd_rate
  
  // 3. ¿Qué símbolo mostramos?
  const symbol = currencyMode === 'eur' ? '€' : '$'
  // ----------------------------------------

  const products = await getProducts(store.user_id) || []

const ownerPhone = store.phone || '584120000000'

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">{store.name}</h1>
          </div>
          
          {/* BADGE DE TASA DINÁMICA */}
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
            currencyMode === 'eur' 
              ? 'bg-indigo-50 text-indigo-700 border-indigo-100' // Estilo Euro (Azulado)
              : 'bg-green-50 text-green-700 border-green-100'   // Estilo Dólar (Verde)
          }`}>
             <RefreshCw className="w-3 h-3" />
             {/* Muestra: Tasa USD: 308.15 Bs  o  Tasa EUR: 360.50 Bs */}
             <span className="uppercase">Tasa {currencyMode}: {activeRate} Bs</span>
          </div>
        </div>
      </header>

      {/* PRODUCTOS */}
      <main className="max-w-2xl mx-auto px-4 py-8"> {/* Cambié max-w-xl a max-w-2xl para más aire en desktop */}
        <p className="text-sm text-gray-500 mb-6">Mostrando {products.length} productos</p>

        <div className="flex flex-col gap-4"> {/* Usamos flex col para la lista principal */}
            {products.map((product: any) => {
              
              // Cálculos (Igual que antes)
              const totalRef = product.usd_cash_price + (product.usd_penalty || 0)
              const priceInBs = totalRef * (activeRate || 0)

              return (
                <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  
                  {/* --- LAYOUT GRID INTELIGENTE --- */}
                  {/* Mobile: 2 columnas [Auto | 1fr] */}
                  {/* Desktop (md): 3 columnas [Auto | 1fr | Auto] */}
                  <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-4 items-center">
                    
                    {/* 1. LA FOTO (Columna Izquierda Fija) */}
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50">
                        {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        )}
                    </div>
                    
                    {/* 2. LA INFO (Columna Central Flexible) */}
                    <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1 leading-tight">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category} • {product.sizes || 'Unico'}</p>
                        
                        {/* PRECIOS Y BOTÓN (SOLO VISIBLE EN MÓVIL) */}
                        {/* En móvil, esto aparece debajo de la info */}
                        <div className="mt-3 flex flex-col gap-3 md:hidden">
                            <div className="flex items-end gap-2">
                                <span className="text-xl font-extrabold text-black tracking-tight">{symbol}{product.usd_cash_price}</span>
                                {activeRate > 0 && (
                                    <span className="text-sm text-gray-500 font-medium pb-0.5">
                                        Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(priceInBs)}
                                    </span>
                                )}
                            </div>
                            {/* El botón ocupa todo el ancho en móvil */}
                            <AddToCartBtn product={product} />
                        </div>
                    </div>

                    {/* 3. BLOQUE DE ACCIÓN (SOLO VISIBLE EN DESKTOP) */}
                    {/* En desktop, esto es una columna nueva a la derecha */}
                    <div className="hidden md:flex flex-col items-end gap-2 pl-4 border-l border-gray-50">
                        <div className="text-right">
                             <span className="block text-xl font-extrabold text-black tracking-tight">{symbol}{product.usd_cash_price}</span>
                             {activeRate > 0 && (
                                <span className="block text-xs text-gray-400 font-medium">
                                    Ref. {symbol}{totalRef} | Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(priceInBs)}
                                </span>
                             )}
                        </div>
                        {/* El botón es compacto en desktop */}
                        <div className="mt-1">
                          <AddToCartBtn product={product} />
                        </div>
                    </div>

                  </div>
                  {/* ------------------------------- */}

                </div>
              )
            })}
        </div>
      </main>
      {/* CHECKOUT FLOTANTE */}
      <FloatingCheckout 
        rate={activeRate} 
        currency={currencyMode}
        phone={ownerPhone} 
        storeName={store.name}
      />
      
      <footer className="mt-10 text-center text-xs text-gray-400">
        Precios calculados a tasa {currencyMode.toUpperCase()} BCV
      </footer>
    </div>
  )
}