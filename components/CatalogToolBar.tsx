'use client'

import React, { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpDown, Check, ChevronDown, X } from 'lucide-react'

export type SortOptionValue = 'featured' | 'price_asc' | 'price_desc'

interface CatalogToolbarProps {
    selectedCategory: string
    totalCount: number
    sortBy: SortOptionValue
    onSortChange: (value: SortOptionValue) => void
    onResetCategory: () => void
    isBoutiqueMode?: boolean
    cardStyle?: string
    templateId?: string
}

const SORT_OPTIONS: { value: SortOptionValue; label: string; shortLabel: string }[] = [
    { value: 'featured', label: 'Recomendados', shortLabel: 'Recomendados' },
    { value: 'price_asc', label: 'Precio: menor a mayor', shortLabel: 'Menor precio' },
    { value: 'price_desc', label: 'Precio: mayor a menor', shortLabel: 'Mayor precio' },
]

export default function CatalogToolbar({
    selectedCategory,
    totalCount,
    sortBy,
    onSortChange,
    onResetCategory,
    isBoutiqueMode = false,
    cardStyle = 'standard',
    templateId = 'classic',
}: CatalogToolbarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const activeOption = SORT_OPTIONS.find((o) => o.value === sortBy) || SORT_OPTIONS[0]
    const isAllCategories = selectedCategory === 'Todos'
    const isSortedByPrice = sortBy !== 'featured'

    // Arquetipos de plantilla
    const isIndustrial = templateId === 'hardware_dense' || cardStyle === 'dense_hardware'
    const isLuxury = templateId === 'minimal_luxury' || cardStyle === 'editorial'
    const isBrutalist = templateId === 'streetwear_bold' || cardStyle === 'brutalist'
    const isTechBento = templateId === 'modular_tech' || cardStyle === 'modular_tech'

    // Cierre automático al hacer clic fuera o presionar Escape
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

   // Título agnóstico y editorial (Funciona en cualquier industria sin sesgo de nicho)
    const sectionTitle = isAllCategories
        ? isLuxury
            ? 'Colección'
            : 'Catálogo'
        : selectedCategory

    return (
        <div
            className={`w-full mb-6 md:mb-8 pb-3.5 md:pb-4 flex items-center justify-between gap-3 ${
                isBrutalist
                    ? 'border-b-2 border-[var(--store-border)]'
                    : isIndustrial
                      ? 'border-b border-[var(--store-border)]'
                      : 'border-b border-[var(--store-border)]/50'
            }`}
        >
            {/* ========================================================= */}
            {/* LADO IZQUIERDO: TÍTULO ALINEADO + CONTADOR SIN SALTOS     */}
            {/* ========================================================= */}
            <div className="min-w-0 flex-1 flex items-center gap-2.5 sm:gap-3">
                <h2
                    className={`leading-tight tracking-tight text-[var(--store-text-main)] ${
                        isLuxury
                            ? 'font-serif text-xl sm:text-2xl md:text-3xl font-normal'
                            : isIndustrial
                              ? 'font-mono text-base sm:text-lg md:text-xl font-bold uppercase'
                              : isBrutalist
                                ? 'text-lg sm:text-xl md:text-2xl font-extrabold uppercase tracking-tighter'
                                : 'text-lg sm:text-xl md:text-2xl font-semibold'
                    }`}
                >
                    {sectionTitle}
                </h2>

                {/* Píldora de Conteo Tabular (Siempre en el mismo eje, nunca cae abajo) */}
                <span
                    className={`shrink-0 inline-flex items-center justify-center font-mono tabular-nums leading-none ${
                        isIndustrial || isBrutalist
                            ? 'text-[10px] font-bold px-2 py-1 bg-[var(--store-surface)] text-[var(--store-text-main)] border border-[var(--store-border)] rounded-none'
                            : isLuxury
                              ? 'text-[11px] font-normal text-[var(--store-surface-text)] tracking-widest'
                              : isTechBento
                                ? 'text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--store-surface)] text-[var(--store-surface-text)] border border-[var(--store-border)]/70'
                                : 'text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--store-surface)] text-[var(--store-surface-text)] border border-[var(--store-border)]/60'
                    }`}
                >
                    {isLuxury ? `(${totalCount})` : totalCount}
                </span>

                {/* Botón rápido para volver a todas las categorías */}
                {!isAllCategories && !isBoutiqueMode && (
                    <button
                        type="button"
                        onClick={onResetCategory}
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--store-surface-text)] hover:text-[var(--store-text-main)] transition-colors cursor-pointer active:scale-95"
                        title="Ver todo el catálogo"
                    >
                        <X size={12} strokeWidth={2.2} />
                        <span className="hidden sm:inline underline underline-offset-4">Ver todo</span>
                    </button>
                )}
            </div>

            {/* ========================================================= */}
            {/* LADO DERECHO: COMPONENTE DESPLEGABLE PERSONALIZADO        */}
            {/* ========================================================= */}
            {totalCount > 1 && (
                <div ref={dropdownRef} className="relative shrink-0 z-30">
                    {/* Gatillo Táctil Polimórfico */}
                    <button
                        type="button"
                        onClick={() => setIsOpen((prev) => !prev)}
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                        className={`group flex items-center justify-between gap-2 min-h-[40px] px-3.5 md:px-4 transition-all duration-200 select-none cursor-pointer active:scale-[0.98] ${
                            isBrutalist
                                ? 'rounded-none border-2 border-[var(--store-text-main)] bg-[var(--store-surface)] font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--store-text-main)]'
                                : isIndustrial
                                  ? 'rounded-none border border-[var(--store-border)] hover:border-[var(--store-text-main)] bg-[var(--store-surface)] font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--store-text-main)]'
                                  : isLuxury
                                    ? 'rounded-none border border-[var(--store-border)] hover:border-[var(--store-text-main)] bg-[var(--store-surface)] text-[11px] font-sans font-medium uppercase tracking-[0.14em] text-[var(--store-text-main)]'
                                    : isTechBento
                                      ? 'rounded-xl border border-[var(--store-border)] hover:border-[var(--store-text-main)]/50 bg-[var(--store-surface)] text-xs font-medium text-[var(--store-text-main)]'
                                      : 'rounded-[var(--radius-btn)] border border-[var(--store-border)] hover:border-[var(--store-text-main)]/40 bg-[var(--store-surface)] text-xs font-medium text-[var(--store-text-main)]'
                        } ${
                            isSortedByPrice || isOpen
                                ? 'border-[var(--store-text-main)]'
                                : ''
                        }`}
                    >
                        <ArrowUpDown
                            size={13}
                            strokeWidth={2}
                            className={`shrink-0 transition-colors ${
                                isSortedByPrice
                                    ? 'text-[var(--store-text-main)]'
                                    : 'text-[var(--store-surface-text)] group-hover:text-[var(--store-text-main)]'
                            }`}
                        />

                        {/* En Desktop muestra prefijo "Ordenar:" para máxima visibilidad; en Mobile muestra la opción directa sin truncar */}
                        <span className="hidden md:inline text-[var(--store-surface-text)] font-normal">
                            Ordenar:
                        </span>

                        <span className="font-semibold text-[var(--store-text-main)] whitespace-nowrap">
                            <span className="md:hidden">{activeOption.shortLabel}</span>
                            <span className="hidden md:inline">{activeOption.label}</span>
                        </span>

                        <ChevronDown
                            size={14}
                            strokeWidth={2}
                            className={`shrink-0 text-[var(--store-surface-text)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                isOpen ? 'rotate-180 text-[var(--store-text-main)]' : ''
                            }`}
                        />
                    </button>

                    {/* Menú Flotante Personalizado (Framer Motion 120fps) */}
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                role="listbox"
                                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className={`absolute right-0 mt-2 w-56 origin-top-right overflow-hidden bg-[var(--store-surface)] ${
                                    isBrutalist
                                        ? 'rounded-none border-2 border-[var(--store-text-main)] p-1 shadow-[6px_6px_0px_rgba(0,0,0,0.85)]'
                                        : isIndustrial
                                          ? 'rounded-none border border-[var(--store-text-main)]/40 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.24)]'
                                          : isLuxury
                                            ? 'rounded-none border border-[var(--store-border)] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)]'
                                            : 'rounded-2xl border border-[var(--store-border)] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]'
                                }`}
                            >
                                <div className="px-3 py-1.5 border-b border-[var(--store-border)]/40 mb-1">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-[var(--store-surface-text)]">
                                        Ordenar catálogo
                                    </span>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    {SORT_OPTIONS.map((option) => {
                                        const isSelected = sortBy === option.value
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() => {
                                                    onSortChange(option.value)
                                                    setIsOpen(false)
                                                }}
                                                className={`w-full min-h-[38px] px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                                    isBrutalist || isIndustrial
                                                        ? 'rounded-none font-mono text-[11px] uppercase tracking-wider'
                                                        : isLuxury
                                                          ? 'rounded-none font-sans text-xs tracking-wide'
                                                          : 'rounded-xl text-xs'
                                                } ${
                                                    isSelected
                                                        ? 'bg-[var(--store-primary)] text-[var(--store-primary-text)] font-semibold'
                                                        : 'text-[var(--store-text-main)] hover:bg-[var(--store-bg)] font-normal'
                                                }`}
                                            >
                                                <span>{option.label}</span>
                                                {isSelected && (
                                                    <Check
                                                        size={14}
                                                        strokeWidth={2.2}
                                                        className="shrink-0"
                                                    />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}