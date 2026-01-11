'use client'

export const dynamic = 'force-dynamic' 

import { useEffect, useState, useRef } from 'react'
// 1. Asegúrate de que esta importación esté correcta
import { uploadImageToSupabase } from '@/utils/supabaseStorage'
import { createBrowserClient } from '@supabase/ssr' 
import { useRouter } from 'next/navigation'
import { Plus, Trash2, LogOut, DollarSign, Image as ImageIcon, Loader2, Upload, RefreshCw, Save } from 'lucide-react'
import Link from 'next/link'
import PaymentSettings from '@/components/PaymentSettings'
import Swal from 'sweetalert2'

export default function AdminPage() {
  const [phone, setPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('usd')
  
  const [rates, setRates] = useState({ usd_rate: 0, eur_rate: 0 })
  const [savingRates, setSavingRates] = useState(false)

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

      // 1. Configuración
      const { data: configData } = await supabase
        .from('app_config')
        .select('usd_rate, eur_rate')
        .eq('id', 1)
        .single()
      
      if (configData) setRates(configData)

      // 2. Tienda
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

      // 3. Productos
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

  // --- LOGICA DE TASAS ---
  const handleRateChange = (key: 'usd_rate' | 'eur_rate', value: string) => {
    setRates(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  const saveRates = async () => {
    setSavingRates(true)
    const { error } = await supabase
        .from('app_config')
        .update({ 
            usd_rate: rates.usd_rate, 
            eur_rate: rates.eur_rate 
        })
        .eq('id', 1)

    if (error) {
        Swal.fire('Error', 'No se pudo actualizar la tasa', 'error')
    } else {
        Swal.fire({
            title: 'Tasas Actualizadas',
            text: 'Todos los precios en Bs se han recalculado.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        })
    }
    setSavingRates(false)
  }

  // --- SUBIDA DE LOGO (REFACTORIZADA) ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !store) return

    // 1. VALIDACIÓN INMEDIATA DE TAMAÑO (UX)
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Archivo muy pesado', 'El logo debe pesar menos de 5MB', 'warning')
        e.target.value = "" // Reset del input
        return
    }

    setUploadingLogo(true)
    try {
        // No necesitamos user.id aquí para el nombre del archivo, 
        // la utilidad genera uno único automáticamente.

        // 2. USAR LA UTILIDAD SEGURA
        // Pasamos 'logos' como la carpeta destino dentro del bucket 'products'
        const publicUrl = await uploadImageToSupabase(supabase, file, 'products', 'logos')

        // 3. ACTUALIZAR BASE DE DATOS
        const { error: dbError } = await supabase
            .from('stores')
            .update({ logo_url: publicUrl })
            .eq('id', store.id)

        if (dbError) throw dbError

        // Actualizar estado local
        setStore({ ...store, logo_url: publicUrl })
        Swal.fire('Logo Actualizado', '', 'success')

    } catch (error: any) {
        console.error(error)
        // El error.message vendrá limpio desde la utilidad si es un error de validación
        Swal.fire('Error', error.message || 'No se pudo subir el logo', 'error')
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
        Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'WhatsApp Guardado', timer: 1500, showConfirmButton: false })
    }
    setSavingPhone(false)
  }

  const toggleCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('stores').update({ currency_type: newCurrency }).eq('user_id', user.id)
  }

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
        title: '¿Borrar producto?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#000',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, borrar'
    })
    
    if (result.isConfirmed) {
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (!error) {
            setProducts(products.filter(p => p.id !== id))
            Swal.fire({ toast: true, icon: 'success', title: 'Borrado', position: 'top-end', showConfirmButton: false, timer: 1000 })
        }
    }
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
                <code className="text-blue-400 text-sm md:text-base break-all cursor-pointer hover:text-blue-300" onClick={() => { navigator.clipboard.writeText(`https://catalogo-center-service.vercel.app/${store?.slug}`); Swal.fire({toast:true, title:'Link copiado', icon:'success', position:'top', showConfirmButton:false, timer:1000}) }}>
                    https://catalogo-center-service.vercel.app/{store?.slug}
                </code>
            </div>
            <a href={`/${store?.slug}`} target="_blank" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap">Ver Tienda ↗</a>
        </div>

        {/* --- GRID DE CONFIGURACIÓN --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. CONTROL CAMBIARIO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 ring-1 ring-orange-50">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                        <RefreshCw size={14}/> Tasas Oficiales (Bs)
                    </h2>
                    <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded-full">Actualizar Diario</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dólar BCV</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={rates.usd_rate}
                                onChange={(e) => handleRateChange('usd_rate', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-orange-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Euro BCV</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 font-bold">€</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={rates.eur_rate}
                                onChange={(e) => handleRateChange('eur_rate', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-orange-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={saveRates} 
                    disabled={savingRates}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                    {savingRates ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} 
                    Actualizar Tasas
                </button>
            </div>

            {/* 2. CONFIGURACIÓN VISUAL (LOGO Y MONEDA) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6">
                 {/* Logo */}
                 <div className="flex items-center gap-4">
                    <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-black overflow-hidden relative group flex-shrink-0"
                    >
                        {store?.logo_url ? (
                            <img src={store.logo_url} className="w-full h-full object-cover" />
                        ) : (
                            <Upload className="text-gray-300 group-hover:text-black" size={20} />
                        )}
                        {uploadingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin" size={20}/></div>}
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-gray-900 mb-1">Logo de la Tienda</h2>
                        <p className="text-xs text-gray-400 mb-2">Se mostrará en WhatsApp</p>
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        <button onClick={() => logoInputRef.current?.click()} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold transition">Cambiar</button>
                    </div>
                 </div>
                 
                 <div className="h-px bg-gray-100 w-full"></div>

                 {/* Moneda */}
                 <div>
                     <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Moneda Principal</h2>
                     <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <button onClick={() => toggleCurrency('usd')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${currency === 'usd' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>USD ($)</button>
                        <button onClick={() => toggleCurrency('eur')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${currency === 'eur' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>EUR (€)</button>
                    </div>
                 </div>
            </div>

            {/* 3. WHATSAPP CARD */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">WhatsApp Pedidos</h2>
                <div className="flex gap-2">
                    <input type="number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 58412..." className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-black text-sm font-medium"/>
                    <button onClick={savePhone} disabled={savingPhone} className="bg-black text-white px-4 rounded-lg text-xs font-bold hover:bg-gray-800 transition-all">{savingPhone ? '...' : 'OK'}</button>
                </div>
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