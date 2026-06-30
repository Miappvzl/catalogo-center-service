// app/login/page.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react'
import Swal from 'sweetalert2'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // NUEVOS ESTADOS: Verificación OTP
  const [waitingOtp, setWaitingOtp] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. MANEJADOR DE LOGIN Y REGISTRO
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegistering) {
        // En registro, Supabase enviará automáticamente el {{ .Token }} si configuraste el Email Template
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user && !data.session) {
          // Cambiamos a la vista de validación de 6 dígitos
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
      const errorMessage = err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err.message
      Swal.fire({
        title: 'Acceso denegado', text: errorMessage, icon: 'error', confirmButtonText: 'Intentar de nuevo',
        buttonsStyling: false, customClass: { popup: 'rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white border-0', confirmButton: 'bg-black text-white px-6 py-4 rounded-xl font-bold mt-4 w-full' }
      })
      setLoading(false)
    }
  }

  // 2. MANEJADOR DE VERIFICACIÓN OTP
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

      // Si es exitoso, la sesión se establece automáticamente
      router.refresh()
      router.push('/admin')

    } catch (err: any) {
      Swal.fire({
        title: 'Código Inválido', text: 'El código ingresado es incorrecto o ha expirado.', icon: 'error', confirmButtonText: 'Intentar de nuevo',
        buttonsStyling: false, customClass: { popup: 'rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white border-0', confirmButton: 'bg-black text-white px-6 py-4 rounded-xl font-bold mt-4 w-full' }
      })
      setLoading(false)
    }
  }

  // RENDERIZADO CONDICIONAL: Vista de Verificación OTP
  if (waitingOtp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans">
        <div className="bg-white p-10 rounded-3xl w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center gap-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
            <ShieldCheck size={32} className="text-white" strokeWidth={2} />
          </div>
          
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black text-black tracking-tight">Código de Seguridad</h1>
            <p className="text-sm font-medium text-black/60">
              Ingresa el código de 6 dígitos que enviamos a <br/><b className="text-black">{email}</b>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-8">
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // Solo números
              className="w-full text-center text-4xl tracking-[0.5em] font-black text-black py-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl outline-none border border-transparent focus:border-black transition-all placeholder:text-black/10"
              placeholder="000000"
              required
            />
            
            <button 
              type="submit" 
              disabled={loading || otpCode.length !== 6}
              className="w-full bg-black text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-black/90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'Verificar y Entrar'}
            </button>
          </form>
          
          <button 
            type="button"
            onClick={() => { setWaitingOtp(false); setOtpCode(''); }}
            className="text-xs font-bold text-black/40 hover:text-black transition-colors uppercase tracking-widest"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  // RENDERIZADO PRINCIPAL: Login / Register (Estética Clean Look estricta)
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 font-sans relative overflow-hidden">
      
      {/* BACKGROUND DECORATION SOFT */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-black/[0.02] rounded-full blur-3xl -z-10"></div>
      
      <div className="bg-white p-8 md:p-12 rounded-3xl w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all z-10">

        {/* HEADER */}
        <div className="text-center mb-10 flex flex-col items-center gap-4">
          <div className="text-white w-16 h-16 bg-black rounded-2xl flex items-center justify-center transition-transform hover:scale-105 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            {isRegistering ? <UserPlus size={28} strokeWidth={2} /> : <Lock size={28} strokeWidth={2} />}
          </div>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">
              {isRegistering ? 'Únete a Preziso' : 'Bienvenido'}
            </h1>
            <p className="text-black/50 text-sm mt-2 font-medium">
              {isRegistering ? 'El sistema operativo de tu tienda' : 'Ingresa a tu panel de control'}
            </p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-black/40" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-transparent rounded-2xl text-base font-semibold text-black focus:outline-none focus:border-black transition-all placeholder:text-black/20"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-black/40 uppercase tracking-widest ml-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-black/40" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-transparent rounded-2xl text-base font-semibold text-black focus:outline-none focus:border-black transition-all placeholder:text-black/20"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-5 rounded-2xl hover:bg-black/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (isRegistering ? <>Crear Cuenta <ArrowRight size={20}/></> : 'Ingresar')}
          </button>
        </form>

        {/* SWITCH LOGIN / REGISTER */}
        <div className="mt-10 text-center">
          <p className="text-sm font-medium text-black/50">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setEmail('')
                setPassword('')
              }}
              className="ml-2 font-black text-black hover:text-black/70 transition-colors focus:outline-none uppercase tracking-wide text-xs"
            >
              {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}