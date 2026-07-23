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
    if (file.size > 2 * 1024 * 1024) {
        return Swal.fire({
            title: 'Archivo muy pesado', 
            text: 'El logotipo no debe superar los 2MB.', 
            icon: 'warning',
            confirmButtonColor: '#171717',
            customClass: { popup: 'rounded-xl font-sans text-xs' }
        })
    }

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
        icon: 'success', 
        title: 'Logotipo actualizado', 
        toast: true, 
        position: 'top-end',
        showConfirmButton: false, 
        timer: 2000, 
        customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
      })
    } catch (error) {
      Swal.fire({
          title: 'Error', 
          text: 'No se pudo subir el archivo.', 
          icon: 'error',
          confirmButtonColor: '#171717',
          customClass: { popup: 'rounded-xl font-sans text-xs' }
      })
    } finally {
      setUploading(false)
    }
  }

  // 1. Estados del Smart Header
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const lastScrollY = useRef(0);
  const [userEmail, setUserEmail] = useState<string>('');

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

      {/* HEADER BLINDADO (Cleanlook: border sutil y fondo translúcido) */}
      <header className={`bg-white/85 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-2 md:py-2 flex justify-between items-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform border-b border-neutral-200/50 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        
       {/* TITULO DE PÁGINA O PORTAL DE TIENDA */}
        <div>
          {title ? (
            /* MODO SECCIÓN: Título estático */
            <div className="flex items-center gap-2.5">
              <span className="text-lg md:text-xl font-bold tracking-tight text-neutral-900">
                {title}
              </span>
            </div>
          ) : (
            /* MODO DASHBOARD: Portal interactivo hacia el Storefront público */
            <a href={`/${store.slug}`} target="_blank" className="group flex items-center gap-2.5 outline-none active:scale-[0.98] transition-all origin-left" title="Ver catálogo público">
              <span className="text-lg md:text-xl font-bold tracking-tight text-neutral-900 group-hover:text-neutral-600 transition-colors">
                {store?.name || 'Cargando...'}
              </span>
              <div className="w-6 h-6 rounded-md bg-neutral-50 border border-neutral-200/50 flex items-center justify-center group-hover:bg-white group-hover:border-neutral-300 transition-all duration-200 shadow-xs">
                <ArrowUpRight size={13} className="text-neutral-400 group-hover:text-neutral-900" strokeWidth={2.5} />
              </div>
            </a>
          )}
        </div>

        <div className="flex items-center gap-2.5">

          {/* CENTRO DE NOTIFICACIONES */}
          {store?.id && <NotificationBell storeId={store.id} />}

          {/* AVATAR & DROPDOWN (Estética Cleanlook) */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="active:scale-95 transition-transform outline-none group"
            >
              <div className={`w-10 h-10 rounded-full p-[1.5px] transition-colors duration-200 ${!isTrial ? 'bg-neutral-200/80 group-hover:bg-neutral-300' : 'bg-neutral-950'}`}>
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden border border-neutral-100">
                <span className="text-xs font-bold text-neutral-800 tracking-tight leading-none">{initials}</span>
                 </div>
              </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  {/* FONDO PROTECTOR (Descarte) */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-0 left-0 w-screen h-screen z-40 bg-neutral-900/10 backdrop-blur-xs md:bg-transparent md:backdrop-blur-none"
                    onClick={() => setIsProfileOpen(false)}
                  />

                  {/* EL MODAL (Bordes finos, jerarquía limpia) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed top-[12vh] left-4 right-4 mx-auto h-fit max-w-[320px] md:absolute md:inset-auto md:right-0 md:top-14 md:mx-0 md:w-64 bg-white rounded-xl border border-neutral-200/50 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] py-1.5 z-50 flex flex-col overflow-hidden"
                  >
                    {/* HEADER DEL MODAL */}
                    <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center border-b border-neutral-100">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border mb-3 ${isTrial ? 'bg-amber-50 border-amber-200/60 text-amber-700' : 'bg-neutral-50 border-neutral-200/60 text-neutral-600'}`}>
                        <span className="text-sm font-bold tracking-tight uppercase">{initials}</span>
                      </div>
                      <p className="text-sm font-bold text-neutral-900 tracking-tight leading-none mb-1.5">{store?.name || 'Administrador'}</p>
                      <p className="text-[10px] font-medium text-neutral-400 font-mono mb-5">{userEmail || 'Cargando correo...'}</p>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          router.push('/admin/profile');
                        }}
                        className="w-full py-2 bg-white border border-neutral-200/50 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center shadow-xs"
                      >
                        Ver Perfil
                      </button>
                    </div>

                    {/* ENLACES SECUNDARIOS */}
                    <div className="p-1.5 flex flex-col gap-0.5">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          router.push('/admin/profile#billing');
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors w-full text-left"
                      >
                        <Zap size={14} className="text-neutral-400" /> Suscripción y Plan
                      </button>
                    </div>

                    <div className="w-full h-px bg-neutral-100 my-0.5" />

                    {/* ZONA DE PELIGRO */}
                    <div className="p-1.5">
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          router.push('/login');
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors w-full"
                      >
                        <LogOut size={14} /> Cerrar Sesión
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
            className="lg:hidden w-9 h-9 rounded-lg bg-white border border-neutral-200/50 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 active:scale-95 transition-all shadow-xs"
            aria-label="Abrir menú"
          >
            <Menu size={16} strokeWidth={2} />
          </button>

        </div>
      </header>
    </>
  )
}