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

      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#0a0a0a', '#E5E5E5', '#A3A3A3', '#FFFFFF']
        })
      }, 400)

      const checkReferralDiscount = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
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
          console.error('Error:', err)
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
          {/* Fondo Difuminado Premium */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xl"
            onClick={handleClose}
          />

          {/* Tarjeta Flotante High-End */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[480px] bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] border border-neutral-200/50 text-center overflow-hidden font-sans z-10"
          >
            {/* Destello sutil Liquid Titanium */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-400 to-transparent opacity-50" />
            
            <div className="absolute -top-12 -right-12 text-neutral-100/50 rotate-12 pointer-events-none">
              <Sparkles size={160} strokeWidth={0.5} />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              {/* Ícono Obsidiana */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="w-16 h-16 bg-[#0a0a0a] text-white rounded-2xl flex items-center justify-center mb-6 shadow-[0_15px_35px_rgba(0,0,0,0.2)]"
              >
                <Sparkles size={28} strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-3xl font-black text-[#0a0a0a] tracking-tight mb-4">
                ¡Bienvenido a Preziso!
              </h2>

              <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-8">
                Es un honor recibir al equipo de <strong className="text-[#0a0a0a] font-black">{storeName}</strong>. Hemos diseñado un modo de enfoque rápido para que domines la plataforma y actives tu tienda en menos de 5 minutos.
              </p>

              {/* Beneficio Partner */}
              {discountInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="w-full bg-[#FAFAFA] border border-neutral-200 rounded-2xl p-5 mb-8 text-left relative overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={14} className="text-[#0a0a0a]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]">
                      Beneficio de Partner Activo
                    </span>
                  </div>
                  <p className="text-sm font-medium text-neutral-600 leading-snug">
                    Llegaste con un acceso especial. Tu <b>primer mes</b> pasa de <span className="line-through text-neutral-400">$18.99</span> a <strong className="text-[#0a0a0a] font-black">${discountInfo.discountedPrice} USD</strong> ({discountInfo.discountPct}% desc).
                  </p>
                </motion.div>
              )}

              {/* Botón de Acción Principal */}
              <button
                onClick={handleClose}
                className="w-full h-14 bg-[#0a0a0a] text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-[0_15px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] group"
              >
                Comenzar Mi Misión <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}