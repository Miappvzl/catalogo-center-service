'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, UserPlus, ArrowRight, MailCheck, RefreshCw } from 'lucide-react'
import Swal from 'sweetalert2'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // NUEVO ESTADO: Sala de espera
  const [waitingEmail, setWaitingEmail] = useState(false)

  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user && !data.session) {
          // Congelamos la pantalla en la "Sala de espera"
          setWaitingEmail(true)
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
        buttonsStyling: false, customClass: { popup: 'rounded-3xl', confirmButton: 'bg-black text-white px-6 py-3 rounded-xl font-bold mt-4 w-full' }
      })
      setLoading(false)
    }
  }

  // FUNCIÓN CROSS-DEVICE: Intenta hacer login silencioso
  const checkSession = async () => {
    setLoading(true)

    // Intentamos iniciar sesión con los datos que tenemos en memoria
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Si el error es específicamente que el correo no está confirmado
      if (error.message.includes('Email not confirmed')) {
        Swal.fire({ 
          title: 'Aún no confirmado', 
          text: 'No hemos detectado la confirmación en nuestro servidor. ¿Seguro que hiciste clic en el enlace?', 
          icon: 'info', 
          confirmButtonText: 'Entendido', 
          buttonsStyling: false, 
          customClass: { popup: 'rounded-3xl border border-gray-200', confirmButton: 'bg-black text-white px-6 py-3 rounded-xl font-bold mt-4 w-full' }
        })
      } else {
        // Si hay otro error (ej. se cayó el internet)
        Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#000' })
      }
      setLoading(false)
    } else {
      // ¡ÉXITO! Supabase verificó que el correo fue confirmado en otro dispositivo y nos dio acceso
      router.refresh()
      router.push('/admin')
    }
  }
  // RENDERIZADO CONDICIONAL: Sala de Espera
  if (waitingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 font-sans relative">
        <div className="bg-white p-10 rounded-3xl w-full max-w-md border border-gray-200 text-center relative z-10 shadow-sm">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MailCheck size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Revisa tu correo</h1>
          <p className="text-sm font-medium text-gray-500 mb-8">
            Hemos enviado un enlace mágico a <b className="text-black">{email}</b>. 
            Haz clic en él desde tu teléfono o PC para activar tu cuenta.
          </p>
          <button 
            onClick={checkSession} disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <> <RefreshCw size={18} /> Ya confirmé, entrar </>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4 font-sans relative overflow-hidden">
      
      {/* BACKGROUND DECORATION FLAT */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gray-200/50 rounded-full blur-3xl -z-10"></div>
      
      <div className="bg-white p-8 md:p-10 rounded-3xl w-full max-w-md border border-gray-200 transition-all z-10">

        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="text-white w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-5 border border-black transition-transform hover:scale-105">
            {isRegistering ? <UserPlus size={26} strokeWidth={2.5} /> : <Lock size={26} strokeWidth={2.5} />}
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isRegistering ? 'Únete a Preziso' : 'Bienvenido de nuevo'}
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">
            {isRegistering ? 'Empieza a vender hoy mismo' : 'Ingresa a tu panel de control'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:border-black focus:bg-white transition-all"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:border-black focus:bg-white transition-all"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? <>Crear Cuenta <ArrowRight size={18}/></> : 'Ingresar')}
          </button>
        </form>

        {/* SWITCH LOGIN / REGISTER (Minimalista) */}
        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-500">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setEmail('')
                setPassword('')
              }}
              className="ml-2 font-black text-black hover:text-gray-600 transition-colors focus:outline-none uppercase tracking-wide text-xs"
            >
              {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}