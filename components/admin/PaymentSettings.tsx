'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Save, Smartphone, Banknote, Bitcoin, Loader2, DollarSign, CreditCard, AlertTriangle } from 'lucide-react'
import Swal from 'sweetalert2'

// --- COMPONENTE TOGGLE (Minimalista y fluido) ---
const ToggleSwitch = ({ checked, onChange, activeColor }: { checked: boolean, onChange: (v: boolean) => void, activeColor: string }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? activeColor : 'bg-gray-200'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
)

export default function PaymentSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  const supabase = getSupabase()
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false) // Nuevo estado para rastrear cambios

  const [methods, setMethods] = useState({
    pago_movil: { active: false, details: '', ...initialData?.pago_movil },
    zelle: { active: false, details: '', ...initialData?.zelle },
    binance: { active: false, details: '', ...initialData?.binance },
    cash: { active: false, details: '', ...initialData?.cash },
    zinli: { active: false, details: '', ...initialData?.zinli }
  })

  const handleChange = (method: string, field: string, value: any) => {
    setIsDirty(true) // Activamos el aviso de "cambios sin guardar"
    setMethods(prev => ({
      ...prev,
      [method]: { ...prev[method as keyof typeof prev], [field]: value }
    }))
  }

  const handleSave = async () => {
    if (!isDirty) return

    setSaving(true)
    const { error } = await supabase
      .from('stores')
      .update({ payment_config: methods })
      .eq('id', storeId)

    setSaving(false)

    if (error) {
      Swal.fire('Error', 'No se pudo guardar', 'error')
    } else {
      setIsDirty(false) // Reseteamos el estado porque ya guardamos
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, customClass: { popup: 'bg-black text-white rounded-xl text-sm font-bold' } })
      Toast.fire({ icon: 'success', title: 'Pagos Actualizados' })
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col h-full">
      <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CreditCard size={20} /> Métodos de Pago
          </h3>
          <p className="text-sm text-gray-500 mt-1">Configura las cuentas donde recibirás el dinero.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        
        {/* PAGO MÓVIL */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.pago_movil.active ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800">
              <Smartphone size={18} className="text-blue-600"/> Pago Móvil
            </div>
            <ToggleSwitch 
              checked={methods.pago_movil.active} 
              onChange={(v) => handleChange('pago_movil', 'active', v)} 
              activeColor="bg-blue-500" 
            />
          </div>
          {methods.pago_movil.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Ej: 0412-1234567, CI 123456, Banesco" 
                 value={methods.pago_movil.details} 
                 onChange={e => handleChange('pago_movil', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>

        {/* ZELLE */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.zelle.active ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800">
              <DollarSign size={18} className="text-purple-600"/> Zelle
            </div>
            <ToggleSwitch 
              checked={methods.zelle.active} 
              onChange={(v) => handleChange('zelle', 'active', v)} 
              activeColor="bg-purple-500" 
            />
          </div>
          {methods.zelle.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Correo Zelle (Titular)" 
                 value={methods.zelle.details} 
                 onChange={e => handleChange('zelle', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-xl border border-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>

        {/* BINANCE */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.binance.active ? 'border-yellow-300 bg-yellow-50/50' : 'border-gray-200 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800">
              <Bitcoin size={18} className="text-yellow-600"/> Binance
            </div>
            <ToggleSwitch 
              checked={methods.binance.active} 
              onChange={(v) => handleChange('binance', 'active', v)} 
              activeColor="bg-yellow-500" 
            />
          </div>
          {methods.binance.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Email o Pay ID" 
                 value={methods.binance.details} 
                 onChange={e => handleChange('binance', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-xl border border-yellow-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>

        {/* CASH */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.cash.active ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-white'}`}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-gray-800">
              <Banknote size={18} className="text-green-700"/> Efectivo
            </div>
            <ToggleSwitch 
              checked={methods.cash.active} 
              onChange={(v) => handleChange('cash', 'active', v)} 
              activeColor="bg-green-500" 
            />
          </div>
          {methods.cash.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Instrucciones (Ej: Solo billetes en buen estado)" 
                 value={methods.cash.details} 
                 onChange={e => handleChange('cash', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-xl border border-green-200 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>
        
      </div>

      {/* FOOTER DE ACCIÓN (Estratégico) */}
      <div className="mt-8 pt-5 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
       <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isDirty ? 'text-yellow-600' : 'text-gray-400'}`}>
          {isDirty ? (
            <>
              <AlertTriangle size={14} strokeWidth={2.5} />
              <span>Tienes cambios sin guardar.</span>
            </>
          ) : (
            <span>Todos los cambios están guardados.</span>
          )}
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || !isDirty} 
          className={`w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            isDirty 
              ? 'bg-[#151515] text-white hover:bg-gray-800 active:scale-95' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}