'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Upload, Loader2, DollarSign, Tag, Ruler, Save } from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'

// 1. IMPORTAMOS LA UTILIDAD DE SEGURIDAD
import { uploadImageToSupabase } from '@/utils/supabaseStorage'

export default function EditProductPage() {
  const params = useParams()
  const id = params.id 

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [penalty, setPenalty] = useState('')
  const [category, setCategory] = useState('')
  const [sizes, setSizes] = useState('')
  
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true) 
  const [saving, setSaving] = useState(false) 
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. CARGAR DATOS (Sin cambios mayores)
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        setName(product.name)
        setPrice(product.usd_cash_price)
        setPenalty(product.usd_penalty || '')
        setCategory(product.category)
        setSizes(product.sizes || '')
        
        if (product.image_url) {
          setCurrentImageUrl(product.image_url)
          setImagePreview(product.image_url)
        }

      } catch (error) {
        console.error(error)
        Swal.fire('Error', 'No se pudo cargar el producto', 'error')
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchProduct()
  }, [id, supabase, router])

  // 2. MANEJO DE IMAGEN SEGURO (Validación de tamaño + Android Fix)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // A. Validación de Tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
         Swal.fire('Archivo muy pesado', 'La imagen no debe superar los 5MB', 'warning')
         e.target.value = "" // Reset del input
         return
      }

      // B. Protección de Preview
      try {
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
      } catch (error) {
        console.error(error)
        Swal.fire('Error', 'No se pudo leer la imagen seleccionada', 'error')
      }
    }
  }

  // 3. GUARDAR CAMBIOS
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sesión expirada")

      // Lógica de Imagen Simplificada:
      let finalImageUrl = currentImageUrl // Por defecto, mantenemos la anterior

      if (imageFile) {
        // --- AQUÍ USAMOS TU FUNCIÓN SEGURA ---
        // Esto sanitiza el nombre y valida errores automáticamente
        finalImageUrl = await uploadImageToSupabase(supabase, imageFile, 'products', user.id)
      }

      // Actualizar en Base de Datos
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name,
          usd_cash_price: parseFloat(price),
          usd_penalty: penalty ? parseFloat(penalty) : 0,
          category,
          sizes,
          image_url: finalImageUrl
        })
        .eq('id', id)

      if (updateError) throw updateError

      Swal.fire({
        title: '¡Actualizado!',
        text: 'El producto se ha modificado correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })

      router.push('/admin')
      router.refresh()

    } catch (error: any) {
      console.error(error)
      // Si la función uploadImageToSupabase falla, el mensaje llega aquí limpio
      Swal.fire('Error', error.message || 'Error al actualizar', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 bg-white rounded-full shadow-sm hover:scale-105 transition-transform text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Editar Producto</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* FOTO */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Foto del Producto</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition overflow-hidden relative"
              >
                {imagePreview ? (
                  <img src={imagePreview} className="h-full w-full object-contain" />
                ) : (
                  <Upload className="text-gray-400" size={32} />
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 flex items-center justify-center transition-colors group">
                    <span className="opacity-0 group-hover:opacity-100 bg-black/50 text-white text-xs px-2 py-1 rounded">Cambiar foto</span>
                </div>
              </div>
            </div>

            {/* NOMBRE */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre</label>
              <input 
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-black"
                required
              />
            </div>

            {/* PRECIOS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Precio ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Penalty Bs ($)</label>
                <input type="number" step="0.01" value={penalty} onChange={(e) => setPenalty(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black" />
              </div>
            </div>

            {/* CATEGORIA Y TALLAS */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categoría</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tallas / Detalles</label>
                    <div className="relative">
                        <Ruler className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input value={sizes} onChange={(e) => setSizes(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black" />
                    </div>
                </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" /> : <> <Save size={18}/> Guardar Cambios</>}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}