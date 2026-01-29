'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Upload, Plus, Save, Loader2, DollarSign, Layers, Tag, Image as ImageIcon, Trash2, X, Package, Box, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

interface ProductEditorProps {
  productId?: string
}

export default function ProductEditor({ productId }: ProductEditorProps) {
  const router = useRouter()
  const supabase = getSupabase()
  
  // Referencias para Inputs de Archivo ocultos
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const variantImageInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(!!productId)
  const [saving, setSaving] = useState(false)
  const [rate, setRate] = useState(0)
  const [uploading, setUploading] = useState(false) 

  // --- ESTADOS DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    image_url: '',
    usd_price: 0,
    usd_penalty: 0,
    status: 'active'
  })

  const [variants, setVariants] = useState<any[]>([])
  
  const [variantInput, setVariantInput] = useState({
    colorName: '',
    colorHex: '#000000',
    sizes: '',
    defaultStock: 10,
    images: [] as string[]
  })

  // 1. CARGA INICIAL
  useEffect(() => {
    const init = async () => {
      const { data: config } = await supabase.from('app_config').select('usd_rate').single()
      if (config) setRate(config.usd_rate)

      if (productId) {
        const { data: product, error } = await supabase
          .from('products')
          .select(`*, product_variants(*)`)
          .eq('id', productId)
          .single()

        if (error || !product) {
          Swal.fire('Error', 'Producto no encontrado', 'error')
          router.push('/admin/inventory')
          return
        }

        setFormData({
          name: product.name,
          category: product.category,
          description: product.description || '',
          image_url: product.image_url || '',
          usd_price: product.usd_cash_price || 0,
          usd_penalty: product.usd_penalty || 0,
          status: product.status || 'active'
        })

        if (product.product_variants) {
           setVariants(product.product_variants.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)))
        }
        setLoading(false)
      } else {
          setLoading(false)
      }
    }
    init()
  }, [productId])

  // --- LÓGICA DE SUBIDA DE IMÁGENES (CONECTADO A 'VARIANTS') ---
  const handleImageUpload = async (file: File, target: 'main' | 'variant') => {
      try {
          setUploading(true)
          
          // 1. Validaciones
          if (!file.type.startsWith('image/')) throw new Error('Solo se permiten imágenes')
          if (file.size > 5 * 1024 * 1024) throw new Error('La imagen no puede pesar más de 5MB')

          // 2. Subir a Supabase Storage (Bucket 'variants')
          // Creamos una ruta limpia:  public/timestamp-random.jpg
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `${fileName}` // Si quieres carpetas usa: `uploads/${fileName}`

          const { error: uploadError } = await supabase.storage
              .from('variants') // <--- AQUÍ ESTÁ EL CAMBIO IMPORTANTE
              .upload(filePath, file)

          if (uploadError) throw uploadError

          // 3. Obtener URL Pública
          const { data: { publicUrl } } = supabase.storage
              .from('variants') // <--- AQUÍ TAMBIÉN
              .getPublicUrl(filePath)

          // 4. Asignar URL al estado correspondiente
          if (target === 'main') {
              setFormData(prev => ({ ...prev, image_url: publicUrl }))
          } else {
              if (variantInput.images.length >= 3) {
                  Swal.fire('Límite', 'Máximo 3 fotos por color', 'warning')
              } else {
                  setVariantInput(prev => ({ ...prev, images: [...prev.images, publicUrl] }))
              }
          }

      } catch (error: any) {
          console.error("Upload error:", error)
          Swal.fire('Error al subir', error.message || 'Verifica que el bucket "variants" sea público.', 'error')
      } finally {
          setUploading(false)
      }
  }

  // --- LÓGICA DEL GENERADOR ---
  const removeImageFromVariantInput = (index: number) => {
      const newImages = [...variantInput.images]
      newImages.splice(index, 1)
      setVariantInput({ ...variantInput, images: newImages })
  }

  const addVariantGroup = () => {
     if (!variantInput.colorName) return Swal.fire('Falta Color', 'Define un nombre para el color', 'warning')
     if (!variantInput.sizes) return Swal.fire('Faltan Tallas', 'Ingresa al menos una talla', 'warning')
     
     const sizeList = variantInput.sizes.split(',').map(s => s.trim()).filter(Boolean)
     if (sizeList.length === 0) return Swal.fire('Error', 'Formato de tallas incorrecto', 'warning')

     const newVariants = sizeList.map(s => ({
         id: crypto.randomUUID(),
         color_name: variantInput.colorName,
         color_hex: variantInput.colorHex,
         size: s, 
         stock: variantInput.defaultStock,
         gallery: variantInput.images, 
         variant_image: variantInput.images[0] || '' 
     }))

     setVariants([...variants, ...newVariants])
     
     setVariantInput({ 
         colorName: '',
         colorHex: variantInput.colorHex, 
         sizes: '', 
         defaultStock: 10,
         images: []
    }) 
    Swal.fire({ icon: 'success', title: 'Agregado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 })
  }

  const removeVariant = (id: string) => {
      setVariants(variants.filter(v => v.id !== id))
  }

  // --- GUARDADO ---
  const handleSave = async () => {
      if (!formData.name) return Swal.fire('Falta Nombre', 'El nombre del producto es obligatorio', 'warning')
      if (formData.usd_price <= 0) return Swal.fire('Precio Inválido', 'El precio base debe ser mayor a 0', 'warning')
      
      setSaving(true)
      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error("Usuario no autenticado")

          const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
          
          const productPayload = {
              name: formData.name,
              category: formData.category,
              description: formData.description,
              image_url: formData.image_url,
              usd_cash_price: formData.usd_price,
              usd_penalty: formData.usd_penalty,
              status: formData.status,
              user_id: user.id,    
              store_id: store?.id   
          }

          let savedProductId = productId

          if (productId) {
              const { error } = await supabase.from('products').update(productPayload).eq('id', productId)
              if (error) throw error
          } else {
              const { data: newProd, error } = await supabase.from('products').insert(productPayload).select().single()
              if (error) throw error
              savedProductId = newProd.id
          }

          if (savedProductId) {
              if (productId) await supabase.from('product_variants').delete().eq('product_id', savedProductId)
              
              const variantsPayload = variants.map(v => ({
                  product_id: savedProductId,
                  color_name: v.color_name,
                  color_hex: v.color_hex,
                  size: v.size,
                  stock: v.stock,
                  variant_image: v.variant_image, 
                  gallery: v.gallery 
              }))
              
              if (variantsPayload.length > 0) {
                  const { error: varError } = await supabase.from('product_variants').insert(variantsPayload)
                  if (varError) throw varError
              }
          }

          Swal.fire({ title: '¡Producto Publicado!', icon: 'success', confirmButtonColor: '#000'})
          router.push('/admin/inventory')

      } catch (error: any) {
          console.error(error)
          Swal.fire('Error', error.message, 'error')
      } finally {
          setSaving(false)
      }
  }

  const finalPriceBs = (Number(formData.usd_price) + Number(formData.usd_penalty)) * rate

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-gray-400" size={32}/></div>

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32 font-sans selection:bg-black selection:text-white">
      
      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex justify-between items-center transition-all">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors group">
                <ArrowLeft size={20} className="text-gray-500 group-hover:text-black"/>
            </button>
            <div>
                <h1 className="font-black text-xl text-gray-900 tracking-tight leading-none">{productId ? 'Editar Producto' : 'Nuevo Producto'}</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{productId ? 'Gestión de Inventario' : 'Crear Item'}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <button onClick={() => router.back()} className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide">Cancelar</button>
             <button onClick={handleSave} disabled={saving} className="bg-black text-white pl-5 pr-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-70 disabled:scale-100">
                {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} strokeWidth={2.5}/>}
                <span>{productId ? 'Guardar' : 'Publicar'}</span>
             </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">

            {/* IZQUIERDA (8/12) */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
                
                {/* TARJETA 1: INFO PRINCIPAL */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
                    
                    {/* SUBIR IMAGEN PRINCIPAL */}
                    <div className="w-full md:w-1/3 shrink-0">
                        <input type="file" ref={mainImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'main')}/>
                        <div 
                            onClick={() => mainImageInputRef.current?.click()}
                            className={`aspect-square bg-gray-50 rounded-3xl border-2 border-dashed ${uploading ? 'border-blue-400 animate-pulse' : 'border-gray-200 hover:border-black'} flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all`}
                        >
                            {formData.image_url ? (
                                <img src={formData.image_url} className="w-full h-full object-contain p-2 mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="text-center p-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-300 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                        {uploading ? <Loader2 className="animate-spin"/> : <Upload size={24} strokeWidth={2}/>}
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide group-hover:text-black">Subir Imagen</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Nombre del Producto</label>
                            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Nike Air Force 1" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-5 py-4 font-bold text-lg text-gray-900 placeholder:text-gray-300 transition-all outline-none"/>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Categoría</label>
                                <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ej: Zapatos" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-5 py-3.5 font-bold text-gray-900 transition-all outline-none"/>
                            </div>
                             <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Estado</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-5 py-3.5 font-bold text-gray-900 transition-all outline-none cursor-pointer">
                                    <option value="active">Activo</option>
                                    <option value="draft">Borrador</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Descripción</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalles clave..." className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-5 py-3.5 font-medium text-gray-900 min-h-[100px] resize-none transition-all outline-none"/>
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: MATRIZ DE VARIANTES */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-3"><Box size={24} className="text-gray-900"/> Matriz de Variantes</h3>
                        <span className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold">{variants.length} Generadas</span>
                    </div>

                    <div className="bg-gray-50 rounded-3xl p-8 mb-8 border border-gray-200/50">
                        {/* INPUT FILE OCULTO PARA VARIANTES */}
                        <input type="file" ref={variantImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'variant')}/>

                        <div className="flex flex-col gap-8">
                            {/* FILA 1 */}
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block">1. Definir Color</label>
                                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border-2 border-gray-200 focus-within:border-black transition-all shadow-sm">
                                        <input type="color" value={variantInput.colorHex} onChange={e => setVariantInput({...variantInput, colorHex: e.target.value})} className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent transition-transform hover:scale-110"/>
                                        <div className="flex-1 h-full flex flex-col justify-center">
                                            <label className="text-[9px] font-bold text-gray-300 uppercase">Nombre del Color</label>
                                            <input type="text" placeholder="Ej: Midnight Black" value={variantInput.colorName} onChange={e => setVariantInput({...variantInput, colorName: e.target.value})} className="w-full bg-transparent border-none text-base font-black outline-none text-gray-900 placeholder:text-gray-300 -mt-1"/>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex justify-between">
                                        <span>2. Fotos del Color</span>
                                        <span className="text-[9px]">{variantInput.images.length}/3</span>
                                    </label>
                                    <div className="flex gap-3 h-[72px]">
                                        <button onClick={() => variantImageInputRef.current?.click()} disabled={variantInput.images.length >= 3 || uploading} className="w-[72px] h-full rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-black hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-black">
                                            {uploading ? <Loader2 className="animate-spin"/> : <Plus size={24}/>}
                                        </button>
                                        {variantInput.images.map((img, idx) => (
                                            <div key={idx} className="relative w-[72px] h-full rounded-2xl border border-gray-200 overflow-hidden group bg-white shadow-sm">
                                                <img src={img} className="w-full h-full object-cover"/>
                                                <button onClick={() => removeImageFromVariantInput(idx)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"><X size={20}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* FILA 2 */}
                            <div className="flex flex-col md:flex-row gap-8 items-end">
                                <div className="flex-[2]">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block">3. Tallas Disponibles</label>
                                    <input placeholder="Ej: S, M, L, XL (Separadas por coma)" value={variantInput.sizes} onChange={e => setVariantInput({...variantInput, sizes: e.target.value})} className="w-full bg-white border-2 border-gray-200 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:border-black outline-none transition-all placeholder:text-gray-300 text-lg shadow-sm"/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block">4. Stock Inicial</label>
                                    <div className="relative">
                                        <Package className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20}/>
                                        <input type="number" min="0" value={variantInput.defaultStock} onChange={e => setVariantInput({...variantInput, defaultStock: parseInt(e.target.value) || 0})} className="w-full bg-white border-2 border-gray-200 focus:border-black rounded-2xl pl-14 pr-6 py-4 font-black text-lg text-gray-900 transition-all outline-none shadow-sm"/>
                                    </div>
                                </div>
                            </div>

                            <button onClick={addVariantGroup} className="w-full bg-black text-white p-5 rounded-2xl hover:bg-gray-900 transition-all shadow-xl shadow-black/10 active:scale-[0.99] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 mt-2">
                                <Plus size={20} strokeWidth={3}/> Agregar a la Matriz
                            </button>
                        </div>
                    </div>

                    {/* LISTA */}
                    <div className="space-y-3">
                        {variants.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/30">
                                <Layers size={32} className="text-gray-300 mx-auto mb-3"/>
                                <p className="text-sm font-bold text-gray-400">Sin variantes configuradas.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {variants.map((v, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white border-2 border-gray-100 p-4 rounded-2xl hover:border-gray-300 transition-all group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 relative">
                                                {v.variant_image ? (
                                                    <img src={v.variant_image} className="w-full h-full object-cover"/>
                                                ) : (
                                                    <div className="w-full h-full" style={{ backgroundColor: v.color_hex }}></div>
                                                )}
                                                {v.gallery && v.gallery.length > 1 && <div className="absolute bottom-0 right-0 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-tl-lg">+{v.gallery.length - 1}</div>}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: v.color_hex }}></div>
                                                    <p className="font-black text-lg text-gray-900 leading-none">{v.color_name}</p>
                                                </div>
                                                <p className="text-sm font-bold text-gray-500">Talla: <span className="text-black bg-gray-100 px-2 py-0.5 rounded-md">{v.size}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-end">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1">Stock</label>
                                                <input type="number" className="w-20 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-xl px-3 py-2 text-sm font-bold text-center outline-none transition-all" value={v.stock} onChange={(e) => { const newArr = [...variants]; newArr[i].stock = parseInt(e.target.value) || 0; setVariants(newArr) }} />
                                            </div>
                                            <button onClick={() => removeVariant(v.id)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* DERECHA (4/12) */}
            <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-28 h-fit">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/40 border border-gray-100">
                    <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2"><DollarSign size={24} className="text-green-600"/> Estrategia</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Precio Base ($)</label>
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-green-600 transition-colors text-lg">$</span>
                                <input type="number" value={formData.usd_price === 0 ? '' : formData.usd_price} onChange={e => setFormData({...formData, usd_price: parseFloat(e.target.value) || 0})} placeholder="0.00" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-green-500 rounded-2xl pl-12 pr-5 py-4 font-black text-2xl text-gray-900 transition-all outline-none placeholder:text-gray-300"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Desc. por Divisa ($)</label>
                            <div className="relative group">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-red-500 transition-colors text-lg">$</span>
                                <input type="number" value={formData.usd_penalty === 0 ? '' : formData.usd_penalty} onChange={e => setFormData({...formData, usd_penalty: parseFloat(e.target.value) || 0})} placeholder="0.00" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-red-500 rounded-2xl pl-12 pr-5 py-4 font-bold text-xl text-gray-900 transition-all outline-none placeholder:text-gray-300"/>
                            </div>
                        </div>
                        <div className="mt-8">
                             <div className="bg-[#1A1D24] rounded-3xl p-6 text-center shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col items-center">
                                    <span className="bg-white/10 text-white/70 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider mb-4 border border-white/5">Tasa: {rate.toFixed(2)}</span>
                                    <span className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1 block">Ref en Bolívares</span>
                                    <span className="text-4xl font-black text-white tracking-tight leading-none">Bs {finalPriceBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  )
}