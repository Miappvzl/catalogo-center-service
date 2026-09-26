// components/restaurant/RestaurantCategoryRail.tsx
'use client'

import { useRef, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'

export interface RestaurantCategoryRailProps {
    categories: string[]
    activeCategory: string
    onSelectCategory: (category: string) => void
    categoryImages?: Record<string, string>
    variant?: string
}

function RestaurantCategoryRailComponent({
    categories,
    activeCategory,
    onSelectCategory,
    categoryImages = {}
}: RestaurantCategoryRailProps) {
    const railRef = useRef<HTMLDivElement>(null)
    const activeItemRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        if (activeItemRef.current && railRef.current) {
            const container = railRef.current
            const target = activeItemRef.current

            const containerRect = container.getBoundingClientRect()
            const targetRect = target.getBoundingClientRect()

            if (targetRect.left < containerRect.left || targetRect.right > containerRect.right) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest'
                })
            }
        }
    }, [activeCategory])

    const handleCategoryClick = useCallback((category: string) => {
        onSelectCategory(category)
        const targetId = `section-${category.toLowerCase().replace(/\s+/g, '-')}`
        const element = document.getElementById(targetId)

        if (element) {
            const yOffset = -120
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset
            window.scrollTo({ top: y, behavior: 'smooth' })
        }
    }, [onSelectCategory])

    if (!categories || categories.length === 0) return null

    return (
        <nav 
            aria-label="Categorías del menú"
            className="w-full bg-[var(--store-bg)] border-b border-[var(--store-border)]/40 py-4 transition-colors"
        >
            <div 
                ref={railRef}
                className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar px-4 sm:px-8 snap-x snap-mandatory"
                style={{ scrollBehavior: 'smooth' }}
            >
                {categories.map((category) => {
                    const isActive = activeCategory === category
                    const imageUrl = categoryImages[category]

                    return (
                        <button
                            key={category}
                            ref={isActive ? (el) => { activeItemRef.current = el } : null}
                            type="button"
                            onClick={() => handleCategoryClick(category)}
                            className="flex flex-col items-center gap-2 shrink-0 snap-start outline-none group active:scale-95 transition-transform"
                        >
                           {/* Avatar Circular con Sombra y Bordes Dinámicos */}
                        <div 
                                className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden transition-all duration-300 relative bg-[var(--store-surface)] shadow-[var(--shadow-ui)] ${
                                    isActive 
                                        ? 'border-[length:var(--border-width-ui)] border-[var(--store-primary)] ring-4 ring-[var(--store-primary)]/15 scale-105' 
                                        : 'border-[length:var(--border-width-ui)] border-[var(--store-border)] group-hover:border-[var(--store-text-main)]/30'
                                }`}
                                style={{ borderRadius: 'var(--radius-btn)' }}
                            >
                                {imageUrl ? (
                                    <Image
                                        src={getOptimizedUrl(imageUrl)}
                                        alt={category}
                                        fill
                                        sizes="80px"
                                        className={`object-cover p-1 rounded-full transition-transform duration-500 ${
                                            isActive ? 'scale-105' : 'group-hover:scale-110'
                                        }`}
                                    />
                                ) : (
                                    <span className="text-xs font-black uppercase font-mono tracking-wider text-[var(--store-surface-text)] opacity-40">
                                        {category.substring(0, 3)}
                                    </span>
                                )}
                            </div>

                            {/* Etiqueta Tipográfica */}
                            <span 
                                className={`text-[11px] sm:text-xs tracking-tight text-center truncate max-w-[75px] sm:max-w-[90px] transition-colors ${
                                    isActive 
                                        ? 'text-[var(--store-primary)] font-black' 
                                        : 'text-[var(--store-surface-text)] font-semibold group-hover:text-[var(--store-text-main)]'
                                }`}
                            >
                                {category}
                            </span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}

export default memo(RestaurantCategoryRailComponent)