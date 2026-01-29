'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Save, Smartphone, Banknote, Bitcoin, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'

// CAMBIO: Ahora recibimos storeId en lugar de userId
export default function PaymentSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  
  const defaultMethods = {
    pago_movil: { active: false, bank: '', phone: '', id: '' },
    zelle: { active: false, email: '', holder: '' },
    cash: { active: true, info: '' },
    binance: { active: false, email: '' }
  }

  const [methods, setMethods] = useState({
    ...defaultMethods,
    ...(initialData || {}),
    pago_movil: { ...defaultMethods.pago_movil, ...(initialData?.pago_movil || {}) },
    zelle: { ...defaultMethods.zelle, ...(initialData?.zelle || {}) },
    cash: { ...defaultMethods.cash, ...(initialData?.cash || {}) },
    binance: { ...defaultMethods.binance, ...(initialData?.binance || {}) },
  })
  
  const [saving, setSaving] = useState(false)

  // Cliente Supabase Autenticado (Igual que en ShippingSettings)
  const supabase = getSupabase()
  const handleChange = (method: string, field: string, value: any) => {
    setMethods((prev: any) => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    if (!storeId) return
    setSaving(true)
    
    console.log("Guardando Pagos para tienda:", storeId);

    // GUARDAMOS USANDO storeId (No user_id)
    const { error } = await supabase
      .from('stores')
      .update({ payment_methods: methods })
      .eq('id', storeId) // <--- CRUCIAL

    setSaving(false)

    if (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
    } else {
      const Toast = Swal.mixin({
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
          customClass: { popup: 'bg-black text-white' }
       })
       Toast.fire({ icon: 'success', title: 'Métodos de Pago Actualizados' })
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Banknote size={20} /> Métodos de Pago
          </h3>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
          >
             {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
             Guardar
          </button>
      </div>

      <div className="space-y-4">
        
        {/* PAGO MÓVIL */}
        <div className={`p-5 rounded-xl border transition-all ${methods.pago_movil?.active ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <Smartphone size={18} className="text-green-600"/> Pago Móvil
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.pago_movil?.active || false} onChange={(e) => handleChange('pago_movil', 'active', e.target.checked)} />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          {methods.pago_movil?.active && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in">
              <input placeholder="Banco (Ej: Banesco)" value={methods.pago_movil.bank || ''} onChange={e => handleChange('pago_movil', 'bank', e.target.value)} className="input-elite" />
              <input placeholder="Teléfono (0414...)" value={methods.pago_movil.phone || ''} onChange={e => handleChange('pago_movil', 'phone', e.target.value)} className="input-elite" />
              <input placeholder="Cédula (V-123...)" value={methods.pago_movil.id || ''} onChange={e => handleChange('pago_movil', 'id', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

        {/* ZELLE */}
        <div className={`p-5 rounded-xl border transition-all ${methods.zelle?.active ? 'border-purple-500 bg-purple-50' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <span className="text-purple-600 font-serif font-black italic text-lg">Z</span> Zelle
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.zelle?.active || false} onChange={(e) => handleChange('zelle', 'active', e.target.checked)} />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {methods.zelle?.active && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in">
              <input placeholder="Correo Zelle" value={methods.zelle.email || ''} onChange={e => handleChange('zelle', 'email', e.target.value)} className="input-elite" />
              <input placeholder="Nombre del Titular" value={methods.zelle.holder || ''} onChange={e => handleChange('zelle', 'holder', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

        {/* BINANCE */}
        <div className={`p-5 rounded-xl border transition-all ${methods.binance?.active ? 'border-yellow-500 bg-yellow-50' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2 font-bold text-gray-800">
                <Bitcoin size={18} className="text-yellow-600"/> Binance Pay
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.binance?.active || false} onChange={(e) => handleChange('binance', 'active', e.target.checked)} />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>
           {methods.binance?.active && (
            <div className="animate-in fade-in">
              <input placeholder="Email o Pay ID" value={methods.binance.email || ''} onChange={e => handleChange('binance', 'email', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

        {/* EFECTIVO */}
        <div className={`p-5 rounded-xl border transition-all ${methods.cash?.active ? 'border-green-800 bg-green-50' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <Banknote size={18} className="text-green-800"/> Efectivo / Divisas
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.cash?.active || false} onChange={(e) => handleChange('cash', 'active', e.target.checked)} />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-800"></div>
            </label>
          </div>
          {methods.cash?.active && (
            <div className="animate-in fade-in">
                 <input placeholder="Instrucciones (Ej: Pagar al retirar)" value={methods.cash.info || ''} onChange={e => handleChange('cash', 'info', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

      </div>
      <style jsx global>{`
        .input-elite {
            @apply w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder:text-gray-400;
        }
      `}</style>
    </div>
  )
}