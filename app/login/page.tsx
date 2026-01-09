'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, UserPlus } from 'lucide-react'
import Swal from 'sweetalert2'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

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
        // --- REGISTRO ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user && !data.session) {
          // ALERTA DE ÉXITO (Confirmar correo)
          Swal.fire({
            title: '¡Cuenta creada!',
            text: 'Revisa tu correo para confirmar tu cuenta, luego vuelve aqui .',
            icon: 'success',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#000000',
            backdrop: true,
            allowOutsideClick: false
          })
          
          setLoading(false)
          return
        }

        router.refresh()
        router.push('/admin')

      } else {
        // --- LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.refresh()
        router.push('/admin')
      }

    } catch (err: any) {
      // --- ALERTA DE ERROR (Aquí está el cambio) ---
      // Esto reemplaza al texto rojo. Ahora todo es SweetAlert.
      Swal.fire({
        title: 'Error',
        text: err.message || 'Ocurrió un error inesperado',
        icon: 'error',
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: '#000000', // Mantenemos tu branding negro
      })
      
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 transition-all">

        {/* HEADER */}
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

          {/* YA NO HAY DIVS DE MENSAJES AQUÍ, EL DISEÑO QUEDA LIMPIO */}

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
                // Ya no necesitamos limpiar errorMsg aquí porque no existe
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