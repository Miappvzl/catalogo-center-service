'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/app/store/useCart'
import { calculateCartEngine } from '@/utils/cartLogic'

export default function FloatingFoodBar({ rates, promotions, storeConfig }: any) {
    const { items } = useCart()
    const [mounted, setMounted] = useState(false)
    const [isPulsing, setIsPulsing] = useState(false)
    const prevItemsCount = useRef(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)

    useEffect(() => {
        if (totalItems > prevItemsCount.current) {
            setIsPulsing(true)
            const timer = setTimeout(() => setIsPulsing(false), 300)
            return () => clearTimeout(timer)
        }
        prevItemsCount.current = totalItems
    }, [totalItems])

    if (!mounted || items.length === 0) return null

    const engine = calculateCartEngine(items, promotions, storeConfig?.fiscal_profile !== 'informal', storeConfig?.wholesale_config)
    const totalUSD = engine.finalBsModeUSD // Usamos el precio final con descuentos

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-6 bg-gradient-to-t from-[var(--store-bg)] via-[var(--store-bg)] to-transparent pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
                <div className="max-w-xl mx-auto pointer-events-auto">
                    <button
                        onClick={() => document.dispatchEvent(new CustomEvent('toggleCartDrawer'))}
                        className={`w-full bg-[var(--store-text-main)] text-[var(--store-bg)] rounded-[var(--radius-btn)] p-3.5 md:p-4 flex items-center justify-between shadow-2xl transition-all active:scale-[0.98] ${
                            isPulsing ? 'scale-[1.02]' : 'scale-100'
                        }`}
                    >
                        {/* Cantidad de platos */}
                        <div className="bg-[var(--store-bg)]/20 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0">
                            <span className="font-bold text-xs md:text-sm font-mono tracking-tighter">
                                {totalItems}
                            </span>
                        </div>

                        {/* Texto Central */}
                        <span className="font-bold text-sm md:text-base tracking-wide flex-1 text-center">
                            Ver Pedido
                        </span>

                        {/* Total Dinero */}
                        <span className="font-black text-sm md:text-base tracking-tight font-mono shrink-0">
                            ${totalUSD.toFixed(2)}
                        </span>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}