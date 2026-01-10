'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { CreditCard, Save, Smartphone, Banknote, Bitcoin } from 'lucide-react'
import Swal from 'sweetalert2'

export default function PaymentSettings({ storeId, initialData }: { storeId: number, initialData: any }) {
  // Aseguramos estructura por defecto si initialData viene vacío o incompleto
  const defaultMethods = {
    pago_movil: { active: false, bank: '', phone: '', id: '' },
    zelle: { active: false, email: '', holder: '' },
    cash: { active: true },
    binance: { active: false, email: '' }
  }

  // Mezclamos initialData con los defaults para evitar undefineds profundos
  const [methods, setMethods] = useState({
    ...defaultMethods,
    ...initialData,
    // Aseguramos que cada objeto interno exista también
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
    const { error } = await supabase
      .from('stores')
      .update({ payment_methods: methods })
      .eq('id', storeId)

    if (error) {
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
    } else {
      Swal.fire({
        title: '¡Guardado!',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    }
    setSaving(false)
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <CreditCard size={20}/> Métodos de Pago Aceptados
      </h2>

      <div className="space-y-6">
        
        {/* PAGO MÓVIL */}
        <div className={`p-4 rounded-xl border transition-all ${methods.pago_movil?.active ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <Smartphone size={18} className="text-blue-600"/> Pago Móvil
            </div>
            <input 
              type="checkbox" 
              checked={methods.pago_movil?.active || false}
              onChange={(e) => handleChange('pago_movil', 'active', e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
          </div>
          
          {methods.pago_movil?.active && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* AGREGA "|| ''" EN TODOS LOS VALUE */}
              <input placeholder="Banco (Ej: Banesco)" value={methods.pago_movil.bank || ''} onChange={e => handleChange('pago_movil', 'bank', e.target.value)} className="input-base" />
              <input placeholder="Teléfono (0412...)" value={methods.pago_movil.phone || ''} onChange={e => handleChange('pago_movil', 'phone', e.target.value)} className="input-base" />
              <input placeholder="Cédula / RIF" value={methods.pago_movil.id || ''} onChange={e => handleChange('pago_movil', 'id', e.target.value)} className="input-base" />
            </div>
          )}
        </div>

        {/* ZELLE */}
        <div className={`p-4 rounded-xl border transition-all ${methods.zelle?.active ? 'border-purple-500 bg-purple-50/50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <span className="text-purple-600 font-serif font-black italic">Z</span> Zelle
            </div>
            <input 
              type="checkbox" 
              checked={methods.zelle?.active || false}
              onChange={(e) => handleChange('zelle', 'active', e.target.checked)}
              className="w-5 h-5 accent-purple-600 cursor-pointer"
            />
          </div>
          {methods.zelle?.active && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* AGREGA "|| ''" EN TODOS LOS VALUE */}
              <input placeholder="Correo Zelle" value={methods.zelle.email || ''} onChange={e => handleChange('zelle', 'email', e.target.value)} className="input-base" />
              <input placeholder="Nombre del Titular" value={methods.zelle.holder || ''} onChange={e => handleChange('zelle', 'holder', e.target.value)} className="input-base" />
            </div>
          )}
        </div>

        {/* EFECTIVO */}
        <div className={`p-4 rounded-xl border transition-all ${methods.cash?.active ? 'border-green-500 bg-green-50/50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <Banknote size={18} className="text-green-600"/> Efectivo / Divisas
            </div>
            <input 
              type="checkbox" 
              checked={methods.cash?.active || false}
              onChange={(e) => handleChange('cash', 'active', e.target.checked)}
              className="w-5 h-5 accent-green-600 cursor-pointer"
            />
          </div>
        </div>

        {/* BINANCE / USDT */}
        <div className={`p-4 rounded-xl border transition-all ${methods.binance?.active ? 'border-yellow-500 bg-yellow-50/50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2 font-bold text-gray-800">
                <Bitcoin size={18} className="text-yellow-600"/> Binance Pay
            </div>
            <input 
              type="checkbox" 
              checked={methods.binance?.active || false}
              onChange={(e) => handleChange('binance', 'active', e.target.checked)}
              className="w-5 h-5 accent-yellow-600 cursor-pointer"
            />
          </div>
           {methods.binance?.active && (
            <div>
              {/* AGREGA "|| ''" EN TODOS LOS VALUE */}
              <input placeholder="Binance Email o Pay ID" value={methods.binance.email || ''} onChange={e => handleChange('binance', 'email', e.target.value)} className="input-base" />
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition flex items-center justify-center gap-2">
           {saving ? 'Guardando...' : <><Save size={18}/> Guardar Configuración de Pagos</>}
        </button>

      </div>
      
      <style jsx>{`
        .input-base {
          width: 100%;
          padding: 0.75rem;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.875rem;
        }
        .input-base:focus {
            outline: none;
            border-color: black;
        }
      `}</style>
    </div>
  )
}