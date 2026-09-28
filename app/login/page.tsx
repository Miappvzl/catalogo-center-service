// app/login/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { 
  Lock, 
  Mail, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import Swal from 'sweetalert2'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

// ============================================================================
// CONSTANTES Y CONFIGURACIONES ESTÁTICAS (FUERA DEL RENDER)
// ============================================================================
const VIEW_VARIANTS: Variants = {
  hidden: { 
    opacity: 0, 
    y: 10, 
    scale: 0.99,
    filter: 'blur(4px)' 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: 'blur(0px)',
    transition: { 
      type: 'spring', 
      stiffness: 380, 
      damping: 32,
      mass: 0.8
    } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    scale: 0.99,
    filter: 'blur(3px)', 
    transition: { 
      duration: 0.18, 
      ease: [0.32, 0, 0.67, 0] 
    } 
  }
}

const QUOTE_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1] 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -12, 
    filter: 'blur(4px)',
    transition: { 
      duration: 0.25 
    } 
  }
}

const SWEET_ALERT_CONFIG = {
  buttonsStyling: false,
  customClass: { 
    popup: 'rounded-[2rem] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-2xl border border-neutral-100 p-8', 
    confirmButton: 'bg-neutral-950 hover:bg-neutral-800 text-white px-8 py-3.5 rounded-xl font-medium mt-4 w-full transition-all active:scale-[0.98]',
    title: 'text-lg font-semibold text-neutral-950 tracking-tight',
    htmlContainer: 'text-sm text-neutral-500 font-normal leading-relaxed'
  }
}

/**
 * Traduce y humaniza los errores más comunes de Supabase Auth
 */
function mapAuthError(rawMessage: string): string {
  const msg = rawMessage.toLowerCase()
  if (msg.includes('invalid login credentials')) {
    return 'El correo o la contraseña que ingresaste no son correctos.'
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Este correo ya tiene una cuenta registrada. Por favor, inicia sesión.'
  }
  if (msg.includes('password should be at least')) {
    return 'La contraseña debe tener un mínimo de 6 caracteres.'
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Has realizado demasiados intentos en poco tiempo. Por seguridad, espera unos minutos.'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Error de conexión. Revisa tu conexión a internet e inténtalo de nuevo.'
  }
  return rawMessage
}

