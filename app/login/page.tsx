// app/login/page.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, UserPlus, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react'
import Swal from 'sweetalert2'
import { motion, AnimatePresence, Variants } from 'framer-motion'

export default function LoginPage() {
  // 2. Aplica el tipo Variants explícitamente
const viewVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 15, 
    scale: 0.98, 
    filter: 'blur(4px)' 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    filter: 'blur(0px)', 
    transition: { 
      type: "spring", // TypeScript ahora validará esto correctamente como literal
      stiffness: 400, 
      damping: 30 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -15, 
    scale: 0.98, 
    filter: 'blur(4px)', 
    transition: { 
      duration: 0.2, 
      ease: "easeIn" 
    } 
  }
}
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Estados: Verificación OTP
  const [waitingOtp, setWaitingOtp] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Configuración premium para SweetAlert
  const sweetAlertConfig = {
    buttonsStyling: false,
    customClass: { 
      popup: 'rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] bg-white/95 backdrop-blur-xl border border-zinc-100', 
      confirmButton: 'bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-3.5 rounded-xl font-medium mt-4 w-full transition-all active:scale-[0.98]',
      title: 'text-xl font-semibold text-zinc-900 tracking-tight',
      htmlContainer: 'text-sm text-zinc-500 font-medium'
    }
  }

// 1. MANEJADOR DE LOGIN Y REGISTRO (Blindado)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        // 🚀 BLINDAJE: Detecta si Supabase está simulando un registro para un correo que ya existe
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('Este correo ya está registrado. Por favor, inicia sesión.')
        }

        if (data.user && !data.session) {
          setWaitingOtp(true)
          setLoading(false)
          return
        }

        router.refresh()
        router.push('/admin')

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        router.refresh()
        router.push('/admin')
      }

    } catch (err: any) {
      // Manejo de errores preciso
      let errorMessage = err.message
      if (err.message === 'Invalid login credentials') {
        errorMessage = 'Las credenciales ingresadas no son válidas.'
      }

      Swal.fire({
        title: 'Acceso denegado', 
        text: errorMessage, 
        icon: 'error', 
        confirmButtonText: 'Reintentar',
        buttonsStyling: false,
        customClass: { 
          popup: 'rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] bg-white/95 backdrop-blur-xl border border-zinc-100', 
          confirmButton: 'bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-3.5 rounded-xl font-medium mt-4 w-full transition-all active:scale-[0.98]',
          title: 'text-xl font-semibold text-zinc-900 tracking-tight',
          htmlContainer: 'text-sm text-zinc-500 font-medium'
        }
      })
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup'
      })

      if (error) throw error

      router.refresh()
      router.push('/admin')

    } catch (err: any) {
      Swal.fire({
        title: 'Código Inválido', 
        text: 'El código ingresado es incorrecto o ha expirado.', 
        icon: 'error', 
        confirmButtonText: 'Reintentar',
        ...sweetAlertConfig
      })
      setLoading(false)
    }
  }

  // Variantes de animación para fluidez absoluta
 

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#FAFAFA] p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-zinc-200 selection:text-zinc-900">
      
      {/* Luces ambientales abstractas (No molestan, aportan profundidad óptica) */}
      <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-zinc-200/40 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-zinc-200/30 rounded-full blur-[80px] -z-10 pointer-events-none" />

      <AnimatePresence mode="wait">
        {waitingOtp ? (
          /* ========================================================
             VISTA OTP (HIGH-END)
             ======================================================== */
          <motion.div
            key="otp-view"
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white/80 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] w-full max-w-[420px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] border border-white/60 text-center flex flex-col items-center z-10"
          >
            <div className="w-14 h-14 bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.1)] mb-8">
              <ShieldCheck size={26} className="text-white/90" strokeWidth={1.5} />
            </div>
            
            <div className="flex flex-col gap-1.5 mb-10">
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Verifica tu identidad</h1>
              <p className="text-sm font-medium text-zinc-500 leading-relaxed">
                Hemos enviado un código a <br/>
                <span className="text-zinc-900 font-semibold">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-8">
             <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-4xl tracking-[0.5em] font-medium text-zinc-900 py-6 bg-white border border-zinc-200/80 rounded-2xl outline-none transition-all duration-300 placeholder:text-zinc-300 hover:border-zinc-300 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] focus:border-zinc-900 focus:ring-[3px] focus:ring-zinc-900/5 focus:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]"
                placeholder="000000"
                required
              />
              
              <button 
                type="submit" 
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-zinc-900 text-white text-sm font-medium h-14 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Validar acceso'}
              </button>
            </form>
            
            <button 
              type="button"
              onClick={() => { setWaitingOtp(false); setOtpCode(''); }}
              className="mt-8 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
              Modificar correo
            </button>
          </motion.div>
        ) : (
          /* ========================================================
             VISTA LOGIN / REGISTER (HIGH-END)
             ======================================================== */
          <motion.div
            key={`auth-view-${isRegistering}`}
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white/80 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] w-full max-w-[420px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] border border-white/60 z-10"
          >
            {/* Cabecera Editorial */}
            <div className="text-center mb-10 flex flex-col items-center gap-5">
              <div className="w-14 h-14 bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                {isRegistering ? <UserPlus size={24} className="text-white/90 relative z-10" strokeWidth={1.5} /> : <Lock size={24} className="text-white/90 relative z-10" strokeWidth={1.5} />}
              </div>
              
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                  {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
                </h1>
                <p className="text-sm font-medium text-zinc-500">
                  {isRegistering ? 'El sistema operativo de tu comercio' : 'Accede a tu panel de administración'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              
              {/* Campo: Correo */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 group-focus-within:text-zinc-900 transition-colors duration-300">
                    <Mail size={18} strokeWidth={2} />
                  </div>
                 <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 h-14 bg-white border border-zinc-200/80 rounded-2xl text-base font-medium text-zinc-900 outline-none transition-all duration-300 placeholder:text-zinc-400 placeholder:font-normal hover:border-zinc-300 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] focus:border-zinc-900 focus:ring-[3px] focus:ring-zinc-900/5 focus:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]"
                    placeholder="nombre@ejemplo.com"
                    required
                  />
                </div>
              </div>

              {/* Campo: Contraseña */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                  Contraseña
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 group-focus-within:text-zinc-900 transition-colors duration-300">
                    <Lock size={18} strokeWidth={2} />
                  </div>
                 <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 h-14 bg-white border border-zinc-200/80 rounded-2xl text-base font-medium text-zinc-900 outline-none transition-all duration-300 placeholder:text-zinc-400 placeholder:font-normal hover:border-zinc-300 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] focus:border-zinc-900 focus:ring-[3px] focus:ring-zinc-900/5 focus:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {/* Acción Principal */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 text-white text-sm font-medium h-14 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 mt-2 shadow-[0_4px_14px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {isRegistering ? 'Continuar' : 'Acceder al panel'}
                    <ArrowRight size={16} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                  </>
                )}
              </button>
            </form>

            {/* Selector de Modo */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering)
                  setEmail('')
                  setPassword('')
                }}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors focus:outline-none"
              >
                {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}{' '}
                <span className="font-bold underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 transition-colors">
                  {isRegistering ? 'Inicia Sesión' : 'Regístrate aquí'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}