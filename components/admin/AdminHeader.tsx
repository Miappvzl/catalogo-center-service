'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, ShoppingBag, Edit2, Menu, Link, Zap, LogOut, User, ArrowUpRight } from 'lucide-react'
import SubscriptionBanner from './SubscriptionBanner'
import { getSupabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import NotificationBell from '@/components/admin/NotificationBell'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'

export default function AdminHeader({ store, title }: { store: any, title?: string }) {
  const router = useRouter()
  const supabase = getSupabase()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    if (file.size > 2 * 1024 * 1024) return Swal.fire('Error', 'Máximo 2MB', 'warning')

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${store.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

      await supabase.from('stores').update({ logo_url: publicUrl }).eq('id', store.id)
      router.refresh()

      Swal.fire({
        icon: 'success', title: 'Logo Actualizado', toast: true, position: 'top-end',
        showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl' }
      })
    } catch (error) {
      Swal.fire('Error', 'No se pudo subir', 'error')
    } finally {
      setUploading(false)
    }
  }

  // 🚀 AQUI VAN LOS HOOKS DEL SMART HEADER (ANTES DEL IF)
  // 1. Estados del Smart Header
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const lastScrollY = useRef(0);
  const [userEmail, setUserEmail] = useState<string>(''); // 🚀 NUEVO ESTADO

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || '');
    };
    fetchUser();
  }, [supabase]);

  // Lógica de identidad global
  const initials = store?.name ? store.name.substring(0, 2).toUpperCase() : 'PR';
  const isTrial = store?.subscription_status === 'trial';


  // 2. Motor de Scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsHeaderVisible(false); // Bajando: esconder
      } else {
        setIsHeaderVisible(true);  // Subiendo: mostrar
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


 return (
    <>
      {store && <SubscriptionBanner store={store} />}

      {/* 🚀 HEADER BLINDADO (Sin bordes, shadow ultra-suave y blur agresivo) */}
      <header className={`bg-white/70 backdrop-blur-2xl sticky top-0 z-40 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform shadow-[0_10px_40px_rgba(0,0,0,0.02)] ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        
       {/* TITULO DE PÁGINA O PORTAL DE TIENDA */}
        <div>
          {title ? (
            /* 🚀 MODO SECCIÓN: Título estático inerte para pantallas como "Configuración" */
            <div className="flex items-center gap-2.5">
              <span className="text-xl md:text-2xl font-black tracking-tighter text-zinc-900">
                {title}
              </span>
            </div>
          ) : (
            /* 🚀 MODO DASHBOARD: Portal interactivo hacia el Storefront público */
            <a href={`/${store.slug}`} target="_blank" className="group flex items-center gap-2.5 outline-none active:scale-95 transition-transform origin-left" title="Ver mi tienda">
              <span className="text-xl md:text-2xl font-black tracking-tighter text-zinc-900 group-hover:text-zinc-600 transition-colors">
                {store?.name || 'Cargando...'}
              </span>
              <div className="w-6 h-6 rounded-full bg-zinc-100/80 flex items-center justify-center group-hover:bg-zinc-200 group-hover:scale-110 transition-all duration-300">
                <ArrowUpRight size={13} className="text-zinc-500 group-hover:text-zinc-900" strokeWidth={2.5} />
              </div>
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">

          {/* CENTRO DE NOTIFICACIONES */}
          {store?.id && <NotificationBell storeId={store.id} />}

          

          {/* AVATAR & DROPDOWN (Estética Dark Tech pura) */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="active:scale-95 transition-transform outline-none group"
            >
             <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full p-[2px] transition-all duration-500 ${!isTrial ? 'bg-gradient-to-tr from-zinc-400 via-zinc-100 to-zinc-300 shadow-sm group-hover:from-zinc-500 group-hover:to-zinc-400' : 'bg-gradient-to-tr from-yellow-400 via-yellow-300 to-yellow-500 shadow-yellow-300/30 group-hover:from-yellow-500 group-hover:to-yellow-400'}`}>
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner">
                  <span className="text-[11px] font-black text-zinc-900 tracking-widest uppercase">{initials}</span>
                </div>
              </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  {/* FONDO PROTECTOR (Zinc oscuro con desenfoque) */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-0 left-0 w-screen h-screen z-40 bg-zinc-900/10 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none"
                    onClick={() => setIsProfileOpen(false)}
                  />

                  {/* EL MODAL (Cero líneas divisorias, jerarquía por espacios) */}
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed top-[15vh] left-0 right-0 mx-auto h-fit w-[85%] max-w-[300px] md:absolute md:inset-auto md:right-0 md:top-14 md:mx-0 md:w-64 bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] py-2 z-50 flex flex-col overflow-hidden ring-1 ring-black/5"
                  >
                    {/* HEADER DEL MODAL */}
                    <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center">
                      <div className={`w-14 h-14 rounded-full p-[2px] mb-4 ${!isTrial ? 'bg-gradient-to-tr from-zinc-400 via-zinc-100 to-zinc-300 shadow-sm' : 'bg-gradient-to-tr from-yellow-400 via-yellow-300 to-yellow-500 shadow-yellow-300/30'}`}>
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-inner">
                          <span className="text-sm font-black text-zinc-900 tracking-widest uppercase">{initials}</span>
                        </div>
                      </div>
                      <p className="text-sm font-black text-zinc-900 tracking-tight leading-none mb-1.5">{store?.name || 'Administrador'}</p>
                      <p className="text-[10px] font-bold text-zinc-400 tracking-widest mb-6">{userEmail || 'Cargando correo...'}</p>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          router.push('/admin/profile');
                        }}
                        className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center"
                      >
                        Ver Perfil
                      </button>
                    </div>

                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-100 to-transparent my-1" />

                    {/* ENLACES SECUNDARIOS */}
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          router.push('/admin/profile#billing');
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-colors w-full text-left"
                      >
                        <Zap size={14} className="text-zinc-400" /> Suscripción y Plan
                      </button>
                    </div>

                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-100 to-transparent my-1" />

                    {/* ZONA DE PELIGRO */}
                    <div className="p-2">
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          router.push('/login');
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
                      >
                        <LogOut size={12} strokeWidth={2.5} /> Cerrar Sesión
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* BOTÓN HAMBURGUESA (Móvil) */}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('toggleMobileAdminSidebar'))}
            className="lg:hidden w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-600 active:scale-95 transition-transform"
            aria-label="Abrir menú"
          >
            <Menu size={18} strokeWidth={2} />
          </button>

        </div>
      </header>
    </>
  )
}