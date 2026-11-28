'use client'

import { useState } from 'react'

interface ProductWholesaleConfigProps {
  initialActive?: boolean;
  initialMinQty?: number;
  initialDiscountPct?: number;
  basePrice?: number;
  unitCost?: number | null;
  onChange: (data: { wholesale_active: boolean, wholesale_min_qty: number, wholesale_discount_pct: number }) => void;
}

export default function ProductWholesaleConfig({
  initialActive = false,
  initialMinQty = 6,
  initialDiscountPct = 0,
  basePrice = 0,
  unitCost = null,
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
      wholesale_discount_pct: field === 'discountPct' ? (safeValue > 100 ? 100 : safeValue) : discountPct 
    });
  };

  const hasValidCost = unitCost !== null && unitCost !== undefined && unitCost >= 0;
  const wholesaleUnitPrice = basePrice > 0 ? Number((basePrice * (1 - discountPct / 100)).toFixed(2)) : 0;
  const wholesaleUnitProfit = hasValidCost ? Number((wholesaleUnitPrice - Number(unitCost)).toFixed(2)) : null;
  const wholesaleMarginPct = hasValidCost && wholesaleUnitPrice > 0
    ? Number((((wholesaleUnitPrice - Number(unitCost)) / wholesaleUnitPrice) * 100).toFixed(1))
    : null;
  const isBelowCost = hasValidCost && basePrice > 0 && wholesaleUnitPrice < Number(unitCost);
  const maxSafeDiscountPct = hasValidCost && basePrice > Number(unitCost)
    ? Number((((basePrice - Number(unitCost)) / basePrice) * 100).toFixed(2))
    : 0;

  return (
    <div className="bg-white p-6 border border-neutral-200/60 mb-4 rounded-[var(--radius-card)] w-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Regla Mayorista Individual</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Sobreescribe la configuración global para este producto específico.</p>
        </div>
        
        {/* Clean B2B Toggle */}
        <button 
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-neutral-950' : 'bg-neutral-200'}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {isActive && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block mb-1.5">Cantidad Mínima</label>
            <input 
              type="number" 
              min="2"
              value={minQty}
              onChange={(e) => handleUpdate('minQty', parseInt(e.target.value))}
              className="w-full bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/60 focus:border-neutral-900 rounded-[var(--radius-btn)] px-4 py-3 text-sm font-bold text-neutral-900 outline-none transition-all font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block mb-1.5">% de Descuento</label>
            <div className="relative">
              <input 
                type="number" 
                min="0"
                max="100"
                step="0.01"
                value={discountPct}
                onChange={(e) => handleUpdate('discountPct', parseFloat(e.target.value))}
                className={`w-full bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border rounded-[var(--radius-btn)] pl-4 pr-8 py-3 text-sm font-bold outline-none transition-all tabular-nums font-mono ${
                  isBelowCost
                    ? 'border-rose-300 text-rose-700 focus:border-rose-500 bg-rose-50/40'
                    : 'border-neutral-200/60 text-neutral-900 focus:border-neutral-900'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold font-mono">%</span>
            </div>
          </div>

          {/* Telemetría Mayorista en Vivo */}
          {basePrice > 0 && (
            <div className={`md:col-span-2 p-3.5 rounded-xl border transition-colors ${
              isBelowCost
                ? 'bg-rose-50/80 border-rose-200/80 text-rose-950'
                : 'bg-neutral-50/80 border-neutral-200/60 text-neutral-800'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">
                    Precio Mayorista Unitario:
                  </span>
                  <span className="text-xs font-mono font-black text-neutral-950">
                    ${wholesaleUnitPrice.toFixed(2)}
                  </span>
                  {hasValidCost && wholesaleUnitProfit !== null && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      isBelowCost
                        ? 'bg-rose-100/90 text-rose-800 border-rose-300'
                        : wholesaleMarginPct !== null && wholesaleMarginPct < 10
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                    }`}>
                      {isBelowCost
                        ? `Pérdida: -$${Math.abs(wholesaleUnitProfit).toFixed(2)}/und`
                        : `Ganancia: +$${wholesaleUnitProfit.toFixed(2)}/und (${wholesaleMarginPct}% margen)`}
                    </span>
                  )}
                </div>

                {isBelowCost && maxSafeDiscountPct > 0 && (
                  <button
                    type="button"
                    onClick={() => handleUpdate('discountPct', maxSafeDiscountPct)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  >
                    Topar en {maxSafeDiscountPct}% (Punto Equilibrio)
                  </button>
                )}
              </div>

              {isBelowCost && (
                <p className="text-[11px] font-medium text-rose-800 mt-2 leading-relaxed">
                  🚨 <b>Alerta de Pérdida al Mayor:</b> Con un {discountPct}% de descuento, el precio unitario (${wholesaleUnitPrice.toFixed(2)}) cae por debajo de tu costo guardado (${Number(unitCost).toFixed(2)}). En un pedido mínimo de {minQty} unidades perderías <b>-${(Math.abs(wholesaleUnitProfit || 0) * Math.max(1, minQty)).toFixed(2)}</b>.
                </p>
              )}
            </div>
          )}

          <div className="md:col-span-2 mt-1 bg-neutral-50 p-3 rounded-lg border border-neutral-100 flex items-start gap-2">
            <svg className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] font-medium text-neutral-500 leading-relaxed">
              Las cantidades de todas las tallas y colores de este producto se sumarán automáticamente para alcanzar esta meta en el carrito del cliente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}