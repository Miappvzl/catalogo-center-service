'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, ShoppingBag, Edit2, Menu, Link, Zap, LogOut, User } from 'lucide-react'
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

      <header className={`bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 px-3 md:px-8 py-3 md:py-3 flex justify-between items-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">{title || store?.name || 'Cargando...'}</h1>
          {!title && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Panel de Control</p>}
        </div>

        <div className="flex items-center gap-3">


          {/* 🚀 EL CENTRO DE NOTIFICACIONES */}
          {store?.id && <NotificationBell storeId={store.id} />}

          {/* 🚀 AVATAR & DROPDOWN (Mini Tarjeta de Identidad) */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="active:scale-95 transition-transform outline-none"
            >
              <div className={`w-11 h-11 rounded-full p-[2px] transition-all ${!isTrial ? 'bg-gradient-to-r from-[#4f37d3] to-[#e5e5e5]' : 'bg-black hover:bg-gray-800'}`}>
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                  <span className="text-[13px] font-black text-gray-900 tracking-tighter">{initials}</span>
                </div>
              </div>
            </button>

           
           <AnimatePresence>
              {isProfileOpen && (
                <>
                  {/* 🚀 FONDO PROTECTOR (BLINDADO): w-screen y h-screen rompen la caja del header */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-0 left-0 w-screen h-screen z-40 bg-black/20 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none" 
                    onClick={() => setIsProfileOpen(false)} 
                  />
                  
                  {/* 🚀 EL MODAL (BLINDADO): top-[20vh] lo posiciona de forma segura hacia abajo en móvil */}
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed top-[20vh] left-0 right-0 mx-auto h-fit w-[85%] max-w-[320px] md:absolute md:inset-auto md:right-0 md:top-14 md:mx-0 md:w-64 bg-white rounded-[1.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] md:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-gray-100 py-2 z-50 flex flex-col overflow-hidden"
                  >
                    {/* 🚀 HEADER DEL MODAL: Mini Perfil con CTA Central */}
                    <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex flex-col items-center text-center bg-gray-50/30">
                      <div className={`w-14 h-14 rounded-full p-[2.5px] mb-3 ${!isTrial ? 'bg-gradient-to-r from-[#4f37d3] to-[#e5e5e5] shadow-[0_0_15px_rgba(138,43,226,0.15)]' : 'bg-black'}`}>
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                          <span className="text-lg font-black text-gray-900 tracking-tighter">{initials}</span>
                        </div>
                      </div>
                      <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1.5">{store?.name || 'Administrador'}</p>
                      <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-4">{userEmail || 'Cargando correo...'}</p>
                      
                      {/* BOTÓN BLINDADO (Usa router.push en lugar de <Link>) */}
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          router.push('/admin/profile');
                        }} 
                        className="w-full py-2.5 bg-white border border-gray-200 hover:border-gray-900 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm flex items-center justify-center"
                      >
                        Ver Perfil
                      </button>
                    </div>
                    
                    {/* ENLACES SECUNDARIOS */}
                    <div className="p-2 flex flex-col gap-1">
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          router.push('/admin/profile#billing');
                        }} 
                        className="flex items-center justify-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-600 hover:text-black hover:bg-gray-50 rounded-xl transition-colors w-full text-left"
                      >
                        <Zap size={16} className="text-gray-400" /> Suscripción y Plan
                      </button>
                    </div>
                    
                    {/* ZONA DE PELIGRO */}
                    <div className="p-2 border-t border-gray-50">
                      <button 
                        onClick={async () => { 
                          await supabase.auth.signOut(); 
                          router.push('/login'); 
                        }} 
                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
                      >
                        <LogOut size={14} strokeWidth={2.5} /> Cerrar Sesión
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>



          {/* EDITOR DE LOGO (Clean UI) */}
          <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />

            <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden transition-colors group-hover:border-black ">
              {uploading ? (
                <Loader2 className="animate-spin text-gray-400" />
              ) : store?.logo_url ? (
                <Image
                  src={getOptimizedUrl(store.logo_url)}
                  alt="Logo"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ShoppingBag size={18} className="text-gray-300" />
              )}
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="absolute -bottom-1 -right-1 bg-white border border-gray-200 text-gray-600 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center group-hover:text-black group-hover:border-black transition-all z-10">
              <Edit2 size={10} strokeWidth={2.5} />
            </div>
          </div>

          {/* BOTÓN HAMBURGUESA (Solo Móvil, Estrictamente a la derecha) */}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('toggleMobileAdminSidebar'))}
            className="lg:hidden w-11 h-11 rounded-full bg-white  flex items-center justify-center text-[#4a5565] active:scale-95 transition-all "
            aria-label="Abrir menú"
          >
            <Menu size={22} strokeWidth={2} />
          </button>

        </div>
      </header>
    </>
  )
}