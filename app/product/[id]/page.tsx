import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

// @ts-ignore
export default async function ProductPage({ params }) {
  const { id } = params;
  const productNameDecoded = decodeURIComponent(id);

  // 1. Consultas a Supabase
  // Buscamos el producto por nombre (Name)
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('name', productNameDecoded)
    .single();
    
  // Buscamos el dólar
  const { data: config } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'dolar_rate')
    .single();

  const dolarRate = Number(config?.value || 0);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h2 className="text-2xl font-bold mb-4">Producto no encontrado 😢</h2>
        <Link href="/" className="text-blue-600 underline">Volver al catálogo</Link>
      </div>
    );
  }

  // --- LÓGICA DE NEGOCIO (Igual que antes, pero con datos de DB) ---
  const priceUSD = Number(product.usd_cash_price || 0);
  const penalty = Number(product.usd_penalty || 0);
  const priceBS = (priceUSD + penalty) * dolarRate;
  const hasPenalty = penalty > 0;

  // Mensaje de WhatsApp
  const wsMsg = `Hola Center Service, quiero comprar: ${product.name}. \nPrecio visto: ${priceBS.toLocaleString('es-VE', {maximumFractionDigits:2})} Bs.`;
  const wsLink = `https://wa.me/584121234567?text=${encodeURIComponent(wsMsg)}`;

  return (
    <div className="min-h-screen bg-white text-zinc-900 pb-20">
      <nav className="sticky top-0 bg-white/90 backdrop-blur border-b border-zinc-100 p-4 flex items-center gap-4 z-50">
        <Link href="/" className="p-2 hover:bg-zinc-100 rounded-full transition">
          <ArrowLeft size={24} />
        </Link>
        <span className="font-semibold text-lg truncate">{product.name}</span>
      </nav>

      <main className="max-w-4xl mx-auto">
        <div className="w-full aspect-square md:aspect-video bg-zinc-50 relative">
           <img 
             src={product.image_url || 'https://via.placeholder.com/600'} 
             alt={product.name} 
             className="w-full h-full object-contain md:object-cover"
           />
        </div>

        <div className="p-6">
          <div className="mb-6">
            <span className="text-blue-600 font-bold text-sm tracking-widest uppercase">{product.category}</span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2 mb-2">{product.name}</h1>
            <div className="flex items-center gap-2 text-zinc-500">
               <CheckCircle size={16} className="text-green-500"/>
               <span className="text-sm">Disponible en tienda</span>
            </div>
          </div>

          <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 mb-8">
            <p className="text-sm text-zinc-500 mb-1">Precio Total en Bolívares</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-zinc-900">
                {priceBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xl text-zinc-400 font-medium">Bs</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
               <span>Referencia Divisas:</span>
               <span className="font-bold text-green-600">${priceUSD}</span>
               {hasPenalty && <span className="text-xs text-red-400 line-through">(No aplica en Bs)</span>}
            </div>

            {hasPenalty && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-yellow-800 text-sm">Oferta especial solo en Divisas</h4>
                  <p className="text-yellow-700 text-xs mt-1 leading-relaxed">
                    El precio de referencia (${priceUSD}) es promocional. Para pagos en Bolívares aplica el precio base sin descuento, calculado a la tasa del día.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mb-8">
            <h3 className="font-bold mb-3">Tallas Disponibles</h3>
            <div className="flex flex-wrap gap-2">
              {(product.sizes || 'Consultar').split(',').map((size: string, i: number) => (
                <span key={i} className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium">
                  {size.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-100 p-4 pb-6 md:pb-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="hidden md:block">
            <p className="text-xs text-zinc-500">Total a pagar</p>
            <p className="font-bold text-xl">{priceBS.toLocaleString('es-VE', {maximumFractionDigits:2})} Bs</p>
          </div>
          <a 
            href={wsLink}
            target="_blank"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <MessageCircle size={20} />
            Pedir por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}