'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, ShoppingBag, Package, Settings, Plus, LogOut, Store, Copy, Check, Tag, Headset, X, Wallet, Palette, Users, Calculator, FileText } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useEditorGuard } from '@/app/store/useEditorGuard'
import Swal from 'sweetalert2'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'

const NAV_LINKS = [
  // 📌 General
  { name: 'Inicio', href: '/admin', icon: LayoutGrid, category: 'General' },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag, category: 'General' },

  // 📌 Punto de Venta
  { name: 'POS / Cotizar', href: '/admin/pos', icon: Calculator, hideOnBottomBar: true, isNew: true, category: 'Ventas' },
  { name: 'Presupuestos', href: '/admin/quotes', icon: FileText, hideOnBottomBar: true, isNew: true, category: 'Ventas' },
  { name: 'Caja', href: '/admin/cash', icon: Wallet, hideOnBottomBar: true, category: 'Ventas' },

  // 📌 Catálogo
  { name: 'Inventario', href: '/admin/inventory', icon: Package, category: 'Catálogo' },
  { name: 'Nuevo Producto', href: '/admin/product/new', icon: Plus, isAction: true, category: 'Catálogo' },
  { name: 'Promociones', href: '/admin/promotions', icon: Tag, hideOnBottomBar: true, category: 'Catálogo' },

  // 📌 Negocio
  { name: 'Diseño', href: '/admin/customization', icon: Palette, hideOnBottomBar: true, category: 'Negocio' },
  { name: 'Comisiones', href: '/admin/commissions', icon: Users, hideOnBottomBar: true, category: 'Negocio' },
  { name: 'Ajustes', href: '/admin/settings', icon: Settings, category: 'Negocio' },
]

// 🚀 ENVOLTORIO PROTEGIDO ULTRA-RÁPIDO (Prefetching + Caché en RAM)
const GuardedLink = ({ href, children, className }: any) => {
  const router = useRouter()
  const pathname = usePathname()
  const isDirty = useEditorGuard((state) => state.isDirty)
  const setDirty = useEditorGuard((state) => state.setDirty)

  const handleClick = (e: React.MouseEvent) => {
    // Si ya estamos en la ruta, ignoramos el clic
    if (pathname === href) {
      e.preventDefault()
      return
    }

    // Si hay cambios sin guardar, detenemos la navegación ultra-rápida y mostramos la alerta
    if (isDirty) {
      e.preventDefault()
      Swal.fire({
        title: '¿Salir sin guardar?',
        text: 'Tienes cambios pendientes en el producto. Si sales ahora, se perderán.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#000000',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Quedarme',
        customClass: { popup: 'rounded-[var(--radius-card)]' }
      }).then((result) => {
        if (result.isConfirmed) {
          setDirty(false)
          router.push(href) // Navegación programática manual
        }
      })
    }
    // 🔥 EL TRUCO: Si NO está dirty, NO hacemos e.preventDefault(). 
    // Dejamos que el componente <Link> libere la pantalla desde la RAM al instante.
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      prefetch={true} // 🚀 EL MOTOR DE VELOCIDAD: Fuerza la descarga silenciosa
    >
      {children}
    </Link>
  )
}

const NewBadge = () => (
  <span className="ml-auto flex h-4 items-center border border-[#5500ffb2] justify-center rounded-full bg-[#ffffff] px-1.5 text-[8px] font-black uppercase tracking-wider text-[#4c00ffab]">
    Nuevo
  </span>
);

