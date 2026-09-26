// components/restaurant/RestaurantHeader.tsx
'use client'

import Image from 'next/image'
import { Search, X, ShoppingBag, User } from 'lucide-react'
import { getOptimizedUrl } from '@/utils/cdn'
import { StoreScheduleStatus } from '@/utils/storeHours'
import { useCart } from '@/app/store/useCart'

interface RestaurantHeaderProps {
    store: any
    activeRate: number
    searchQuery: string
    setSearchQuery: (q: string) => void
    scheduleStatus: StoreScheduleStatus
    setIsRateModalOpen: (open: boolean) => void
}

export default function RestaurantHeader({
    store,
    activeRate,
    searchQuery,
    setSearchQuery,
    scheduleStatus,
    setIsRateModalOpen
}: RestaurantHeaderProps) {
    const isEur = store?.currency_type === 'eur'
    const items = useCart(state => state.items)
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <header className="w-full bg-[var(--store-bg)] border-b border-[var(--store-border)]/30 transition-colors">
            {/* CINTILLO DISCRETO DE HORARIOS */}
            <div 
                className="w-full py-1.5 px-4 flex items-center justify-center text-center border-b transition-colors"
                style={{
                    backgroundColor: scheduleStatus.isOpen 
                        ? 'color-mix(in srgb, #10b981 8%, var(--store-bg))' 
                        : 'color-mix(in srgb, #f43f5e 10%, var(--store-bg))',
                    borderColor: scheduleStatus.isOpen 
                        ? 'color-mix(in srgb, #10b981 20%, var(--store-border))' 
                        : 'color-mix(in srgb, #f43f5e 25%, var(--store-border))',
                    color: 'var(--store-text-main)'
                }}
            >
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-tight">
                    <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" 
                        style={{ backgroundColor: scheduleStatus.isOpen ? '#10b981' : '#f43f5e' }} 
                    />
                    <span>
                        {scheduleStatus.isOpen ? 'Cocina en Servicio' : 'Local Fuera de Servicio'}
                    </span>
                    <span className="text-[var(--store-surface-text)] font-normal opacity-85">
                        — {scheduleStatus.detailLabel}
                    </span>
                </div>
            </div>

            {/* BARRA SUPERIOR: SALUDO + MARCA + TASA + ACCESOS */}
            <div className="max-w-[1500px] mx-auto px-4 sm:px-8 pt-4 pb-3">
                <div className="flex items-center justify-between gap-4">
                    
                    {/* Identidad de la Marca */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white border border-[var(--store-border)]/60 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                            {store?.logo_url ? (
                                <Image
                                    src={getOptimizedUrl(store.logo_url)}
                                    alt={store.name}
                                    width={48}
                                    height={48}
                                    className="object-contain p-1"
                                />
                            ) : (
                                <ShoppingBag size={20} className="text-[var(--store-surface-text)]" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--store-surface-text)] block font-mono">
                                {store.description || 'Restaurante & Delivery'}
                            </span>
                            <h1 className="text-base sm:text-xl font-black text-[var(--store-text-main)] tracking-tight truncate leading-tight">
                                {store.name}
                            </h1>
                        </div>
                    </div>

                    {/* Acciones de Cabecera (Tasa + Bolsa con Badge) */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsRateModalOpen(true)}
                            className="text-right outline-none group cursor-pointer hidden sm:block"
                        >
                            <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-[var(--store-surface-text)] block">
                                Tasa {isEur ? 'EUR' : 'BCV'}
                            </span>
                            <span className="text-xs font-mono font-black text-[var(--store-text-main)] tabular-nums leading-none">
                                Bs. {activeRate.toFixed(2)}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))}
                            className="relative w-10 h-10 rounded-full bg-white border border-[var(--store-border)]/60 flex items-center justify-center text-[var(--store-text-main)] shadow-xs hover:border-[var(--store-text-main)]/30 active:scale-95 transition-all"
                            aria-label="Abrir carrito"
                        >
                            <ShoppingBag size={18} />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--store-primary)] text-[var(--store-primary-text)] font-mono text-[9px] font-black flex items-center justify-center shadow-xs">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Buscador Integrado Estilo App */}
                <div className="mt-3.5 w-full">
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)]" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar en el menú (ej. hamburguesa, papas, bebida)..."
                            className="w-full bg-white border border-[var(--store-border)]/60 focus:border-[var(--store-text-main)] rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm font-medium text-[var(--store-text-main)] placeholder:text-[var(--store-surface-text)]/60 outline-none transition-all shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] p-1"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}