'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js' // <--- IMPORTACIÓN CORREGIDA
import { useRouter } from 'next/navigation'

// Inicializamos cliente manual (Igual que en Login/Registro)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SetupStore() {
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert("No estás autenticado")
      router.push('/login')
      return
    }

    // 2. Guardar tienda
    // Formateamos el slug para que sea url-amigable (ej: "Mi Tienda" -> "mi-tienda")
    const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-')

    const { error } = await supabase.from('stores').insert({
      user_id: user.id,
      slug: cleanSlug,
      name: name
    })

    if (error) {
      console.error(error)
      alert('Error: Ese link ya está en uso o hubo un problema.')
      setLoading(false)
    } else {
      alert('¡Tienda Creada!')
      // Redirigir al Admin o directamente a ver su tienda
      router.push('/admin') 
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100">
        <h1 className="text-2xl font-bold mb-2 text-center">Configura tu Link 🔗</h1>
        <p className="text-gray-500 mb-8 text-sm text-center">Elige cómo te encontrarán tus clientes.</p>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Nombre del Negocio</label>
            <input 
              type="text" 
              placeholder="Ej: Zapatería Center"
              className="w-full border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Tu URL Personalizada</label>
            <div className="flex items-center">
              <span className="bg-gray-100 border border-r-0 border-gray-200 p-4 rounded-l-xl text-gray-500 text-sm font-mono">qatalog.com/</span>
              <input 
                type="text" 
                placeholder="zapateria-center"
                className="w-full border border-gray-200 p-4 rounded-r-xl font-mono text-sm focus:ring-2 focus:ring-black outline-none transition"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">Se usará para tu link oficial.</p>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Creando Tienda...' : 'Generar mi Link Oficial'}
          </button>
        </form>
      </div>
    </div>
  )
}