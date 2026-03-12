'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, ShoppingBag, Package, Settings, PlusCircle, LogOut, Store, Copy, Check } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { motion } from 'framer-motion'

const NAV_LINKS = [
  { name: 'Inicio', href: '/admin', icon: LayoutGrid },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Nuevo', href: '/admin/product/new', icon: PlusCircle, isAction: true },
  { name: 'Inventario', href: '/admin/inventory', icon: Package },
  { name: 'Ajustes', href: '/admin/settings', icon: Settings },
]

const DesktopSidebar = ({ pathname, store, onLogout }: { pathname: string, store: any, onLogout: () => void }) => {
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    if (!store?.slug) return
    // Lógica dinámica que funciona tanto en localhost como en producción
    const host = window.location.host.replace('www.', '')
    const url = `${window.location.protocol}//${store.slug}.${host}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-gray-200 bg-white z-50 p-6">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">
            <Store size={18} />
        </div>
        <span className="font-black text-lg tracking-tight text-gray-900">Preziso</span>
      </div>

      <nav className="flex-1 space-y-1.5 relative">
        {NAV_LINKS.map((link) => {
          if (link.isAction) return null
          const isActive = pathname === link.href
          return (
            <Link 
                key={link.href} 
                href={link.href} 
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors duration-200 group ${
                    isActive ? 'text-black' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="desktop-nav-indicator"
                  className="absolute inset-0 bg-gray-100 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
              <span className="relative z-10">{link.name}</span>
            </Link>
          )
        })}
        
        <div className="pt-4">
            <Link 
                href="/admin/product/new" 
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-black transition-all border border-dashed border-gray-200 hover:border-gray-300"
            >
                <PlusCircle size={20} /> Nuevo Producto
            </Link>
        </div>
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200 space-y-3">
        {store && (
          <div className="flex items-center justify-between p-1 border border-gray-200 rounded-xl bg-white">
            <Link 
                // Usamos JS vainilla para forzar la navegación al subdominio real
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    const host = window.location.host.replace('www.', '');
                    window.open(`${window.location.protocol}//${store.slug}.${host}`, '_blank');
                }}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:text-black hover:bg-gray-50 transition-colors"
            >
                <Store size={15} /> Ver mi Tienda
            </Link>
            <div className="w-px h-5 bg-gray-200 mx-1"></div>
            <button 
                onClick={copyLink} 
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-all active:scale-95"
                title="Copiar enlace"
            >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        )}
        <button 
            onClick={onLogout} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-700 transition-all w-full text-left"
        >
            <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

const MobileBottomBar = ({ pathname }: { pathname: string }) => (
  <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)] transform-gpu">
    <div className="flex justify-between items-end p-1 pt-0 max-w-md mx-auto">
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href
        
        if (link.isAction) {
          return (
            <div key={link.href} className="flex-shrink-0 relative -top-6 px-2">
              <Link href={link.href} className="block group">
                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center border-4 border-white group-active:scale-95 transition-transform duration-200">
                  <PlusCircle size={26} strokeWidth={2.5} />
                </div>
              </Link>
            </div>
          )
        }
        
        return (
          <Link 
              key={link.href} 
              href={link.href} 
              prefetch={true}
              className={`flex flex-1 flex-col items-center justify-center gap-0 py-1 transition-colors duration-200 active:scale-95 ${
                  isActive ? 'text-black' : 'text-gray-400 hover:text-gray-900'
              }`}
          >
            <div className="relative w-12 h-8 flex items-center justify-center z-10">
               {isActive && (
                 <motion.div
                   layoutId="mobile-nav-indicator"
                   className="absolute inset-0 bg-gray-100 rounded-full -z-10"
                   transition={{ type: "spring", stiffness: 400, damping: 30 }}
                 />
               )}
               <div className={`transition-transform duration-300 ${isActive ? '-translate-y-0.5' : ''}`}>
                  <link.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "opacity-100" : "opacity-80"} />
               </div>
            </div>
            
            <span className="text-[10px] font-bold tracking-wide">
              {link.name}
            </span>
          </Link>
        )
      })}
    </div>
  </div>
)

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
      <MobileBottomBar pathname={pathname} />
    </>
  )
}