export default function LoginPage() {
  const router = useRouter()

  // 1. Cliente Supabase optimizado con instancia única
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    )
  }, [])

  // Estados del Formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Estados de Verificación OTP
  const [waitingOtp, setWaitingOtp] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  // 2. Manejador de Autenticación (Login & Registro)
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const sanitizedEmail = email.trim().toLowerCase()

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ 
          email: sanitizedEmail, 
          password 
        })
        if (error) throw error

        // Blindaje contra simulación de registro de correos ya existentes
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('Este correo ya está registrado. Por favor, inicia sesión.')
        }

        if (data.user && !data.session) {
          setWaitingOtp(true)
          setLoading(false)
          return
        }

        router.replace('/admin')
        router.refresh()

      } else {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: sanitizedEmail, 
          password 
        })
        if (error) throw error

        router.replace('/admin')
        router.refresh()
      }

    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Ocurrió un error inesperado.'
      const friendlyMessage = mapAuthError(rawMessage)

      Swal.fire({
        title: 'Verifica tus datos', 
        text: friendlyMessage, 
        icon: 'error', 
        confirmButtonText: 'Intentar de nuevo',
        ...SWEET_ALERT_CONFIG
      })
      setLoading(false)
    }
  }

  // 3. Manejador de Validación OTP
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading || otpCode.length !== 6) return
    setLoading(true)

    const sanitizedEmail = email.trim().toLowerCase()

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: sanitizedEmail,
        token: otpCode,
        type: 'signup'
      })

      if (error) throw error

      router.replace('/admin')
      router.refresh()

    } catch (err: unknown) {
      Swal.fire({
        title: 'Código incorrecto', 
        text: 'El código de 6 dígitos no coincide o ya ha vencido. Inténtalo de nuevo.', 
        icon: 'error', 
        confirmButtonText: 'Reintentar',
        ...SWEET_ALERT_CONFIG
      })
      setLoading(false)
    }
  }

  // Alternador de modo inteligente (Conserva el correo para evitar re-digitación)
  const toggleAuthMode = () => {
    setIsRegistering((prev) => !prev)
    setPassword('')
  }

  return (
    <main className="min-h-[100dvh] w-full bg-white flex flex-col lg:flex-row antialiased selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      
      {/* =====================================================================
          LADO IZQUIERDO: LIENZO EDGE-TO-EDGE CON GLOW AMBIENTAL
          ===================================================================== */}
      <section className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col justify-between p-6 sm:p-10 lg:p-16 xl:p-20 bg-white relative z-10 overflow-hidden">
        
        {/* Glow Profesional Superior Derecho */}
        <div 
          className="absolute -top-24 -right-24 w-80 sm:w-96 h-80 sm:h-96 rounded-full pointer-events-none -z-0"
          style={{
            background: 'radial-gradient(circle at 75% 25%, rgba(10, 10, 10, 0.12) 0%, rgba(10, 10, 10, 0.04) 45%, transparent 70%)'
          }}
        />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-neutral-900/10 via-neutral-500/5 to-transparent blur-3xl pointer-events-none -z-0" />

        {/* Cabecera: Logo Oficial de Preziso */}
        <header className="w-full flex items-center justify-between z-20">
          <a href="https://www.preziso.shop" className="block focus:outline-none transition-opacity hover:opacity-85">
            <Image
              src="/pezisologo.png"
              alt="Preziso"
              width={140}
              height={36}
              priority
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </a>
        </header>

        {/* Zona Central Dinámica */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-8 sm:py-10">
          <AnimatePresence mode="wait" initial={false}>
            {waitingOtp ? (
              
              /* -------------------------------------------------------------
                 VISTA: VERIFICACIÓN OTP
                 ------------------------------------------------------------- */
              <motion.div
                key="otp-step"
                variants={VIEW_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-950 mb-6">
                  <ShieldCheck size={24} strokeWidth={1.8} />
                </div>

                <div className="space-y-2 mb-8">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
                    Confirma tu correo
                  </h1>
                  <p className="text-sm text-neutral-500 leading-relaxed font-normal">
                    Ingresa el código de 6 dígitos que enviamos a <br />
                    <strong className="text-neutral-900 font-semibold">{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-3">
                    <label 
                      htmlFor="otp-input"
                      className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest block"
                    >
                      Código de verificación
                    </label>
                    
                    <div className="relative">
                      {/* Input táctil con sanitización en tiempo real */}
                      <input
                        id="otp-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
                        required
                      />

                      {/* Display visual de 6 dígitos */}
                      <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const digit = otpCode[idx] ?? ''
                          const isActive = otpCode.length === idx || (otpCode.length === 6 && idx === 5)
                          return (
                            <div 
                              key={idx}
                              className={`h-14 sm:h-16 rounded-xl border flex items-center justify-center text-lg sm:text-xl font-semibold transition-all duration-200 ${
                                digit 
                                  ? 'border-neutral-950 text-neutral-950 bg-white shadow-sm' 
                                  : 'border-neutral-200 bg-neutral-50 text-neutral-400'
                              } ${isActive ? 'ring-2 ring-neutral-950/10 border-neutral-950' : ''}`}
                            >
                              {digit}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full h-13 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span>Verificar y entrar a mi tienda</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setWaitingOtp(false); setOtpCode(''); }}
                    className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-neutral-950 transition-colors group"
                  >
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Corregir correo
                  </button>
                </div>
              </motion.div>

            ) : (

              /* -------------------------------------------------------------
                 VISTA: LOGIN / REGISTRO
                 ------------------------------------------------------------- */
              <motion.div
                key={`auth-form-${isRegistering ? 'register' : 'login'}`}
                variants={VIEW_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full"
              >
                {/* Títulos Asimétricos */}
                <div className="space-y-2 mb-8">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest block">
                    {isRegistering ? 'Nueva Tienda' : 'Panel de Administración'}
                  </span>

                  <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950">
                    {isRegistering ? 'Crea tu tienda online.' : 'Bienvenido de vuelta.'}
                  </h1>

                  <p className="text-sm text-neutral-500 font-normal leading-relaxed">
                    {isRegistering 
                      ? 'Empieza a vender por WhatsApp en minutos. Sin descuadres ni tarjetas de crédito.'
                      : 'Ingresa para gestionar tu catálogo, ventas del día y pedidos.'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  {/* Correo Electrónico */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="auth-email"
                      className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest block pl-0.5"
                    >
                      Correo electrónico
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-950 transition-colors pointer-events-none">
                        <Mail size={17} strokeWidth={2} />
                      </div>
                      <input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@negocio.com"
                        required
                        className="w-full h-13 pl-11 pr-4 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-sm placeholder:text-neutral-400 focus:bg-white focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Contraseña con Ojito Toggle */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="auth-password"
                      className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest block pl-0.5"
                    >
                      Contraseña
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-950 transition-colors pointer-events-none">
                        <Lock size={17} strokeWidth={2} />
                      </div>
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        required
                        className="w-full h-13 pl-11 pr-11 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 text-sm placeholder:text-neutral-400 focus:bg-white focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-900 transition-colors focus:outline-none rounded-lg"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff size={18} strokeWidth={2} />
                        ) : (
                          <Eye size={18} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Botón Principal */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-13 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)] mt-2 group"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span>{isRegistering ? 'Crear mi tienda gratis' : 'Entrar a mi tienda'}</span>
                        <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                {/* Alternador de Modo */}
                <div className="mt-8 pt-6 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-500">
                    {isRegistering ? '¿Ya tienes tienda?' : '¿Aún no tienes tienda?'}
                  </span>
                  
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="font-semibold text-neutral-950 hover:underline underline-offset-4 decoration-neutral-300 transition-all"
                  >
                    {isRegistering ? 'Inicia sesión' : 'Registrarme gratis'}
                  </button>
                </div>

                {/* CITA EDITORIAL DE AUTOR (SIN CAJA, PURA TIPOGRAFÍA) */}
                <div className="lg:hidden mt-8 flex flex-col">
                  <span className="text-5xl font-serif font-black text-neutral-950 leading-none select-none">
                    “
                  </span>
                  
                  <p className="text-[13px] text-neutral-700 leading-relaxed font-normal">
                    {isRegistering 
                      ? 'Construído con una sola meta: que ningún comerciante en Venezuela vuelva a perder una venta por el desorden de las tasas o WhatsApp. Este sistema lo hicimos para ti.'
                      : 'Tu catálogo listo, tus tasas al día y el control de tus ventas. Hoy es otro día para abrir santamaría y seguir creciendo.'}
                  </p>

                 
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Seguro y Estable */}
        <footer className="w-full pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400 text-center sm:text-left z-20">
          <span>&copy; {new Date().getFullYear()} Preziso</span>
          <span>Hecho para el comercio venezolano</span>
        </footer>

      </section>

      {/* =====================================================================
          LADO DERECHO: PANEL INSPIRACIONAL DESKTOP (OBSIDIANA & MANIFIESTO)
          ===================================================================== */}
      <section className="hidden lg:flex lg:w-1/2 min-h-[100dvh] bg-neutral-950 relative overflow-hidden flex-col justify-center items-center p-16 xl:p-24 border-l border-neutral-900">
        
        {/* Destellos de iluminación suave en Obsidiana */}
        <div className="absolute top-1/4 -right-20 w-[450px] h-[450px] bg-neutral-800/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-neutral-900/40 rounded-full blur-[140px] pointer-events-none" />

        {/* Retícula sutil milimétrica */}
        <div 
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Manifiesto Editorial Centrado */}
        <div className="relative z-10 max-w-lg w-full">
          <AnimatePresence mode="wait">
            {isRegistering ? (
              
              /* Manifiesto: Registro */
              <motion.div
                key="quote-register"
                variants={QUOTE_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-8"
              >
                <div className="space-y-5">
                  <span className="text-4xl xl:text-5xl font-serif text-neutral-600 leading-none select-none block">
                    “
                  </span>
                  
                  <h2 className="text-2xl sm:text-3xl xl:text-4xl font-normal text-neutral-100 tracking-tight leading-[1.3]">
                    La tecnología debe adaptarse a nuestra cultura, <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400">no al revés.</span>
                  </h2>

                  <p className="text-neutral-400 text-sm sm:text-base leading-relaxed font-light">
                    Transformamos el caos multimoneda, la inestabilidad de las tasas y el desorden de WhatsApp en una plataforma intuitiva y elegante para vender sin límites.
                  </p>
                </div>

                {/* Firma del Fundador */}
                <div className="pt-6 border-t border-neutral-800/80 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-200 shadow-sm">
                    A
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-200 tracking-tight">Ángel Gabriel Ojeda Medina</h3>
                    <p className="text-xs text-neutral-400">Fundador & Arquitecto Principal</p>
                  </div>
                </div>
              </motion.div>

            ) : (

              /* Manifiesto: Login */
              <motion.div
                key="quote-login"
                variants={QUOTE_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-8"
              >
                <div className="space-y-5">
                  <span className="text-4xl xl:text-5xl font-serif text-neutral-600 leading-none select-none block">
                    “
                  </span>
                  
                  <h2 className="text-2xl sm:text-3xl xl:text-4xl font-normal text-neutral-100 tracking-tight leading-[1.3]">
                    Preziso no es solo un software; es un motor diseñado para <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400">acelerar el crecimiento de nuestro país.</span>
                  </h2>

                  <p className="text-neutral-400 text-sm sm:text-base leading-relaxed font-light">
                    Cobros en dólares, Zelle y Pago Móvil sin descuadres de caja. Tu catálogo sincronizado y listo para tu próxima venta.
                  </p>
                </div>

                {/* Firma del Fundador */}
                <div className="pt-6 border-t border-neutral-800/80 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sm font-semibold text-neutral-200 shadow-sm">
                    A
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-200 tracking-tight">Ángel Gabriel Ojeda Medina</h3>
                    <p className="text-xs text-neutral-400">Fundador & Arquitecto Principal</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </section>

    </main>
  )
}