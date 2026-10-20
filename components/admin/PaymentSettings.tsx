'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { 
  Save, 
  Smartphone, 
  Banknote, 
  Bitcoin, 
  Loader2, 
  DollarSign, 
  CreditCard, 
  AlertTriangle, 
  Landmark, 
  Wallet, 
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Swal from 'sweetalert2'
import { revalidateStoreCache } from '@/app/admin/actions'
import { motion } from 'framer-motion'

// --- COMPONENTE TOGGLE ANIMADO (Elastic Clean Standard) ---
const AnimatedSwitch = ({ active, activeColor = 'bg-neutral-900' }: { active: boolean, activeColor?: string }) => (
  <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 cursor-pointer ${active ? `${activeColor} border-transparent justify-end` : 'bg-neutral-100 border-neutral-200 justify-start'}`}>
    <motion.div 
      layout 
      transition={{ type: "spring", stiffness: 600, damping: 30 }} 
      className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" 
    />
  </div>
)

export default function PaymentSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  const supabase = getSupabase()
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
   // Estado aislado para credenciales cifradas

const [pfKeys, setPfKeys] = useState({ publicKey: '', secretKey: '' })
  const [skylinkKeys, setSkylinkKeys] = useState({ commerceCode: '', apiKey: '' }) // 🚀 NUEVO: Estado Skylink
  const [binanceKeys, setBinanceKeys] = useState({ apiKey: '', secretKey: '' }) // 🚀 NUEVO: Estado Binance Pay
 
  const [methods, setMethods] = useState({
    allow_split_payments: initialData?.allow_split_payments || false,
    pago_flash: { active: false, ...initialData?.pago_flash }, 
    skylink: { active: false, ...initialData?.skylink }, // 🚀 NUEVO: Configuración Skylink
    transferencia: { active: false, details: '', ...initialData?.transferencia }, 
    pago_movil: { active: false, details: '', ...initialData?.pago_movil },
    zelle: { active: false, details: '', ...initialData?.zelle },
    binance: { active: false, details: '', ...initialData?.binance },
    zinli: { active: false, details: '', ...initialData?.zinli }, 
    wally: { active: false, details: '', ...initialData?.wally }, 
    cash: { active: false, details: '', ...initialData?.cash }
  })

   // SINCRONIZACIÓN ROBUSTA CON EL GUARDIÁN GLOBAL
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('preziso:dirty-state', { detail: { id: 'payments', isDirty } }))
    return () => {
      window.dispatchEvent(new CustomEvent('preziso:dirty-state', { detail: { id: 'payments', isDirty: false } }))
    }
  }, [isDirty])

  useEffect(() => {
    const handleTriggerSave = (e: Event) => {
      const customEvent = e as CustomEvent<{ registerPromise?: (p: Promise<any>) => void }>
      if (isDirty) {
        const savePromise = handleSave()
        if (customEvent.detail?.registerPromise && savePromise) {
          customEvent.detail.registerPromise(savePromise)
        }
      }
    }
    const handleDiscard = () => setIsDirty(false)
    window.addEventListener('preziso:trigger-save', handleTriggerSave)
    window.addEventListener('preziso:discard-changes', handleDiscard)
    return () => {
      window.removeEventListener('preziso:trigger-save', handleTriggerSave)
      window.removeEventListener('preziso:discard-changes', handleDiscard)
    }
  }, [isDirty, methods, pfKeys, skylinkKeys])

  const handleChange = (method: string, field: string, value: any) => {
    setIsDirty(true)
    setMethods(prev => ({
      ...prev,
      [method]: { ...prev[method as keyof typeof prev], [field]: value }
    }))
  }

  const handleSplitToggle = (value: boolean) => {
    setIsDirty(true);
    setMethods(prev => ({ ...prev, allow_split_payments: value }));
  }

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)

    const { error } = await supabase.from('stores').update({ payment_config: methods }).eq('id', storeId)

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
        Swal.fire('Fallo de Criptografía', errData.error || 'Tus llaves bancarias NO se guardaron.', 'error');
        setSaving(false);
        return;
      }
      setPfKeys({ publicKey: '', secretKey: '' });
    }

    // 🚀 NUEVO: Guardado seguro de credenciales Skylink en la bóveda
    if (methods.skylink.active && skylinkKeys.commerceCode && skylinkKeys.apiKey) {
      const credRes = await fetch('/api/admin/payment-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          provider: 'skylink',
          publicKey: skylinkKeys.commerceCode,
          secretKey: skylinkKeys.apiKey
        })
      });

    if (!credRes.ok) {
        const errData = await credRes.json();
        Swal.fire('Fallo de Seguridad', errData.error || 'Las credenciales de Skylink NO se guardaron.', 'error');
        setSaving(false);
        return;
      }
      setSkylinkKeys({ commerceCode: '', apiKey: '' });
    }

    // 🚀 NUEVO: Guardado seguro de credenciales Binance Pay
    if (methods.binance.active && binanceKeys.apiKey && binanceKeys.secretKey) {
      const credRes = await fetch('/api/admin/payment-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          provider: 'binance',
          publicKey: binanceKeys.apiKey,
          secretKey: binanceKeys.secretKey
        })
      });

      if (!credRes.ok) {
        const errData = await credRes.json();
        Swal.fire('Fallo Criptográfico', errData.error || 'Las credenciales de Binance NO se guardaron.', 'error');
        setSaving(false);
        return;
      }
      setBinanceKeys({ apiKey: '', secretKey: '' });
    }

    setSaving(false)
    if (error) {
      Swal.fire('Error', 'No se pudo guardar la configuración pública', 'error')
    } else {
      await revalidateStoreCache()
      setIsDirty(false)
      Swal.fire({ 
        toast: true, 
        position: 'top-end', 
        icon: 'success', 
        title: 'Pagos Actualizados', 
        showConfirmButton: false, 
        timer: 3000,
        customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
      })
    }
  }

  return (
    <div className="bg-white p-4 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col h-full space-y-6">
      
      {/* HEADER PRINCIPAL */}
      <div>
        <div className="flex items-center gap-2 text-neutral-900">
          <CreditCard size={18} className="text-neutral-500" />
          <h2 className="text-base font-bold tracking-tight">Métodos de Pago</h2>
        </div>
        <p className="text-xs text-neutral-400 mt-1">Configure las plataformas y cuentas donde sus clientes depositarán los fondos.</p>
      </div>

      {/* GLOBAL SETTING: PAGO MIXTO */}
      <div className="bg-neutral-50/60 p-4.5 rounded-lg border border-neutral-200/50">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => handleSplitToggle(!methods.allow_split_payments)}
        >
          <div className="space-y-0.5">
            <p className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">Permitir Pago Mixto (Multimétodo)</p>
            <p className="text-xs text-neutral-400 pr-4">Habilita al comprador a fragmentar el monto total combinando múltiples pasarelas (ej. Zelle + Pago Móvil).</p>
          </div>
          <AnimatedSwitch active={methods.allow_split_payments} />
        </div>
      </div>

      {/* GRID DE MÉTODOS DE PAGO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        
     {/* SKYLINK PAY (AUTOMATIZADO) */}
      {storeId === 'be6326b1-f712-4f40-8e29-00149164a319' && (
        <div className={`p-5 rounded-xl border transition-all duration-300 md:col-span-2 ${methods.skylink.active ? 'border-neutral-900 bg-neutral-900 shadow-lg' : 'border-neutral-200/50 bg-neutral-50/40 hover:bg-neutral-50'}`}>
          <div
            className="flex justify-between items-start md:items-center mb-2 cursor-pointer gap-4"
            onClick={() => handleChange('skylink', 'active', !methods.skylink.active)}
          >
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-sm font-bold transition-colors ${methods.skylink.active ? 'text-white' : 'text-neutral-900'}`}>
                <Zap size={16} className={methods.skylink.active ? 'text-amber-400' : 'text-neutral-500'} /> 
                <span>Pago Móvil Automatizado</span>
              </div>
              <p className={`text-xs ${methods.skylink.active ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Validación automática y liquidación directa a tu banco vía Skylink. Tarifa: 2.9% por transacción.
              </p>
            </div>
            <AnimatedSwitch active={methods.skylink.active} activeColor="bg-amber-500" />
          </div>
          
          {methods.skylink.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="pt-4 mt-2 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Código de Comercio</label>
                  <input
                    placeholder="Ej: 657137066270"
                    autoComplete="off"
                    value={skylinkKeys.commerceCode}
                    onChange={e => {
                      if (e.isTrusted) setIsDirty(true);
                      setSkylinkKeys(prev => ({ ...prev, commerceCode: e.target.value.replace(/\D/g, '') }));
                    }}
                    className="w-full text-xs px-3 py-2.5 rounded-lg bg-neutral-800 text-white font-mono placeholder:text-neutral-500 border border-neutral-700 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">API Key HMAC</label>
                  <input
                    type="password"
                    placeholder="Pega aquí tu API Key secreta"
                    autoComplete="new-password"
                    value={skylinkKeys.apiKey}
                    onChange={e => {
                      if (e.isTrusted) setIsDirty(true);
                      setSkylinkKeys(prev => ({ ...prev, apiKey: e.target.value.trim() }));
                    }}
                    className="w-full text-xs px-3 py-2.5 rounded-lg bg-neutral-800 text-white font-mono placeholder:text-neutral-500 border border-neutral-700 focus:border-amber-500 outline-none transition-all"
                  />
                </div>

                <p className="text-[10px] text-amber-500/80 md:col-span-2 flex items-center gap-1.5 font-medium mt-1">
                  <AlertCircle size={12} />
                  Tus credenciales se encriptarán a nivel bancario en nuestra bóveda (AES-256). Solo debes ingresarlas una vez.
                </p>
              </div>
            </div>
          )}
        </div>
               )}

        {/* PAGO MÓVIL (AZUL SALVIA MUTED) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.pago_movil.active ? 'border-neutral-200 bg-white shadow-xs' : 'border-neutral-200/50 bg-neutral-50/40 hover:bg-neutral-50'}`}>
          <div
            className="flex justify-between items-center mb-3 cursor-pointer"
            onClick={() => handleChange('pago_movil', 'active', !methods.pago_movil.active)}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${methods.pago_movil.active ? 'text-blue-700' : 'text-neutral-400'}`}>
              <Smartphone size={15} /> 
              <span>Pago Móvil</span>
            </div>
            <AnimatedSwitch active={methods.pago_movil.active} activeColor="bg-blue-600" />
          </div>
          {methods.pago_movil.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                placeholder="Ej: 0412-1234567, V-123456, Banesco"
                value={methods.pago_movil.details}
                onChange={e => handleChange('pago_movil', 'details', e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-md  bg-neutral-50/90 font-semibold focus:bg-white focus:border-neutral-400 outline-none transition-all"
                />
            </div>
          )}
        </div>


        {/* ZELLE (LAVANDA MUTED) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.zelle.active ? 'border-neutral-200 bg-white shadow-xs' : 'border-neutral-200/50 bg-neutral-50/40 hover:bg-neutral-50'}`}>
          <div
            className="flex justify-between items-center mb-3 cursor-pointer"
            onClick={() => handleChange('zelle', 'active', !methods.zelle.active)}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${methods.zelle.active ? 'text-purple-700' : 'text-neutral-400'}`}>
              <DollarSign size={15} /> 
              <span>Zelle</span>
            </div>
            <AnimatedSwitch active={methods.zelle.active} activeColor="bg-purple-600" />
          </div>
          {methods.zelle.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                placeholder="Correo electrónico Zelle (Titular)"
                value={methods.zelle.details}
                onChange={e => handleChange('zelle', 'details', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-md  bg-neutral-50/90 font-semibold focus:bg-white focus:border-neutral-400 outline-none transition-all"
              />
            </div>
          )}
        </div>

   {/* BINANCE PAY (AUTOMATIZADO - FLAT DESIGN PREMIUM) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 md:col-span-2 ${methods.binance.active ? 'border-neutral-900 bg-[#FAFAFC]' : 'border-neutral-200/60 bg-white hover:bg-neutral-50/50'}`}>
          <div
            className="flex justify-between items-start md:items-center mb-2 cursor-pointer gap-4"
            onClick={() => handleChange('binance', 'active', !methods.binance.active)}
          >
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-sm font-semibold transition-colors ${methods.binance.active ? 'text-neutral-950' : 'text-neutral-500'}`}>
                <Bitcoin size={16} strokeWidth={1.5} className={methods.binance.active ? 'text-[#FCD535]' : 'text-neutral-400'} /> 
                <span>Binance Pay Automatizado</span>
              </div>
              <p className={`text-xs font-normal ${methods.binance.active ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Genera un código QR dinámico. Las órdenes se validan y aprueban automáticamente en tiempo real.
              </p>
            </div>
            <AnimatedSwitch active={methods.binance.active} activeColor="bg-[#FCD535]" />
          </div>
          
          {methods.binance.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-4 mt-4 border-t border-neutral-200/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Binance API Key</label>
                  <input
                    placeholder="Pega tu API Key de Binance"
                    autoComplete="off"
                    value={binanceKeys.apiKey}
                    onChange={e => {
                      if (e.isTrusted) setIsDirty(true);
                      setBinanceKeys(prev => ({ ...prev, apiKey: e.target.value.trim() }));
                    }}
                    className="w-full text-xs px-3 py-2.5 rounded-lg bg-white text-neutral-950 font-mono placeholder:text-neutral-300 border border-neutral-200/60 focus:border-neutral-900 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Binance Secret Key</label>
                  <input
                    type="password"
                    placeholder="Pega tu Secret Key"
                    autoComplete="new-password"
                    value={binanceKeys.secretKey}
                    onChange={e => {
                      if (e.isTrusted) setIsDirty(true);
                      setBinanceKeys(prev => ({ ...prev, secretKey: e.target.value.trim() }));
                    }}
                    className="w-full text-xs px-3 py-2.5 rounded-lg bg-white text-neutral-950 font-mono placeholder:text-neutral-300 border border-neutral-200/60 focus:border-neutral-900 outline-none transition-all"
                  />
                </div>

                <p className="text-[10px] text-neutral-500 md:col-span-2 flex items-center gap-1.5 font-normal mt-1">
                  <AlertCircle size={12} strokeWidth={1.5} />
                  Encriptación AES-256 Activa. Tus claves nunca se exponen en texto plano.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* TRANSFERENCIA BANCARIA (GRIS ACERADO MUTED) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.transferencia.active ? 'border-neutral-200 bg-white shadow-xs' : 'border-neutral-200/50 bg-neutral-50/40 hover:bg-neutral-50'}`}>
          <div 
            className="flex justify-between items-center mb-3 cursor-pointer" 
            onClick={() => handleChange('transferencia', 'active', !methods.transferencia.active)}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${methods.transferencia.active ? 'text-neutral-800' : 'text-neutral-400'}`}>
              <Landmark size={15} /> 
              <span>Transferencia Nacional</span>
            </div>
            <AnimatedSwitch active={methods.transferencia.active} activeColor="bg-neutral-900" />
          </div>
          {methods.transferencia.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <input 
                placeholder="Banco, Cuenta Corriente, Titular, RIF" 
                value={methods.transferencia.details} 
                onChange={e => handleChange('transferencia', 'details', e.target.value)} 
                className="w-full text-xs px-3 py-2 rounded-md bg-neutral-50/90 font-semibold focus:bg-white focus:border-neutral-400 outline-none transition-all" 
              />
            </div>
          )}
        </div>

        {/* ZINLI (DUSTY ROSE MUTED) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.zinli.active ? 'border-neutral-200 bg-white shadow-xs' : 'border-neutral-200/50 bg-neutral-50/40 hover:bg-neutral-50'}`}>
          <div 
            className="flex justify-between items-center mb-3 cursor-pointer" 
            onClick={() => handleChange('zinli', 'active', !methods.zinli.active)}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${methods.zinli.active ? 'text-rose-700' : 'text-neutral-400'}`}>
              <Wallet size={15} /> 
              <span>Zinli</span>
            </div>
            <AnimatedSwitch active={methods.zinli.active} activeColor="bg-rose-600" />
          </div>
          {methods.zinli.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <input 
                placeholder="Correo electrónico registrado en Zinli" 
                value={methods.zinli.details} 
                onChange={e => handleChange('zinli', 'details', e.target.value)} 
                className="w-full text-xs px-3 py-2 rounded-md bg-neutral-50/90 font-semibold focus:bg-white focus:border-neutral-400 outline-none transition-all" 
              />
            </div>
          )}
        </div>

        {/* WALLYTECH (OCEAN CYAN MUTED) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.wally.active ? 'border-neutral-200 bg-white shadow-xs' : 'border-neutral-200/50 bg-neutral-50/40 hover:bg-neutral-50'}`}>
          <div 
            className="flex justify-between items-center mb-3 cursor-pointer" 
            onClick={() => handleChange('wally', 'active', !methods.wally.active)}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${methods.wally.active ? 'text-sky-700' : 'text-neutral-400'}`}>
              <Wallet size={15} /> 
              <span>Wally</span>
            </div>
            <AnimatedSwitch active={methods.wally.active} activeColor="bg-sky-600" />
          </div>
          {methods.wally.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <input 
                placeholder="Usuario de Wally (@usuario)" 
                value={methods.wally.details} 
                onChange={e => handleChange('wally', 'details', e.target.value)} 
                className="w-full text-xs px-3 py-2 rounded-md bg-neutral-50/90  font-semibold focus:bg-white focus:border-neutral-400 outline-none transition-all" 
              />
            </div>
          )}
        </div>

        {/* CASH / EFECTIVO (SAGE GREEN MUTED) */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${methods.cash.active ? 'border-neutral-200 bg-white shadow-xs' : 'border-neutral-200/50 bg-neutral-50/40 hover:bg-neutral-50'}`}>
          <div
            className="flex justify-between items-center mb-3 cursor-pointer"
            onClick={() => handleChange('cash', 'active', !methods.cash.active)}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${methods.cash.active ? 'text-emerald-700' : 'text-neutral-400'}`}>
              <Banknote size={15} /> 
              <span>Efectivo (Dólares / Bs)</span>
            </div>
            <AnimatedSwitch active={methods.cash.active} activeColor="bg-emerald-600" />
          </div>
          {methods.cash.active && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                placeholder="Instrucciones especiales (Ej: Solo billetes sin roturas)"
                value={methods.cash.details}
                onChange={e => handleChange('cash', 'details', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-md    bg-neutral-50/90 font-semibold focus:bg-white focus:border-neutral-400 outline-none transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* FOOTER DE ACCIÓN */}
      <div className="mt-8 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
              <AlertCircle size={12} />
              Tienes cambios sin guardar en pasarelas
            </span>
          ) : (
            <span className="text-neutral-400">Todos los métodos de pago están conciliados.</span>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${isDirty
              ? 'bg-neutral-950 text-white hover:bg-black active:scale-[0.98]'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            }`}
        >
          {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}