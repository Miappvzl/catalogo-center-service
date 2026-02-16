'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Save, Smartphone, Banknote, Bitcoin, Loader2, DollarSign, CreditCard } from 'lucide-react'
import Swal from 'sweetalert2'

export default function PaymentSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  const supabase = getSupabase()
  const [saving, setSaving] = useState(false)

  // Inicializar estado respetando tu estructura original
  const [methods, setMethods] = useState({
    pago_movil: { active: false, details: '', ...initialData?.pago_movil },
    zelle: { active: false, details: '', ...initialData?.zelle },
    binance: { active: false, details: '', ...initialData?.binance },
    cash: { active: false, details: '', ...initialData?.cash },
    zinli: { active: false, details: '', ...initialData?.zinli }
  })

  // Helper para actualizar estado (Misma lógica que tenías)
  const handleChange = (method: string, field: string, value: any) => {
    setMethods(prev => ({
      ...prev,
      [method]: { ...prev[method as keyof typeof prev], [field]: value }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Guardamos directamento en 'payment_config' como lo hace tu sistema actual
    const { error } = await supabase
      .from('stores')
      .update({ payment_config: methods })
      .eq('id', storeId)

    setSaving(false)

    if (error) {
      Swal.fire('Error', 'No se pudo guardar', 'error')
    } else {
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, customClass: { popup: 'bg-black text-white' } })
      Toast.fire({ icon: 'success', title: 'Pagos Actualizados' })
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CreditCard size={20} /> Métodos de Pago
          </h3>
          <button onClick={handleSave} disabled={saving} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-all">
             {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* PAGO MÓVIL */}
        <div className={`p-4 rounded-xl border-2 transition-all ${methods.pago_movil.active ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800"><Smartphone size={18} className="text-blue-600"/> Pago Móvil</div>
            <input type="checkbox" checked={methods.pago_movil.active} onChange={(e) => handleChange('pago_movil', 'active', e.target.checked)} className="accent-black w-5 h-5"/>
          </div>
          {methods.pago_movil.active && (
             <input 
                placeholder="Ej: 0412-1234567, CI 123456, Banesco" 
                value={methods.pago_movil.details} 
                onChange={e => handleChange('pago_movil', 'details', e.target.value)} 
                className="w-full text-sm p-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none"
             />
          )}
        </div>

        {/* ZELLE */}
        <div className={`p-4 rounded-xl border-2 transition-all ${methods.zelle.active ? 'border-purple-500 bg-purple-50/30' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800"><DollarSign size={18} className="text-purple-600"/> Zelle</div>
            <input type="checkbox" checked={methods.zelle.active} onChange={(e) => handleChange('zelle', 'active', e.target.checked)} className="accent-black w-5 h-5"/>
          </div>
          {methods.zelle.active && (
             <input 
                placeholder="Correo Zelle (Titular)" 
                value={methods.zelle.details} 
                onChange={e => handleChange('zelle', 'details', e.target.value)} 
                className="w-full text-sm p-2 rounded-lg border border-gray-200 focus:border-purple-500 outline-none"
             />
          )}
        </div>

        {/* BINANCE */}
        <div className={`p-4 rounded-xl border-2 transition-all ${methods.binance.active ? 'border-yellow-500 bg-yellow-50/30' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800"><Bitcoin size={18} className="text-yellow-600"/> Binance</div>
            <input type="checkbox" checked={methods.binance.active} onChange={(e) => handleChange('binance', 'active', e.target.checked)} className="accent-black w-5 h-5"/>
          </div>
          {methods.binance.active && (
             <input 
                placeholder="Email o Pay ID" 
                value={methods.binance.details} 
                onChange={e => handleChange('binance', 'details', e.target.value)} 
                className="w-full text-sm p-2 rounded-lg border border-gray-200 focus:border-yellow-500 outline-none"
             />
          )}
        </div>

        {/* CASH */}
        <div className={`p-4 rounded-xl border-2 transition-all ${methods.cash.active ? 'border-green-600 bg-green-50/30' : 'border-gray-100 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800"><Banknote size={18} className="text-green-700"/> Efectivo</div>
            <input type="checkbox" checked={methods.cash.active} onChange={(e) => handleChange('cash', 'active', e.target.checked)} className="accent-black w-5 h-5"/>
          </div>
          {methods.cash.active && (
             <input 
                placeholder="Instrucciones (Ej: Solo billetes buen estado)" 
                value={methods.cash.details} 
                onChange={e => handleChange('cash', 'details', e.target.value)} 
                className="w-full text-sm p-2 rounded-lg border border-gray-200 focus:border-green-600 outline-none"
             />
          )}
        </div>
        
      </div>
    </div>
  )
}