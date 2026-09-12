'use client'

import { useState } from 'react'
import { DollarSign, Banknote, Activity, XCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// 1. Añade 'salesTodayBs' a la interface de props al inicio del archivo:
interface TodaySalesWidgetProps {
  currencySymbol: string
  salesTodayUSD: number
  salesTodayBs?: number // 👈 AÑADIR
  cashPct: number
  digitalPct: number
  cashTotalUSD: number
  digitalTotalUSD: number
  sortedDigitalMethods: { name: string; amount: number }[]
}

// 2. Recíbelo en la función del componente:
export default function TodaySalesWidget({
  currencySymbol,
  salesTodayUSD,
  salesTodayBs = 0, // 👈 AÑADIR
  cashPct,
  digitalPct,
  cashTotalUSD,
  digitalTotalUSD,
  sortedDigitalMethods
}: TodaySalesWidgetProps) {
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false)

  return (
    <>
      {/* TARJETA BENTO: VENTAS HOY (Liquid Titanium & Obsidian) */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[140px] group transition-all hover:border-neutral-300 cursor-default relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
          <div className="w-8 h-8 rounded-lg bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0">
            <DollarSign size={14} strokeWidth={2.5} />
          </div>

        
            <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-neutral-500 bg-[#F6F6F6] px-2 py-0.5 rounded">FACTURADO HOY</span>
        
        </div>

      <div className="relative z-10 mt-3 space-y-3">
          {/* Cifra grande + Equivalente en Bs alineado con la tarjeta de Tasa */}
          <div>
            <p className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-neutral-900 leading-none tabular-nums">
              {currencySymbol}{salesTodayUSD.toFixed(2)}
            </p>
            
            {/* 🚀 MICRO-COPY DE ALINEACIÓN (Dato financiero en vivo) */}
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-neutral-400 font-semibold truncate">
              <span className="text-neutral-500 font-bold">≈</span>
              <span className="text-neutral-600">
                Bs {salesTodayBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-neutral-300">•</span>
              <span>BCV</span>
            </div>
          </div>

          {/* Micro-componente: Donut de Telemetría */}
          {/* ... resto del botón del donut ... */}
          <button 
            type="button"
            onClick={() => setIsLiquidityModalOpen(true)}
            className="flex items-center gap-3.5 pt-2 w-full text-left outline-none active:scale-[0.98] transition-transform cursor-pointer group/liquidity"
            title="Ver desglose contable"
          >
            {/* Anillo Vectorial de 32px (SVG de 0ms de carga) */}
            <div className="relative w-8 h-8 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* Pista base de fondo */}
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#F4F4F5" strokeWidth="4" />
                
                {/* Segmento Físico (Titanium Platino) */}
                {cashPct > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#A3A3A3"
                    strokeWidth="4"
                    strokeDasharray={`${cashPct} ${100 - cashPct}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                )}
                
                {/* Segmento Digital (Negro Obsidiana) */}
                {digitalPct > 0 && (
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#0C0D0E"
                    strokeWidth="4"
                    strokeDasharray={`${digitalPct} ${100 - digitalPct}`}
                    strokeDashoffset={`${-cashPct}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                )}
              </svg>
            </div>

            {/* Leyenda en dos filas estructuradas */}
            <div className="flex flex-col gap-0.5 text-[10px] font-mono leading-tight flex-1 min-w-0">
              <div className="flex items-center justify-between text-neutral-500">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                  <span className="truncate">Físico:</span>
                </div>
                <span className="text-neutral-900 font-bold tabular-nums shrink-0">
                  ${cashTotalUSD.toFixed(0)} <span className="text-neutral-400 font-normal">({cashPct}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-neutral-500">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 shrink-0" />
                  <span className="truncate">Digital:</span>
                </div>
                <span className="text-neutral-900 font-bold tabular-nums shrink-0">
                  ${digitalTotalUSD.toFixed(0)} <span className="text-neutral-400 font-normal">({digitalPct}%)</span>
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
{/* 🚀 MODAL DE ESTRUCTURA DE LIQUIDEZ (Executive Cleanlook Estructurado) */}
      <AnimatePresence>
        {isLiquidityModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop suave */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.18, ease: 'linear' }}
              onClick={() => setIsLiquidityModalOpen(false)} 
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs will-change-[opacity]" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 8 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 4 }} 
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white w-full max-w-[620px] rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-neutral-200/50 z-10 flex flex-col transform-gpu will-change-[transform,opacity]"
            >
              {/* Header con Contexto y Total Consolidado */}
              <div className="px-6 py-4 flex justify-between items-center border-b border-neutral-100 bg-neutral-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200/50 flex items-center justify-center text-neutral-800 shadow-xs">
                    <Banknote size={15} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider">Estructura de Liquidez</h3>
                    <p className="text-[10px] font-mono text-neutral-400">Arqueo de ingresos • Hoy</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-neutral-200/50 text-[10px] font-mono font-bold text-neutral-800 shadow-xs">
                    Total: ${salesTodayUSD.toFixed(2)}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setIsLiquidityModalOpen(false)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-md border border-transparent hover:border-neutral-200/50 transition-all active:scale-95"
                    aria-label="Cerrar modal"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Contenido en 2 Columnas Estructuradas */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-100 bg-white">
                
                {/* LADO IZQUIERDO: EFECTIVO FÍSICO */}
                <div className="p-6 md:p-7 flex flex-col justify-between space-y-5 bg-white">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                          Caja Física
                        </span>
                        <p className="text-xs font-semibold text-neutral-900">Efectivo en Mostrador</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                        {cashPct}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-3xl font-bold font-mono tracking-tight text-neutral-900 tabular-nums">
                        ${cashTotalUSD.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                        Billetes disponibles en caja para vuelto inmediato y custodia física.
                      </p>
                    </div>
                  </div>

                  {/* Panel de Estado Operativo */}
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between text-neutral-500">
                      <span>Estado en Caja:</span>
                      <strong className="text-neutral-800">{cashTotalUSD > 0 ? 'Con saldo' : 'Sin ingreso'}</strong>
                    </div>
                    <div className="flex justify-between text-neutral-500">
                      <span>Moneda:</span>
                      <strong className="text-neutral-800">USD Divisa</strong>
                    </div>
                  </div>
                </div>

                {/* LADO DERECHO: FLUJO DIGITAL */}
                <div className="p-6 md:p-7 flex flex-col justify-between space-y-5 bg-[#FAFAFC]/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                          Banca & Billeteras
                        </span>
                        <p className="text-xs font-semibold text-neutral-900">Flujo Digital</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                        {digitalPct}%
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-3xl font-bold font-mono tracking-tight text-neutral-900 tabular-nums">
                        ${digitalTotalUSD.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                        Fondos ingresados por canales electrónicos y conciliaciones bancarias.
                      </p>
                    </div>
                  </div>

                  {/* Desglose Ordenado por Canal */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                      Desglose por Canal:
                    </p>
                    
                    {sortedDigitalMethods.length === 0 ? (
                      <div className="p-3 bg-white rounded-lg border border-dashed border-neutral-200/60 text-center">
                        <p className="text-[11px] text-neutral-400 font-medium">
                          Sin cobros digitales registrados hoy (Zelle, Pago Móvil o POS).
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[130px] overflow-y-auto no-scrollbar">
                        {sortedDigitalMethods.map((method, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-neutral-100 shadow-xs">
                            <span className="font-semibold text-neutral-700 truncate pr-2 text-[11px]">{method.name}</span>
                            <span className="font-mono font-bold text-neutral-900 tabular-nums text-xs">
                              ${method.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer Informativo */}
              <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-2">
                <p className="text-[10px] text-neutral-400 font-medium">
                  Sincronizado en tiempo real con ventas web y Punto de Venta (POS).
                </p>
                <button
                  type="button"
                  onClick={() => setIsLiquidityModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-1.5 bg-neutral-950 hover:bg-black text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 shadow-xs"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}