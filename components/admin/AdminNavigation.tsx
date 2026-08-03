'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutGrid,
  ShoppingBag,
  Package,
  Settings,
  Plus,
  LogOut,
  Store,
  Copy,
  Check,
  Tag,
  Headset,
  X,
  Wallet,
  Palette,
  Users,
  Calculator,
  FileText,
  User,
  Gift,
  LineChart,
  Megaphone,
  Lock
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useEditorGuard } from '@/app/store/useEditorGuard'
import Swal from 'sweetalert2'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import VueltoPromoModal from '@/components/admin/VueltoPromoModal';

const NAV_LINKS = [
  // 📌 General
  { name: 'Inicio', href: '/admin', icon: LayoutGrid, category: 'General' },
  { name: 'Inteligencia', href: '/admin/analytics', icon: LineChart, isNew: true, category: 'General' }, // 👈 ACTUALIZA ESTA LÍNEA
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag, category: 'General' },
  { name: 'Clientes', href: '/admin/customers', icon: User, category: 'General' },

  // 📌 Punto de Venta
 { name: 'Campañas', href: '/admin/campaigns', icon: Megaphone, isLocked: true, category: 'Ventas' }, // 👈 ACTUALIZA ESTA LÍNEA
  { name: 'POS / Cotizar', href: '/admin/pos', icon: Calculator, hideOnBottomBar: true, category: 'Ventas' },
  { name: 'Presupuestos', href: '/admin/quotes', icon: FileText, hideOnBottomBar: true, category: 'Ventas' },
  { name: 'Caja', href: '/admin/cash', icon: Wallet, hideOnBottomBar: true, category: 'Ventas' },

  // 📌 Catálogo
  { name: 'Inventario', href: '/admin/inventory', icon: Package, category: 'Catálogo' },
  { name: 'Nuevo Producto', href: '/admin/product/new', icon: Plus, isAction: true, category: 'Catálogo' },
  { name: 'Promociones', href: '/admin/promotions', icon: Tag, hideOnBottomBar: true, category: 'Catálogo' },

  // 📌 Negocio
  { name: 'Diseño', href: '/admin/customization', icon: Palette, hideOnBottomBar: true, category: 'Negocio' },
  { name: 'Comisiones', href: '/admin/commissions', icon: Users, hideOnBottomBar: true, category: 'Negocio' },
  { name: 'Preziso Afiliados', href: '/admin/affiliates', icon: Gift, hideOnBottomBar: true, isNew: true, category: 'Negocio' },
  { name: 'Ajustes', href: '/admin/settings', icon: Settings, category: 'Negocio' },
]

// 🚀 MICRO-COMPONENTE: Avatar Consistente Monocromático (Cleanlook Standard)
const NavAvatarIcon = ({ store }: { store: any }) => {
  const initials = store?.name ? store.name.substring(0, 2).toUpperCase() : 'PR';
  const isTrial = store?.subscription_status === 'trial';

  return (
    <div className={`w-7 h-7 rounded-full p-[1.5px] transition-colors duration-200 ${!isTrial ? 'bg-neutral-200/80 group-hover:bg-neutral-300' : 'bg-neutral-950'}`}>
      <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden border border-neutral-100">
        <span className="text-[10px] font-bold text-neutral-800 tracking-tight leading-none">{initials}</span>
      </div>
    </div>
  )
};

