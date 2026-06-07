'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Save, Smartphone, Banknote, Bitcoin, Loader2, DollarSign, CreditCard, AlertTriangle, Landmark, Wallet, Zap } from 'lucide-react'
import Swal from 'sweetalert2'
import { revalidateStoreCache } from '@/app/admin/actions'
import { motion } from 'framer-motion'
import { Zain } from 'next/font/google'

// --- COMPONENTE TOGGLE ANIMADO (Soft UI) ---
const AnimatedSwitch = ({ active, activeColor = 'bg-black' }: { active: boolean, activeColor?: string }) => (
  <div className={`w-11 h-6 rounded-full border flex items-center px-1 shrink-0 transition-colors duration-300 ${active ? `${activeColor} border-transparent justify-end shadow-subtle` : 'bg-white border-gray-200 justify-start shadow-sm'}`}>
    <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full ${active ? 'bg-white' : 'bg-gray-300'}`} />
  </div>
)

export default function PaymentSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  const supabase = getSupabase()
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  // 🚀 ESTADO AISLADO PARA LAS LLAVES PRIVADAS (NO se guardan en el JSONB)
  const [pfKeys, setPfKeys] = useState({ publicKey: '', secretKey: '' })

  const [methods, setMethods] = useState({
    allow_split_payments: initialData?.allow_split_payments || false,
    pago_flash: { active: false, ...initialData?.pago_flash }, // 🚀 NUEVO
    transferencia: { active: false, details: '', ...initialData?.transferencia }, // 🚀 NUEVO
    pago_movil: { active: false, details: '', ...initialData?.pago_movil },
    zelle: { active: false, details: '', ...initialData?.zelle },
    binance: { active: false, details: '', ...initialData?.binance },
    zinli: { active: false, details: '', ...initialData?.zinli }, // 🚀 AHORA SÍ VISIBLE
    wally: { active: false, details: '', ...initialData?.wally }, // 🚀 NUEVO
    cash: { active: false, details: '', ...initialData?.cash }
  })

  const handleChange = (method: string, field: string, value: any) => {
    setIsDirty(true)
    setMethods(prev => ({
      ...prev,
      [method]: { ...prev[method as keyof typeof prev], [field]: value }
    }))
  }

  // 🚀 NUEVO: Controlador para el Pago Mixto
  const handleSplitToggle = (value: boolean) => {
    setIsDirty(true);
    setMethods(prev => ({ ...prev, allow_split_payments: value }));
  }

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)

    const { error } = await supabase.from('stores').update({ payment_config: methods }).eq('id', storeId)

    // GUARDADO SEGURO DE LLAVES CON MANEJO DE ERRORES:
    if (methods.pago_flash.active && pfKeys.publicKey && pfKeys.secretKey) {
      const credRes = await fetch('/api/admin/payment-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          provider: 'pago_flash',
          publicKey: pfKeys.publicKey,
          secretKey: pfKeys.secretKey
        })
      });

      if (!credRes.ok) {
        const errData = await credRes.json();
        Swal.fire('Fallo de Criptografía', errData.error || 'Tus llaves bancarias NO se guardaron. Revisa la consola o tu .env', 'error');
        setSaving(false);
        return; // Detenemos aquí, no mostramos éxito.
      }
      setPfKeys({ publicKey: '', secretKey: '' });
    }

    setSaving(false)
    if (error) {
      Swal.fire('Error', 'No se pudo guardar la configuración pública', 'error')
    } else {
      await revalidateStoreCache()
      setIsDirty(false)
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pagos Actualizados', showConfirmButton: false, timer: 3000 })
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

      {/* 🚀 GLOBAL SETTING: PAGO MIXTO */}
      <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] mb-6 border border-transparent">
        <div
          className="flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => handleSplitToggle(!methods.allow_split_payments)}
        >
          <div className="pr-4">
            <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">Habilitar Pago Mixto</p>
            <p className="text-xs text-gray-500 mt-1">Permite a los clientes pagar una misma orden combinando múltiples métodos (Ej: Zelle + Pago Móvil).</p>
          </div>
          <AnimatedSwitch active={methods.allow_split_payments} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* 🚀 PAGO FLASH (AUTOMATIZADO - FEATURE TEASER) */}
        <div className="p-5 rounded-[var(--radius-card)] border border-transparent bg-gray-50/60 md:col-span-2 relative overflow-hidden group select-none">
          {/* Efecto de brillo sutil que barre la tarjeta para darle un aspecto "Premium pero bloqueado" */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>

          <div className="flex justify-between items-center opacity-80">
            <div>
              <div className="flex items-center gap-2 font-black text-gray-500">
                <Zap size={18} className="text-gray-400" /> Pago Móvil Automático
                <span className="bg-amber-100 text-amber-700 text-[9px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full ml-1 border border-amber-200/50 shadow-sm">
                  Muy Pronto
                </span>
              </div>
              <p className="text-[10px] font-bold mt-1.5 text-gray-400 max-w-md leading-relaxed">
                Estamos cocinando la pasarela nativa. Pronto tus clientes podrán transferir y la orden se confirmará en milisegundos, sin que tengas que revisar capturas de pantalla.
              </p>
            </div>
            
            {/* Switch visualmente apagado y bloqueado */}
            <div className="w-11 h-6 rounded-full border flex items-center px-1 shrink-0 bg-gray-100 border-gray-200 justify-start cursor-not-allowed shadow-inner">
              <div className="w-4 h-4 rounded-full bg-gray-300" />
            </div>
          </div>
        </div>
        {/* PAGO MÓVIL */}
        <div className={`p-4 rounded-[var(--radius-card)]  border transition-all duration-300; ${methods.pago_movil.active ? 'border-transparent shadow-[0px_3px_2px_0px_#007bff0f]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('pago_movil', 'active', !methods.pago_movil.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.pago_movil.active ? 'text-[#155dfc]' : 'text-gray-400'}`}>
              <Smartphone size={18} className={methods.pago_movil.active ? "text-[#155dfc]" : "text-gray-400"} /> Pago Móvil
            </div>
            <AnimatedSwitch active={methods.pago_movil.active} activeColor="bg-[#155dfc]" />
          </div>
          {methods.pago_movil.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                placeholder="Ej: 0412-1234567, CI 123456, Banesco"
                value={methods.pago_movil.details}
                onChange={e => handleChange('pago_movil', 'details', e.target.value)}
                className="w-full text-sm p-3 rounded-[var(--radius-btn)] border bg-[#f6f6f6] border-transparent focus:bg-white focus:border-blue-500 focus:shadow-subtle outline-none  transition-all"
              />
            </div>
          )}
        </div>

        {/* ZELLE */}
        <div className={`p-4 rounded-[var(--radius-card)]  border transition-all duration-300 ${methods.zelle.active ? 'border-transparent shadow-[0px_3px_2px_0px_#6c1cd314]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('zelle', 'active', !methods.zelle.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.zelle.active ? 'text-[#6c1cd3]' : 'text-gray-400'}`}>
              <DollarSign size={18} className={methods.zelle.active ? "text-[#6c1cd3]" : "text-gray-400"} /> Zelle
            </div>
            <AnimatedSwitch active={methods.zelle.active} activeColor="bg-[#6c1cd3]" />
          </div>
          {methods.zelle.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                placeholder="Correo Zelle (Titular)"
                value={methods.zelle.details}
                onChange={e => handleChange('zelle', 'details', e.target.value)}
                className="w-full text-sm p-3 rounded-[var(--radius-btn)] border bg-[#f6f6f6] border-transparent focus:bg-white focus:border-purple-500 focus:shadow-subtle outline-none  transition-all"
              />
            </div>
          )}
        </div>

        {/* BINANCE */}
        <div className={`p-4 rounded-[var(--radius-card)]  border transition-all duration-300 ${methods.binance.active ? 'border-transparent shadow-[0px_3px_2px_0px_#0c0e120f]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('binance', 'active', !methods.binance.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.binance.active ? 'text-[#f4c317]' : 'text-gray-400'}`}>
              <Bitcoin size={18} className={methods.binance.active ? "text-[#f4c317]" : "text-gray-400"} /> Binance
            </div>
            <AnimatedSwitch active={methods.binance.active} activeColor="bg-[#f4c317]" />
          </div>
          {methods.binance.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                placeholder="Email o Pay ID"
                value={methods.binance.details}
                onChange={e => handleChange('binance', 'details', e.target.value)}
                className="w-full text-sm p-3 rounded-[var(--radius-btn)] border bg-[#f6f6f6] border-transparent focus:bg-white focus:border-yellow-500 focus:shadow-subtle outline-none  transition-all"
              />
            </div>
          )}
        </div>

        {/* TRANSFERENCIA BANCARIA (BS) */}
        <div className={`p-4 rounded-[var(--radius-card)] border transition-all duration-300 ${methods.transferencia.active ? 'border-transparent shadow-[0px_3px_2px_0px_#33415514]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleChange('transferencia', 'active', !methods.transferencia.active)}>
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.transferencia.active ? 'text-slate-700' : 'text-gray-400'}`}>
              <Landmark size={18} className={methods.transferencia.active ? "text-slate-700" : "text-gray-400"} /> Transferencia
            </div>
            <AnimatedSwitch active={methods.transferencia.active} activeColor="bg-slate-700" />
          </div>
          {methods.transferencia.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input placeholder="Ej: Banesco, Cuenta Corriente 0134..." value={methods.transferencia.details} onChange={e => handleChange('transferencia', 'details', e.target.value)} className="w-full text-sm p-3 rounded-[var(--radius-btn)] border bg-[#f6f6f6] border-transparent focus:bg-white focus:border-slate-500 focus:shadow-subtle outline-none transition-all" />
            </div>
          )}
        </div>

        {/* ZINLI (USD) */}
        <div className={`p-4 rounded-[var(--radius-card)] border transition-all duration-300 ${methods.zinli.active ? 'border-transparent shadow-[0px_3px_2px_0px_#e11d4814]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleChange('zinli', 'active', !methods.zinli.active)}>
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.zinli.active ? 'text-rose-600' : 'text-gray-400'}`}>
              <Wallet size={18} className={methods.zinli.active ? "text-rose-600" : "text-gray-400"} /> Zinli
            </div>
            <AnimatedSwitch active={methods.zinli.active} activeColor="bg-rose-600" />
          </div>
          {methods.zinli.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input placeholder="Correo Zinli" value={methods.zinli.details} onChange={e => handleChange('zinli', 'details', e.target.value)} className="w-full text-sm p-3 rounded-[var(--radius-btn)] border bg-[#f6f6f6] border-transparent focus:bg-white focus:border-rose-500 focus:shadow-subtle outline-none transition-all" />
            </div>
          )}
        </div>

        {/* WALLYTECH (USD) */}
        <div className={`p-4 rounded-[var(--radius-card)] border transition-all duration-300 ${methods.wally.active ? 'border-transparent shadow-[0px_3px_2px_0px_#0284c714]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleChange('wally', 'active', !methods.wally.active)}>
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.wally.active ? 'text-sky-600' : 'text-gray-400'}`}>
              <Wallet size={18} className={methods.wally.active ? "text-sky-600" : "text-gray-400"} /> WallyTech
            </div>
            <AnimatedSwitch active={methods.wally.active} activeColor="bg-sky-600" />
          </div>
          {methods.wally.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input placeholder="Usuario Wally (@usuario)" value={methods.wally.details} onChange={e => handleChange('wally', 'details', e.target.value)} className="w-full text-sm p-3 rounded-[var(--radius-btn)] border bg-[#f6f6f6] border-transparent focus:bg-white focus:border-sky-500 focus:shadow-subtle outline-none transition-all" />
            </div>
          )}
        </div>

        {/* CASH */}
        <div className={`p-4 rounded-[var(--radius-card)]  border transition-all duration-300 ${methods.cash.active ? 'border-transparent shadow-[0px_3px_2px_0px_#83b96426]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
          <div
            className="flex justify-between items-center mb-3 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => handleChange('cash', 'active', !methods.cash.active)}
          >
            <div className={`flex items-center gap-2 font-bold transition-colors ${methods.cash.active ? 'text-[#85BB65]' : 'text-gray-400'}`}>
              <Banknote size={18} className={methods.cash.active ? "text-[#85BB65]" : "text-gray-400"} /> Efectivo
            </div>
            <AnimatedSwitch active={methods.cash.active} activeColor="bg-[#85BB65]" />
          </div>
          {methods.cash.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                placeholder="Instrucciones (Ej: Solo billetes en buen estado)"
                value={methods.cash.details}
                onChange={e => handleChange('cash', 'details', e.target.value)}
                className="w-full text-sm p-3 rounded-[var(--radius-btn)] border bg-[#f6f6f6] border-transparent focus:bg-white focus:border-green-600 focus:shadow-subtle outline-none  transition-all"
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
          className={`w-full sm:w-auto px-6 py-3 rounded-[var(--radius-btn)] text-sm font-bold flex items-center justify-center gap-2 transition-all ${isDirty
              ? 'bg-black text-white hover:bg-gray-800 shadow-subtle active:scale-95'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}