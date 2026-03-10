'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, Phone, Globe, Store, Image as ImageIcon, Upload, AlertTriangle } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import Swal from 'sweetalert2'

import PaymentSettings from '@/components/admin/PaymentSettings'
import ShippingSettings from '@/components/admin/ShippingSettings'
import AdminHeader from '@/components/admin/AdminHeader'

export default function SettingsPage() {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<any>(null)
  
  const [identity, setIdentity] = useState({ phone: '', name: '', hero_url: '' })
  const [isIdentityDirty, setIsIdentityDirty] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .single()
        
      if (data) {
        setStore(data)
        setIdentity({ phone: data.phone || '', name: data.name, hero_url: data.hero_url || '' })
      }
      setLoading(false)
    }
    fetchSettings()
  }, [supabase])

  const handleIdentityChange = (field: string, value: string) => {
      // Si es teléfono, forzamos que solo sean números para evitar romper la URL de WhatsApp
      const finalValue = field === 'phone' ? value.replace(/\D/g, '') : value
      setIdentity(prev => ({ ...prev, [field]: finalValue }))
      setIsIdentityDirty(true)
  }

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo imágenes', 'error')

      setUploadingHero(true)
      try {
          const compressedFile = await compressImage(file, 1920, 0.8)
          const fileName = `hero-${store.id}-${Date.now()}.jpg`
          
          const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, compressedFile)
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
          
          setIdentity(prev => ({ ...prev, hero_url: publicUrl }))
          
          await supabase.from('stores').update({ hero_url: publicUrl }).eq('id', store.id)
          
      } catch (error) {
          Swal.fire('Error', 'No se pudo subir la imagen', 'error')
      } finally {
          setUploadingHero(false)
          if (heroInputRef.current) heroInputRef.current.value = ''
      }
  }

  const saveIdentity = async () => {
    if (!isIdentityDirty) return
    setSavingIdentity(true)

    const { error } = await supabase
        .from('stores')
        .update({ phone: identity.phone, name: identity.name })
        .eq('id', store.id)
        
    setSavingIdentity(false)
    
    if (error) {
        Swal.fire('Error', 'No se pudo guardar la identidad', 'error')
    } else {
        setIsIdentityDirty(false)
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
            customClass: { popup: 'bg-black text-white rounded-xl text-sm font-bold' }
        })
        Toast.fire({ icon: 'success', title: 'Identidad Guardada' })
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={32}/></div>

  return (
    <div className="pb-20 font-sans text-gray-900 bg-gray-50 min-h-screen">
      <AdminHeader store={store} title="Configuración" />
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-6 md:space-y-8 mt-6 md:mt-8">
        
        {/* SECCIÓN IDENTIDAD & APARIENCIA */}
        <section className="bg-white p-4 md:p-8 rounded-2xl border border-gray-200 flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Globe size={20} className="text-black"/> Identidad de Marca
                </h3>
                <p className="text-sm text-gray-500 mt-1">La información pública que verán tus clientes.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1">
                        <Store size={12}/> Nombre de la Tienda
                    </label>
                    <input 
                        value={identity.name} 
                        onChange={e => handleIdentityChange('name', e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-1 focus:ring-black focus:bg-white outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1">
                        <Phone size={12}/> WhatsApp Oficial
                    </label>
                    <input 
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={identity.phone} 
                        onChange={e => {
                            // Bloqueo estricto en tiempo real: elimina cualquier cosa que no sea del 0 al 9
                            const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
                            handleIdentityChange('phone', onlyNumbers);
                        }} 
                        placeholder="Ej: 584120000000" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono font-medium text-gray-900 focus:ring-1 focus:ring-black focus:bg-white outline-none transition-all"
                    />
                    <p className="text-[9px] font-bold text-gray-400 mt-2 ml-1 tracking-wide">
                        SOLO NÚMEROS (Ej: 58412...)
                    </p>
                </div>
            </div>

            {/* SECCIÓN HERO BANNER */}
            <div className="border-t border-gray-100 pt-6">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <ImageIcon size={12}/> Banner Principal (Hero)
                </label>
                <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={handleHeroUpload}/>
                
                {identity.hero_url ? (
                    <div className="relative w-full h-40 md:h-48 rounded-xl overflow-hidden group border border-gray-200">
                        <img src={identity.hero_url} className="w-full h-full object-cover" alt="Hero Banner" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => heroInputRef.current?.click()} className="bg-white text-black px-4 py-2.5 rounded-full text-xs font-bold hover:scale-105 border border-transparent hover:border-gray-200 transition-all flex items-center gap-2">
                                {uploadingHero ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>} Cambiar Banner
                            </button>
                        </div>
                    </div>
                ) : (
                    <div onClick={() => heroInputRef.current?.click()} className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${uploadingHero ? 'border-gray-300 animate-pulse bg-gray-50' : 'border-gray-200 hover:border-black bg-gray-50 hover:bg-gray-100'}`}>
                        {uploadingHero ? (
                            <Loader2 className="animate-spin text-gray-400 mb-2" size={24}/>
                        ) : (
                            <Upload className="text-gray-400 mb-2" size={24}/>
                        )}
                        <span className="text-xs font-bold text-gray-900">Haz clic para subir un Banner</span>
                        <span className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-widest">Recomendado: 1920x1080px</span>
                    </div>
                )}
            </div>

            {/* FOOTER DE ACCIÓN ESTANDARIZADO */}
            <div className="mt-8 pt-5 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isIdentityDirty ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {isIdentityDirty ? (
                        <>
                            <AlertTriangle size={14} strokeWidth={2.5} />
                            <span>Tienes cambios sin guardar.</span>
                        </>
                    ) : (
                        <span>Todos los cambios están guardados.</span>
                    )}
                </div>
                <button 
                    onClick={saveIdentity} 
                    disabled={savingIdentity || !isIdentityDirty} 
                    className={`w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        isIdentityDirty 
                            ? 'bg-black text-white hover:bg-gray-800 active:scale-95' 
                            : 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {savingIdentity ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                    Guardar Identidad
                </button>
            </div>
        </section>

        <PaymentSettings storeId={store.id} initialData={store.payment_config} />
        {/* INYECTAMOS INITIAL DATA PARA EVITAR DOBLE LECTURA EN BASE DE DATOS */}
        <ShippingSettings storeId={store.id} initialData={store.shipping_config} />
        
      </div>
    </div>
  )
}