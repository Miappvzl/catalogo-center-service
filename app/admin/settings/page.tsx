'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, Phone, Globe, Store, Upload, AlertTriangle, Percent, Receipt, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import Swal from 'sweetalert2'
import { motion } from 'framer-motion'

import PaymentSettings from '@/components/admin/PaymentSettings'
import ShippingSettings from '@/components/admin/ShippingSettings'
import AdminHeader from '@/components/admin/AdminHeader'
import SecuritySettings from '@/components/admin/SecuritySettings'
import PushNotificationManager from '@/components/admin/PushNotificationManager'

// --- COMPONENTE TOGGLE ANIMADO (Soft UI) ---
const AnimatedSwitch = ({ active, activeColor = 'bg-black' }: { active: boolean, activeColor?: string }) => (
  <div className={`w-11 h-6 rounded-full border flex items-center px-1 shrink-0 transition-colors duration-300 ${active ? `${activeColor} border-transparent justify-end shadow-subtle` : 'bg-white border-gray-200 justify-start shadow-sm'}`}>
      <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full ${active ? 'bg-white' : 'bg-gray-300'}`}/>
  </div>
)

export default function SettingsPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<any>(null)
  
  // Estados de Configuración
  const [identity, setIdentity] = useState({ phone: '', name: '', hero_url: '' })
  const [wholesale, setWholesale] = useState({ active: false, min_items: 6, discount_percentage: 15 })
  const [receipt, setReceipt] = useState({ strict_mode: false })
  
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('stores').select('*').eq('user_id', user.id).single()
      if (data) {
        setStore(data)
        setIdentity({ phone: data.phone || '', name: data.name, hero_url: data.hero_url || '' })
        setWholesale(data.wholesale_config || { active: false, min_items: 6, discount_percentage: 15 })
        setReceipt(data.receipt_config || { strict_mode: false })
      }
      setLoading(false)
    }
    fetchSettings()
  }, [supabase])

  const handleIdentityChange = (field: string, value: string) => {
      const finalValue = field === 'phone' ? value.replace(/\D/g, '') : value
      setIdentity(prev => ({ ...prev, [field]: finalValue }))
      setIsDirty(true)
  }

  const handleWholesaleChange = (field: string, value: any) => {
      setWholesale(prev => ({ ...prev, [field]: value }))
      setIsDirty(true)
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

  const saveSettings = async () => {
    if (!isDirty) return
    setSaving(true)
    
    const { error } = await supabase
        .from('stores')
        .update({ 
            phone: identity.phone, 
            name: identity.name,
            wholesale_config: wholesale,
            receipt_config: receipt
        })
        .eq('id', store.id)

    setSaving(false)

    if (error) {
        Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
    } else {
        setIsDirty(false)
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
            customClass: { popup: 'bg-black text-white rounded-xl text-sm font-bold' }
        })
        Toast.fire({ icon: 'success', title: 'Configuración Guardada' })
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={32}/></div>

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="pb-32 font-sans text-gray-900 bg-[#F6F6F6] min-h-screen">
      <AdminHeader store={store} title="Configuración" />

      <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-6 md:space-y-8 mt-6 md:mt-8">
        
        {/* SECCIÓN 1: IDENTIDAD Y REGLAS DE NEGOCIO */}
        <div className="space-y-6">
            <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive">
                <div className="mb-6">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Globe size={20} className="text-black"/> Identidad de Marca</h3>
                    <p className="text-sm text-gray-500 mt-1">La información pública que verán tus clientes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1"><Store size={12}/> Nombre de la Tienda</label>
                        <input 
                            value={identity.name} 
                            onChange={e => handleIdentityChange('name', e.target.value)} 
                            className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-bold text-gray-900 focus:bg-white focus:border-black focus:shadow-subtle outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1"><Phone size={12}/> WhatsApp Oficial</label>
                        <input 
                            type="tel" 
                            inputMode="numeric" 
                            value={identity.phone} 
                            onChange={e => handleIdentityChange('phone', e.target.value.replace(/[^0-9]/g, ''))} 
                            placeholder="Ej: 584120000000" 
                            className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-mono font-medium text-gray-900 focus:bg-white focus:border-black focus:shadow-subtle outline-none transition-all"
                        />
                    </div>
                </div>

                {/* HERO UPLOAD */}
                <div className="border-t border-gray-100 pt-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"> Banner Principal (Hero)</label>
                    <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={handleHeroUpload}/>
                    
                    {identity.hero_url ? (
                        <div className="relative w-full h-40 md:h-48 rounded-[var(--radius-card)] overflow-hidden group border border-transparent hover:border-black transition-colors cursor-pointer" onClick={() => heroInputRef.current?.click()}>
                            <img src={identity.hero_url} className="w-full h-full object-cover" alt="Hero Banner" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="bg-white text-black px-4 py-2.5 rounded-full text-xs font-bold shadow-subtle hover:scale-105 transition-all flex items-center gap-2">
                                    {uploadingHero ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14}/>} Cambiar Banner
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div onClick={() => heroInputRef.current?.click()} className={`w-full h-32 rounded-[var(--radius-card)] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${uploadingHero ? 'border-gray-300 animate-pulse bg-gray-50' : 'border-gray-200 hover:border-black bg-gray-50 hover:bg-white'}`}>
                            {uploadingHero ? <Loader2 className="animate-spin text-gray-400 mb-2" size={24}/> : <Upload className="text-gray-400 mb-2" size={24}/>}
                            <span className="text-xs font-bold text-gray-900">Subir un Banner (1920x1080px)</span>
                        </div>
                    )}
                </div>
            </section>

            {/* REGLAS DE NEGOCIO */}
            <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive">
                <div className="mb-6">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Percent size={20} className="text-black"/> Reglas de Negocio</h3>
                    <p className="text-sm text-gray-500 mt-1">Gamifica tus ventas y asegura tus pagos.</p>
                </div>

                {/* Mayorista Gamificado */}
                <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] mb-6 border border-transparent">
                    <div 
                        className="flex items-center justify-between mb-4 cursor-pointer active:scale-[0.99] transition-transform"
                        onClick={() => handleWholesaleChange('active', !wholesale.active)}
                    >
                        <div>
                            <p className="font-bold text-gray-900 text-sm">Descuento Mayorista Automático</p>
                            <p className="text-xs text-gray-500 mt-0.5 pr-4">Aplica un descuento global a toda la orden si superan X piezas.</p>
                        </div>
                        <AnimatedSwitch active={wholesale.active} />
                    </div>

                    {wholesale.active && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-4 border-t border-gray-100">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Piezas Mínimas</label>
                                <input 
                                    type="number" 
                                    value={wholesale.min_items} 
                                    onChange={(e) => handleWholesaleChange('min_items', Number(e.target.value))} 
                                    className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] px-3 py-2.5 font-bold outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">% Descuento</label>
                                <input 
                                    type="number" 
                                    value={wholesale.discount_percentage} 
                                    onChange={(e) => handleWholesaleChange('discount_percentage', Number(e.target.value))} 
                                    className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] px-3 py-2.5 font-bold outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Comprobantes Estrictos */}
                <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] border border-transparent">
                    <div 
                        className="flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                        onClick={() => { setReceipt({ strict_mode: !receipt.strict_mode }); setIsDirty(true) }}
                    >
                        <div className="pr-4">
                            <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><Receipt size={16}/> Comprobante Obligatorio</p>
                            <p className="text-xs text-gray-500 mt-1">El cliente NO podrá enviar el pedido a WhatsApp sin subir una captura del pago.</p>
                        </div>
                        <AnimatedSwitch active={receipt.strict_mode} />
                    </div>
                </div>

                {/* BOTÓN DE GUARDADO LOCAL */}
                <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isDirty ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {isDirty ? (
                            <>
                                <AlertTriangle size={14} strokeWidth={2.5} />
                                <span>Tienes cambios sin guardar aquí.</span>
                            </>
                        ) : (
                            <span>Todo guardado correctamente.</span>
                        )}
                    </div>
                    <button 
                        onClick={saveSettings} 
                        disabled={saving || !isDirty} 
                        className={`w-full sm:w-auto px-6 py-3 rounded-[var(--radius-btn)] text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            isDirty 
                                ? 'bg-black text-white hover:bg-gray-800 shadow-subtle active:scale-95' 
                                : 'bg-gray-50 border border-transparent text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                        Guardar Identidad y Reglas
                    </button>
                </div>
            </section>
        </div>

        {/* MODULOS INDEPENDIENTES */}
        <PaymentSettings storeId={store.id} initialData={store.payment_config} />
        <ShippingSettings storeId={store.id} initialData={store.shipping_config} />
        
{/* SEGURIDAD DE LA CUENTA */}
<PushNotificationManager storeId={store.id} />
        <SecuritySettings />
        

        <button 
                    onClick={handleLogout} 
                    className="flex items-center justify-center gap-3 px-4 py-3  rounded-[var(--radius-btn)] text-[0.9rem] font-bold bg-white active:bg-red-50 active:text-red-700  text-red-500 hover:bg-red-50 hover:text-red-700 transition-all w-full text-left"
                >
                    <LogOut size={18} /> Cerrar Sesión
                </button>
      </div>
    </div>
  )
}