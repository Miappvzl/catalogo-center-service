'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
    Search, Plus, Edit2, Trash2, Settings, Package,
    CreditCard, LogOut, LayoutGrid, Store, Menu, X,
    Copy, ExternalLink, Save, Coins, Upload, Loader2,
    ShieldCheck
} from 'lucide-react'
import PaymentSettings from '@/components/PaymentSettings'
import ShippingSettings from '@/components/admin/ShippingSettings'
import { uploadImageToSupabase } from '@/utils/supabaseStorage'
import Swal from 'sweetalert2'

interface Product {
    id: string
    name: string
    price: number
    usd_cash_price?: number
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
    shipping_config?: any
}

const normalizeCategory = (cat: string | undefined | null) => {
    if (!cat || cat.trim() === '') return 'Sin Categoría';
    const lower = cat.trim().toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'inventory' | 'settings'>('inventory')
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<StoreProfile | null>(null)
    const [user, setUser] = useState<any>(null)
    const [savingProfile, setSavingProfile] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    // Estado para guardar el origen (dominio) y evitar errores de hidratación
    const [origin, setOrigin] = useState('')

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todos')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const router = useRouter()

    useEffect(() => {
        // Guardamos el dominio actual (ej: preziso.vercel.app)
        setOrigin(window.location.origin)
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUser(user)

            const { data: stores } = await supabase
                .from('stores')
                .select('*')
                .eq('user_id', user.id)

            const storeData = stores?.[0] || null

          
                if (storeData) {
                console.log("DEBUG ADMIN - Store ID Real:", storeData.id); // <--- Verificación
                setProfile({
                    id: storeData.id, // <--- CORRECCIÓN CLAVE (Usamos el ID real de la tienda)
                    store_name: storeData.slug,
                    display_name: storeData.name,
                    currency_symbol: storeData.currency_symbol || '$',
                    phone: storeData.phone,
                    logo_url: storeData.logo_url,
                    usd_price: storeData.usd_price,
                    eur_price: storeData.eur_price,
                    payment_config: storeData.payment_methods,
                    shipping_config: storeData.shipping_config
                })
            } else {
                router.push('/admin/setup')
            }

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

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => normalizeCategory(p.category)))
        const sortedCats = Array.from(cats).sort();
        return ['Todos', ...sortedCats]
    }, [products])

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
            const productCat = normalizeCategory(product.category);
            const matchesCategory = selectedCategory === 'Todos' || productCat === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [products, searchTerm, selectedCategory])

    const handleDelete = async (id: string) => {

        Swal.fire({
            title: '¿Eliminar ítem?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#000',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await supabase.from('products').delete().eq('id', id)
                setProducts(products.filter(p => p.id !== id))
                Swal.fire('Eliminado', 'El producto ha sido eliminado.', 'success')
            }
        })
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleSaveProfile = async () => {
        if (!user || !profile) return
        setSavingProfile(true)

        try {
            const { error } = await supabase
                .from('stores')
                .update({
                    slug: profile.store_name,
                    name: profile.display_name,
                    phone: profile.phone,
                    logo_url: profile.logo_url,
                    currency_symbol: profile.currency_symbol,
                    usd_price: profile.usd_price,
                    eur_price: profile.eur_price,

                })
                .eq('user_id', user.id)

            if (error) throw error
            Swal.fire({ icon: 'success', title: 'Sistema Actualizado', timer: 1500, showConfirmButton: false })
        } catch (error) {
            console.error(error)
            Swal.fire({ icon: 'error', title: 'Error de Sistema', text: 'No se pudo guardar la configuración.' })
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

    // --- LÓGICA DE COPIADO ROBUSTA ---
    const copyLink = () => {
        if (!profile?.store_name) return;
        const url = `${origin}/${profile.store_name}`

        // Función auxiliar para éxito
        const onSuccess = () => {
            Swal.fire({
                icon: 'success',
                title: 'Link Copiado',
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false
            })
        }

        // Intento 1: API Moderna
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url)
                .then(onSuccess)
                .catch(() => fallbackCopy(url, onSuccess)) // Si falla, vamos al Plan B
        } else {
            // Intento 2: Plan B directo
            fallbackCopy(url, onSuccess)
        }
    }

    // Plan B: Crear un elemento invisible y seleccionarlo (Funciona en todos lados)
    const fallbackCopy = (text: string, onSuccess: () => void) => {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
            document.execCommand('copy')
            onSuccess()
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No pudimos copiar el link automáticamente.' })
        }
        document.body.removeChild(textArea)
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-black" size={32} />
                <span className="text-xs font-mono uppercase tracking-widest text-gray-400">Cargando Sistema...</span>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans text-gray-900">

            {/* SIDEBAR */}
            <aside className="hidden md:flex flex-col w-64 bg-gray-50 border-r border-gray-200 h-screen sticky top-0">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black flex items-center justify-center rounded-md">
                            <span className="text-white font-serif italic font-bold">P.</span>
                        </div>
                        <span className="font-bold text-sm tracking-widest uppercase">Admin Panel</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Principal</p>
                    <button onClick={() => setActiveTab('inventory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all rounded-md ${activeTab === 'inventory' ? 'bg-white border border-gray-200 text-black shadow-sm' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}>
                        <Package size={16} /> Inventario
                    </button>
                    <button onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all rounded-md ${activeTab === 'settings' ? 'bg-white border border-gray-200 text-black shadow-sm' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}>
                        <Settings size={16} /> Configuración
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-3 mb-4">
                        {profile?.logo_url ? (
                            <Image src={profile.logo_url} width={32} height={32} alt="Logo" className="rounded-md border border-gray-200 object-cover" />
                        ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded-md border border-gray-200"></div>
                        )}
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold truncate uppercase">{profile?.display_name || 'Tienda'}</p>
                            <p className="text-[10px] font-mono text-gray-400">Estado: Activo</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide border border-transparent hover:border-red-100 transition-all">
                        <LogOut size={14} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* MOBILE MENU */}
            <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30 flex items-center justify-between">
                <div className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-xs font-serif italic">P.</div>
                    Admin
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 border border-gray-200 rounded-md text-black">
                    {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-14 bg-white z-20 p-4 space-y-2 border-t border-gray-100">
                    <button onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false) }} className="w-full p-4 border border-gray-200 rounded-md flex items-center gap-3 font-bold text-xs uppercase tracking-wide"><Package size={16} /> Inventario</button>
                    <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false) }} className="w-full p-4 border border-gray-200 rounded-md flex items-center gap-3 font-bold text-xs uppercase tracking-wide"><Settings size={16} /> Configuración</button>
                    <button onClick={handleSignOut} className="w-full p-4 bg-red-50 text-red-600 rounded-md flex items-center gap-3 font-bold text-xs uppercase tracking-wide"><LogOut size={16} /> Salir</button>
                </div>
            )}

            {/* CONTENT AREA */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-white">

                {/* === INVENTARIO === */}
                {activeTab === 'inventory' && (
                    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-gray-100 pb-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-black uppercase leading-none">Inventario</h1>
                                <p className="text-xs font-mono text-gray-400 mt-2">Total Items: {products.length}</p>
                            </div>
                            <Link href="/admin/product/new" className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-md font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                <Plus size={16} /> Agregar Item
                            </Link>
                        </header>

                        {/* BARRA DE HERRAMIENTAS */}
                        <div className="bg-gray-50 p-1 rounded-lg border border-gray-200 mb-8 flex flex-col md:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input type="text" placeholder="Buscar referencia..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-md pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-black focus:border-black outline-none text-sm font-medium placeholder:text-gray-400" />
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1">
                                {categories.map(cat => (
                                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                                        className={`whitespace-nowrap px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all border ${selectedCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-32 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 text-sm font-medium">Inventario vacío o sin resultados.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredProducts.map((product) => (
                                    <div key={product.id} className="group bg-white border border-gray-200 hover:border-black transition-colors rounded-lg overflow-hidden flex flex-col">

                                        <div className="aspect-square bg-gray-50 relative border-b border-gray-100 p-4">
                                            {product.image_url ? (
                                                <Image src={product.image_url} fill className="object-contain mix-blend-multiply p-4" alt={product.name} sizes="200px" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-200 font-bold text-2xl">P.</div>
                                            )}
                                            {product.category && (
                                                <div className="absolute top-2 left-2 bg-white border border-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500 rounded-sm">
                                                    {normalizeCategory(product.category)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 flex flex-col flex-1 gap-2">
                                            <h3 className="font-bold text-sm leading-tight text-gray-900 line-clamp-2 min-h-[2.5em]">{product.name}</h3>

                                            <div className="mt-auto pt-3 border-t border-dashed border-gray-100 flex items-center justify-between">
                                                <span className="font-mono text-sm font-medium text-gray-900">
                                                    ${product.usd_cash_price || product.price || 0}
                                                </span>

                                                <div className="flex gap-1">
                                                    <Link href={`/admin/product/edit/${product.id}`} className="p-1.5 bg-gray-50 hover:bg-black hover:text-white rounded text-gray-600 border border-gray-200 transition-colors" title="Editar">
                                                        <Edit2 size={14} />
                                                    </Link>
                                                    <button onClick={() => handleDelete(product.id)} className="p-1.5 bg-gray-50 hover:bg-red-500 hover:text-white rounded text-gray-600 border border-gray-200 transition-colors" title="Eliminar">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
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
                    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 space-y-8">

                        <header className="mb-8 border-b border-gray-100 pb-6">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-black uppercase leading-none">Configuración</h1>
                            <p className="text-xs font-mono text-gray-400 mt-2">ID Tienda: {profile.id.slice(0, 8)}</p>
                        </header>

                        {/* LINK CARD */}
                        <div className="bg-[#0f0f0f] text-white p-6 rounded-lg shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-800">
                            <div className="flex flex-col gap-1 w-full">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Tu Enlace Público</label>
                                {/* SOLUCIÓN: Ahora es un enlace real <a> */}
                                <a
                                    href={`${origin}/${profile.store_name}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 font-mono text-sm text-gray-300 break-all hover:text-white transition-colors cursor-pointer group"
                                >
                                    <ExternalLink size={14} className="text-green-500 shrink-0 group-hover:scale-110 transition-transform" />
                                    {origin}/{profile.store_name}
                                </a>
                            </div>
                            <button onClick={copyLink} className="shrink-0 bg-white text-black px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wide hover:bg-gray-200 transition-colors w-full md:w-auto">
                                Copiar Link
                            </button>
                        </div>

                        {/* 2. DATOS GENERALES */}

                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/30">
                            <h2 className="text-sm font-black uppercase tracking-wide mb-6 flex items-center gap-2">
                                <Store size={16} /> Datos de la Empresa
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Slug (URL)</label>
                                    <div className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden">
                                        <span className="pl-3 text-xs text-gray-400 font-mono">/</span>
                                        <input type="text" value={profile.store_name || ''}
                                            onChange={(e) => setProfile({ ...profile, store_name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                            className="w-full py-2.5 px-2 text-sm font-bold outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre Visible</label>
                                    <input type="text" value={profile.display_name || ''}
                                        onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-md py-2.5 px-3 text-sm font-bold outline-none focus:border-black transition-colors" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">WhatsApp Contacto</label>
                                    <input type="text" value={profile.phone || ''} placeholder="58412..."
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-md py-2.5 px-3 text-sm font-mono outline-none focus:border-black transition-colors" />
                                </div>
                            </div>

                            {/* LOGO */}
                            <div className="mt-6 border-t border-dashed border-gray-200 pt-6">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 block">Identidad Visual (Logo)</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white border border-gray-200 rounded-md flex items-center justify-center overflow-hidden relative">
                                        {profile.logo_url ? (
                                            <Image src={profile.logo_url} fill className="object-cover" alt="Logo" />
                                        ) : (
                                            <div className="text-gray-200 text-xs">N/A</div>
                                        )}
                                        {uploadingLogo && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={16} /></div>}
                                    </div>
                                    <label className="cursor-pointer bg-white border border-gray-200 hover:border-black text-black px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all">
                                        Subir Imagen
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 3. FINANZAS (TASAS) */}
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/30">
                            <h2 className="text-sm font-black uppercase tracking-wide mb-6 flex items-center gap-2">
                                <Coins size={16} /> Tasas de Cambio
                            </h2>

                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Moneda Base:</span>
                                <div className="flex bg-gray-100 p-1 rounded-md">
                                    <button onClick={() => setProfile({ ...profile, currency_symbol: '$' })}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${profile.currency_symbol === '$' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>USD ($)</button>
                                    <button onClick={() => setProfile({ ...profile, currency_symbol: '€' })}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${profile.currency_symbol === '€' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>EUR (€)</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tasa Dólar (Manual)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                        <input type="number" value={profile.usd_price || ''}
                                            onChange={(e) => setProfile({ ...profile, usd_price: parseFloat(e.target.value) || 0 })}
                                            placeholder="0 = Auto"
                                            className="w-full bg-white border border-gray-200 rounded-md py-2.5 pl-6 pr-3 text-sm font-mono font-bold outline-none focus:border-green-500" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tasa Euro (Manual)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                                        <input type="number" value={profile.eur_price || ''}
                                            onChange={(e) => setProfile({ ...profile, eur_price: parseFloat(e.target.value) || 0 })}
                                            placeholder="0 = Auto"
                                            className="w-full bg-white border border-gray-200 rounded-md py-2.5 pl-6 pr-3 text-sm font-mono font-bold outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">* Si dejas el valor en 0, se usará la tasa del Banco Central (BCV).</p>
                        </div>

                        {/* 4. MÉTODOS DE PAGO */}
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/30">
                            <h2 className="text-sm font-black uppercase tracking-wide mb-6 flex items-center gap-2">
                                <CreditCard size={16} /> Pasarela
                            </h2>
                            {/* 3. LOGÍSTICA (ENVÍOS) */}
                            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/30">
                                {/* No necesitamos header aquí porque el componente ya tiene uno interno */}
                                {profile?.id && <ShippingSettings storeId={profile.id} />}
                            </div>
                            {user && <PaymentSettings userId={user.id} initialData={profile.payment_config} />}
                        </div>

                        {/* ACTION BAR */}
                        <div className="sticky bottom-4 bg-white/80 backdrop-blur border border-gray-200 p-4 rounded-lg shadow-2xl flex justify-end">
                            <button onClick={handleSaveProfile} disabled={savingProfile}
                                className="bg-black text-white px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2">
                                {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Guardar Cambios
                            </button>
                        </div>

                    </div>
                )}
            </main>
        </div>
    )
}