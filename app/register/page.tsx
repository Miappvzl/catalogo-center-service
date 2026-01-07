'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  // Creamos el cliente manualmente usando tus variables de entorno
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        // Registro exitoso -> Al Admin
        router.push('/admin')
        router.refresh()
      }
    } catch (err) {
      setError('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Crea tu Tienda
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Empieza a vender online en segundos.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="-space-y-px rounded-md">
            {/* Campos separados para mejor estética */}
            <div className="mb-4">
              <label htmlFor="email-address" className="block text-xs font-bold text-gray-500 uppercase mb-2">Correo electrónico</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-xl border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 bg-gray-50"
                placeholder="(ej: tienda@gmail.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase mb-2">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full rounded-xl border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 bg-gray-50"
                placeholder="(mínimo 6 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium">
              ⚠️ {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-black px-3 py-3.5 text-sm font-bold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-70 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                "Crear mi cuenta gratis"
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <p className="text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-black hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}