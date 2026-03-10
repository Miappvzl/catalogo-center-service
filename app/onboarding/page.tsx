'use client'

import { useState } from 'react'
import confetti from 'canvas-confetti'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Store, Loader2, ArrowRight, Smartphone, Globe, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Datos de la tienda
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')

  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Generador inteligente de URLs
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    // Limpia caracteres especiales y evita guiones duplicados
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
  }

  const handleNext = () => {
    if (step === 1 && name && slug) setStep(2)
  }

  const handleCreateStore = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      // 1. Validar si el slug existe (para no chocar con otra tienda)
      const { data: existing } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle()
      if (existing) {
        setLoading(false)
        return Swal.fire({ icon: 'error', title: 'Oops...', text: 'Esa URL ya está ocupada por otro negocio. Prueba añadiendo tu ciudad.', confirmButtonColor: '#000' })
      }

      // 2. Crear la tienda (Con 14 días de prueba)
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 14) // 14 DÍAS EXACTOS

      const { error } = await supabase.from('stores').insert([{
          user_id: user.id,
          name: name,
          slug: slug,
          phone: phone,
          currency_type: currency,
          subscription_status: 'trial',
          trial_ends_at: trialEndDate.toISOString()
      }])

      if (error) throw error

      // 3. Éxito: Animación de triunfo y al panel
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#000000', '#66cc00', '#741DF2'] // Tus colores de marca
      })

      Swal.fire({ 
        title: '¡Imperio creado!', 
        text: 'Preparando tu centro de comando...', 
        icon: 'success',
        showConfirmButton: false, 
        timer: 2500,
        buttonsStyling: false,
        customClass: { popup: 'rounded-3xl border border-gray-200' }
      })

      setTimeout(() => {
          router.refresh()
          router.push('/admin')
      }, 2500)

    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error fatal', text: error.message, confirmButtonColor: '#000' })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans overflow-hidden relative">
      
      {/* BACKGROUND DECORATION FLAT */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gray-200/50 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gray-200/50 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md relative">
        
        {/* INDICADOR DE PASOS */}
        <div className="flex justify-center gap-2 mb-8">
            <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`}></div>
            <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`}></div>
        </div>

        <AnimatePresence mode="wait">
          
          {/* TARJETA 1: IDENTIDAD */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="bg-white p-8 rounded-3xl border border-gray-200 flex flex-col gap-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto mb-4 border border-black">
                  <Globe size={24} />
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Nombra tu Imperio</h1>
                <p className="text-gray-500 text-sm mt-1 font-medium">¿Cómo se llamará tu tienda online?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre Comercial</label>
                  <input 
                    type="text" value={name} onChange={handleNameChange} placeholder="Ej: Zapatos Caracas"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-black focus:bg-white transition-all"
                    autoFocus
                  />
                </div>
                
                {/* PREVIEW DE URL EN TIEMPO REAL */}
                <div className={`transition-all duration-300 ${name ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Tu Enlace Público</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden px-4 py-3.5">
                    <span className="text-gray-400 font-medium text-sm">preziso.app/</span>
                    <span className="font-bold text-black text-sm truncate">{slug || '...'}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleNext} disabled={!name || !slug}
                className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
              >
                Continuar <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* TARJETA 2: OPERACIONES */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="bg-white p-8 rounded-3xl border border-gray-200 flex flex-col gap-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto mb-4 border border-black">
                  <Smartphone size={24} />
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Casi listo</h1>
                <p className="text-gray-500 text-sm mt-1 font-medium">¿Dónde recibirás tus ventas?</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">WhatsApp de Ventas</label>
                  <input 
                    type="tel" inputMode="numeric" pattern="[0-9]*" value={phone} 
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))} 
                    placeholder="Ej: 584140000000"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 focus:outline-none focus:border-black focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Usa código internacional (Ej: 58 para Venezuela)</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Moneda Principal</label>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrency('usd')} className={`flex-1 py-3.5 rounded-xl text-sm font-bold border transition-all ${currency === 'usd' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black'}`}>
                      Dólares (USD)
                    </button>
                    <button onClick={() => setCurrency('eur')} className={`flex-1 py-3.5 rounded-xl text-sm font-bold border transition-all ${currency === 'eur' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black'}`}>
                      Euros (EUR)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(1)} className="px-5 py-4 bg-gray-50 text-gray-600 font-bold rounded-xl border border-gray-200 hover:border-black transition-all active:scale-95">
                  Atrás
                </button>
                <button 
                  onClick={handleCreateStore} disabled={loading || !phone}
                  className="flex-1 bg-green-600 text-white font-bold py-4 rounded-xl border border-green-600 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <>Lanzar Tienda <CheckCircle2 size={18} /></>}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}