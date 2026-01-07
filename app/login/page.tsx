'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, UserPlus, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('') // Mensaje para cuando se registra
  
  // ESTADO NUEVO: ¿Está intentando registrarse?
  const [isRegistering, setIsRegistering] = useState(false)

  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (isRegistering) {
        // --- LÓGICA DE REGISTRO ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // Opcional: Esto evita que Supabase pida confirmar email si lo tienes desactivado
          // options: { emailRedirectTo: `${location.origin}/auth/callback` } 
        })

        if (error) throw error

        // Si Supabase pide confirmación de correo (por defecto es así)
        if (data.user && !data.session) {
           setSuccessMsg('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta antes de entrar.')
           setLoading(false)
           return // No redirigimos todavía
        }
        
        // Si el registro loguea directo (Email Confirm desactivado)
        router.refresh()
        router.push('/admin')

      } else {
        // --- LÓGICA DE LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.refresh()
        router.push('/admin')
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 transition-all">
        
        {/* HEADER DINÁMICO */}
        <div className="text-center mb-8">
          <div className={`text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-200 transition-colors ${isRegistering ? 'bg-blue-600' : 'bg-black'}`}>
            {isRegistering ? <UserPlus size={24} /> : <Lock size={24} />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRegistering ? 'Crear Cuenta Nueva' : 'Bienvenido de nuevo'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isRegistering ? 'Empieza a vender hoy mismo' : 'Ingresa a tu panel de control'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 text-gray-800">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="Minimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
          </div>

          {/* MENSAJES DE ESTADO */}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium text-center">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100 font-medium text-center">
              {successMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${isRegistering ? 'bg-blue-600' : 'bg-black'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Registrarse' : 'Ingresar')}
          </button>
        </form>

        {/* SWITCH LOGIN / REGISTER */}
        <div className="mt-6 text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering)
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className="ml-2 font-bold text-black hover:underline focus:outline-none"
            >
              {isRegistering ? 'Inicia Sesión' : 'Regístrate aquí'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}