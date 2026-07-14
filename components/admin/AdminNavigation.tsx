'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, ShoppingBag, Package, Settings, Plus, LogOut, Store, Copy, Check, Tag, Headset, X, Wallet, Palette, Users, Calculator, FileText, User, Gift } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useEditorGuard } from '@/app/store/useEditorGuard'
import Swal from 'sweetalert2'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
// 🚀 IMPORTA EL NUEVO MODAL PROMOCIONAL AL INICIO DE TU ARCHIVO AdminNavigation.tsx:
import VueltoPromoModal from '@/components/admin/VueltoPromoModal';

const NAV_LINKS = [
  // 📌 General
  { name: 'Inicio', href: '/admin', icon: LayoutGrid, category: 'General' },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag, category: 'General' },
  { name: 'Clientes', href: '/admin/customers', icon: User, category: 'General' }, // 🚀 RUTA DE CLIENTES INTEGRADA

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


// 🚀 MICRO-COMPONENTE: Avatar Consistente
const NavAvatarIcon = ({ store }: { store: any }) => {
  const initials = store?.name ? store.name.substring(0, 2).toUpperCase() : 'PR';
  const isTrial = store?.subscription_status === 'trial';
  
  return (
    <div className={`w-[26px] h-[26px] rounded-full p-[2px] ${!isTrial ? 'bg-gradient-to-r from-[#4f37d3] to-[#e5e5e5]' : 'bg-black'}`}>
       <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
           <span className="text-[9px] font-black text-gray-900 tracking-tighter leading-none">{initials}</span>
       </div>
    </div>
  )
};
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
      // 🚀 MOTOR GRÁFICO: w-[80px] cerrado, w-[260px] abierto. 
      // will-change-width delega la animación a la GPU.
      className="hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-white/95 backdrop-blur-xl z-50 border-r border-gray-100 
                 transition-[width,box-shadow] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width]
                 w-[80px] hover:w-[260px] group/sidebar overflow-hidden hover:shadow-[4px_0_40px_rgba(0,0,0,0.03)]"
    >
      {/* HEADER LOGO */}
      <div className="h-20 flex items-center px-3 pl-4 flex-shrink-0">
        <Link href="/" className="flex items-center min-w-[200px] pl-[-2px] active:scale-95 transition-transform">
          <Image
            src={getOptimizedUrl("/favicon-light.png")}
            alt="Preziso Logo"
            width={175}
            height={50}
            className="h-12 w-auto object-contain object-left"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-6 px-3">
        {['General', 'Ventas', 'Catálogo', 'Negocio'].map((category, idx) => {
          const linksInCategory = NAV_LINKS.filter(link => link.category === category);
          if (linksInCategory.length === 0) return null;

          return (
            <div key={category} className={`relative pb-2 ${idx !== -1 ? 'pt-4' : ''}`}>
              
              {/* 🚀 PATRÓN UX: Indicador visual de separación cuando está colapsado */}
              <div className="absolute left-1/2 -translate-x-1/2 top-6 w-4 h-[2px] rounded-full bg-gray-200 transition-opacity duration-[400ms] group-hover/sidebar:opacity-0" />

              {/* Título de la Categoría (Se revela con el hover) */}
              <h3 className="pl-4 pr-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-[400ms] -translate-x-4 group-hover/sidebar:translate-x-0 whitespace-nowrap">
                {category}
              </h3>

              <div className="space-y-0.5">
                {linksInCategory.map((link) => {
                  if (link.isAction) return null;
                  const isActive = pathname === link.href;

                  return (
                    <GuardedLink
                      key={link.href}
                      href={link.href}
                      className={`relative flex items-center p-1.5 rounded-[11px] text-sm font-medium transition-colors duration-200 ${
                        isActive ? 'text-black' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                     {isActive && (
                        <motion.div
                          layoutId="desktop-nav-indicator"
                          className="absolute inset-0 bg-gray-100 rounded-[11px] -z-10 overflow-hidden"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        >
                           {/* 1. SANGRADO PERFECTO (Cero Cortes) */}
                           {/* Usamos paradas porcentuales exactas para forzar un desvanecimiento sin "escalones" de color */}
                           <div 
                              className="absolute inset-0 pointer-events-none" 
                              style={{ background: 'linear-gradient(to left, #edeaff 0%, rgb(242 240 255) 30%, #ffffff75 65%)' }}
                           />
                           
                           {/* 2. HALO DE DIFUMINACIÓN (El resplandor que ablanda la línea) */}
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[60%] w-[6px] bg-[#ffffff] blur-[4px] opacity-40 pointer-events-none" />

                           {/* 3. FILAMENTO ORGÁNICO (El núcleo físico) */}
                           {/* blur-[0.5px] es el secreto para matar la dureza del borde del div */}
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] bg-[#ffffff] opacity-90 rounded-l-full blur-[0.5px] pointer-events-none" />
                        </motion.div>
                      )}
                      
                      {/* El contenedor del ícono es rígidamente de 40x40px, garantizando 0 movimiento horizontal */}
                      <div className="flex items-center justify-center w-10 h-8 flex-shrink-0 z-10">
                        <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      
                      {/* Texto que aparece fluidamente */}
                      <span className="ml-3 font-medium tracking-tight whitespace-nowrap opacity-0 -translate-x-2 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 z-10">
                        {link.name}
                      </span>

                      {link.isNew && (
                        <div className="ml-auto pr-2 opacity-0 transition-opacity duration-[400ms] group-hover/sidebar:opacity-100 flex-shrink-0">
                         
                        </div>
                      )}
                    </GuardedLink>
                  );
                })}

                {/* Botón Nuevo Producto */}
                {category === 'Catálogo' && (
                  <div className="pt-2">
                    <GuardedLink
                      href="/admin/product/new"
                      className="relative flex items-center p-1.5 rounded-[11px] text-sm font-bold text-gray-500 hover:text-black transition-colors border border-transparent group-hover/sidebar:border-gray-200 border-dashed hover:!border-black bg-white group-hover/sidebar:bg-transparent"
                    >
                      <div className="flex items-center justify-center w-10 h-10 flex-shrink-0 bg-gray-50 group-hover/sidebar:bg-transparent rounded-lg">
                        <Plus size={20} />
                      </div>
                      <span className="ml-3 whitespace-nowrap opacity-0 -translate-x-2 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0">
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

      
        {/* BOTTOM SECTION */}
      <div className="mt-auto pt-4 border-t border-gray-100 space-y-1 px-3 pb-6 flex-shrink-0">
        
       {/* 🚀 ITEM NATIVO EN SIDEBAR (Se vuelve un botón gradiente violeta sutil e integrado) */}
        {!isVueltoActive && (
          <button
            onClick={onOpenPromo} // 🚀 CORREGIDO: Llama al callback prop
            className="w-full flex items-center p-1.5 rounded-xl bg-gradient-to-r from-[#000000c3] to-[#1e1533] text-white hover:opacity-95 transition-all text-left shadow-[0_8px_30px_rgb(79,55,211,0.08)] mb-2"
          >
            <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
              <Gift size={18} className="animate-pulse text-white" />
            </div>
            <span className="ml-3 text-xs font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[400ms]">
              Vuelto Inteligente
            </span>
          </button>
        )}

        
        {store && (
          <div className="flex items-center rounded-xl bg-white group-hover/sidebar:bg-gray-50 transition-colors overflow-hidden border border-transparent group-hover/sidebar:border-gray-100">
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="flex items-center flex-1 p-1.5 hover:text-black transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 flex-shrink-0 text-gray-600 bg-gray-50 group-hover/sidebar:bg-transparent rounded-lg">
                <Store size={18} />
              </div>
              <span className="ml-3 text-xs font-bold text-gray-600 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[400ms]">
                Ver Tienda
              </span>
            </Link>
            
            <div className="flex items-center pr-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[400ms]">
              <div className="w-px h-5 bg-gray-200 mx-1"></div>
              <button
                onClick={copyLink}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-gray-600 hover:text-black transition-all active:scale-95"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        <a
          href={`https://wa.me/584145811936?text=Hola%20equipo%20Preziso`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-1.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 hover:text-black"
        >
          <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
            <Headset size={18} />
          </div>
          <span className="ml-3 text-xs font-bold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[400ms]">
            Soporte Técnico
          </span>
        </a>

      <GuardedLink
          href="/admin/profile"
          className="flex items-center p-1.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 hover:text-black w-full text-left"
        >
          <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
            {/* 🚀 AVATAR INTELIGENTE */}
            <NavAvatarIcon store={store} />
          </div>
          <span className="ml-3 text-xs font-bold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[400ms]">
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
                    // 🚀 Añadimos relative y overflow-hidden al contenedor principal
                    className={`relative overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-colors duration-200 ${
                      isActive ? 'bg-[#F8F9FA] text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {/* 🚀 EL EFECTO DE LUZ (Solo si está activo) */}
                    {isActive && (
                      <div className="absolute inset-0 z-0 pointer-events-none">
                        <div 
                           className="absolute inset-0" 
                           style={{ background: 'linear-gradient(to left, #edeaff 0%, rgb(242 240 255) 30%, #ffffff75 65%)' }} 
                        />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[60%] w-[6px] bg-[#ffffff] blur-[4px] opacity-40 pointer-events-none" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] bg-[#ffffff] opacity-90 rounded-l-full blur-[0.5px] pointer-events-none" />
                      </div>
                    )} 
                    {/* Contenido protegido con z-10 para que quede por encima de la luz */}
                    <div className="relative z-10 flex items-center gap-3 w-full">
                      <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-black" : "text-gray-400"} />
                      <span>{link.name}</span>
                    </div>
                  </GuardedLink>

                )
              })}

              {/* 🚀 ITEM NATIVO EN EL MENU LATERAL MÓVIL */}
              {!isVueltoActive && (
                <div className="pt-2">
                  <button
                    onClick={onOpenPromo} // 🚀 CORREGIDO: Llama al callback prop
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#000000] to-[#153322] shadow-[0_8px_30px_rgb(79,55,211,0.08)]"
                  >
                    <Gift size={20} className="animate-pulse" />
                    <span>Activar Vuelto Inteligente</span>
                  </button>
                </div>
              )}
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

              <GuardedLink
                href="/admin/profile"
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-black transition-all w-full text-left"
              >
                {/* 🚀 AVATAR INTELIGENTE */}
                <NavAvatarIcon store={store} /> Mi Perfil
              </GuardedLink>
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
  
  // 🚀 DETECTOR DE TOUR ACTIVO
  const searchParams = useSearchParams()
  const isTourActive = !!searchParams.get('mission')

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

// Si hay un tour activo, sobreescribimos la visibilidad de la barra
  const shouldRenderBar = isVisible && !isTourActive;

  return (
    <div 
      className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-[env(safe-area-inset-bottom)] transform-gpu transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform z-30
      ${shouldRenderBar ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0 pointer-events-none'}`} 
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

  // Estado reactivo local para renderizado en caliente del modal promo
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [storeConfigLocal, setStoreConfigLocal] = useState(store?.payment_config || {});

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  // Comprobar estado de activación de manera reactiva local
  const isVueltoActive = storeConfigLocal?.store_credit_active === true;

  return (
    <>
      {/* 🚀 Propagamos isVueltoActive y onOpenPromo hacia los componentes hijos */}
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

      {/* 🚀 MODAL PROMOCIONAL CON AUDITORÍA LEGAL */}
      {store && (
        <VueltoPromoModal
          isOpen={promoModalOpen}
          onClose={() => setPromoModalOpen(false)}
          storeId={store.id}
          onSuccess={() => {
            // Sincronización de estado instantánea en caliente (0ms)
            const updatedConfig = { ...storeConfigLocal, store_credit_active: true };
            setStoreConfigLocal(updatedConfig);
            router.refresh();
          }}
        />
      )}
    </>
  )
}