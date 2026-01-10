// Esto obliga a Next.js a regenerar la página en cada visita
export const revalidate = 0; 
export const dynamic = 'force-dynamic';

import { Metadata } from 'next'
import AddToCartBtn from '@/components/AddToCartBtn'
import FloatingCheckout from '@/components/FloatingCheckout'
import { createClient } from '@supabase/supabase-js' 
import { ShoppingBag, RefreshCw, Tag } from 'lucide-react' 

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

// 2. Buscamos Tienda (AHORA INCLUYE LOGO_URL)
async function getStoreOwner(slug: string) {
  const { data: store } = await supabase
    .from('stores')
    .select('user_id, name, currency_type, phone, payment_methods, logo_url') // <--- IMPORTANTE
    .eq('slug', slug)
    .single()
  return store
}

// 3. Buscamos Productos 
async function getProducts(userId: string) {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: false })
  
  if (error) {
    console.error("Error SQL buscando productos:", error)
    return [] 
  }
  return products
}

// --- METADATA CON LOGO ---
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const store = await getStoreOwner(slug)

  if (!store) {
    return {
      title: 'Tienda no encontrada',
      description: 'El catálogo que buscas no existe o ha sido eliminado.'
    }
  }

  // Si hay logo, lo usamos. Si no, dejamos vacío o usamos una por defecto.
  const images = store.logo_url ? [store.logo_url] : []

  return {
    title: `${store.name} | Catálogo Online`,
    description: `¡Hola! Revisa el catálogo de productos de ${store.name} y haz tu pedido directamente por WhatsApp.`,
    openGraph: {
      title: store.name,
      description: `Catálogo digital de ${store.name}. Precios actualizados y pedidos vía WhatsApp.`,
      type: 'website',
      images: images, // <--- AQUÍ SE MAGIA
    }
  }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans relative">
      
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Si tiene logo, lo mostramos en el header también */}
            {store.logo_url ? (
                <img src={store.logo_url} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="Logo" />
            ) : (
                <div className="bg-black p-2 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-white" />
                </div>
            )}
            <h1 className="text-lg font-bold tracking-tight text-gray-900">{store.name}</h1>
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${
            currencyMode === 'eur' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-green-50 text-green-700 border-green-100'
          }`}>
             <RefreshCw className="w-3 h-3" />
             <span className="uppercase">Tasa: {activeRate} Bs</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-end mb-6">
            <p className="text-sm text-gray-500">{products.length} Productos</p>
        </div>

        {products.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="text-gray-300" />
             </div>
             <p className="text-gray-400">Esta tienda aún no tiene productos.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {products.map((product: any) => {
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
                                    <span className="text-xl font-black text-gray-900">${product.usd_cash_price}</span>
                                    {hasPenalty && (
                                        <span className="text-xs text-gray-400 line-through font-medium">${totalRef}</span>
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
        phone={ownerPhone} 
        storeName={store.name}
        paymentMethods={store.payment_methods} 
      />
      
      <footer className="py-8 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
        <p>Precios calculados a tasa {currencyMode.toUpperCase()} BCV</p>
        <p className="mt-1">Powered by Center Service</p>
      </footer>
    </div>
  )
}