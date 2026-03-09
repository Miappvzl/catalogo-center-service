'use client'

import { ImageIcon, ShoppingCart, Flame } from 'lucide-react'

// Interfaz para estandarizar los datos que recibe
interface ProductCardProps {
  product: any;
  pricing: {
    cashPrice: number;
    priceInBs: number;
    discountPercent: number;
    hasDiscount: boolean;
  };
  onOpen: (product: any) => void;
}

export default function ProductCard({ product, pricing, onOpen }: ProductCardProps) {
  // Calculamos el ahorro exacto basado en la penalidad guardada por el admin
  const exactSavings = Number(product.usd_penalty || 0);

  return (
    <div 
      className="break-inside-avoid md:break-inside-auto w-full group cursor-pointer flex flex-col gap-0 relative transition-transform duration-200 md:hover:-translate-y-1"
      onClick={() => onOpen(product)}
    >
      {/* Imagen Container: IMAGEN 100% LIMPIA (Sin overlays) */}
      <div className="relative w-full bg-gray-50 overflow-hidden border border-gray-200/60 rounded-[3px] md:aspect-[4/5]">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-auto md:h-full md:absolute md:inset-0 md:object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center text-gray-300">
            <ImageIcon size={24} strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Apartado de Información Estructurada */}
      <div className="flex flex-col px-0.5 mt-3">
        
        {/* Badges Estilo Editorial */}
        {(pricing.hasDiscount || product.stock <= 0) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pricing.hasDiscount && exactSavings > 0 && (
              <span className=" text-emerald-700 text-[11px] font-bold tracking-wide flex items-center gap-1">
                Ahorra ${exactSavings.toFixed(2)} pagando en USD 
                <Flame size={14} className="text-emerald-600 fill-emerald-600/20" />
              </span>
            )}
            {product.stock <= 0 && (
              <span className="bg-white text-black border border-gray-200 text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm flex items-center">
                Agotado
              </span>
            )}
          </div>
        )}

        {/* Título del Producto */}
        <h3 className="text-xs md:text-sm font-bold text-gray-900 tracking-tight leading-snug group-hover:text-gray-600 transition-colors line-clamp-2">
          {product.name}
        </h3>

        {/* Fila de Acción: Precios (Izquierda) + Botón Carrito (Derecha) */}
        <div className="flex items-end justify-between gap-3 mt-1.5">
          <div className="flex flex-col min-w-0">
            <span className="text-sm md:text-base font-black text-gray-900 leading-none">
              ${pricing.cashPrice.toFixed(2)}
            </span>
            <span className="text-[10px] md:text-[11px] font-mono font-bold text-gray-400 leading-none mt-1.5">
              Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(product);
            }}
            className="bg-white text-gray-900 p-2 md:p-2.5 rounded-full border border-gray-200 hover:border-black hover:bg-gray-50 transition-colors active:scale-95 flex items-center justify-center shrink-0"
            aria-label="Ver producto"
          >
            <ShoppingCart className="w-4 h-4 md:w-[16px] md:h-[16px]" strokeWidth={2.5} />
          </button>
        </div>
        
      </div>
    </div>
  )
}