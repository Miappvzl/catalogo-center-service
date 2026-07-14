'use client'

import { useState } from 'react'

interface ProductWholesaleConfigProps {
  initialActive?: boolean;
  initialMinQty?: number;
  initialDiscountPct?: number;
  onChange: (data: { wholesale_active: boolean, wholesale_min_qty: number, wholesale_discount_pct: number }) => void;
}

export default function ProductWholesaleConfig({
  initialActive = false,
  initialMinQty = 6,
  initialDiscountPct = 0,
  onChange
}: ProductWholesaleConfigProps) {
  
  const [isActive, setIsActive] = useState(initialActive);
  const [minQty, setMinQty] = useState(initialMinQty);
  const [discountPct, setDiscountPct] = useState(initialDiscountPct);

  const handleToggle = () => {
    const newState = !isActive;
    setIsActive(newState);
    onChange({ wholesale_active: newState, wholesale_min_qty: minQty, wholesale_discount_pct: discountPct });
  };

  const handleUpdate = (field: 'minQty' | 'discountPct', value: number) => {
    const safeValue = isNaN(value) || value < 0 ? 0 : value;
    if (field === 'minQty') setMinQty(safeValue);
    if (field === 'discountPct') setDiscountPct(safeValue > 100 ? 100 : safeValue);
    
    onChange({ 
      wholesale_active: isActive, 
      wholesale_min_qty: field === 'minQty' ? safeValue : minQty, 
      wholesale_discount_pct: field === 'discountPct' ? safeValue : discountPct 
    });
  };

  return (
    <div className="bg-white p-6 border border-gray-200 mb-4 rounded-[var(--radius-card)] w-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Regla Mayorista Individual</h3>
          <p className="text-xs text-gray-500 mt-0.5">Sobreescribe la configuración global para este producto específico.</p>
        </div>
        
        {/* Clean B2B Toggle */}
        <button 
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-black' : 'bg-gray-200'}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {isActive && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Cantidad Mínima</label>
            <input 
              type="number" 
              min="2"
              value={minQty}
              onChange={(e) => handleUpdate('minQty', parseInt(e.target.value))}
              className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-black rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">% de Descuento</label>
            <div className="relative">
              <input 
                type="number" 
                min="0"
                max="100"
                step="0.01"
                value={discountPct}
                onChange={(e) => handleUpdate('discountPct', parseFloat(e.target.value))}
                className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-black rounded-[var(--radius-btn)] pl-4 pr-8 py-3 text-sm font-bold text-gray-900 outline-none transition-all tabular-nums"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
            </div>
          </div>

          <div className="md:col-span-2 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
              Las cantidades de todas las tallas y colores de este producto se sumarán automáticamente para alcanzar esta meta en el carrito del cliente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}