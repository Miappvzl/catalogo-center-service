'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Loader2, DollarSign, Image as ImageIcon, Ruler, Tag, Percent, Plus } from 'lucide-react'
import Link from 'next/link'

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Lista de Categorías para cualquier negocio
const CATEGORIES = [
  "Zapatos / Sneakers",
  "Ropa y Moda",
  "Salud y Suplementos",
  "Tecnología y Electrónica",
  "Comida y Bebidas",
  "Hogar y Decoración",
  "Repuestos y Herramientas",
  "Juguetes y Niños",
  "Belleza y Cuidado Personal",
  "Otros"
]

export default function NewProduct() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [penalty, setPenalty] = useState('') // Nuevo campo
  const [sizes, setSizes] = useState('')     // Nuevo campo
  const [category, setCategory] = useState(CATEGORIES[0]) // Por defecto la primera
  
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No estás logueado')

      let imageUrl = null

      // 1. Subir Imagen (Si existe)
      if (imageFile) {
        const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('shoes')
          .upload(fileName, imageFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('shoes')
          .getPublicUrl(fileName)
        imageUrl = publicUrl
      }

      // 2. Guardar en Base de Datos
      const { error: dbError } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: name,
          usd_cash_price: parseFloat(price) || 0,
          usd_penalty: parseFloat(penalty) || 0, // <--- Guardamos el Penalty
          sizes: sizes,                          // <--- Guardamos las Tallas/Medidas
          category: category,
          image_url: imageUrl
        })

      if (dbError) throw dbError

      router.push('/admin')
      router.refresh()

    } catch (error) {
      console.error(error)
      alert('Error al crear el producto. Revisa la consola.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex justify-center pb-20">
      <div className="w-full max-w-lg">
        
        <div className="mb-6">
          <Link href="/admin" className="inline-flex items-center text-gray-500 hover:text-black transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Panel
          </Link>
          <h1 className="text-2xl font-bold mt-2">Nuevo Producto</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          
          {/* FOTO */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Foto del Producto</label>
            <div className="relative">
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition ${imagePreview ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">Toca para subir foto</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* NOMBRE */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Nombre del Producto</label>
            <input 
              type="text" 
              placeholder="Ej: Creatina Monohidratada" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
              required
            />
          </div>

          {/* PRECIOS Y PENALTY */}
          {/* BLOQUE DE PRECIOS (Precio Base + Penalty) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* 1. PRECIO BASE (El que se nos perdió) */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Precio ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full pl-8 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                  required
                />
              </div>
            </div>

            {/* 2. PENALTY (El que ya tienes bonito) */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                Penalty / Recargo en Bs ($) <span className="text-gray-300 font-normal lowercase">(opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={penalty}
                  onChange={e => setPenalty(e.target.value)}
                  className="w-full pl-8 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Se sumará al precio base solo para pagos en Bolívares.</p>
            </div>
          </div>

          {/* CATEGORÍA Y TALLAS */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Categoría</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="w-4 h-4 text-gray-400" />
                </div>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full pl-9 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none appearance-none bg-white transition"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Medidas / Tallas / Peso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Ruler className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Ej: S, M, L o 1kg, 500g, 40, 41" 
                  value={sizes}
                  onChange={e => setSizes(e.target.value)}
                  className="w-full pl-9 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>Subiendo... <Loader2 className="animate-spin w-5 h-5" /></>
            ) : (
              <>Publicar Producto <Upload className="w-5 h-5" /></>
            )}
          </button>

        </form>
      </div>
    </div>
  )
}