import { Metadata } from 'next'
import Link from 'next/link'
import ShareButton from '@/components/ShareButton' // <--- 1. IMPORTAR
import { createClient } from '@supabase/supabase-js' 
import { ArrowLeft, MessageCircle, AlertTriangle, CheckCircle, Share2, Tag, ShoppingBag } from 'lucide-react'

// Forzamos dinamismo para que siempre traiga el precio y tasa actual
export const revalidate = 0; 
export const dynamic = 'force-dynamic';

// Inicializamos Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// --- 1. FUNCIONES DE DATOS ---

// Buscar producto por ID
async function getProduct(id: string) {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  return product
}

// Buscar la tienda dueña del producto (para saber el teléfono y slug)
async function getStoreByUserId(userId: string) {
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .single()
  return store
}

// Buscar Tasa del día
async function getRates() {
  const { data } = await supabase.from('app_config').select('usd_rate, eur_rate').eq('id', 1).single()
  return data
}

// --- 2. METADATA (MAGIA PARA WHATSAPP) ---
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const product = await getProduct(resolvedParams.id)
  
  if (!product) return { title: 'Producto no encontrado' }

  return {
    title: `${product.name} | Disponible`,
    description: `Precio: $${product.usd_cash_price}. Entra para ver detalles y comprar.`,
    openGraph: {
      images: product.image_url ? [product.image_url] : [],
      title: product.name,
      description: `Precio: $${product.usd_cash_price}. Entra para ver detalles y comprar.`
    }
  }
}

// --- 3. COMPONENTE PRINCIPAL ---
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // Ejecutamos peticiones en paralelo (Optimización de velocidad)
  const product = await getProduct(id)
  
  // Si no hay producto, mostramos error 404
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
        <div className="bg-gray-100 p-4 rounded-full mb-4"><ShoppingBag className="text-gray-400" size={32}/></div>
        <h2 className="text-2xl font-bold mb-2">Producto no encontrado</h2>
        <p className="text-gray-500 mb-6">Es posible que haya sido eliminado.</p>
        <Link href="/" className="text-black underline font-bold">Ir al inicio</Link>
      </div>
    )
  }

  // Buscamos la tienda y las tasas
  const [store, rates] = await Promise.all([
    getStoreByUserId(product.user_id),
    getRates()
  ])

  // --- LÓGICA DE PRECIOS ---
  const currencyMode = store?.currency_type === 'eur' ? 'eur' : 'usd'
  const activeRate = currencyMode === 'eur' ? rates?.eur_rate : rates?.usd_rate
  const symbol = '$' // Forzamos $ visualmente

  const priceBase = product.usd_cash_price
  const penalty = product.usd_penalty || 0
  const priceRefFull = priceBase + penalty // Precio "tachado" o para pago móvil
  
  const bsPrice = priceRefFull * (activeRate || 0)
  const hasDiscount = penalty > 0

  // Link de WhatsApp Directo
  const wsPhone = store?.phone || '584120000000'
  const wsMessage = `Hola *${store?.name || 'Tienda'}*, estoy interesado en el producto:\n\n👟 *${product.name}*\n💵 Precio Ref: $${priceBase}\n\n¿Está disponible?`
  const wsLink = `https://wa.me/${wsPhone}?text=${encodeURIComponent(wsMessage)}`

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      
      {/* NAVBAR SIMPLE */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center gap-4 z-50">
        <Link href={store ? `/${store.slug}` : '/'} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight line-clamp-1">{product.name}</span>
            <span className="text-[10px] text-gray-500">{store?.name || 'Tienda Oficial'}</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto md:py-8 md:px-4">
        <div className="flex flex-col md:flex-row gap-8">
            
            {/* 1. IMAGEN (Full width en móvil, cuadrada en PC) */}
            <div className="w-full md:w-1/2 bg-gray-50 aspect-square relative md:rounded-3xl overflow-hidden border-gray-100 md:border">
                {product.image_url ? (
                    <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">Sin Foto</div>
                )}
                
                {hasDiscount && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                        <Tag size={12} /> MEJOR PRECIO EN DIVISA
                    </div>
                )}
            </div>

            {/* 2. DETALLES */}
            <div className="flex-1 px-5 md:px-0">
                <div className="mb-6">
                    <span className="inline-block py-1 px-2 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold uppercase tracking-wider mb-3">
                        {product.category || 'General'}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4 tracking-tight">{product.name}</h1>
                    
                    {/* Precios */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase">Precio de Referencia</p>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl font-black text-gray-900 tracking-tighter">${priceBase}</span>
                            {hasDiscount && (
                                <div className="flex flex-col leading-none">
                                    <span className="text-sm text-gray-400 line-through font-bold">${priceRefFull}</span>
                                    <span className="text-[10px] text-green-600 font-bold">Ahorras ${penalty}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Precio en Bs */}
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-200/50 mt-3">
                            <div className="bg-blue-50 text-blue-700 p-1.5 rounded-lg">
                                <RefreshCw size={14} className="animate-spin-slow" style={{ animationDuration: '3s' }}/> 
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Tasa BCV hoy: <b>{activeRate} Bs</b></p>
                                <p className="text-sm font-bold text-gray-700">
                                    ~ Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(bsPrice)}
                                </p>
                            </div>
                        </div>

                        {/* Alerta de Descuento (Penalty) */}
                        {hasDiscount && (
                            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex gap-3">
                                <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                                <div className="text-xs text-yellow-800">
                                    <p className="font-bold">Descuento por pago en Divisas</p>
                                    <p className="leading-relaxed mt-0.5 opacity-90">
                                        El precio de <b>${priceBase}</b> aplica para Zelle, Efectivo o Binance. 
                                        Para Pago Móvil el cálculo base es ${priceRefFull}.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tallas */}
                {product.sizes && (
                    <div className="mb-8">
                        <h3 className="font-bold text-sm mb-3 text-gray-900">Tallas / Variantes</h3>
                        <div className="flex flex-wrap gap-2">
                        {product.sizes.split(',').map((size: string, i: number) => (
                            <span key={i} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600">
                                {size.trim()}
                            </span>
                        ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 text-gray-500 text-sm mb-8">
                    <CheckCircle size={16} className="text-green-500"/> Disponible en inventario
                </div>
            </div>
        </div>
      </main>

      {/* FOOTER FLOTANTE MÓVIL / DESKTOP */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-6 md:pb-4 shadow-2xl z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="hidden md:block">
            <p className="text-xs text-gray-500">Precio Final</p>
            <p className="font-black text-xl">${priceBase}</p>
          </div>
          
          <a 
            href={wsLink}
            target="_blank"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-200"
          >
            <MessageCircle size={20} />
            Pedir por WhatsApp
          </a>
        {/* ... dentro del div fixed bottom-0 ... */}

{/* USAR EL NUEVO BOTÓN CON TODOS LOS DATOS */}
<ShareButton 
    productName={product.name} 
    price={priceBase} 
    slug={id}
    imageUrl={product.image_url} // <--- ¡Aquí pasamos la imagen!
/>
          
        </div>
      </div>
    </div>
  )
}
function RefreshCw({ size, className, style }: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
}