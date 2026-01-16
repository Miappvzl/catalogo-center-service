'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Save, Smartphone, Banknote, Bitcoin } from 'lucide-react'
import Swal from 'sweetalert2'

export default function PaymentSettings({ userId, initialData }: { userId: string, initialData: any }) {
  
  // Valores por defecto para evitar pantallas blancas
  const defaultMethods = {
    pago_movil: { active: false, bank: '', phone: '', id: '' },
    zelle: { active: false, email: '', holder: '' },
    cash: { active: true, info: '' },
    binance: { active: false, email: '' }
  }

  // Mezclamos lo que viene de la BD con los defaults
  const [methods, setMethods] = useState({
    ...defaultMethods,
    ...(initialData || {}),
    pago_movil: { ...defaultMethods.pago_movil, ...(initialData?.pago_movil || {}) },
    zelle: { ...defaultMethods.zelle, ...(initialData?.zelle || {}) },
    cash: { ...defaultMethods.cash, ...(initialData?.cash || {}) },
    binance: { ...defaultMethods.binance, ...(initialData?.binance || {}) },
  })
  
  const [saving, setSaving] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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
    setSaving(true)
    
    // GUARDAMOS EN TABLA 'STORES' (Columna payment_methods)
    const { error } = await supabase
      .from('stores')
      .update({ payment_methods: methods })
      .eq('user_id', userId) // Buscamos la tienda de este usuario

    if (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
    } else {
      Swal.fire({
        title: '¡Guardado!',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      })
    }
    setSaving(false)
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm mt-6">
      <div className="space-y-6">
        
        {/* PAGO MÓVIL */}
        <div className={`p-5 rounded-2xl border transition-all ${methods.pago_movil?.active ? 'border-green-500 bg-green-50/30' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <Smartphone size={20} className="text-green-600"/> Pago Móvil
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.pago_movil?.active || false} onChange={(e) => handleChange('pago_movil', 'active', e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          {methods.pago_movil?.active && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-2">
              <input placeholder="Banco" value={methods.pago_movil.bank || ''} onChange={e => handleChange('pago_movil', 'bank', e.target.value)} className="input-elite" />
              <input placeholder="Teléfono" value={methods.pago_movil.phone || ''} onChange={e => handleChange('pago_movil', 'phone', e.target.value)} className="input-elite" />
              <input placeholder="Cédula" value={methods.pago_movil.id || ''} onChange={e => handleChange('pago_movil', 'id', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

        {/* ZELLE */}
        <div className={`p-5 rounded-2xl border transition-all ${methods.zelle?.active ? 'border-purple-500 bg-purple-50/30' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <span className="text-purple-600 font-serif font-black italic text-lg">Z</span> Zelle
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.zelle?.active || false} onChange={(e) => handleChange('zelle', 'active', e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          {methods.zelle?.active && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2">
              <input placeholder="Correo Zelle" value={methods.zelle.email || ''} onChange={e => handleChange('zelle', 'email', e.target.value)} className="input-elite" />
              <input placeholder="Titular" value={methods.zelle.holder || ''} onChange={e => handleChange('zelle', 'holder', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

        {/* BINANCE */}
        <div className={`p-5 rounded-2xl border transition-all ${methods.binance?.active ? 'border-yellow-500 bg-yellow-50/30' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2 font-bold text-gray-800">
                <Bitcoin size={20} className="text-yellow-600"/> Binance Pay
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.binance?.active || false} onChange={(e) => handleChange('binance', 'active', e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>
           {methods.binance?.active && (
            <div className="animate-in slide-in-from-top-2">
              <input placeholder="Email o Pay ID" value={methods.binance.email || ''} onChange={e => handleChange('binance', 'email', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

        {/* EFECTIVO */}
        <div className={`p-5 rounded-2xl border transition-all ${methods.cash?.active ? 'border-green-800 bg-green-100/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <Banknote size={20} className="text-green-800"/> Efectivo / Divisas
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={methods.cash?.active || false} onChange={(e) => handleChange('cash', 'active', e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-800"></div>
            </label>
          </div>
          {methods.cash?.active && (
            <div className="animate-in slide-in-from-top-2">
                 <input placeholder="Instrucciones" value={methods.cash.info || ''} onChange={e => handleChange('cash', 'info', e.target.value)} className="input-elite" />
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 active:scale-95">
           {saving ? 'Guardando...' : <><Save size={18}/> Guardar Configuración</>}
        </button>

      </div>
      <style jsx>{`
        .input-elite { width: 100%; padding: 0.75rem 1rem; background-color: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 500; color: black; transition: all 0.2s; }
        .input-elite:focus { outline: none; border-color: black; box-shadow: 0 0 0 2px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  )
}