// --- DESKTOP SIDEBAR ---
const DesktopSidebar = ({ pathname, store, onLogout }: { pathname: string, store: any, onLogout: () => void }) => {
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
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white z-50 p-3 pl-[8px] border-r border-gray-100">
      <div className="mb-10 flex items-center gap-3 px-2">

        <Link href="/" className="flex items-center group active:scale-95 transition-transform">
          <Image
            src={getOptimizedUrl("/pezisologo.png")}
            alt="Preziso Logo"
            width={200}
            height={90}
            className="h-10 md:h-15 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      {/* 🚀 CORRECCIÓN: overflow-y-auto y no-scrollbar para evitar que empuje el footer */}
      <nav className="flex-1 overflow-y-auto no-scrollbar space-y-6 relative pb-6 -mx-2 px-2">

        {/* 🚀 LÓGICA DE AGRUPACIÓN (Pattern de Vercel/Stripe) */}
        {['General', 'Ventas', 'Catálogo', 'Negocio'].map((category) => {
          const linksInCategory = NAV_LINKS.filter(link => link.category === category);
          if (linksInCategory.length === 0) return null;

          return (
            <div key={category} className="space-y-0.2">
              {/* Título de la Categoría (Sutil y Elegante) */}
              <h3 className="px-4 text-[10px] font-medium font-black uppercase tracking-widest text-gray-400 mb-1">
                {category}
              </h3>

              {linksInCategory.map((link) => {
                if (link.isAction) return null;
                const isActive = pathname === link.href;

                return (
                  <GuardedLink
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-3 px-4 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-all duration-200 group ${isActive ? 'text-black' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="desktop-nav-indicator"
                        className="absolute inset-0 bg-gray-50 rounded-[var(--radius-btn)] -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <link.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                    <span className="relative z-10">{link.name}</span>
                    {link.isNew && <NewBadge />}
                  </GuardedLink>
                );
              })}

              {/* Botón especial para Nuevo Producto dentro de la categoría Catálogo */}
              {category === 'Catálogo' && (
                <div className="pt-2">
                  <GuardedLink
                    href="/admin/product/new"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-btn)] text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-black transition-all border border-transparent border-dashed hover:border-black"
                  >
                    <Plus size={18} /> Nuevo Producto
                  </GuardedLink>
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">



        {store && (
          <div className="flex items-center justify-between p-1 rounded-[var(--radius-btn)] bg-gray-50">
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-badge)] text-xs font-bold text-gray-600 hover:text-black hover:bg-white transition-colors"
            >
              <Store size={15} /> Ver mi Tienda
            </Link>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button
              onClick={copyLink}
              className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-badge)] bg-transparent hover:bg-white text-gray-600 hover:text-black transition-all active:scale-95 shadow-none hover:shadow-subtle"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        )}

        {/* ENLACE DE SOPORTE TÉCNICO */}
        <a
          href={`https://wa.me/584145811936?text=Hola%20equipo%20Preziso,%20necesito%20ayuda%20con%20mi%20tienda%20${store?.name || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-btn)] text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-black transition-all w-full text-left"
        >
          <Headset size={16} /> Soporte Técnico
        </a>


        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-btn)] text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700 transition-all w-full text-left"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

// --- MOBILE SIDEBAR (Arquitectura de Nivel Élite) ---
const MobileSidebar = ({ pathname, store, onLogout }: { pathname: string, store: any, onLogout: () => void }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    document.addEventListener('toggleMobileAdminSidebar', handleOpen)
    return () => document.removeEventListener('toggleMobileAdminSidebar', handleOpen)
  }, [])

  // Auto-cerrar al cambiar de ruta
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

  // 🚀 OPTIMIZACIÓN 1: Curvas Bezier nativas y eliminación de opacidad en el panel
  const sidebarVariants: Variants = {
    hidden: { x: '100%' }, // Cero cálculos de opacidad
    visible: {
      x: 0,
      transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.4 }
    },
    exit: {
      x: '100%',
      transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }
    }
  }

  // 🚀 OPTIMIZACIÓN 2: Variante separada para el fondo (solo anima opacidad)
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex justify-end">
          {/* Fonde difuminado */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm will-change-[opacity]"
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Panel Lateral */}
          <motion.div
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            // 🚀 OPTIMIZACIÓN 3: Hardware Acceleration forzado
            className="relative w-[80%] max-w-sm h-full bg-white shadow-2xl flex flex-col will-change-transform"
          >
            <div className="p-6 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">

                <Link href="/" className="flex items-center group active:scale-95 transition-transform">
                  <Image
                    src={getOptimizedUrl("/pezisologo.png")}
                    alt="Preziso Logo"
                    width={200}
                    height={90}
                    className="h-15 md:h-20 w-auto object-contain"
                    priority
                  />
                </Link>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-[#F8F9FA] hover:bg-gray-100 rounded-full text-gray-500 active:scale-95 transition-colors">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
              {NAV_LINKS.map((link) => {
                if (link.isAction) return null
                const isActive = pathname === link.href

                return (
                  <GuardedLink
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-colors duration-200 ${isActive ? 'bg-[#F8F9FA] text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-black" : "text-gray-400"} />
                    {link.name}
                    {link.isNew && <NewBadge />}
                  </GuardedLink>

                )
              })}
              <div className="pt-4 mt-4 border-t border-gray-100">
                <GuardedLink
                  href="/admin/product/new"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-gray-500 bg-[#F8F9FA] border border-transparent border-dashed hover:border-black transition-all"
                >
                  <Plus size={20} /> Nuevo Producto
                </GuardedLink>
              </div>
            </nav>

            <div className=" p-4 border-t border-gray-100 space-y-3 bg-white">


              {store && (
                <div className="flex items-center justify-between p-1 rounded-xl bg-[#F8F9FA] border border-gray-100">
                  <Link
                    href={`/${store.slug}`}
                    target="_blank"
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:text-black hover:bg-white transition-colors"
                  >
                    <Store size={15} /> Ver mi Tienda
                  </Link>
                  <div className="w-px h-5 bg-gray-200 mx-1"></div>
                  <button
                    onClick={copyLink}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-transparent hover:bg-white text-gray-600 hover:text-black transition-all active:scale-95 shadow-none hover:shadow-subtle"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
              {/* ENLACE DE SOPORTE TÉCNICO MÓVIL */}
              <a
                href={`https://wa.me/584145811936?text=Hola%20equipo%20Preziso,%20necesito%20ayuda%20con%20mi%20tienda%20${store?.name || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold text-gray-600  hover:bg-gray-100 hover:text-black transition-all w-full text-left"
              >
                <Headset size={16} /> Hablar con Soporte
              </a>

              <button
                onClick={onLogout}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold text-red-500  hover:bg-red-100 transition-all w-full text-left"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
// --- MOBILE BOTTOM BAR (Detección de Scroll Interno en DOM) ---
const MobileBottomBar = ({ pathname }: { pathname: string }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // 🚀 INTELIGENCIA DE DETECCIÓN PROFUNDA (Capture Phase)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      // 1. Identificar exactamente QUÉ contenedor interno se está moviendo
      const target = e.target as HTMLElement | Document;
      let currentScrollY = 0;

      if (target === document) {
        currentScrollY = document.documentElement.scrollTop || window.scrollY;
      } else {
        const element = target as HTMLElement;
        // Evitamos que los scrolls horizontales (ej. un carrusel de categorías) activen la barra
        if (element.scrollHeight <= element.clientHeight) return; 
        currentScrollY = element.scrollTop;
      }

      // 2. Filtro anti-parpadeo
      if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;

      // 3. Motor de Ocultamiento
      if (currentScrollY <= 10) {
        setIsVisible(true); // Tope superior
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false); // Bajando en el catálogo
      } else {
        setIsVisible(true);  // Subiendo en el catálogo
      }

      lastScrollY.current = currentScrollY;
    };

    // 🚀 LA CLAVE ABSOLUTA: 'capture: true' fuerza al window a interceptar scrolls de divs internos
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  const normalLinks = NAV_LINKS.filter(link => !link.hideOnBottomBar && !link.isAction)
  const actionLink = NAV_LINKS.find(link => link.isAction)
  
  const bottomBarLinks = [
    normalLinks[0], // Inicio
    normalLinks[1], // Pedidos
    actionLink,     // Central
    normalLinks[2], // Inventario
    normalLinks[3]  // Ajustes
  ].filter(Boolean)

  return (
    <div 
      className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-[env(safe-area-inset-bottom)] transform-gpu transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform z-30
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'}`} 
    >
      <div className="flex justify-between items-end p-1 pt-0 max-w-md mx-auto">
        {bottomBarLinks.map((link: any) => {
          const isActive = pathname === link.href

          if (link.isAction) {
            return (
              <div key={link.href} className="flex-shrink-0 relative -top-2 px-2">
                <GuardedLink href={link.href} className="block group shadow-subtle rounded-full">
                  <div className="w-11 h-11 bg-[#070707] text-white rounded-full flex items-center justify-center group-active:scale-95 transition-transform duration-200">
                    <Plus size={26} strokeWidth={1.4} />
                  </div>
                </GuardedLink>
              </div>
            )
          }

          return (
            <GuardedLink
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0 py-1 transition-colors duration-200 active:scale-95 ${isActive ? 'text-black' : 'text-gray-400'}`}
            >
              <div className="relative w-12 h-8 flex items-center justify-center z-10">
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-gray-50 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={`transition-transform duration-300 ${isActive ? '-translate-y-0.5' : ''}`}>
                  <link.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
              </div>
              <span className="text-[10px] font-bold tracking-wide">
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <>
      <DesktopSidebar pathname={pathname} store={store} onLogout={handleLogout} />
      <MobileSidebar pathname={pathname} store={store} onLogout={handleLogout} />
      <MobileBottomBar pathname={pathname} />
    </>
  )
}