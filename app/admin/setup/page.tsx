'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr' // <--- CAMBIO: Usamos la librería moderna
import { useRouter } from 'next/navigation'
import { Store, Loader2, ArrowRight } from 'lucide-react'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // CAMBIO: Usamos createBrowserClient igual que en el Admin y Login
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    setSlug(val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''))
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
         router.push('/login')
         return
      }

      // 1. Verificar si el slug ya existe
      const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .maybeSingle() // Usamos maybeSingle para evitar errores en consola

      if (existing) {
        alert('¡Esa URL ya está ocupada! Prueba con otra.')
        setLoading(false)
        return
      }

      // 2. Crear la tienda
      const { error } = await supabase
        .from('stores')
        .insert([
          {
            user_id: user.id,
            name: name,
            slug: slug,
            currency_type: 'usd',
            phone: ''
          }
        ])

      if (error) throw error

      // 3. Éxito: Refrescamos y vamos al Admin
      router.refresh()
      router.push('/admin')

    } catch (error: any) {
      console.error(error)
      alert('Error creando la tienda: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        <div className="text-center mb-8">
          <div className="bg-black text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nombra tu Imperio</h1>
          <p className="text-gray-500 text-sm mt-1">Configura la URL de tu tienda para empezar.</p>
        </div>

        <form onSubmit={handleCreateStore} className="space-y-6">
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nombre de la Tienda</label>
            <input 
              type="text" 
              value={name}
              onChange={handleNameChange}
              placeholder="Ej: Zapatos Caracas"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tu URL (Link)</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3">
              <span className="text-gray-400 text-sm border-r border-gray-200 pr-2 mr-2">preziso...app/</span>
              <input 
                type="text" 
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/ /g, '-'))}
                className="w-full py-3 bg-transparent focus:outline-none font-medium text-black"
                placeholder="zapatos-caracas"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !name || !slug}
            className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Crear Tienda <ArrowRight size={18} /></>}
          </button>

        </form>
      </div>
    </div>
  )
}