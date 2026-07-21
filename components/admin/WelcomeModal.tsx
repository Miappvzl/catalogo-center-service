'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, ArrowRight, Tag } from 'lucide-react'
import confetti from 'canvas-confetti'
import { getSupabase } from '@/lib/supabase-client'

interface DiscountInfo {
  discountPct: number
  discountedPrice: string
}

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

      // 1. Confeti de bienvenida con física suave
      setTimeout(() => {
        confetti({
          particleCount: 110,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#000000', '#10B981', '#E5E5E5']
        })
      }, 300)

      // 2. Consultar si el nuevo usuario tiene un descuento asignado por su afiliado
      const checkReferralDiscount = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const { data: ref } = await supabase
            .from('saas_referrals')
            .select(`
              saas_affiliates (
                discount_pct
              )
            `)
            .eq('referred_user_id', user.id)
            .single()

          if (ref?.saas_affiliates) {
            // @ts-ignore
            const discountPct = Number(ref.saas_affiliates.discount_pct || 0)

            if (discountPct > 0) {
              const BASE_PRICE = 18.99
              const finalPrice = (BASE_PRICE * (1 - discountPct / 100)).toFixed(2)
              setDiscountInfo({
                discountPct,
                discountedPrice: finalPrice
              })
            }
          }
        } catch (err) {
          console.error('Error al consultar descuento de referido:', err)
        }
      }

      checkReferralDiscount()
    }
  }, [searchParams, supabase])

  const handleClose = () => {
    setIsOpen(false)
    // Limpiamos el query param ?welcome=true silenciosamente
    router.replace('/admin', { scroll: false })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Fondo Difuminado Cinematográfico */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Tarjeta Flotante con Dinámica de Muelle (Spring) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[460px] bg-white rounded-[2.5rem] p-7 sm:p-9 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.18)] border border-gray-100 text-center overflow-hidden font-sans z-10"
          >
            {/* Elemento Decorativo */}
            <div className="absolute -top-12 -right-12 text-gray-100/60 rotate-12 pointer-events-none">
              <Sparkles size={160} strokeWidth={0.8} />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              {/* Ícono Principal */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                className="w-16 h-16 bg-black text-white rounded-3xl flex items-center justify-center mb-6 shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
              >
                <Sparkles size={28} />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
                ¡Bienvenido a Preziso!
              </h2>

              <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed mb-6">
                Es un placer recibir al equipo de <strong className="text-black font-extrabold">{storeName}</strong>. Tu tienda ya está lista para comenzar a vender.
              </p>

              {/* 🚀 BANNER DE DESCUENTO EN 1ER MES (SI VIENE DE UN AFILIADO) */}
              {discountInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="w-full bg-emerald-50/80 border border-emerald-100/80 rounded-2xl p-4 mb-6 text-left relative overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Tag size={14} className="text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">
                      ¡Beneficio de Partner Aplicado!
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-950 leading-snug">
                    Llegaste invitado con un enlace especial. Tu <b>primer mes</b> de suscripción pasa de <span className="line-through text-emerald-700/70">$18.99</span> a solo <strong className="text-emerald-900 font-black text-sm">${discountInfo.discountedPrice} USD</strong> ({discountInfo.discountPct}% desc).
                  </p>
                  <p className="text-[9px] text-emerald-700 font-medium mt-1.5">
                    *Tus 7 días de prueba gratis comienzan ahora. El descuento se aplicará automáticamente en tu primer cobro.
                  </p>
                </motion.div>
              )}

              {/* Botón CTA */}
              <button
                onClick={handleClose}
                className="w-full h-14 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(0,0,0,0.1)] group"
              >
                Iniciar en la plataforma <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}