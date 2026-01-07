'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr' // <--- LA CLAVE: Librería moderna
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Loader2, DollarSign, Tag, Ruler } from 'lucide-react'
import Link from 'next/link'

export default function NewProductPage() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [penalty, setPenalty] = useState('')
  const [category, setCategory] = useState('')
  const [sizes, setSizes] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Conexión Moderna (Lee las cookies correctamente)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Manejar selección de imagen
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
      // 1. Verificar Usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No estás logueado. Inicia sesión de nuevo.")

      // 2. Subir Imagen (Si existe)
      let imageUrl = null
      if (imageFile) {
        // Nombre único para la foto: usuario/timestamp.jpg
        const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('products') // Asegúrate de que este bucket exista en Supabase
          .upload(fileName, imageFile)

        if (uploadError) throw uploadError

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      // 3. Guardar Producto en Base de Datos
      const { error: insertError } = await supabase
        .from('products')
        .insert([
          {
            user_id: user.id,
            name: name,
            usd_cash_price: parseFloat(price),
            usd_penalty: penalty ? parseFloat(penalty) : 0, // Si está vacío es 0
            category: category,
            sizes: sizes,
            image_url: imageUrl
          }
        ])

      if (insertError) throw insertError

      // 4. Éxito
      alert('¡Producto creado con éxito!')
      router.push('/admin') // Volver al panel
      router.refresh()      // Refrescar para ver el producto nuevo

    } catch (error: any) {
      console.error(error)
      alert(error.message || "Ocurrió un error al crear el producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 bg-white rounded-full shadow-sm hover:scale-105 transition-transform text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- SUBIDA DE FOTO --- */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Foto del Producto
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all ${imagePreview ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
              >
                {imagePreview ? (
                  <img src={imagePreview} className="h-full w-full object-contain rounded-lg" />
                ) : (
                  <>
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <span className="text-sm text-gray-500 font-medium">Toca para subir foto</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* --- NOMBRE --- */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Nombre del Producto
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Creatina Monohidratada"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-black transition-all"
                required
              />
            </div>

            {/* --- PRECIOS (Grid) --- */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Precio ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input 
                    type="number" 
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all font-medium"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Penalty en Bs ($) <span className="text-gray-300 font-normal normal-case">(Opcional)</span>
                </label>
                <div className="relative">
                  <PlusSymbol /> {/* Icono pequeño custom abajo */}
                  <input 
                    type="number" 
                    step="0.01"
                    value={penalty}
                    onChange={(e) => setPenalty(e.target.value)}
                    placeholder="+ 0.00"
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all font-medium"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 leading-tight">
                  Se sumará al precio base solo para pagos en Bolívares.
                </p>
              </div>
            </div>

            {/* --- CATEGORÍA --- */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Categoría
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Zapatos / Sneakers / Suplementos"
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all"
                />
              </div>
            </div>

            {/* --- TALLAS / MEDIDAS --- */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Medidas / Tallas / Peso
              </label>
              <div className="relative">
                <Ruler className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  placeholder="Ej: S, M, L o 1kg, 500g, 40, 41"
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all"
                />
              </div>
            </div>

            {/* --- BOTÓN PUBLICAR --- */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-gray-200"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Publicar Producto'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

// Icono auxiliar
function PlusSymbol() {
  return <span className="absolute left-4 top-3 text-gray-400 font-bold text-lg">+</span>
}