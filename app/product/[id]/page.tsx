import { createClient } from '@/utils/supabaseServer';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import AddToCartBtn from '@/components/AddToCartBtn';

// 1. OBTENER PRODUCTO
async function getProduct(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  
  if (error) {
    console.error("❌ Error cargando producto:", error.message);
    return null;
  }
  return data;
}

// 2. OBTENER TIENDA (Corregido: Tabla 'stores')
async function getStore(userId: string) {
  const supabase = await createClient();
  // Ahora apuntamos a la tabla correcta 'stores' definida en tu esquema
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error(`❌ Error buscando tienda en 'stores' (user_id: ${userId}):`, error.message);
    return null; 
  }
  return data;
}

// 3. OBTENER TASAS GLOBALES (Corregido: Tabla 'app_config')
async function getGlobalRates() {
  const supabase = await createClient();
  // Apuntamos a 'app_config' que es la que tiene 'usd_rate' y 'eur_rate'
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .single(); // Debería funcionar porque app_config suele tener 1 sola fila (id=1)
  
  if (error) {
    console.warn("⚠️ Error leyendo 'app_config':", error.message);
    // Retornamos valores por defecto si falla la DB para no romper la app
    return { usd_rate: 0, eur_rate: 0 }; 
  }
  return data;
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // 1. Cargar producto
  const product = await getProduct(id);
  
  if (!product) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 font-sans">
         <h1 className="text-4xl font-black text-gray-200 uppercase mb-2">404</h1>
         <p className="text-gray-500 font-medium">Producto no encontrado</p>
         <Link href="/" className="mt-6 text-xs font-bold text-black underline uppercase tracking-widest">
           Volver al inicio
         </Link>
       </div>
     );
  }

  // 2. Cargar datos relacionados en paralelo
  const [store, globalRates] = await Promise.all([
    getStore(product.user_id),
    getGlobalRates()
  ]);

  // --- VARIABLES SEGURAS (Fallbacks) ---
  const storeSlug = store?.slug || '#'; 
  const storeName = store?.name || 'Tienda';
  const currencySymbol = store?.currency_symbol || '$';

  // --- LÓGICA DE TASA INTELIGENTE (Adaptada a tu Schema) ---
  const currencyMode = store?.currency_symbol === '€' ? 'eur' : 'usd';
  let activeRate = 0;
  
  // Prioridad: Tasa Manual de Tienda > Tasa Global del Sistema
  if (currencyMode === 'eur') {
      // Usamos eur_price de la tabla 'stores' o eur_rate de 'app_config'
      activeRate = (store?.eur_price && store.eur_price > 0) 
        ? store.eur_price 
        : globalRates?.eur_rate || 0;
  } else {
      // Usamos usd_price de la tabla 'stores' o usd_rate de 'app_config'
      activeRate = (store?.usd_price && store.usd_price > 0) 
        ? store.usd_price 
        : globalRates?.usd_rate || 0;
  }

  // --- CÁLCULOS DE PRECIO ---
  const priceUsd = product.usd_cash_price;
  const priceBs = activeRate > 0 ? (priceUsd * activeRate) : 0;
  const hasPenalty = product.usd_penalty > 0;
  
  // Formatear ID visualmente
  const displayId = String(product.id).length > 8 
        ? String(product.id).slice(0, 8) 
        : String(product.id);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-32 animate-in fade-in duration-500">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 h-16 flex items-center px-4 md:px-8 justify-between">
        <Link 
            // CORRECCIÓN: Ahora lleva a la tienda real (ej: /zapatos-ccs)
            href={storeSlug !== '#' ? `/${storeSlug}` : '/'} 
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black uppercase tracking-wider transition-colors"
        >
            <ArrowLeft size={18} />
            <span className="hidden md:inline">Volver a {storeName}</span>
            <span className="md:hidden">Volver</span>
        </Link>

        <div className="font-mono text-xs font-medium text-gray-400">
            REF: {displayId}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        
        {/* BREADCRUMBS */}
        <div className="mb-8 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Link href={storeSlug !== '#' ? `/${storeSlug}` : '/'} className="hover:text-black transition-colors">
              {storeName}
            </Link> 
            <span>/</span>
            <span className="text-gray-600">{product.category || 'General'}</span>
            <span>/</span>
            <span className="text-black">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
            
            {/* IMAGEN TÉCNICA */}
            <div className="relative w-full aspect-square bg-white border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center p-8 md:p-12 shadow-sm">
                {product.image_url ? (
                    <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="text-gray-200 font-black text-6xl md:text-8xl select-none opacity-20">P.</div>
                )}

                {hasPenalty && (
                    <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-md">
                        Desc Divisa
                    </div>
                )}
            </div>

            {/* DETALLES */}
            <div className="flex flex-col h-full justify-center">
                
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 uppercase tracking-tighter leading-[0.9] mb-4 md:mb-6">
                    {product.name}
                </h1>

                {/* TARJETA DE PRECIO */}
                <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl mb-8">
                    <div className="flex items-baseline justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Precio Unitario</span>
                        
                        {activeRate > 0 ? (
                             <span className="text-xs font-mono font-medium text-gray-500">
                                Tasa {currencyMode.toUpperCase()}: <span className="text-black font-bold">{activeRate} Bs</span>
                             </span>
                        ) : (
                             <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                Tasa no disponible
                             </span>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-gray-900">
                             <span className="text-2xl font-bold text-gray-400">{currencySymbol}</span>
                             <span className="text-5xl md:text-6xl font-black tracking-tighter font-mono">
                                {priceUsd}
                             </span>
                        </div>
                        {activeRate > 0 && (
                            <div className="font-mono text-gray-500 text-lg font-medium">
                                ≈ Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(priceBs)}
                            </div>
                        )}
                    </div>
                </div>

                {/* DESCRIPCIÓN */}
                <div className="prose prose-sm text-gray-500 mb-10 leading-relaxed">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Especificaciones</h3>
                    <p>{product.description || "Sin descripción técnica disponible para este ítem."}</p>
                </div>

                {/* ACCIONES */}
                <div className="flex flex-col gap-4">
                    <div className="h-14">
                         {/* Pasamos el producto completo para que AddToCartBtn funcione */}
                         <AddToCartBtn product={product} /> 
                    </div>
                    
                    {/* GARANTÍAS Y ENVÍO */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-3 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                            <ShieldCheck className="text-green-600" size={20}/>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-gray-900 tracking-wide">Garantía</span>
                                <span className="text-[10px] text-gray-500">Compra protegida</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                            <Truck className="text-black" size={20}/>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-gray-900 tracking-wide">Envío Nacional</span>
                                <span className="text-[10px] text-gray-500">MRW / Zoom / Tealca</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}