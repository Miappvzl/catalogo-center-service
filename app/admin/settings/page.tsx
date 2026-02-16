'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Phone, Globe, Store } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

// IMPORTAMOS LOS COMPONENTES QUE CONTIENEN LA LÓGICA PESADA
import PaymentSettings from '@/components/admin/PaymentSettings'
import ShippingSettings from '@/components/admin/ShippingSettings'
import AdminHeader from '@/components/admin/AdminHeader'

export default function SettingsPage() {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<any>(null)
  
  // Estado exclusivo para esta página: Identidad de la Tienda
  const [identity, setIdentity] = useState({ phone: '', name: '' })
  const [savingIdentity, setSavingIdentity] = useState(false)

  // Carga inicial de datos
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
        // Pre-llenamos los campos de identidad
        setIdentity({ phone: data.phone || '', name: data.name })
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  // Función para guardar SOLO la identidad (Nombre y WhatsApp)
  const saveIdentity = async () => {
    setSavingIdentity(true)
    const { error } = await supabase
        .from('stores')
        .update({ phone: identity.phone, name: identity.name })
        .eq('id', store.id)
        
    setSavingIdentity(false)
    
    if (error) {
        Swal.fire('Error', 'No se pudo guardar la identidad', 'error')
    } else {
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
            customClass: { popup: 'bg-black text-white' }
        })
        Toast.fire({ icon: 'success', title: 'Identidad Guardada' })
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32}/>
    </div>
  )

  return (
    <div className="pb-20">
      {/* 1. HEADER (Con lógica de cambio de logo incluida) */}
      <AdminHeader store={store} title="Configuración" />
      
      <div className="max-w-4xl mx-auto px-4 md:px-6 space-y-8">
        
        {/* 2. SECCIÓN IDENTIDAD (Gestionada aquí mismo) */}
        <section className="bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Globe size={20} className="text-blue-600"/> Identidad
                </h3>
                <button 
                    onClick={saveIdentity} 
                    disabled={savingIdentity} 
                    className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-black/10 active:scale-95"
                >
                    {savingIdentity ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} 
                    Guardar
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block ml-1 flex items-center gap-1">
                        <Store size={10}/> Nombre de la Tienda
                    </label>
                    <input 
                        value={identity.name} 
                        onChange={e => setIdentity({...identity, name: e.target.value})} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-black focus:bg-white outline-none transition-all shadow-sm"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block ml-1 flex items-center gap-1">
                        <Phone size={10}/> WhatsApp Oficial
                    </label>
                    <input 
                        value={identity.phone} 
                        onChange={e => setIdentity({...identity, phone: e.target.value})} 
                        placeholder="Ej: 58412..." 
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-mono font-medium text-gray-900 focus:border-black focus:bg-white outline-none transition-all shadow-sm"
                    />
                    <p className="text-[9px] text-gray-400 mt-1.5 ml-1">
                        Número donde recibirás los pedidos (Formato: 58...)
                    </p>
                </div>
            </div>
        </section>

        {/* 3. COMPONENTE DE PAGOS (Importado) */}
        {/* Le pasamos la config inicial para que no cargue vacío */}
        <PaymentSettings storeId={store.id} initialData={store.payment_config} />

        {/* 4. COMPONENTE DE ENVÍOS (Importado) */}
        {/* Este componente hace su propio fetch, así que solo necesita el ID */}
        <ShippingSettings storeId={store.id} />
        
      </div>
    </div>
  )
}