// 🚀 ENVOLTORIO PROTEGIDO ULTRA-RÁPIDO (Con SweetAlert Premium Cohesivo)
const GuardedLink = ({ href, children, className }: any) => {
  const router = useRouter()
  const pathname = usePathname()
  const isDirty = useEditorGuard((state) => state.isDirty)
  const setDirty = useEditorGuard((state) => state.setDirty)

  const handleClick = (e: React.MouseEvent) => {
    if (pathname === href) {
      e.preventDefault()
      return
    }

    if (isDirty) {
      e.preventDefault()
      Swal.fire({
        title: '¿Salir sin guardar?',
        text: 'Tiene modificaciones de producto pendientes de registro.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#171717',
        cancelButtonColor: '#f5f5f7',
        confirmButtonText: 'Descartar y salir',
        cancelButtonText: 'Quedarme',
        customClass: {
          popup: 'rounded-xl font-sans p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/50',
          confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-950 hover:bg-black text-white transition-all',
          cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all border border-neutral-200/50'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          setDirty(false)
          router.push(href)
        }
      })
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      prefetch={true}
    >
      {children}
    </Link>
  )
};



const DesktopSidebar = ({ pathname, store, onLogout, isVueltoActive, onOpenPromo }: { pathname: string, store: any, onLogout: () => void, isVueltoActive: boolean, onOpenPromo: () => void }) => {
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    if (!store?.slug) return
    const host = window.location.host.replace('www.', '')
    const url = `${window.location.protocol}//${store.slug}.${host}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside
      className="hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-[#ffffff] z-50 border-r border-neutral-200/50 
                 transition-[width,box-shadow] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width]
                 w-[74px] hover:w-[250px] group/sidebar overflow-hidden hover:shadow-[1px_0_15px_rgba(0,0,0,0.015)]"
    >
      {/* HEADER LOGO */}
      <div className="h-20 flex items-center px-3 pl-4 flex-shrink-0 ">
        <Link href="/" className="flex items-center min-w-[200px] pl-[-2px] active:scale-95 transition-all">
          <Image
            src={getOptimizedUrl("/favicon-light.png")}
            alt="Preziso Logo"
            width={160}
            height={46}
            className="h-10 w-auto object-contain object-left"
            priority
          />
        </Link>
      </div>

      {/* NAVEGACIÓN PRINCIPAL */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-6 px-3">
        {['General', 'Ventas', 'Catálogo', 'Negocio'].map((category, idx) => {
          const linksInCategory = NAV_LINKS.filter(link => link.category === category);
          if (linksInCategory.length === 0) return null;

          return (
            <div key={category} className={`relative pb-1.5 ${idx !== 0 ? 'pt-4' : 'pt-2'}`}>

              {/* Separador cuando el sidebar está colapsado */}
              <div className="absolute left-1/2 -translate-x-1/2 top-6 w-3 h-[1px] rounded bg-neutral-200 transition-opacity duration-200 group-hover/sidebar:opacity-0" />

              {/* Título de Categoría */}
              <h3 className="pl-3 pr-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-2.5 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 -translate-x-3 group-hover/sidebar:translate-x-0 whitespace-nowrap">
                {category}
              </h3>

              <div className="space-y-1">
                {linksInCategory.map((link) => {
                  if (link.isAction) return null;
                  const isActive = pathname === link.href;

                  return (
                    <GuardedLink
                      key={link.href}
                      href={link.href}
                      className={`relative flex items-center p-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${isActive ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/50'
                        }`}
                    >
                      {/* INDICADOR ACTIVO DEFINITIVO: Relleno plano neutro de bajo contraste, sin bordes */}
                      {/* EL GANADOR INDISCUTIBLE: Degradado de luz violeta suave original de Preziso, sin bordes */}
                      {isActive && (
                        <motion.div
                          layoutId="desktop-nav-indicator"
                          className="absolute inset-0 bg-neutral-100/40 rounded-lg -z-10 overflow-hidden"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        >
                          {/* Degradado suave violeta/blanco original sin bordes rígidos */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: 'linear-gradient(to left, #edeaff 0%, rgb(242 240 255) 30%, rgba(255, 255, 255, 0.4) 100%)' }}
                          />

                          {/* Filamento difuminado blanco original en el extremo derecho para suavizar el contraste */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[60%] w-[5px] bg-white blur-[2px] opacity-40 pointer-events-none" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[60%] w-[2px] bg-white opacity-90 rounded-l-full pointer-events-none" />
                        </motion.div>
                      )}

                      {/* Contenedor de Icono rígido de 36px para evitar Layout Shift */}
                      <div className="flex items-center justify-center w-9 h-7 flex-shrink-0 z-10">
                        <link.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      </div>

                      {/* Texto de Enlace */}
                      <span className="ml-2.5 text-xs font-semibold tracking-tight whitespace-nowrap opacity-0 -translate-x-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 z-10">
                        {link.name}
                      </span>

                     {/* Microetiqueta de Novedad */}
                      {link.isNew && (
                        <div className="ml-auto pr-2 opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100 flex-shrink-0">
                          <span className="bg-neutral-950 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                            NUEVO
                          </span>
                        </div>
                      )}

                      {/* 🚀 INYECTA ESTA ETIQUETA DE BLOQUEO DE PREPARACIÓN EN ESCRITORIO */}
                      {link.isLocked && (
                        <div className="ml-auto pr-2 opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100 flex-shrink-0 flex items-center gap-1">
                          <Lock size={10} className="text-neutral-400" />
                          <span className="bg-neutral-100 border border-neutral-200/50 text-neutral-500 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                            PRONTO
                          </span>
                        </div>
                      )}
                    </GuardedLink>
                  );
                })}

                {/* Botón de Creación Rápida */}
                {category === 'Catálogo' && (
                  <div className="pt-1.5">
                    <GuardedLink
                      href="/admin/product/new"
                      className="relative flex items-center p-1.5 rounded-lg text-xs font-semibold text-neutral-500 hover:text-neutral-900 border border-dashed border-neutral-200/50 bg-white group-hover/sidebar:bg-transparent hover:!border-neutral-900 hover:bg-white"
                    >
                      <div className="flex items-center justify-center w-9 h-7 flex-shrink-0 bg-neutral-50 group-hover/sidebar:bg-transparent rounded-lg">
                        <Plus size={16} />
                      </div>
                      <span className="ml-2.5 whitespace-nowrap opacity-0 -translate-x-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0">
                        Nuevo Producto
                      </span>
                    </GuardedLink>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      {/* SECCIÓN INFERIOR */}
      <div className="mt-auto pt-4 border-t border-neutral-200/50 space-y-1.5 px-3 pb-6 flex-shrink-0 bg-[#FAFAFC]">

        {/* Promoción: Vuelto Inteligente (Gris Carbón Muted) */}
        {!isVueltoActive && (
          <button
            onClick={onOpenPromo}
            className="w-full flex items-center p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white hover:bg-black transition-all text-left shadow-xs mb-1.5"
          >
            <div className="flex items-center justify-center w-9 h-7 flex-shrink-0">
              <Gift size={15} className="animate-pulse text-white" />
            </div>
            <span className="ml-2.5 text-xs font-semibold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              Vuelto Inteligente
            </span>
          </button>
        )}

        {/* Ver Tienda */}
        {store && (
          <div className="flex items-center rounded-lg bg-white border border-neutral-200/50 group-hover/sidebar:bg-neutral-50 transition-colors overflow-hidden">
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="flex items-center flex-1 p-1.5 hover:text-neutral-900 transition-colors"
            >
              <div className="flex items-center justify-center w-9 h-7 flex-shrink-0 text-neutral-400 group-hover/sidebar:bg-transparent rounded-lg">
                <Store size={15} />
              </div>
              <span className="ml-2.5 text-[11px] font-bold text-neutral-500 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                Ver Tienda
              </span>
            </Link>

            <div className="flex items-center pr-1.5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              <div className="w-px h-4 bg-neutral-200 mx-1"></div>
              <button
                onClick={copyLink}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900 transition-all active:scale-95 shadow-xs border border-neutral-100"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Soporte */}
        <a
          href={`https://wa.me/584145811936?text=Hola%20equipo%20Preziso`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-1.5 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-500 hover:text-neutral-900 border border-transparent"
        >
          <div className="flex items-center justify-center w-9 h-7 flex-shrink-0">
            <Headset size={15} />
          </div>
          <span className="ml-2.5 text-[11px] font-bold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
            Soporte Técnico
          </span>
        </a>

        {/* Perfil */}
        <GuardedLink
          href="/admin/profile"
          className="flex items-center p-1.5 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-500 hover:text-neutral-900 w-full text-left"
        >
          <div className="flex items-center justify-center w-9 h-7 flex-shrink-0">
            <NavAvatarIcon store={store} />
          </div>
          <span className="ml-2.5 text-[11px] font-bold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
            Mi Perfil
          </span>
        </GuardedLink>
      </div>
    </aside>
  );
}
const MobileSidebar = ({ pathname, store, onLogout, isVueltoActive, onOpenPromo }: { pathname: string, store: any, onLogout: () => void, isVueltoActive: boolean, onOpenPromo: () => void }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    document.addEventListener('toggleMobileAdminSidebar', handleOpen)
    return () => document.removeEventListener('toggleMobileAdminSidebar', handleOpen)
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const copyLink = () => {
    if (!store?.slug) return
    const host = window.location.host.replace('www.', '')
    const url = `${window.location.protocol}//${store.slug}.${host}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sidebarVariants: Variants = {
    hidden: { x: '100%' },
    visible: {
      x: 0,
      transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.4 }
    },
    exit: {
      x: '100%',
      transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }
    }
  }

  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex justify-end">
          {/* Fondo difuminado */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-[#09090b]/35 backdrop-blur-xs will-change-[opacity]"
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Panel Lateral Desplizable */}
          <motion.div
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-[80%] max-w-sm h-full bg-[#FAFAFC] shadow-2xl flex flex-col will-change-transform border-l border-neutral-200/50"
          >
            <div className="p-5 flex items-center justify-between border-b border-neutral-200/50 bg-[#FAFAFC]">
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center group active:scale-95 transition-all">
                  <Image
                    src={getOptimizedUrl("/pezisologo.png")}
                    alt="Preziso Logo"
                    width={180}
                    height={80}
                    className="h-12 w-auto object-contain"
                    priority
                  />
                </Link>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 bg-neutral-150 hover:bg-neutral-200 rounded-full text-neutral-500 active:scale-95 transition-all">
                <X size={16} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar bg-[#FAFAFC]">
              {NAV_LINKS.map((link) => {
                if (link.isAction) return null
                const isActive = pathname === link.href

                  return (
    <GuardedLink
      key={link.href}
      href={link.href}
      className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold transition-all duration-150 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`}
    >
      <div className="relative z-10 flex items-center gap-3 w-full">
        <link.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-neutral-900" : "text-neutral-400"} />
        <span>{link.name}</span>
        
      
        {/* 👈 INYECTA ESTA MICROETIQUETA MÓVIL SÉCTICA */}
        {link.isNew && (
          <span className="ml-auto bg-neutral-950 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0">
            NUEVO
          </span>
        )}

        {/* 🚀 INYECTA ESTA ETIQUETA DE BLOQUEO DE PREPARACIÓN EN MÓVIL */}
        {link.isLocked && (
          <span className="ml-auto bg-neutral-100 text-neutral-500 border border-neutral-200/50 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1">
            <Lock size={10} className="text-neutral-400" />
            <span>PRONTO</span>
          </span>
        )}
      </div>
    </GuardedLink>
  )
              })}

              {/* Botón Promocional: Vuelto Inteligente Móvil (Carbón Mate) */}
              {!isVueltoActive && (
                <div className="pt-2">
                  <button
                    onClick={onOpenPromo}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-white bg-neutral-900 border border-neutral-800 shadow-xs"
                  >
                    <Gift size={16} className="animate-pulse" />
                    <span>Activar Vuelto Inteligente</span>
                  </button>
                </div>
              )}

              <div className="pt-3.5 mt-3.5 border-t border-neutral-200/50">
                <GuardedLink
                  href="/admin/product/new"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold text-neutral-500 bg-white border border-dashed border-neutral-200/50 hover:border-neutral-900 transition-all"
                >
                  <Plus size={16} />
                  <span>Nuevo Producto</span>
                </GuardedLink>
              </div>
            </nav>

            {/* SECCIÓN INFERIOR MÓVIL */}
            <div className="p-4 border-t border-neutral-200/50 space-y-3 bg-white">
              {store && (
                <div className="flex items-center justify-between p-1 rounded-lg bg-neutral-50 border border-neutral-200/50">
                  <Link
                    href={`/${store.slug}`}
                    target="_blank"
                    className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold text-neutral-500 hover:text-neutral-950 hover:bg-white transition-all"
                  >
                    <Store size={14} />
                    <span>Ver mi Tienda</span>
                  </Link>
                  <div className="w-px h-4 bg-neutral-200 mx-1"></div>
                  <button
                    onClick={copyLink}
                    className="w-8 h-8 flex items-center justify-center rounded bg-transparent hover:bg-white text-neutral-500 hover:text-neutral-900 transition-all active:scale-95 shadow-xs border border-transparent hover:border-neutral-100"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              )}

              {/* Enlace Soporte */}
              <a
                href={`https://wa.me/584145811936?text=Hola%20equipo%20Preziso,%20necesito%20ayuda%20con%20mi%20tienda%20${store?.name || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded text-xs font-semibold text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 transition-colors w-full text-left"
              >
                <Headset size={14} className="text-neutral-400" />
                <span>Hablar con Soporte</span>
              </a>

              {/* Mi Perfil */}
              <GuardedLink
                href="/admin/profile"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded text-xs font-semibold text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 transition-colors w-full text-left"
              >
                <NavAvatarIcon store={store} />
                <span>Mi Perfil</span>
              </GuardedLink>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// --- MOBILE BOTTOM BAR (CON DETECCIÓN INTELIGENTE DE MODALES) ---
const MobileBottomBar = ({ pathname }: { pathname: string }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isModalActive, setIsModalActive] = useState(false); // 🚀 NUEVO: Estado del modal
  const lastScrollY = useRef(0);

  const searchParams = useSearchParams()
  const isTourActive = !!searchParams.get('mission')

// 🚀 NUEVO: MutationObserver Inteligente capaz de detectar montajes de modales flotantes
  useEffect(() => {
    const checkForActiveModals = () => {
      if (typeof document === 'undefined') return;

      // 1. Caso Estándar: Scroll bloqueado en el body [2]
      const isScrollLocked = 
        document.body.style.overflow === 'hidden' || 
        document.body.classList.contains('overflow-hidden') ||
        document.body.style.getPropertyValue('overflow') === 'hidden';

      // 2. Caso Avanzado: Elementos con Z-Index de modal presentes en el árbol
      // Preziso usa z-[60] (ProductModal), z-[70] (MobileSidebar), z-[80] (LaunchModals)
      const hasFloatingModals = !!document.querySelector(
        '[class*="z-[60]"], [class*="z-[70]"], [class*="z-[80]"], [class*="z-60"], [class*="z-70"], [class*="z-80"]'
      );

      // Si se cumple cualquiera, ocultamos la barra
      setIsModalActive(isScrollLocked || hasFloatingModals);
    };

    // Evaluación inicial
    checkForActiveModals();

    // Configurar observador de alta fidelidad que vigila cambios en estilos,
    // clases y también el montaje/desmontaje de nuevos elementos (subárbol completo) [2].
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        // Si se agregó/quitó un nodo o cambiaron clases, forzamos evaluación [2]
        if (
          mutation.type === 'childList' || 
          mutation.attributeName === 'style' || 
          mutation.attributeName === 'class'
        ) {
          shouldCheck = true;
          break;
        }
      }

      if (shouldCheck) {
        checkForActiveModals();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: true, // 👈 Detecta montajes/desmontajes de nodos en el DOM [2]
      subtree: true,    // 👈 Detecta cambios en todo el subárbol del body [2]
    });

    return () => observer.disconnect();
  }, []);

  // Manejador del scroll para ocultar la barra al deslizar hacia abajo
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      let currentScrollY = 0;

      if (target === document) {
        currentScrollY = document.documentElement.scrollTop || window.scrollY;
      } else {
        const element = target as HTMLElement;
        if (element.scrollHeight <= element.clientHeight) return;
        currentScrollY = element.scrollTop;
      }

      if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;

      if (currentScrollY <= 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  const normalLinks = NAV_LINKS.filter(link => !link.hideOnBottomBar && !link.isAction)
  const actionLink = NAV_LINKS.find(link => link.isAction)

  const bottomBarLinks = [
    normalLinks[0],
    normalLinks[1],
    actionLink,
    normalLinks[2],
    normalLinks[3]
  ].filter(Boolean)

  // 🚀 MEJORA: La barra se oculta si la pantalla se desplaza hacia abajo, si hay un tour activo, o si hay un modal abierto.
  const shouldRenderBar = isVisible && !isTourActive && !isModalActive;

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/50 pb-[env(safe-area-inset-bottom)] transform-gpu transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform z-30
      ${shouldRenderBar ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0 pointer-events-none'}`}
    >
      {/* Target de Toque Optimizado: Mínimo 44px de altura operativa */}
      <div className="flex justify-between items-end p-1 pt-0 max-w-md mx-auto min-h-[46px]">
        {bottomBarLinks.map((link: any) => {
          const isActive = pathname === link.href

          if (link.isAction) {
            return (
              <div key={link.href} className="flex-shrink-0 relative -top-2 px-2">
                <GuardedLink href={link.href} className="block group rounded-full">
                  <div className="w-11 h-11 bg-neutral-950 text-white rounded-full flex items-center justify-center group-active:scale-95 transition-transform duration-150 border border-neutral-800 shadow-sm">
                    <Plus size={22} strokeWidth={1.8} />
                  </div>
                </GuardedLink>
              </div>
            )
          }

          return (
            <GuardedLink
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors duration-150 active:scale-95 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`}
            >
              <div className="relative w-12 h-7 flex items-center justify-center z-10">
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-[#f0f0f0]  rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <div className={`transition-transform duration-200 ${isActive ? '-translate-y-0.5' : ''}`}>
                  <link.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
              </div>
              <span className="text-[9px] font-bold tracking-wide">
                {link.name}
              </span>
            </GuardedLink>
          )
        })}
      </div>
    </div>
  )
}

interface NavProps { store: any }
export default function AdminNavigation({ store }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabase()

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [storeConfigLocal, setStoreConfigLocal] = useState(store?.payment_config || {});

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const isVueltoActive = storeConfigLocal?.store_credit_active === true;

  return (
    <>
      <DesktopSidebar
        pathname={pathname}
        store={store}
        onLogout={handleLogout}
        isVueltoActive={isVueltoActive}
        onOpenPromo={() => setPromoModalOpen(true)}
      />
      <MobileSidebar
        pathname={pathname}
        store={store}
        onLogout={handleLogout}
        isVueltoActive={isVueltoActive}
        onOpenPromo={() => setPromoModalOpen(true)}
      />
      <MobileBottomBar pathname={pathname} />

      {store && (
        <VueltoPromoModal
          isOpen={promoModalOpen}
          onClose={() => setPromoModalOpen(false)}
          storeId={store.id}
          onSuccess={() => {
            const updatedConfig = { ...storeConfigLocal, store_credit_active: true };
            setStoreConfigLocal(updatedConfig);
            router.refresh();
          }}
        />
      )}
    </>
  )
}