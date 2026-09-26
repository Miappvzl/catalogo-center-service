// components/restaurant/RestaurantFilterModal.tsx
'use client'

import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react'

export interface RestaurantFiltersState {
    sortBy: 'default' | 'popular' | 'price_asc' | 'price_desc'
    maxPrepTime: number | null
    priceRange: 'all' | 'budget' | 'medium' | 'premium'
    onlyPromos: boolean
}

export const DEFAULT_FILTERS: RestaurantFiltersState = {
    sortBy: 'default',
    maxPrepTime: null,
    priceRange: 'all',
    onlyPromos: false
}

interface RestaurantFilterModalProps {
    isOpen: boolean
    onClose: () => void
    filters: RestaurantFiltersState
    setFilters: (filters: RestaurantFiltersState) => void
    totalResults: number
}

const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1, 
        transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } 
    },
    exit: { 
        opacity: 0, 
        transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } 
    }
}

const sheetVariants: Variants = {
    hidden: {
        y: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : '0%',
        x: typeof window !== 'undefined' && window.innerWidth >= 640 ? '100%' : '0%'
    },
    visible: {
        y: '0%',
        x: '0%',
        transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] }
    },
    exit: {
        y: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : '0%',
        x: typeof window !== 'undefined' && window.innerWidth >= 640 ? '100%' : '0%',
        transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] }
    }
}

export default function RestaurantFilterModal({
    isOpen,
    onClose,
    filters,
    setFilters,
    totalResults
}: RestaurantFilterModalProps) {
    const handleReset = () => {
        setFilters(DEFAULT_FILTERS)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center">
                     {/* BACKDROP OSCURO DE ALTO RENDIMIENTO */}
                    <motion.div
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                        className="absolute inset-0 bg-neutral-950/45 transform-gpu will-change-[opacity]"
                    />
                    {/* Bottom Sheet */}
                    <motion.div
                        variants={sheetVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative w-full max-w-lg bg-[var(--store-surface)] rounded-t-[32px] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl border-t border-[var(--store-border)]/50 z-10 text-left"
                    >
                        {/* Cabecera */}
                        <div className="p-5 border-b border-[var(--store-border)]/40 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal size={18} className="text-[var(--store-text-main)]" />
                                <h3 className="font-bold text-base text-[var(--store-text-main)] tracking-tight">
                                    Filtros del Menú
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-[var(--store-bg)] flex items-center justify-center text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Opciones de Filtrado */}
                        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar pb-32">
                            
                            {/* 1. ORDENAMIENTO */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--store-surface-text)] font-mono block">
                                    Ordenar Por
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'default', label: 'Predeterminado' },
                                        { id: 'popular', label: 'Lo Más Vendido' },
                                        { id: 'price_asc', label: 'Menor Precio' },
                                        { id: 'price_desc', label: 'Mayor Precio' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setFilters({ ...filters, sortBy: opt.id as any })}
                                            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                                filters.sortBy === opt.id
                                                    ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] shadow-xs'
                                                    : 'bg-[var(--store-bg)] text-[var(--store-surface-text)] border-[var(--store-border)]/60 hover:text-[var(--store-text-main)]'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        
                            {/* 2. TIEMPO DE COCINA CON LENGUAJE CLARO */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--store-surface-text)] font-mono block">
                                    Tiempo de Preparación
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { id: null, label: 'Cualquier tiempo' },
                                        { id: 20, label: 'Hasta 20 min' },
                                        { id: 35, label: 'Hasta 35 min' }
                                    ].map((opt) => (
                                        <button
                                            key={String(opt.id)}
                                            type="button"
                                            onClick={() => setFilters({ ...filters, maxPrepTime: opt.id })}
                                            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex-1 text-center ${
                                                filters.maxPrepTime === opt.id
                                                    ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] shadow-xs'
                                                    : 'bg-[var(--store-bg)] text-[var(--store-surface-text)] border-[var(--store-border)]/60 hover:text-[var(--store-text-main)]'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. RANGO DE PRECIO SIN SÍMBOLOS MATEMÁTICOS */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--store-surface-text)] font-mono block">
                                    Presupuesto por Plato
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'all', label: 'Todos los precios' },
                                        { id: 'budget', label: 'Económico (Menos de $10)' },
                                        { id: 'medium', label: 'Medio ($10 a $20)' },
                                        { id: 'premium', label: 'Especial (Más de $20)' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setFilters({ ...filters, priceRange: opt.id as any })}
                                            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-left ${
                                                filters.priceRange === opt.id
                                                    ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] border-[var(--store-primary)] shadow-xs'
                                                    : 'bg-[var(--store-bg)] text-[var(--store-surface-text)] border-[var(--store-border)]/60 hover:text-[var(--store-text-main)]'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* 4. PROMOCIONES */}
                            <div className="pt-2 border-t border-[var(--store-border)]/40">
                                <button
                                    type="button"
                                    onClick={() => setFilters({ ...filters, onlyPromos: !filters.onlyPromos })}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                                        filters.onlyPromos
                                            ? 'border-[var(--store-primary)] bg-[var(--store-primary)]/5'
                                            : 'border-[var(--store-border)]/60 bg-[var(--store-bg)]'
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--store-text-main)]">
                                            Solo Platos con Descuento
                                        </span>
                                        <span className="text-[10px] text-[var(--store-surface-text)]">
                                            Muestra únicamente opciones con precio de oferta activo
                                        </span>
                                    </div>
                                    <div className={`w-9 h-5 rounded-full border flex items-center px-0.5 transition-colors ${
                                        filters.onlyPromos ? 'bg-[var(--store-primary)] border-[var(--store-primary)] justify-end' : 'bg-neutral-300 border-neutral-300 justify-start'
                                    }`}>
                                        <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                                    </div>
                                </button>
                            </div>

                        </div>

                        {/* Footer Fijo de Acción */}
                        <div className="absolute bottom-0 left-0 right-0 bg-[var(--store-surface)] border-t border-[var(--store-border)]/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-4 py-3 rounded-xl border border-[var(--store-border)] text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                <RotateCcw size={14} />
                                <span>Limpiar</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 px-4 rounded-[var(--radius-btn,9999px)] bg-[var(--store-primary)] text-[var(--store-primary-text)] font-bold text-xs uppercase tracking-wider shadow-sm active:scale-[0.98] transition-transform text-center"
                            >
                                Aplicar ({totalResults} platos)
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}