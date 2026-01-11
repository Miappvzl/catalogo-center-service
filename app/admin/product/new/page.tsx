'use client'

import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Loader2, DollarSign, Tag, Ruler } from 'lucide-react'
import Link from 'next/link'

// 1. IMPORTAMOS TU NUEVA UTILIDAD (Ajusta la ruta si es necesario)
import { uploadImageToSupabase } from '@/utils/supabaseStorage' 

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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 2. MEJORA EN LA SELECCIÓN (Protección contra errores en Android y Tamaño)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validación rápida de tamaño antes de mostrar preview (Mejora UX)
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen es muy pesada (Máximo 5MB).")
        e.target.value = "" // Limpiar input
        return
      }

      try {
        setImageFile(file)
        // Protegemos createObjectURL por si el archivo está corrupto en móviles
        const objectUrl = URL.createObjectURL(file)
        setImagePreview(objectUrl)
      } catch (error) {
        console.error("Error al previsualizar:", error)
        alert("No se pudo cargar la vista previa de esta imagen.")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Verificar Usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No estás logueado. Inicia sesión de nuevo.")

      // 2. SUBIDA DE IMAGEN (OPTIMIZADO CON TU NUEVA UTILIDAD)
      let imageUrl = null
      
      if (imageFile) {
        // ¡Magia! Todo el proceso complejo se reduce a esta línea:
        // (Cliente, Archivo, NombreBucket, CarpetaUsuario)
        imageUrl = await uploadImageToSupabase(supabase, imageFile, 'products', user.id)
      }

      // 3. Guardar Producto en Base de Datos
      const { error: insertError } = await supabase
        .from('products')
        .insert([
          {
            user_id: user.id,
            name: name,
            usd_cash_price: parseFloat(price),
            usd_penalty: penalty ? parseFloat(penalty) : 0,
            category: category,
            sizes: sizes,
            image_url: imageUrl
          }
        ])

      if (insertError) throw insertError

      // 4. Éxito
      alert('¡Producto creado con éxito!')
      router.push('/admin')
      router.refresh()

    } catch (error: any) {
      console.error(error)
      // Ahora si falla la subida por tamaño o nombre, el mensaje vendrá limpio desde tu utility
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

            {/* --- RESTO DEL FORMULARIO (Sin cambios, solo oculto para brevedad) --- */}
            {/* ... inputs de nombre, precio, categoría ... */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre del Producto</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Creatina Monohidratada" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-black transition-all" required />
            </div>

             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Precio ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all font-medium" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Penalty en Bs ($) <span className="text-gray-300 font-normal normal-case">(Opcional)</span></label>
                <div className="relative">
                  <PlusSymbol />
                  <input type="number" step="0.01" value={penalty} onChange={(e) => setPenalty(e.target.value)} placeholder="+ 0.00" className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all font-medium" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categoría</label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 text-gray-400" size={16} />
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Zapatos / Sneakers / Suplementos" className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Medidas / Tallas / Peso</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-3 text-gray-400" size={16} />
                <input type="text" value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Ej: S, M, L o 1kg, 500g, 40, 41" className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition-all" />
              </div>
            </div>


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

function PlusSymbol() {
  return <span className="absolute left-4 top-3 text-gray-400 font-bold text-lg">+</span>
}