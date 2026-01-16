'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
    Search, Plus, Edit2, Trash2, Settings, Package,
    CreditCard, LogOut, LayoutGrid, Store, Menu, X,
    Copy, ExternalLink, Save, Coins, Upload, Loader2
} from 'lucide-react'
import PaymentSettings from '@/components/PaymentSettings'
import { uploadImageToSupabase } from '@/utils/supabaseStorage'
import Swal from 'sweetalert2'

interface Product {
    id: string
    name: string
    price: number
    image_url: string
    category?: string
}

interface StoreProfile {
    id: string
    store_name: string
    display_name: string
    currency_symbol: string
    phone: string
    logo_url?: string
    usd_price?: number
    eur_price?: number
    payment_config?: any
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'inventory' | 'settings'>('inventory')
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<StoreProfile | null>(null)
    const [user, setUser] = useState<any>(null)
    const [savingProfile, setSavingProfile] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todos')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const router = useRouter()

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUser(user)

            // 1. CARGAR DATOS DE LA TIENDA (DESDE TABLA STORES)
            const { data: stores } = await supabase
                .from('stores')
                .select('*')
                .eq('user_id', user.id)

            const storeData = stores?.[0] || null

            if (storeData) {
                setProfile({
                    id: user.id,
                    store_name: storeData.slug, // URL
                    display_name: storeData.name, // Nombre Real
                    currency_symbol: storeData.currency_symbol || '$',
                    phone: storeData.phone,
                    logo_url: storeData.logo_url,
                    usd_price: storeData.usd_price,
                    eur_price: storeData.eur_price,
                    payment_config: storeData.payment_methods // Para pasar a PaymentSettings
                })
            } else {
                router.push('/admin/setup')
            }

