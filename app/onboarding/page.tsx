// app/onboarding/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, ArrowRight, Check, Globe, Smartphone, Store, Utensils, Loader2, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { processReferral, verifyPartnerCodeAction } from '@/app/actions/affiliates'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { TEMPLATES_REGISTRY } from '@/lib/templates-registry' // 🚀 FUENTE ÚNICA DE VERDAD
import PhoneInput from '@/components/ui/PhoneInput'

const PremiumInput = ({ label, prefix, suffix, value, onChange, placeholder, type = "text", hint }: any) => (
  <div className="space-y-2 w-full">
    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider ml-1">{label}</label>
    <div className="group relative flex items-center bg-white border border-neutral-200 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-neutral-900">
      {prefix && <span className="text-neutral-400 mr-2.5 font-medium shrink-0">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent border-0 focus:border-0 outline-none focus:outline-none focus:ring-0 focus:shadow-none shadow-none p-0 text-sm font-medium text-neutral-900 placeholder:font-normal placeholder:text-neutral-400/70"
      />
      {suffix && <span className="text-neutral-400 ml-2 text-xs font-medium shrink-0 select-none">{suffix}</span>}
    </div>
    {hint && <p className="text-[10px] text-neutral-400 ml-1 italic">{hint}</p>}
  </div>
)

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [rates, setRates] = useState({ usd: 0, eur: 0 })

  // ESTADO MAESTRO
  const [storeType, setStoreType] = useState<'retail' | 'restaurant'>('retail')
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [isEditingSlug, setIsEditingSlug] = useState(false)
  const [isSlugCustomized, setIsSlugCustomized] = useState(false)
  const [phone, setPhone] = useState('')

  // Sanitizador inteligente: convierte tildes/ñ (Cafetería -> cafeteria) y limpia URLs de Instagram/TikTok si el usuario las pega
  const cleanSlugString = (raw: string): string => {
    let text = raw.trim().toLowerCase()
    // Si el usuario pega por error un link de Instagram, TikTok o web completa, extraemos solo su nombre de usuario
    text = text
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/^(instagram\.com|tiktok\.com|facebook\.com|wa\.me)\//, '')
      .replace(/\.preziso\.shop.*$/, '')
      .split('/')[0]
      .split('?')[0]

    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Convierte á->a, é->e, í->i, ó->o, ú->u, ñ->n
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30)
  }

  const [partnerCode, setPartnerCode] = useState('')
  const [checkingCode, setCheckingCode] = useState(false)
  const [partnerFeedback, setPartnerFeedback] = useState<{
    valid: boolean
    message: string
  } | null>(null)

  const handleValidatePartnerCode = async () => {
    if (!partnerCode.trim()) return
    setCheckingCode(true)
    try {
      const res = await verifyPartnerCodeAction(partnerCode)
      setPartnerFeedback({ valid: res.valid, message: res.message })
    } catch {
      setPartnerFeedback({ valid: false, message: 'No se pudo verificar el código' })
    } finally {
      setCheckingCode(false)
    }
  }

  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchRates() {
      const { data } = await supabase.from('app_config').select('usd_rate, eur_rate').single()
      if (data) setRates({ usd: Number(data.usd_rate), eur: Number(data.eur_rate) })
    }
    fetchRates()
  }, [])

  const handleNameChange = (val: string) => {
    setStoreName(val)
    if (!isSlugCustomized) {
      setSlug(cleanSlugString(val))
    }
  }

  const handleFinalize = async () => {
    setLoading(true)
    try {


      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No se encontró sesión de usuario. Por favor, inicia sesión de nuevo.")

      // 🚀 ASIGNACIÓN DESDE TEMPLATES_REGISTRY (CERO CÓDIGO QUEMADO)
      const isFood = storeType === 'restaurant'
      const targetTemplateId = isFood ? 'gourmet_flow' : 'classic'
      const templateDef = TEMPLATES_REGISTRY.find(t => t.id === targetTemplateId) || TEMPLATES_REGISTRY[0]
      const initialThemeConfig = templateDef.default_config

      const initialStoreHours = isFood ? {
        timezone: 'America/Caracas',
        is_temporarily_closed: false,
        schedule: {
          monday: { isOpen: true, open: '09:00', close: '22:00' },
          tuesday: { isOpen: true, open: '09:00', close: '22:00' },
          wednesday: { isOpen: true, open: '09:00', close: '22:00' },
          thursday: { isOpen: true, open: '09:00', close: '22:00' },
          friday: { isOpen: true, open: '09:00', close: '23:59' },
          saturday: { isOpen: true, open: '09:00', close: '23:59' },
          sunday: { isOpen: false, open: '00:00', close: '00:00' }
        }
      } : null

      // Guardado maestro en stores
      const { error: storeErr } = await supabase.from('stores').upsert({
        user_id: user.id,
        name: storeName.trim(),
        slug: slug.trim(),
        phone: phone.replace(/\D/g, ''),
        currency_type: currency,
        store_type: storeType,
        theme_config: initialThemeConfig,
        store_hours: initialStoreHours,
        subscription_status: 'trial',
        terms_accepted: true,
        fiscal_profile: 'informal'
      }, { onConflict: 'user_id' })
      if (storeErr) {
        if (storeErr.code === '23505') throw new Error("Esa URL ya está ocupada por otro negocio. Prueba otra.")
        throw storeErr
      }

    await processReferral(user.id, partnerCode).catch(console.error)

      setTimeout(() => {
        router.refresh()
        router.push('/admin?welcome=true')
      }, 400)
    } catch (err: any) {
      console.error("Error en Onboarding:", err)
      toast.error(err.message || "Ocurrió un error inesperado")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center p-6 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[460px] relative">
        {/* Barra de progreso de 3 pasos */}
        <div className="flex gap-1.5 mb-10 justify-center">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-[3px] rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-neutral-900' : 'w-4 bg-neutral-200'
                }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* PASO 1: MODELO DE NEGOCIO */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">Giro Comercial</h1>
                <p className="text-neutral-500 text-sm">Selecciona el tipo de negocio que vas a operar.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setStoreType('retail')}
                  className={`group flex items-start justify-between p-5 rounded-2xl border text-left transition-all ${storeType === 'retail'
                      ? 'border-neutral-900 bg-white shadow-sm ring-1 ring-neutral-900/10'
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${storeType === 'retail' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                      }`}>
                      <Store size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900">Comercio General & Retail</p>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Ropa, calzado, tecnología, repuestos o artículos con tallas y envíos tradicionales.
                      </p>
                    </div>
                  </div>
                  {storeType === 'retail' && <Check size={18} strokeWidth={3} className="shrink-0 text-neutral-900 ml-2 mt-1" />}
                </button>

                <button
                  type="button"
                  onClick={() => setStoreType('restaurant')}
                  className={`group flex items-start justify-between p-5 rounded-2xl border text-left transition-all ${storeType === 'restaurant'
                      ? 'border-neutral-900 bg-white shadow-sm ring-1 ring-neutral-900/10'
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${storeType === 'restaurant' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                      }`}>
                      <Utensils size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900">Gastronomía & Restaurantes</p>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Restaurantes, fast food o dark kitchens con menú continuo, extras, mesas y delivery local.
                      </p>
                    </div>
                  </div>
                  {storeType === 'restaurant' && <Check size={18} strokeWidth={3} className="shrink-0 text-neutral-900 ml-2 mt-1" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-12 bg-neutral-900 text-white rounded-xl font-medium text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
              >
                Continuar <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* PASO 2: BASE FINANCIERA */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">Base Financiera</h1>
                <p className="text-neutral-500 text-sm">Selecciona la moneda base de tus precios.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'usd', label: 'Dólares Americanos', rate: rates.usd },
                  { id: 'eur', label: 'Euros Europeos', rate: rates.eur }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCurrency(opt.id as 'usd' | 'eur')}
                    className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${currency === opt.id ? 'border-neutral-900 bg-white shadow-sm' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currency === opt.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                        }`}>
                        <Coins size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-neutral-900">{opt.label}</p>
                        <p className="text-xs font-mono text-neutral-400">Tasa: {opt.rate.toFixed(2)} Bs</p>
                      </div>
                    </div>
                    {currency === opt.id && <Check size={18} strokeWidth={3} />}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 border border-neutral-200 text-neutral-600 rounded-xl font-medium text-sm hover:bg-neutral-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-[2] h-12 bg-neutral-900 text-white rounded-xl font-medium text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* PASO 3: IDENTIDAD */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">Tu Identidad</h1>
                <p className="text-neutral-500 text-sm">Configura cómo te verán tus clientes.</p>
              </div>

         <div className="space-y-5">
                {/* BLOQUE UNIFICADO: NOMBRE DEL NEGOCIO + DIRECCIÓN WEB AUTOMÁTICA */}
                <div className="space-y-2.5">
                  <PremiumInput 
                    label="Nombre del Negocio" 
                    placeholder={storeType === 'restaurant' ? "Ej: Burger House" : "Ej: Trazo Boutique"} 
                    value={storeName} 
                    onChange={handleNameChange} 
                    prefix={<Store size={16} />} 
                  />

                  {/* VISTA PREVIA INTELIGENTE DE LA DIRECCIÓN WEB (DIVULGACIÓN PROGRESIVA) */}
                  <AnimatePresence mode="wait">
                    {!isEditingSlug ? (
                      <motion.div
                        key="slug-preview"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-100/80 border border-neutral-200/70"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe size={14} className="text-neutral-400 shrink-0" />
                          <div className="text-xs truncate">
                            <span className="text-neutral-500 mr-1.5">Tu web será:</span>
                            <span className="font-mono font-semibold text-neutral-900">
                              {slug || (storeType === 'restaurant' ? 'burgerhouse' : 'mitienda')}
                            </span>
                            <span className="font-mono text-neutral-400">.preziso.shop</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsEditingSlug(true)}
                          className="shrink-0 text-[11px] font-semibold text-neutral-600 hover:text-neutral-950 px-2 py-0.5 rounded-md hover:bg-white transition-colors cursor-pointer"
                        >
                          Cambiar
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="slug-editor"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="p-3 rounded-xl bg-white border border-neutral-900 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                            Personalizar dirección web
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingSlug(false)}
                            className="text-[11px] font-semibold text-neutral-900 hover:opacity-70 cursor-pointer"
                          >
                            Listo
                          </button>
                        </div>

                        <div className="flex items-center bg-neutral-50 border border-neutral-200/80 rounded-lg px-3 py-2">
                          <Globe size={14} className="text-neutral-400 mr-2 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            value={slug}
                            onChange={(e) => {
                              setIsSlugCustomized(true)
                              setSlug(cleanSlugString(e.target.value))
                            }}
                            placeholder="mitienda"
                            className="w-full min-w-0 bg-transparent border-0 focus:border-0 outline-none focus:outline-none focus:ring-0 shadow-none p-0 text-xs font-mono font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-400"
                          />
                          <span className="text-xs font-mono text-neutral-400 ml-1 shrink-0 select-none">
                            .preziso.shop
                          </span>
                        </div>

                        <p className="text-[10px] text-neutral-400 leading-tight">
                          Escribe solo letras o números sin espacios. Este será el link para compartir tu tienda.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="space-y-2 w-full">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider ml-1">
                    WhatsApp de Atención
                  </label>
             <PhoneInput
                 variant="boxed"
                 required={false}
                 value={phone}
                 onChange={(fullPhone) => setPhone(fullPhone)}
               />
                </div>
                {/* CÓDIGO DE PARTNER / INVITACIÓN (OPCIONAL) */}
                <div className="space-y-2 w-full pt-1">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider ml-1">
                    Código de Partner / Invitación (Opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-white border border-neutral-200 rounded-xl px-4 py-2.5 focus-within:border-neutral-900 transition-colors">
                      <Tag size={15} className="text-neutral-400 mr-2.5 shrink-0" />
                      <input
                        type="text"
                        maxLength={20}
                        value={partnerCode}
                        onChange={(e) => {
                          setPartnerCode(
                            e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                          )
                          if (partnerFeedback) setPartnerFeedback(null)
                        }}
                        placeholder="EJ: SUPLESHOP"
                        className="w-full min-w-0 bg-transparent border-0 focus:border-0 outline-none focus:outline-none focus:ring-0 focus:shadow-none shadow-none p-0 text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 placeholder:font-normal placeholder:text-neutral-400/70"
                      />
                    </div>
                    {partnerCode.trim().length >= 3 && (
                      <button
                        type="button"
                        onClick={handleValidatePartnerCode}
                        disabled={checkingCode}
                        className="px-4 py-2.5 rounded-xl border border-neutral-900 bg-transparent hover:bg-neutral-900 text-neutral-900 hover:text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                      >
                        {checkingCode ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          'Validar'
                        )}
                      </button>
                    )}
                  </div>
                  {partnerFeedback && (
                    <p
                      className={`text-[11px] font-medium ml-1 ${partnerFeedback.valid ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                    >
                      {partnerFeedback.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 h-12 border border-neutral-200 text-neutral-600 rounded-xl font-medium text-sm hover:bg-neutral-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={loading || !storeName.trim() || !slug.trim() || phone.replace(/\D/g, '').length < 10}
                  className="flex-[2] h-12 bg-neutral-900 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-neutral-200 disabled:opacity-20 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "Lanzar Tienda"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}