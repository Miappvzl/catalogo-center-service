'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Save, Smartphone, Banknote, Bitcoin, Loader2, DollarSign, CreditCard, AlertTriangle } from 'lucide-react'
import Swal from 'sweetalert2'
import { motion } from 'framer-motion'

// --- COMPONENTE TOGGLE ANIMADO (Soft UI) ---
const AnimatedSwitch = ({ active, activeColor = 'bg-black' }: { active: boolean, activeColor?: string }) => (
  <div className={`w-11 h-6 rounded-full border flex items-center px-1 shrink-0 transition-colors duration-300 ${active ? `${activeColor} border-transparent justify-end shadow-subtle` : 'bg-white border-gray-200 justify-start shadow-sm'}`}>
      <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full ${active ? 'bg-white' : 'bg-gray-300'}`}/>
  </div>
)

export default function PaymentSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  const supabase = getSupabase()
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false) 
  
  const [methods, setMethods] = useState({
    pago_movil: { active: false, details: '', ...initialData?.pago_movil },
    zelle: { active: false, details: '', ...initialData?.zelle },
    binance: { active: false, details: '', ...initialData?.binance },
    cash: { active: false, details: '', ...initialData?.cash },
    zinli: { active: false, details: '', ...initialData?.zinli }
  })

  const handleChange = (method: string, field: string, value: any) => {
    setIsDirty(true) 
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
      setIsDirty(false)
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, customClass: { popup: 'bg-black text-white rounded-xl text-sm font-bold' } })
      Toast.fire({ icon: 'success', title: 'Pagos Actualizados' })
    }
  }

  return (
    <div className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex flex-col h-full">
      <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CreditCard size={20} /> Métodos de Pago
          </h3>
          <p className="text-sm text-gray-500 mt-1">Configura las cuentas donde recibirás el dinero.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* PAGO MÓVIL */}
        <div className={`p-4 rounded-[var(--radius-card)] border transition-all duration-300 ${methods.pago_movil.active ? 'border-transparent bg-[#b6d8ff]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div 
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('pago_movil', 'active', !methods.pago_movil.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.pago_movil.active ? 'text-gray-900' : 'text-gray-500'}`}>
              <Smartphone size={18} className={methods.pago_movil.active ? "text-blue-600" : "text-gray-400"}/> Pago Móvil
            </div>
            <AnimatedSwitch active={methods.pago_movil.active} activeColor="bg-blue-500" />
          </div>
          {methods.pago_movil.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Ej: 0412-1234567, CI 123456, Banesco" 
                 value={methods.pago_movil.details} 
                 onChange={e => handleChange('pago_movil', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-[var(--radius-btn)] border border-transparent focus:bg-white focus:border-blue-500 focus:shadow-subtle outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>

        {/* ZELLE */}
        <div className={`p-4 rounded-[var(--radius-card)] border transition-all duration-300 ${methods.zelle.active ? 'border-transparent bg-[#e5c6ff]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div 
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('zelle', 'active', !methods.zelle.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.zelle.active ? 'text-gray-900' : 'text-gray-500'}`}>
              <DollarSign size={18} className={methods.zelle.active ? "text-purple-600" : "text-gray-400"}/> Zelle
            </div>
            <AnimatedSwitch active={methods.zelle.active} activeColor="bg-purple-500" />
          </div>
          {methods.zelle.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Correo Zelle (Titular)" 
                 value={methods.zelle.details} 
                 onChange={e => handleChange('zelle', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-[var(--radius-btn)] border border-transparent focus:bg-white focus:border-purple-500 focus:shadow-subtle outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>

        {/* BINANCE */}
        <div className={`p-4 rounded-[var(--radius-card)] border transition-all duration-300 ${methods.binance.active ? 'border-transparent bg-[#fff369de]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div 
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('binance', 'active', !methods.binance.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.binance.active ? 'text-gray-900' : 'text-gray-500'}`}>
              <Bitcoin size={18} className={methods.binance.active ? "text-yellow-600" : "text-gray-400"}/> Binance
            </div>
            <AnimatedSwitch active={methods.binance.active} activeColor="bg-yellow-500" />
          </div>
          {methods.binance.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Email o Pay ID" 
                 value={methods.binance.details} 
                 onChange={e => handleChange('binance', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-[var(--radius-btn)] border border-transparent focus:bg-white focus:border-yellow-500 focus:shadow-subtle outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>

        {/* CASH */}
        <div className={`p-4 rounded-[var(--radius-card)] border transition-all duration-300 ${methods.cash.active ? 'border-transparent bg-[#00ff008a]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div 
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('cash', 'active', !methods.cash.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.cash.active ? 'text-gray-900' : 'text-gray-500'}`}>
              <Banknote size={18} className={methods.cash.active ? "text-green-700" : "text-gray-400"}/> Efectivo
            </div>
            <AnimatedSwitch active={methods.cash.active} activeColor="bg-green-500" />
          </div>
          {methods.cash.active && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
               <input 
                 placeholder="Instrucciones (Ej: Solo billetes en buen estado)" 
                 value={methods.cash.details} 
                 onChange={e => handleChange('cash', 'details', e.target.value)} 
                 className="w-full text-sm p-3 rounded-[var(--radius-btn)] border border-transparent focus:bg-white focus:border-green-600 focus:shadow-subtle outline-none bg-white transition-all"
               />
             </div>
          )}
        </div>
      </div>

      {/* FOOTER DE ACCIÓN */}
      <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
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
          className={`w-full sm:w-auto px-6 py-3 rounded-[var(--radius-btn)] text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            isDirty 
              ? 'bg-black text-white hover:bg-gray-800 shadow-subtle active:scale-95' 
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}