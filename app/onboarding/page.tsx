'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, ArrowRight, Check, Globe, Smartphone, Store, Package, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
// 1. Agrega esta importación en la parte superior, junto a las demás:
import { processReferral } from '@/app/actions/affiliates'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

const PremiumInput = ({ label, prefix, suffix, value, onChange, placeholder, type = "text", hint }: any) => (
  <div className="space-y-2 w-full">
    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider ml-1">{label}</label>
    <div className="group relative flex items-center bg-white border border-neutral-200 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-neutral-900 focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.02)]">
      {prefix && <span className="text-neutral-400 mr-2 font-medium">{prefix}</span>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent outline-none text-sm font-medium text-neutral-900 placeholder:text-neutral-300" />
      {suffix && <span className="text-neutral-400 ml-2 text-xs font-medium">{suffix}</span>}
    </div>
    {hint && <p className="text-[10px] text-neutral-400 ml-1 italic">{hint}</p>}
  </div>
)

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [rates, setRates] = useState({ usd: 0, eur: 0 })
  
  // ESTADO MAESTRO
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  
  
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  useEffect(() => {
    async function fetchRates() {
      const { data } = await supabase.from('app_config').select('usd_rate, eur_rate').single()
      if (data) setRates({ usd: Number(data.usd_rate), eur: Number(data.eur_rate) })
    }
    fetchRates()
  }, [])

  const handleNameChange = (val: string) => {
    setStoreName(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, ''))
  }

 

// --- GUARDADO MAESTRO (VERSIÓN BLINDADA) ---
  const handleFinalize = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No se encontró sesión de usuario. Por favor, inicia sesión de nuevo.")

      // 1. UPSERT DE LA TIENDA (Con términos aceptados por defecto)
      const { error: storeErr } = await supabase.from('stores').upsert({
        user_id: user.id,
        name: storeName,
        slug: slug,
        phone: phone,
        currency_type: currency,
        subscription_status: 'trial',
        // 🚀 FIX CRÍTICO: Previene el bloqueo del FiscalGatekeeper en el primer login
        terms_accepted: true,
        fiscal_profile: 'informal'
      }, { onConflict: 'user_id' })

      if (storeErr) {
        if (storeErr.code === '23505') throw new Error("Esa URL ya está ocupada por otro negocio. Prueba otra.")
        throw storeErr
      }

      // 🚀 Procesamos el referido en segundo plano si existe la cookie
      await processReferral(user.id).catch(console.error)

      // 2. ÉXITO Y REDIRECCIÓN
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#000', '#22c55e'] })
      
      setTimeout(() => {
        router.refresh()
        router.push('/admin?welcome=true') // 🚀 Dispara el Modal de Bienvenida limpio
      }, 1500)

    } catch (err: any) {
      console.error("Error en Onboarding:", err)
      toast.error(err.message || "Ocurrió un error inesperado")
      setLoading(false)
    }
  }

  

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center p-6 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[440px] relative">
        <div className="flex gap-1.5 mb-12 justify-center">
          {[1, 2].map((i) => (
            <div key={i} className={`h-[3px] rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-neutral-900' : 'w-4 bg-neutral-200'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">Base Financiera</h1>
                <p className="text-neutral-500 text-sm">Selecciona la moneda base de tus precios.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[{ id: 'usd', label: 'Dólares Americanos', rate: rates.usd }, { id: 'eur', label: 'Euros Europeos', rate: rates.eur }].map((opt) => (
                  <button key={opt.id} onClick={() => setCurrency(opt.id as 'usd' | 'eur')} className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${currency === opt.id ? 'border-neutral-900 bg-white shadow-sm' : 'border-neutral-200 hover:border-neutral-300'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currency === opt.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}><Coins size={20} /></div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-neutral-900">{opt.label}</p>
                        <p className="text-xs font-mono text-neutral-400">Tasa: {opt.rate.toFixed(2)} Bs</p>
                      </div>
                    </div>
                    {currency === opt.id && <Check size={18} strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full h-12 bg-neutral-900 text-white rounded-xl font-medium text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2">Continuar <ArrowRight size={16} /></button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">Tu Identidad</h1>
                <p className="text-neutral-500 text-sm">Configura cómo te verán tus clientes.</p>
              </div>
              <div className="space-y-5">
                <PremiumInput label="Nombre del Negocio" placeholder="Ej: Trazo Boutique" value={storeName} onChange={handleNameChange} prefix={<Store size={16} />} />
                <PremiumInput label="Enlace de tu Tienda" placeholder="mitienda" value={slug} onChange={(v:any) => setSlug(v.toLowerCase().replace(/[^a-z0-9]/g, ''))} suffix=".preziso.shop" prefix={<Globe size={16} />} />
                <PremiumInput label="WhatsApp" placeholder="584121234567" value={phone} onChange={(v:any) => setPhone(v.replace(/[^0-9]/g, ''))} prefix={<Smartphone size={16} />} />
              </div>
             <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 h-12 border border-neutral-200 text-neutral-600 rounded-xl font-medium text-sm">Atrás</button>
                <button 
                  onClick={handleFinalize} 
                  disabled={loading || !storeName || !slug || !phone} 
                  className="flex-[2] h-12 bg-neutral-900 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-neutral-200 disabled:opacity-20 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "Lanzar mi Imperio"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}