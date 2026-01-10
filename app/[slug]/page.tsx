// Esto obliga a Next.js a regenerar la página en cada visita
export const revalidate = 0; 
export const dynamic = 'force-dynamic';

import AddToCartBtn from '@/components/AddToCartBtn'
import FloatingCheckout from '@/components/FloatingCheckout'
import { createClient } from '@supabase/supabase-js' 
import { ShoppingBag, RefreshCw, AlertTriangle } from 'lucide-react' // Agregué AlertTriangle para debug

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 1. Buscamos Tasas
async function getExchangeRates() {
  const { data } = await supabase.from('app_config').select('usd_rate, eur_rate').eq('id', 1).single()
  return data
}

// 2. Buscamos Tienda (CORREGIDO: Agregado payment_methods)
async function getStoreOwner(slug: string) {
  const { data: store } = await supabase
    .from('stores')
    .select('user_id, name, currency_type, phone, payment_methods') // <--- ¡AQUÍ FALTABA ESTO!
    .eq('slug', slug)
    .single()
  return store
}

// 3. Buscamos Productos (Con manejo de errores para debug)
async function getProducts(userId: string) {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: false })
  
  if (error) console.error("Error buscando productos:", error)
  return products
}

export default async function DynamicStore({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const slug = resolvedParams.slug

  const [store, rates] = await Promise.all([
    getStoreOwner(slug),
    getExchangeRates()
  ])

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-gray-600">Tienda no encontrada.</p>
      </div>
    )
  }

  const currencyMode = store.currency_type === 'eur' ? 'eur' : 'usd'
  const activeRate = currencyMode === 'eur' ? rates?.eur_rate : rates?.usd_rate
  const symbol = currencyMode === 'eur' ? '€' : '$'

  const products = await getProducts(store.user_id) || []
  const ownerPhone = store.phone || '584120000000'

  // --- MODO DEBUG (SOLO PARA TI) ---
  // Si no hay productos, mostramos información técnica para entender por qué.
  const isDebug = products.length === 0; 
  // ---------------------------------

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
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
            currencyMode === 'eur' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-green-50 text-green-700 border-green-100'
          }`}>
             <RefreshCw className="w-3 h-3" />
             <span className="uppercase">Tasa {currencyMode}: {activeRate} Bs</span>
          </div>
        </div>
      </header>

      {/* --- BLOQUE DE DEBUG (BÓRRALO CUANDO ARREGLEMOS) --- */}
      {isDebug && (
        <div className="max-w-2xl mx-auto px-4 py-4 mt-4">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-xs font-mono text-yellow-800 break-all">
                <p className="font-bold flex items-center gap-2 text-sm mb-2">
                    <AlertTriangle size={16}/> MODO DETECTIVE ACTIVADO
                </p>
                <p><strong>Tienda Slug:</strong> {slug}</p>
                <p><strong>Dueño ID (Store):</strong> {store.user_id}</p>
                <p><strong>Buscando productos donde user_id == </strong> {store.user_id}</p>
                <p><strong>Resultados encontrados:</strong> {products.length}</p>
                <p className="mt-2 text-gray-500 italic">
                    Si ves el ID del dueño aquí, ve a Supabase - Tabla Products y revisa si tus productos tienen EXACTAMENTE este mismo ID en la columna 'user_id'. Si son diferentes, ahí está el problema.
                </p>
            </div>
        </div>
      )}
      {/* --------------------------------------------------- */}

      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 mb-6">Mostrando {products.length} productos</p>

        <div className="flex flex-col gap-4">
            {products.map((product: any) => {
              const totalRef = product.usd_cash_price + (product.usd_penalty || 0)
              const priceInBs = totalRef * (activeRate || 0)

              return (
                <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-4 items-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50">
                        {product.image_url && ( <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1 leading-tight">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category} • {product.sizes || 'Unico'}</p>
                        <div className="mt-3 flex flex-col gap-3 md:hidden">
                            <div className="flex items-end gap-2">
                                <span className="text-xl font-extrabold text-black tracking-tight">{symbol}{product.usd_cash_price}</span>
                                {activeRate > 0 && (
                                    <span className="text-sm text-gray-500 font-medium pb-0.5">
                                        Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(priceInBs)}
                                    </span>
                                )}
                            </div>
                            <AddToCartBtn product={product} />
                        </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-2 pl-4 border-l border-gray-50">
                        <div className="text-right">
                             <span className="block text-xl font-extrabold text-black tracking-tight">{symbol}{product.usd_cash_price}</span>
                             {activeRate > 0 && (
                                <span className="block text-xs text-gray-400 font-medium">
                                    Ref. {symbol}{totalRef} | Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(priceInBs)}
                                </span>
                             )}
                        </div>
                        <div className="mt-1">
                          <AddToCartBtn product={product} />
                        </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </main>

      {/* Checkout con métodos de pago corregidos */}
      <FloatingCheckout 
        rate={activeRate} 
        currency={currencyMode}
        phone={ownerPhone} 
        storeName={store.name}
        paymentMethods={store.payment_methods} 
      />
      
      <footer className="mt-10 text-center text-xs text-gray-400">
        Precios calculados a tasa {currencyMode.toUpperCase()} BCV
      </footer>
    </div>
  )
}