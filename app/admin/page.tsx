'use client'

export const dynamic = 'force-dynamic' 

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr' 
import { useRouter } from 'next/navigation'
import { Plus, Trash2, LogOut, DollarSign, Image as ImageIcon, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import PaymentSettings from '@/components/PaymentSettings'

export default function AdminPage() {
  const [phone, setPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('usd')
  
  // Estados para el Logo
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 1. Buscamos la tienda (Select * traerá el nuevo logo_url automáticamente)
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!storeData) {
        router.replace('/admin/setup')
        return
      }

      setStore(storeData)
      setCurrency(storeData.currency_type || 'usd')
      setPhone(storeData.phone || '')

      // 2. Productos
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false })
        
      setProducts(productsData || [])

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false) 
    }
  }

  // --- SUBIDA DE LOGO ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !store) return

    setUploadingLogo(true)
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No user")

        // Subimos al bucket 'products' pero en una carpeta 'logos'
        const fileName = `logos/${user.id}-${Date.now()}`
        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName)

        // Guardamos en la BD
        const { error: dbError } = await supabase
            .from('stores')
            .update({ logo_url: publicUrl })
            .eq('id', store.id)

        if (dbError) throw dbError

        // Actualizamos UI
        setStore({ ...store, logo_url: publicUrl })
        alert("¡Logo actualizado!")

    } catch (error) {
        console.error(error)
        alert("Error subiendo el logo")
    } finally {
        setUploadingLogo(false)
    }
  }

  // --- RESTO DE FUNCIONES ---
  const savePhone = async () => {
    setSavingPhone(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('stores').update({ phone: phone }).eq('user_id', user.id)
        alert("Teléfono guardado")
    }
    setSavingPhone(false)
  }

  const toggleCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('stores').update({ currency_type: newCurrency }).eq('user_id', user.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Borrar?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(products.filter(p => p.id !== id))
  }

  if (loading || (!store && loading === false)) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Panel de Control</h1>
            <p className="text-gray-500 text-sm">Gestiona tu tienda: <span className="font-bold">{store?.name}</span></p>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><LogOut size={20} /></button>
        </div>

        {/* LINK CARD */}
        <div className="bg-gray-900 rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tu Link Oficial</p>
                <code className="text-blue-400 text-sm md:text-base break-all">
                    https://catalogo-center-service.vercel.app/{store?.slug}
                </code>
            </div>
            <a href={`/${store?.slug}`} target="_blank" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap">Ver Tienda ↗</a>
        </div>

        {/* GRID DE CONFIGURACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. LOGO CARD (NUEVA) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 w-full text-left flex items-center gap-2">
                    <ImageIcon size={14}/> Logo de Tienda
                </h2>
                
                <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-black overflow-hidden relative mb-4 transition-all group"
                >
                    {store?.logo_url ? (
                        <img src={store.logo_url} className="w-full h-full object-cover" />
                    ) : (
                        <Upload className="text-gray-300 group-hover:text-black" />
                    )}
                    {uploadingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin"/></div>}
                </div>
                
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                <p className="text-xs text-gray-500">Toca el círculo para subir tu logo.</p>
            </div>

            {/* 2. MONEDA CARD */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign size={14}/> Moneda Base</h2>
                    <p className="text-xs text-gray-500 mb-4">¿En qué moneda quieres ver el total en Bs?</p>
                </div>
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button onClick={() => toggleCurrency('usd')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${currency === 'usd' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>USD BCV</button>
                    <button onClick={() => toggleCurrency('eur')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${currency === 'eur' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>EUR BCV</button>
                </div>
            </div>

            {/* 3. WHATSAPP CARD */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">WhatsApp Pedidos</h2>
                    <input type="number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 58412..." className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-black text-sm font-medium"/>
                </div>
                <button onClick={savePhone} disabled={savingPhone} className="mt-4 w-full bg-black text-white py-2 rounded-lg text-xs font-bold hover:bg-gray-800 transition-all">{savingPhone ? '...' : 'Guardar'}</button>
            </div>
        </div>

        {/* PAGOS */}
        {store && (
            <PaymentSettings 
                storeId={store.id} 
                initialData={store.payment_methods} 
            />
        )}

        {/* PRODUCTOS */}
        <div>
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-bold text-gray-900">Mis Productos</h2>
                <Link href="/admin/product/new" className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-black/20"><Plus size={18} /> Nuevo</Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {products.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300"><p className="text-gray-400">No tienes productos aún.</p></div>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">{product.image_url && <img src={product.image_url} className="w-full h-full object-cover" />}</div>
                            <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900 truncate">{product.name}</h3><p className="text-sm text-green-600 font-medium">${product.usd_cash_price}</p></div>
                            <div className="flex items-center gap-2">
                                <Link href={`/admin/product/edit/${product.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><ImageIcon size={18} /></Link>
                                <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  )
}