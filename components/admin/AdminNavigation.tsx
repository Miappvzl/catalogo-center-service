'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, ShoppingBag, Package, Settings, PlusCircle, LogOut, ExternalLink, Store } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'

interface NavProps {
  store: any
}

export default function AdminNavigation({ store }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  const links = [
    { name: 'Inicio', href: '/admin', icon: LayoutGrid },
    { name: 'Pedidos', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Nuevo', href: '/admin/product/new', icon: PlusCircle, isAction: true },
    { name: 'Inventario', href: '/admin/inventory', icon: Package },
    { name: 'Ajustes', href: '/admin/settings', icon: Settings },
  ]

  // Sidebar Desktop
  const DesktopSidebar = () => (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-white/50 bg-white/50 backdrop-blur-xl z-50 p-6">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">
            <Store size={18} />
        </div>
        <span className="font-black text-lg tracking-tight">Preziso</span>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          if (link.isAction) return null
          const isActive = pathname === link.href
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isActive ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-500 hover:bg-white hover:text-black hover:shadow-sm'}`}>
              <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {link.name}
            </Link>
          )
        })}
        <Link href="/admin/product/new" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-green-50 hover:text-green-700 transition-all mt-4 border border-dashed border-gray-300 hover:border-green-200">
            <PlusCircle size={20} /> Nuevo Producto
        </Link>
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200/50 space-y-4">
        {store && (
            <Link href={`/${store.slug}`} target="_blank" className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-black transition-colors px-2">
                <ExternalLink size={14} /> Ver mi Tienda
            </Link>
        )}
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-600 transition-colors px-2 w-full text-left">
            <LogOut size={14} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  )

  // Bottom Bar Mobile
  const MobileBottomBar = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 z-50 pb-safe-area">
      <div className="flex justify-around items-center p-2 pb-4 safe-area-pb">
        {links.map((link) => {
          const isActive = pathname === link.href
          if (link.isAction) {
            return (
              <Link key={link.href} href={link.href} className="relative -top-5">
                <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-xl shadow-black/20 active:scale-90 transition-transform">
                  <PlusCircle size={28} strokeWidth={2} />
                </div>
              </Link>
            )
          }
          return (
            <Link key={link.href} href={link.href} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-colors ${isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}>
              <link.icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "opacity-100" : "opacity-80"} />
              <span className="text-[10px] font-bold">{link.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )

  return <><DesktopSidebar /><MobileBottomBar /></>
}