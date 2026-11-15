'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase-client'

interface DiscountInfo {
    discountPct: number
    discountedPrice: string
}

// Ruta del render 3D en /public (puedes reemplazarla por tu nuevo render generado)
const WELCOME_3D_ASSET = '/Portal-de-tienda-futurista.webp'

export default function WelcomeModal({ storeName }: { storeName: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null)
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = getSupabase()

    useEffect(() => {
        const isWelcome = searchParams.get('welcome') === 'true'
        if (isWelcome) {
            setIsOpen(true)

            const checkReferralDiscount = async () => {
                try {
                    const {
                        data: { user },
                    } = await supabase.auth.getUser()
                    if (!user) return

                    const { data: ref } = await supabase
                        .from('saas_referrals')
                        .select(`saas_affiliates ( discount_pct )`)
                        .eq('referred_user_id', user.id)
                        .single()

                    if (ref?.saas_affiliates) {
                        // @ts-ignore
                        const discountPct = Number(ref.saas_affiliates.discount_pct || 0)
                        if (discountPct > 0) {
                            const BASE_PRICE = 18.99
                            const finalPrice = (BASE_PRICE * (1 - discountPct / 100)).toFixed(2)
                            setDiscountInfo({ discountPct, discountedPrice: finalPrice })
                        }
                    }
                } catch (err) {
                    console.error('Error verificando beneficio de referido:', err)
                }
            }
            checkReferralDiscount()
        }
    }, [searchParams, supabase])

    const handleClose = () => {
        setIsOpen(false)
        router.replace('/admin', { scroll: false })
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    {/* Backdrop Limpio (Ligero para GPUs móviles) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-0 bg-neutral-950/45 backdrop-blur-xs"
                        onClick={handleClose}
                    />

                    {/* Contenedor Principal del Modal */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-[420px] bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] text-center overflow-hidden font-sans z-10 transform-gpu"
                    >
                        {/* Halo radial sutil detrás de la pieza 3D (Cero costo de repintado) */}
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute top-0 inset-x-0 h-48 bg-[radial-gradient(50%_50%_at_50%_35%,rgba(24,24,27,0.05)_0%,transparent_100%)]"
                        />

                        <div className="relative z-10 flex flex-col items-center">
                          {/* ESCULTURA 3D: Capa 1 (Entrada suave) + Capa 2 (Levitación continua en GPU) */}
                            <motion.div
                                initial={{ opacity: 0, y: 14, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                    duration: 0.55,
                                    delay: 0.06,
                                    ease: [0.16, 1, 0.3, 1],
                                }}
                                className="-mt-1 mb-3 transform-gpu will-change-transform select-none pointer-events-none"
                            >
                                <motion.div
                                    animate={{ y: [0, -8] }}
                                    transition={{
                                        duration: 3.2,
                                        repeat: Infinity,
                                        repeatType: 'mirror',
                                        ease: 'easeInOut',
                                    }}
                                    className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto transform-gpu will-change-transform"
                                >
                                    <Image
                                        src={WELCOME_3D_ASSET}
                                        alt="Bienvenido a Preziso"
                                        fill
                                        priority
                                        sizes="(max-width: 640px) 176px, 208px"
                                        className="object-contain"
                                    />
                                </motion.div>
                            </motion.div>

                            {/* Micro-Kicker Editorial */}
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-2">
                                Espacio listo
                            </span>

                            {/* Título Principal */}
                            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-950 tracking-tight leading-snug mb-2.5">
                                Te damos la bienvenida, {storeName}
                            </h2>

                            {/* Copy Amigable y Directo */}
                            <p className="text-xs sm:text-[13px] text-neutral-500 font-normal leading-relaxed max-w-[340px] mb-6">
                                Tu tienda ya está creada. Preparamos una guía rápida paso a paso en
                                tu panel para que subas tus primeros productos y empieces a recibir
                                pedidos hoy mismo.
                            </p>

                            {/* Tarjeta de Beneficio de Partner (Si aplica) */}
                            {discountInfo && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: 0.12,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                    className="w-full bg-[#FAFAFC] border border-neutral-200/80 rounded-xl p-4 mb-6 text-left"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-neutral-500">
                                            Invitación activa
                                        </span>
                                        <span className="text-[10px] font-mono font-semibold tabular-nums px-2 py-0.5 rounded bg-neutral-900 text-white">
                                            -{discountInfo.discountPct}% primer mes
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-600 leading-relaxed">
                                        Cuentas con una tarifa preferencial en tu primer mes: de{' '}
                                        <span className="font-mono tabular-nums line-through text-neutral-400">
                                            $18.99
                                        </span>{' '}
                                        a{' '}
                                        <strong className="font-mono font-semibold tabular-nums text-neutral-950">
                                            ${discountInfo.discountedPrice} USD
                                        </strong>
                                        .
                                    </p>
                                </motion.div>
                            )}

                            {/* Acción Primaria (Sin iconos ni sombras sucias) */}
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full h-11 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl font-medium text-xs tracking-tight flex items-center justify-center transition-all duration-150 active:scale-[0.98] cursor-pointer"
                            >
                                Entrar a mi panel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}