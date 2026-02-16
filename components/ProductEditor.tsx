'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Upload, Plus, Save, Loader2, DollarSign, Trash2, X, Package, Box, Tag, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

interface ProductEditorProps {
  productId?: string
  rates: { usd: number, eur: number }
  storeSettings: { id: string, currency: string }
}

export default function ProductEditor({ productId, rates, storeSettings }: ProductEditorProps) {
  const router = useRouter()
  const supabase = getSupabase()
  
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const variantImageInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(!!productId)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false) 

  // LOGICA DE MONEDA
  const isEur = storeSettings.currency === 'eur'
  const activeRate = isEur ? rates.eur : rates.usd
  const rateLabel = isEur ? 'Tasa Euro' : 'Tasa BCV'

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    image_url: '',
    price: 0,    // Precio Cash (Divisa)
    penalty: 0,  // Margen para Bs
    status: 'active'
  })

  const [variants, setVariants] = useState<any[]>([])
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([])

  const [variantInput, setVariantInput] = useState({
    colorName: '',
    colorHex: '#000000',
    sizes: '',
    defaultStock: 10,
    images: [] as string[]
  })

  // --- MOTOR DE CÁLCULO DE DESCUENTOS ---
  const math = useMemo(() => {
      const cashPrice = Number(formData.price) || 0
      const markup = Number(formData.penalty) || 0
      
      // 1. Precio de Lista (Full)
      const listPrice = cashPrice + markup

      // 2. Porcentaje de Descuento (Para el Badge)
      // Fórmula: (Markup / ListPrice) * 100
      const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0

      // 3. Referencia en Bolívares
      // Siempre se calcula sobre el Precio de Lista * Tasa Seleccionada
      const refBs = listPrice * activeRate

      return { listPrice, discountPercent, refBs }
  }, [formData.price, formData.penalty, activeRate])

  // CARGA INICIAL
  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
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
          price: product.usd_cash_price || 0,
          penalty: product.usd_penalty || 0,
          status: product.status || 'active'
        })

        if (product.product_variants) {
           setVariants(product.product_variants.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)))
        }
        setLoading(false)
      }
      fetchProduct()
    } else {
        setLoading(false)
    }
  }, [productId])

  // SUBIDA DE IMÁGENES
  const handleImageUpload = async (file: File, target: 'main' | 'variant') => {
      try {
          setUploading(true)
          if (!file.type.startsWith('image/')) throw new Error('Solo imágenes')
          if (file.size > 5 * 1024 * 1024) throw new Error('Máx 5MB')

          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `${fileName}`

          const { error } = await supabase.storage.from('variants').upload(filePath, file)
          if (error) throw error

          const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(filePath)

          if (target === 'main') {
              setFormData(prev => ({ ...prev, image_url: publicUrl }))
          } else {
              if (variantInput.images.length >= 3) return Swal.fire('Límite', 'Máx 3 fotos', 'warning')
              setVariantInput(prev => ({ ...prev, images: [...prev.images, publicUrl] }))
          }
      } catch (error: any) {
          Swal.fire('Error', error.message, 'error')
      } finally {
          setUploading(false)
      }
  }

  const removeImageFromVariantInput = (index: number) => {
      const newImages = [...variantInput.images]
      newImages.splice(index, 1)
      setVariantInput({ ...variantInput, images: newImages })
  }

  const addVariantGroup = () => {
     if (!variantInput.colorName) return Swal.fire('Falta Color', 'Define un nombre', 'warning')
     if (!variantInput.sizes) return Swal.fire('Faltan Tallas', 'Ingresa tallas', 'warning')
     
     const sizeList = variantInput.sizes.split(',').map(s => s.trim()).filter(Boolean)
     
     const newVariants = sizeList.map(s => ({
         id: `temp-${crypto.randomUUID()}`, 
         color_name: variantInput.colorName,
         color_hex: variantInput.colorHex,
         size: s, 
         stock: variantInput.defaultStock,
         gallery: variantInput.images, 
         variant_image: variantInput.images[0] || '' 
     }))

     setVariants([...variants, ...newVariants])
     setVariantInput({ ...variantInput, sizes: '', defaultStock: 10, images: [] }) 
     Swal.fire({ icon: 'success', title: 'Agregado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 })
  }

  const removeVariant = (id: string) => {
      if (!id.startsWith('temp-')) setDeletedVariantIds(prev => [...prev, id])
      setVariants(variants.filter(v => v.id !== id))
  }

  const handleSave = async () => {
      if (!formData.name) return Swal.fire('Error', 'Falta el nombre', 'warning')
      if (formData.price <= 0) return Swal.fire('Error', 'Precio inválido', 'warning')
      
      setSaving(true)
      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error("No auth")

          const payload = {
              name: formData.name,
              category: formData.category,
              description: formData.description,
              image_url: formData.image_url,
              usd_cash_price: formData.price, 
              usd_penalty: formData.penalty,
              status: formData.status,
              user_id: user.id,    
              store_id: storeSettings.id
          }

          let currentId = productId

          if (currentId) {
              const { error } = await supabase.from('products').update(payload).eq('id', currentId)
              if (error) throw error
          } else {
              const { data, error } = await supabase.from('products').insert(payload).select().single()
              if (error) throw error
              currentId = data.id
          }

          if (currentId) {
              if (deletedVariantIds.length > 0) {
                  await supabase.from('product_variants').delete().in('id', deletedVariantIds)
              }

              const toInsert: any[] = []
              const toUpdate: any[] = []

              variants.forEach(v => {
                  const vPayload = {
                      product_id: currentId,
                      color_name: v.color_name,
                      color_hex: v.color_hex,
                      size: v.size,
                      stock: v.stock,
                      variant_image: v.variant_image, 
                      gallery: v.gallery 
                  }
                  if (v.id.startsWith('temp-')) toInsert.push(vPayload)
                  else toUpdate.push({ ...vPayload, id: v.id })
              })
              
              if (toInsert.length > 0) await supabase.from('product_variants').insert(toInsert)
              if (toUpdate.length > 0) await supabase.from('product_variants').upsert(toUpdate)
          }

          Swal.fire({ title: '¡Guardado!', icon: 'success', confirmButtonColor: '#000'})
          router.push('/admin/inventory')

      } catch (error: any) {
          Swal.fire('Error', error.message, 'error')
      } finally {
          setSaving(false)
      }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-gray-400" size={32}/></div>

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32 font-sans text-gray-900 selection:bg-black selection:text-white">
      
      {/* HEADER */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-30 px-4 md:px-6 py-4 flex justify-between items-center transition-all shadow-sm">
        <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors group">
                <ArrowLeft size={20} className="text-gray-500 group-hover:text-black"/>
            </button>
            <div>
                <h1 className="font-black text-lg md:text-xl leading-none">{productId ? 'Editar' : 'Nuevo Producto'}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inventario</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isEur ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        Calculando en {isEur ? 'Euros' : 'Dólares'}
                    </span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
             <button onClick={() => router.back()} className="hidden md:block px-4 py-2 text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide">Cancelar</button>
             <button onClick={handleSave} disabled={saving} className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70">
                {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} strokeWidth={2.5}/>}
                <span>Guardar</span>
             </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

            {/* IZQUIERDA (INPUTS & MATRIZ) */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* 1. INFO PRINCIPAL */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 md:gap-8">
                    {/* FOTO */}
                    <div className="w-full md:w-1/3 shrink-0">
                        <input type="file" ref={mainImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'main')}/>
                        <div onClick={() => mainImageInputRef.current?.click()} className={`aspect-square bg-gray-50 rounded-2xl border-2 border-dashed ${uploading ? 'border-blue-400 animate-pulse' : 'border-gray-200 hover:border-black'} flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all`}>
                            {formData.image_url ? (
                                <img src={formData.image_url} className="w-full h-full object-contain p-4 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="text-center p-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-400 shadow-sm border border-gray-100">
                                        {uploading ? <Loader2 className="animate-spin"/> : <Upload size={20}/>}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-black">Subir Foto</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* INPUTS TEXTO */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Nombre</label>
                            <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Nike Air Force 1" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-xl px-4 py-3 font-bold text-base text-gray-900 placeholder:text-gray-300 transition-all outline-none"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Categoría</label>
                                <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ej: Zapatos" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-xl px-4 py-3 font-bold text-gray-900 outline-none"/>
                            </div>
                             <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Estado</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-xl px-4 py-3 font-bold text-gray-900 outline-none cursor-pointer">
                                    <option value="active">Activo</option>
                                    <option value="draft">Borrador</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Descripción</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalles..." className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black rounded-xl px-4 py-3 font-medium text-sm text-gray-900 min-h-[80px] resize-none outline-none"/>
                        </div>
                    </div>
                </div>

                {/* 2. MATRIZ DE VARIANTES */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Box size={20}/> Variantes</h3>
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500">{variants.length} SKU</span>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-200">
                        <input type="file" ref={variantImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'variant')}/>

                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">1. Color</label>
                                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border-2 border-gray-200 focus-within:border-black transition-all">
                                        <input type="color" value={variantInput.colorHex} onChange={e => setVariantInput({...variantInput, colorHex: e.target.value})} className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"/>
                                        <input type="text" placeholder="Ej: Negro" value={variantInput.colorName} onChange={e => setVariantInput({...variantInput, colorName: e.target.value})} className="flex-1 bg-transparent border-none text-sm font-bold outline-none text-gray-900 -mt-0.5"/>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 flex justify-between">
                                        <span>2. Fotos ({variantInput.images.length}/3)</span>
                                    </label>
                                    <div className="flex gap-2 h-14">
                                        <button onClick={() => variantImageInputRef.current?.click()} disabled={variantInput.images.length >= 3 || uploading} className="w-14 h-full rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-black hover:bg-white transition-all disabled:opacity-50 text-gray-400 hover:text-black">
                                            {uploading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={20}/>}
                                        </button>
                                        {variantInput.images.map((img, idx) => (
                                            <div key={idx} className="relative w-14 h-full rounded-xl border border-gray-200 overflow-hidden group bg-white">
                                                <img src={img} className="w-full h-full object-cover"/>
                                                <button onClick={() => removeImageFromVariantInput(idx)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white"><X size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 items-end">
                                <div className="flex-[2] w-full">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">3. Tallas (Separar con coma)</label>
                                    <input 
                                        placeholder="S, M, L, XL" 
                                        value={variantInput.sizes} 
                                        onChange={e => setVariantInput({...variantInput, sizes: e.target.value.toUpperCase()})} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-black outline-none shadow-sm text-sm placeholder:text-gray-300"
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">4. Stock</label>
                                    <input type="number" min="0" value={variantInput.defaultStock} onChange={e => setVariantInput({...variantInput, defaultStock: parseInt(e.target.value) || 0})} className="w-full bg-white border-2 border-gray-200 focus:border-black rounded-xl px-4 py-3 font-black text-gray-900 outline-none shadow-sm text-center"/>
                                </div>
                            </div>

                            <button onClick={addVariantGroup} className="w-full bg-black text-white p-3 rounded-xl hover:bg-gray-800 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                <Plus size={16} strokeWidth={3}/> Agregar
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {variants.map((v, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl hover:border-gray-300 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                                        {v.variant_image ? <img src={v.variant_image} className="w-full h-full object-cover"/> : <div className="w-full h-full" style={{ backgroundColor: v.color_hex }}></div>}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color_hex }}></div>
                                            <p className="font-bold text-sm text-gray-900">{v.color_name}</p>
                                        </div>
                                        <p className="text-xs text-gray-500">Talla: <span className="font-bold text-black">{v.size}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right"><p className="text-[9px] font-bold text-gray-400 uppercase">Stock</p><p className="font-mono font-bold text-sm">{v.stock}</p></div>
                                    <button onClick={() => removeVariant(v.id)} className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA (ESTRATEGIA PRECIOS) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><DollarSign size={20} className="text-green-600"/> Precios</h3>
                    </div>
                    
                    <div className="space-y-5">
                        {/* INPUTS DE PRECIO */}
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Precio Cash (Divisa)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-green-600">$</span>
                                <input type="number" value={formData.price === 0 ? '' : formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} placeholder="0.00" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-green-500 rounded-xl pl-8 pr-4 py-3 font-black text-xl text-gray-900 outline-none"/>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Margen / Recargo</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-red-500">$</span>
                                <input type="number" value={formData.penalty === 0 ? '' : formData.penalty} onChange={e => setFormData({...formData, penalty: parseFloat(e.target.value) || 0})} placeholder="0.00" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-red-500 rounded-xl pl-8 pr-4 py-3 font-bold text-lg text-gray-900 outline-none"/>
                            </div>
                        </div>

                        {/* TARJETA NEGRA DE SIMULACIÓN */}
                        <div className="bg-[#1A1D24] rounded-2xl p-5 text-center shadow-xl relative overflow-hidden mt-4">
                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <span className="bg-white/10 text-white/70 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-white/5">
                                    {rateLabel}: {activeRate.toFixed(2)}
                                </span>

                                {/* SIMULACIÓN DEL BADGE */}
                                {math.discountPercent > 0 && (
                                    <div className="bg-white text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg transform -rotate-2">
                                        PAGA EN DIVISA -{math.discountPercent}%
                                    </div>
                                )}

                                <div className="w-full border-t border-white/10 pt-4 mt-2">
                                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">
                                        Precio Visible (Bs)
                                    </p>
                                    <p className="font-black text-3xl text-white tracking-tight leading-none">
                                        Bs {math.refBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[9px] text-white/30 mt-2">
                                        Equivale a ${math.listPrice.toFixed(2)} (Full)
                                    </p>
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