            // 2. CARGAR PRODUCTOS
            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (productsData) setProducts(productsData)

        } catch (error) {
            console.error('Error cargando datos:', error)
        } finally {
            setLoading(false)
        }
    }

    // --- FILTROS ---
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [products, searchTerm, selectedCategory])

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category || 'Sin Categoría'))
        return ['Todos', ...Array.from(cats)]
    }, [products])

    // --- ACCIONES ---
    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro?')) return
        await supabase.from('products').delete().eq('id', id)
        setProducts(products.filter(p => p.id !== id))
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // GUARDAR PERFIL (EN TABLA STORES)
    const handleSaveProfile = async () => {
        if (!user || !profile) return
        setSavingProfile(true)

        try {
            const { error } = await supabase
                .from('stores')
                .update({
                    slug: profile.store_name, // slug en la BD
                    name: profile.display_name, // name en la BD
                    phone: profile.phone,
                    logo_url: profile.logo_url,
                    currency_symbol: profile.currency_symbol,
                    usd_price: profile.usd_price,
                    eur_price: profile.eur_price,
                })
                .eq('user_id', user.id)

            if (error) throw error
            Swal.fire({ icon: 'success', title: 'Tienda Actualizada', timer: 1500, showConfirmButton: false })
        } catch (error) {
            console.error(error)
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la tienda.' })
        } finally {
            setSavingProfile(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        setUploadingLogo(true)
        try {
            const file = e.target.files[0]
            const url = await uploadImageToSupabase(supabase, file, 'logos', 'store-logos')
            setProfile(prev => prev ? { ...prev, logo_url: url } : null)
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo subir la imagen.' })
        } finally {
            setUploadingLogo(false)
        }
    }

    // 1. FUNCIÓN ROBUSTA PARA COPIAR
  const copyLink = () => {
     // Si no hay nombre de tienda, avisamos
     if(!profile?.store_name) {
         Swal.fire({ 
            icon: 'warning', 
            title: 'Falta el nombre', 
            text: 'Primero asigna un nombre URL a tu tienda.',
            toast: true, position: 'top-end', timer: 3000, showConfirmButton: false 
         });
         return;
     }

     const url = `${window.location.origin}/${profile.store_name}`

     // Intentamos primero con la API Moderna (Solo HTTPS)
     if (navigator.clipboard && window.isSecureContext) {
         navigator.clipboard.writeText(url)
             .then(() => showSuccessAlert())
             .catch((err) => {
                 console.error('Error API moderna:', err)
                 fallbackCopy(url) // Si falla, vamos al Plan B
             })
     } else {
         // Si no hay HTTPS, usamos el Plan B directo
         fallbackCopy(url)
     }
  }

  // 2. FUNCIÓN "PLAN B" (Vieja Escuela - Funciona siempre)
  const fallbackCopy = (text: string) => {
      const textArea = document.createElement("textarea")
      textArea.value = text
      
      // Lo hacemos invisible y fijo para no mover la pantalla
      textArea.style.position = "fixed"
      textArea.style.left = "-9999px"
      textArea.style.top = "0"
      
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
          const successful = document.execCommand('copy')
          if(successful) showSuccessAlert()
          else throw new Error('Falló execCommand')
      } catch (err) {
          console.error('Fallback error:', err)
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo copiar. Intenta seleccionarlo manualmente.' })
      }
      
      document.body.removeChild(textArea)
  }

  // Alerta de éxito reutilizable
  const showSuccessAlert = () => {
      Swal.fire({
         icon: 'success',
         title: '¡Link Copiado!',
         text: 'Listo para compartir en WhatsApp.',
         toast: true,
         position: 'top-end',
         timer: 2000,
         showConfirmButton: false
     })
  }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin" size={32} /></div>

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">

            {/* SIDEBAR */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 p-6">
                <div className="flex items-center gap-2 mb-10">
                    <div className="bg-black text-white p-1.5 rounded-lg"><Store size={20} /></div>
                    <span className="font-bold text-lg tracking-tight">Admin<span className="text-green-600">.</span></span>
                </div>
                <nav className="flex-1 space-y-2">
                    <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'inventory' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <Package size={20} /> Inventario
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'settings' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <Settings size={20} /> Configuración
                    </button>
                </nav>
                <div className="pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        {profile?.logo_url ? (
                            <Image src={profile.logo_url} width={32} height={32} alt="Logo" className="rounded-full bg-gray-100 object-cover" />
                        ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                        )}
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{profile?.display_name || 'Sin Nombre'}</p>
                            <p className="text-xs text-gray-400">Admin</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><LogOut size={16} /> Salir</button>
                </div>
            </aside>

            {/* MOBILE MENU */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30 flex items-center justify-between">
                <div className="font-bold text-lg flex items-center gap-2"><Store size={18} /> Admin</div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-gray-100 rounded-lg text-black">
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-16 bg-white z-20 p-4 space-y-4">
                    <button onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false) }} className="w-full p-4 bg-gray-50 rounded-xl flex items-center gap-3 font-bold text-black"><Package /> Inventario</button>
                    <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false) }} className="w-full p-4 bg-gray-50 rounded-xl flex items-center gap-3 font-bold text-black"><Settings /> Configuración</button>
                    <button onClick={handleSignOut} className="w-full p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 font-bold"><LogOut /> Salir</button>
                </div>
            )}

            {/* CONTENT */}
            <main className="flex-1 p-4 md:p-10 overflow-y-auto">

                {/* === INVENTARIO === */}
                {activeTab === 'inventory' && (
                    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-black">Inventario</h1>
                                <p className="text-gray-500">Gestiona tus productos.</p>
                            </div>
                            <Link href="/admin/product/new" className="bg-black hover:bg-gray-800 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl hover:-translate-y-1 transition-all">
                                <Plus size={20} /> Nuevo Producto
                            </Link>
                        </header>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 sticky top-20 md:top-0 z-10">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-black/5 outline-none font-medium text-black" />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                                {categories.map(cat => (
                                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{cat}</button>
                                ))}
                            </div>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">No se encontraron productos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {filteredProducts.map((product, index) => (
                                    <div key={product.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                                        <div className="aspect-square bg-gray-100 rounded-xl mb-3 relative overflow-hidden">
                                            {product.image_url ? (
                                                <Image src={product.image_url} fill className="object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} sizes="(max-width: 768px) 100vw, 33vw" priority={index < 4} />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-300"><LayoutGrid size={24} /></div>
                                            )}
                                            {product.category && <span className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-bold">{product.category}</span>}
                                        </div>
                                        <h3 className="font-bold text-gray-900 truncate mb-1">{product.name}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-green-600 font-black">${product.price}</span>
                                            <div className="flex gap-1">
                                                <Link href={`/admin/product/edit/${product.id}`} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg"><Edit2 size={16} /></Link>
                                                <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* === CONFIGURACIÓN === */}
                {activeTab === 'settings' && profile && (
                    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

                        {/* 1. COMPARTIR TIENDA */}
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 md:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ExternalLink size={20} /> Tu Tienda Online</h2>
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 w-full border border-white/10 flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${profile.store_name ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
                                    <span className="font-mono text-sm truncate opacity-90">
                                        {profile.store_name ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${profile.store_name}` : 'Asigna un nombre URL abajo'}
                                    </span>
                                </div>
                                <button onClick={copyLink} className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg w-full md:w-auto justify-center">
                                    <Copy size={18} /> Copiar Link
                                </button>
                            </div>
                        </div>

                        {/* 2. DATOS DE LA TIENDA */}
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Store size={24} /></div>
                                <h2 className="text-xl font-bold text-black">Datos Generales</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Tienda (URL)</label>
                                        <input type="text" value={profile.store_name || ''} onChange={(e) => setProfile({ ...profile, store_name: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="ej: mi-tienda" className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black/5 rounded-xl px-4 py-3 font-medium transition-all text-black" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Visible (Título)</label>
                                        <input type="text" value={profile.display_name || ''} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} placeholder="Ej: Zapatos Caracas" className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black/5 rounded-xl px-4 py-3 font-medium transition-all text-black" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                                    <input type="text" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+58 412..." className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black/5 rounded-xl px-4 py-3 font-medium transition-all text-black" />
                                </div>

                                {/* LOGO UPLOAD */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Logo de la Tienda</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                            {profile.logo_url ? <Image
                                                src={profile.logo_url}
                                                fill
                                                className="object-cover"
                                                alt="Logo"
                                                sizes="100px"
                                            /> : <div className="flex items-center justify-center h-full text-gray-400"><Store size={24} /></div>}
                                            {uploadingLogo && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={20} /></div>}
                                        </div>
                                        <div className="flex-1">
                                            <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                            <label htmlFor="logo-upload" className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 font-bold cursor-pointer hover:border-black hover:text-black transition-all ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <Upload size={20} /> {uploadingLogo ? 'Subiendo...' : 'Subir Imagen'}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* MONEDA Y TASAS */}
                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mt-4">
                                    <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold"><Coins size={18} /> Configuración de Moneda</div>

                                    <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-xl border border-gray-100">
                                        <span className="text-sm font-medium pl-2">Moneda Principal:</span>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button onClick={() => setProfile({ ...profile, currency_symbol: '$' })} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${profile.currency_symbol === '$' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>USD ($)</button>
                                            <button onClick={() => setProfile({ ...profile, currency_symbol: '€' })} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${profile.currency_symbol === '€' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>EUR (€)</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* TASA DÓLAR */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tasa Dólar (BCV)</label>
                                            <input
                                                type="number"
                                                // TRUCO: Si es 0, mostramos '' (vacío)
                                                value={profile.usd_price || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setProfile({
                                                        ...profile,
                                                        // Si borran todo, guardamos 0
                                                        usd_price: val === '' ? 0 : parseFloat(val)
                                                    })
                                                }}
                                                placeholder="Auto (0)"
                                                className="w-full bg-white border border-gray-200 focus:border-green-500 rounded-xl px-4 py-2 font-bold text-black outline-none placeholder:font-normal placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* TASA EURO */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tasa Euro (BCV)</label>
                                            <input
                                                type="number"
                                                // TRUCO: Si es 0, mostramos '' (vacío)
                                                value={profile.eur_price || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setProfile({
                                                        ...profile,
                                                        // Si borran todo, guardamos 0
                                                        eur_price: val === '' ? 0 : parseFloat(val)
                                                    })
                                                }}
                                                placeholder="Auto (0)"
                                                className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-xl px-4 py-2 font-bold text-black outline-none placeholder:font-normal placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 text-center">Dejar en vacío o 0 para usar la tasa automática del sistema.</p>
                                </div>

                                <button onClick={handleSaveProfile} disabled={savingProfile} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-4">
                                    {savingProfile ? 'Guardando...' : <><Save size={18} /> Guardar Datos de Tienda</>}
                                </button>
                            </div>
                        </div>

                        {/* 3. MÉTODOS DE PAGO */}
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CreditCard size={24} /></div>
                                <h2 className="text-xl font-bold text-black">Métodos de Pago</h2>
                            </div>
                            {user && <PaymentSettings userId={user.id} initialData={profile.payment_config} />}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}