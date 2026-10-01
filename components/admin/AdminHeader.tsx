'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, Zap, LogOut, ArrowUpRight } from 'lucide-react'
import SubscriptionBanner from './SubscriptionBanner'
import { getSupabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/admin/NotificationBell'
import { AnimatePresence, motion } from 'framer-motion'

export default function AdminHeader({ store, title }: { store: any, title?: string }) {
  const router = useRouter()
  const supabase = getSupabase()

  // Estados del Smart Header
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const lastScrollY = useRef(0)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email || '')
    }
    fetchUser()
  }, [supabase])

  const initials = store?.name ? store.name.substring(0, 2).toUpperCase() : 'PR'
  const isTrial = store?.subscription_status === 'trial'

// 🚀 MOTOR DE SCROLL ULTRA-FLUIDO (Cero re-renderizados innecesarios, cero jitter)
  useEffect(() => {
    let lastScrollY = window.scrollY
    let isVisible = true
    const SCROLL_THRESHOLD = 15 // Ignora micro-oscilaciones del dedo menores a 15px

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const diff = currentScrollY - lastScrollY

      // 1. En la parte superior siempre visible
      if (currentScrollY <= 20) {
        if (!isVisible) {
          setIsHeaderVisible(true)
          isVisible = true
        }
        lastScrollY = currentScrollY
        return
      }

      // 2. Si el movimiento es menor al umbral, no hacer nada (evita micro-cortes)
      if (Math.abs(diff) < SCROLL_THRESHOLD) return

      // 3. Bajando con decisión -> Ocultar SOLO si estaba visible
      if (diff > 0 && isVisible) {
        setIsHeaderVisible(false)
        setIsProfileOpen(false)
        isVisible = false
      } 
      // 4. Subiendo con decisión -> Mostrar SOLO si estaba oculto
      else if (diff < 0 && !isVisible) {
        setIsHeaderVisible(true)
        isVisible = true
      }

      lastScrollY = currentScrollY
    }

    // passive: true le garantiza al navegador que el scroll nativo no esperará por JS
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  return (
    <>
      {store && <SubscriptionBanner store={store} />}

      {/* HEADER STICKY CON ANIMACIÓN Y CONTENCIÓN */}
      <header 
        className={`bg-white sticky top-0 z-40 w-full px-3 sm:px-4 md:px-8 py-3 md:py-3.5 flex justify-between items-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-b border-neutral-200/50 ${
          isHeaderVisible ? 'translate-y-0 shadow-xs' : '-translate-y-full'
        }`}
      >
        
        {/* TÍTULO / LINK CATÁLOGO */}
        <div className="min-w-0 flex-1 mr-2 sm:mr-3">
          {title ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-neutral-900 truncate block">
                {title}
              </span>
            </div>
          ) : (
            <a 
              href={`/${store.slug}`} 
              target="_blank" 
              className="group inline-flex items-center gap-1.5 outline-none active:scale-[0.98] transition-all min-w-0 max-w-full" 
              title="Ver catálogo público"
            >
              <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-neutral-900 group-hover:text-neutral-600 transition-colors truncate block">
                {store?.name || 'Cargando...'}
              </span>
              <ArrowUpRight size={14} className="text-neutral-800 group-hover:text-neutral-900 shrink-0" strokeWidth={2.5} />
            </a>
          )}
        </div>

        {/* ACCIONES DERECHA */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {store?.id && <NotificationBell storeId={store.id} />}

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="active:scale-95 transition-transform outline-none group shrink-0"
              aria-label="Menú de perfil"
            >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all duration-200 ${
                isTrial 
                  ? 'bg-amber-50 border-amber-200/60 text-amber-700 shadow-xs' 
                  : 'bg-neutral-50 border-neutral-200/60 text-neutral-700 group-hover:border-neutral-300 group-hover:bg-white shadow-xs'
              }`}>
                <span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight uppercase">{initials}</span>
              </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-neutral-950/20 backdrop-blur-xs md:bg-transparent md:backdrop-blur-none"
                    onClick={() => setIsProfileOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 4 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed top-[10vh] left-4 right-4 mx-auto max-w-[300px] md:absolute md:inset-auto md:right-0 md:top-12 md:mx-0 md:w-60 bg-white rounded-xl border border-neutral-200/50 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.12)] p-2 z-50 flex flex-col transform-gpu"
                  >
                    <div className="p-4 flex flex-col items-center text-center border-b border-neutral-100">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center border mb-2.5 ${isTrial ? 'bg-amber-50 border-amber-200/60 text-amber-700' : 'bg-neutral-50 border-neutral-200/60 text-neutral-700'}`}>
                        <span className="text-sm font-bold font-mono uppercase">{initials}</span>
                      </div>
                      <p className="text-xs font-bold text-neutral-900 tracking-tight leading-none mb-1 truncate max-w-[200px]">
                        {store?.name || 'Administrador'}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400 truncate max-w-[200px] mb-3">
                        {userEmail || 'Cargando correo...'}
                      </p>
                      <button
                        onClick={() => { setIsProfileOpen(false); router.push('/admin/profile') }}
                        className="w-full py-1.5 bg-neutral-50 border border-neutral-200/50 hover:bg-neutral-100 hover:text-neutral-900 text-neutral-700 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                      >
                        Ver Perfil
                      </button>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <button
                        onClick={() => { setIsProfileOpen(false); router.push('/admin/profile#billing') }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors w-full text-left"
                      >
                        <Zap size={14} className="text-neutral-400" />
                        <span>Suscripción y Plan</span>
                      </button>
                    </div>

                    <div className="w-full h-px bg-neutral-100 my-0.5" />

                    <div className="pt-0.5">
                      <button
                        onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors w-full text-left"
                      >
                        <LogOut size={13} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => document.dispatchEvent(new CustomEvent('toggleMobileAdminSidebar'))}
            className="lg:hidden w-8 h-8 rounded-lg bg-white border border-neutral-200/50 flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 active:scale-95 transition-all shadow-xs shrink-0"
            aria-label="Abrir menú de navegación"
          >
            <Menu size={16} strokeWidth={2} />
          </button>
        </div>
      </header>
    </>
  )
}