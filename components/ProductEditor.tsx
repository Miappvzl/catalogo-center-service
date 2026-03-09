'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Upload, Plus, Save, Loader2, DollarSign, Trash2, X, Box, AlertTriangle, ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer' // IMPORTANTE: El nuevo optimizador
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
  const [isDirty, setIsDirty] = useState(false) // ESTADO UX: Control de cambios

  const isEur = storeSettings.currency === 'eur'
  const activeRate = isEur ? rates.eur : rates.usd
  const rateLabel = isEur ? 'Tasa Euro' : 'Tasa BCV'

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    image_url: '',
    price: '' as number | '',    
    penalty: '' as number | '',  
    status: 'active'
  })

  const [variants, setVariants] = useState<any[]>([])
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([])

  const [variantInput, setVariantInput] = useState({
    colorName: '',
    colorHex: '#000000',
    sizes: '',
    defaultStock: 10 as number | '',
    images: [] as string[]
  })

  // Helpers para actualizar estado y marcar como "Sucio"
  const updateForm = (field: string, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }))
      setIsDirty(true)
  }
  const updateVariantInput = (field: string, value: any) => {
      setVariantInput(prev => ({ ...prev, [field]: value }))
      setIsDirty(true)
  }

  const math = useMemo(() => {
      const cashPrice = Number(formData.price) || 0
      const markup = Number(formData.penalty) || 0
      const listPrice = cashPrice + markup
      const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0
      const refBs = listPrice * activeRate
      return { listPrice, discountPercent, refBs }
  }, [formData.price, formData.penalty, activeRate])

  // PREVENCIÓN DE CIERRE ACCIDENTAL EN EL NAVEGADOR
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (isDirty) {
              e.preventDefault()
              e.returnValue = ''
          }
      }
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

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
        setIsDirty(false) // Inicializamos limpio
      }
      fetchProduct()
    } else {
        setLoading(false)
    }
  }, [productId])

  // UX FIX: FUNCIÓN DE SALIDA SEGURA
  const handleExit = (e?: React.MouseEvent) => {
      if (e) e.preventDefault()
      if (!isDirty) {
          router.back()
          return
      }

      Swal.fire({
          title: '¿Salir sin guardar?',
          text: 'Tienes cambios pendientes. Si sales ahora, se perderán.',
          icon: 'warning',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'Sí, descartar',
          denyButtonText: 'Guardar producto',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#ef4444', // Rojo peligro
          denyButtonColor: '#000000', // Negro principal
          customClass: { popup: 'rounded-full' }
      }).then((result) => {
          if (result.isConfirmed) {
              setIsDirty(false)
              router.back()
          } else if (result.isDenied) {
              handleSave()
          }
      })
  }

  // RENDIMIENTO Y UX: SUBIDA MÚLTIPLE OPTIMIZADA
  const handleImageUpload = async (files: FileList | File[], target: 'main' | 'variant') => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      try {
          setUploading(true)
          
          if (target === 'main') {
              const file = fileArray[0]
              if (!file.type.startsWith('image/')) throw new Error('Solo imágenes permitidas')
              
              const compressedFile = await compressImage(file, 1080, 0.8) // Optimizamos a 1080p máximo
              const fileName = `main-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
              
              const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
              if (error) throw error

              const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
              updateForm('image_url', publicUrl)

          } else {
              // LÓGICA DE MÚLTIPLES IMÁGENES DE VARIANTE
              const currentSlots = 3 - variantInput.images.length
              if (currentSlots <= 0) return Swal.fire('Límite alcanzado', 'Máximo 3 fotos por variante', 'warning')
              
              const filesToUpload = fileArray.slice(0, currentSlots)
              const newUrls: string[] = []

              for (const file of filesToUpload) {
                  if (!file.type.startsWith('image/')) continue
                  
                  const compressedFile = await compressImage(file, 800, 0.7) // Optimizamos variantes un poco más
                  const fileName = `var-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
                  
                  const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
                  if (!error) {
                      const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
                      newUrls.push(publicUrl)
                  }
              }
              
              setVariantInput(prev => ({ ...prev, images: [...prev.images, ...newUrls] }))
              setIsDirty(true)
          }
      } catch (error: any) {
          Swal.fire('Error', error.message, 'error')
      } finally {
          setUploading(false)
          if (target === 'main' && mainImageInputRef.current) mainImageInputRef.current.value = ''
          if (target === 'variant' && variantImageInputRef.current) variantImageInputRef.current.value = ''
      }
  }

  const removeImageFromVariantInput = (index: number) => {
      const newImages = [...variantInput.images]
      newImages.splice(index, 1)
      updateVariantInput('images', newImages)
  }

  const addVariantGroup = () => {
      if (!variantInput.colorName) return Swal.fire('Falta Color', 'Define un nombre para el color', 'warning')
      if (!variantInput.sizes) return Swal.fire('Faltan Tallas', 'Ingresa al menos una talla', 'warning')
      
      const sizeList = variantInput.sizes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      const stockToApply = Number(variantInput.defaultStock) || 0
      
      const newVariants = sizeList.map(s => ({
          id: `temp-${crypto.randomUUID()}`, 
          color_name: variantInput.colorName,
          color_hex: variantInput.colorHex,
          size: s, 
          stock: stockToApply,
          gallery: variantInput.images, 
          variant_image: variantInput.images[0] || '' 
      }))

      setVariants([...variants, ...newVariants])
      setVariantInput({ ...variantInput, sizes: '', defaultStock: 10, images: [] }) 
      setIsDirty(true)
      
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' }})
      Toast.fire({ icon: 'success', title: 'Variantes Generadas' })
  }

  const removeVariant = (id: string) => {
      if (!id.startsWith('temp-')) setDeletedVariantIds(prev => [...prev, id])
      setVariants(variants.filter(v => v.id !== id))
      setIsDirty(true)
  }

  const handleSave = async () => {
      if (!formData.name) return Swal.fire('Falta información', 'El producto debe tener un nombre', 'warning')
      if (Number(formData.price) <= 0) return Swal.fire('Error', 'El precio base debe ser mayor a 0', 'warning')
      
      setSaving(true)
      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error("No auth")

          const payload = {
              name: formData.name,
              category: formData.category,
              description: formData.description,
              image_url: formData.image_url,
              usd_cash_price: Number(formData.price) || 0, 
              usd_penalty: Number(formData.penalty) || 0,
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

          setIsDirty(false) // Limpiamos el estado
          Swal.fire({ title: '¡Guardado con éxito!', icon: 'success', confirmButtonColor: '#000', customClass: { popup: 'rounded-full' }})
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
      
      {/* HEADER LIMPIO CON ESPACIO RESPIRABLE Y RESPONSIVE OPTIMIZADO */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center transition-all">
        
        {/* Lado Izquierdo: Controles de navegación y títulos */}
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <button onClick={handleExit} className="p-2 shrink-0 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors group" title="Volver">
                <ArrowLeft className="text-gray-500 group-hover:text-black transition-colors w-4 h-4 md:w-5 md:h-5"/>
            </button>
            <div className="min-w-0">
                <h1 className="font-black text-lg md:text-2xl leading-none truncate">{productId ? 'Editar Producto' : 'Nuevo Producto'}</h1>
                <div className="flex items-center gap-2 mt-1.5 md:mt-2 overflow-hidden">
                    <span className="hidden sm:block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">Catálogo</span>
                    <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase border whitespace-nowrap ${isEur ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {isEur ? 'EUR' : 'USD'} <span className="hidden sm:inline">Base</span>
                    </span>
                </div>
            </div>
        </div>

        {/* Lado Derecho: Acciones (Adaptativas) */}
        <div className="flex items-center gap-2 md:gap-5 shrink-0 pl-2">
             <button onClick={handleExit} className="hidden md:block px-4 py-2 text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide">Cancelar</button>
             <button onClick={handleSave} disabled={saving} className="bg-black text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full font-bold text-xs md:text-sm hover:bg-gray-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70">
                {saving ? <Loader2 className="animate-spin w-3.5 h-3.5 md:w-4 md:h-4"/> : <Save strokeWidth={2.5} className="w-3.5 h-3.5 md:w-4 md:h-4"/>}
                <span className="hidden sm:block">Guardar Producto</span>
                <span className="sm:hidden">Guardar</span>
             </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-10">
        
        {/* AVISO DE CAMBIOS SIN GUARDAR (Estética Premium Clean Look) */}
        {isDirty && (
             <div className="mb-6 md:mb-8 bg-yellow-50/80 border border-yellow-200/80 p-4 rounded-xl flex items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2">
                 <div className="bg-yellow-100 p-2 md:p-2.5 rounded-xl shrink-0 mt-0.5 sm:mt-0 border border-yellow-200">
                     <AlertTriangle className="text-yellow-600 w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5}/>
                 </div>
                 <div>
                     <p className="text-sm font-black text-yellow-800 leading-tight">Cambios sin guardar</p>
                     <p className="text-xs font-medium text-yellow-700/80 mt-1">No olvides presionar <span className="font-bold">Guardar</span> antes de salir para no perder tu progreso.</p>
                 </div>
             </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

            {/* IZQUIERDA (INPUTS & MATRIZ) */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* 1. INFO PRINCIPAL */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-6 md:gap-8">
                    {/* FOTO PRINCIPAL OPTIMIZADA */}
                    <div className="w-full md:w-1/3 shrink-0">
                        {/* Se usa handleImageUpload para delegar la conversion a Array */}
                        <input type="file" ref={mainImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'main')}/>
                        <div onClick={() => mainImageInputRef.current?.click()} className={`aspect-square bg-gray-50 rounded-2xl border border-dashed ${uploading ? 'border-gray-300 animate-pulse' : 'border-gray-300 hover:border-black'} flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all`}>
                            {formData.image_url ? (
                                <img src={formData.image_url} className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt="Producto" />
                            ) : (
                                <div className="text-center p-4 flex flex-col items-center">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 text-gray-400 border border-gray-200 group-hover:text-black group-hover:border-gray-300 transition-colors">
                                        {uploading ? <Loader2 className="animate-spin"/> : <ImageIcon size={20}/>}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-black transition-colors">Subir Foto Base</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* INPUTS TEXTO LIMPIOS */}
                    <div className="flex-1 space-y-5">
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Nombre del Producto</label>
                            <input value={formData.name} onChange={e => updateForm('name', e.target.value)} placeholder="Ej: Nike Air Force 1" className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3.5 font-bold text-base text-gray-900 placeholder:text-gray-400 transition-all outline-none"/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Categoría</label>
                                <input value={formData.category} onChange={e => updateForm('category', e.target.value)} placeholder="Ej: Zapatos" className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3.5 font-bold text-gray-900 placeholder:text-gray-400 transition-all outline-none"/>
                            </div>
                             <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Estado en Tienda</label>
                                <select value={formData.status} onChange={e => updateForm('status', e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3.5 font-bold text-gray-900 transition-all outline-none cursor-pointer appearance-none">
                                    <option value="active">Activo (Visible)</option>
                                    <option value="draft">Borrador (Oculto)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Descripción</label>
                            <textarea value={formData.description} onChange={e => updateForm('description', e.target.value)} placeholder="Añade detalles, materiales, cuidados..." className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3.5 font-medium text-sm text-gray-900 placeholder:text-gray-400 min-h-[120px] resize-none transition-all outline-none"/>
                        </div>
                    </div>
                </div>

                {/* 2. MATRIZ DE VARIANTES */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Box size={20}/> Matriz de Variantes</h3>
                        <span className="bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-[10px] font-bold text-gray-600">{variants.length} SKUs Generados</span>
                    </div>

                    {/* CREADOR RÁPIDO DE VARIANTES */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-8">
                        {/* MULTIPLE ACTIVADO PARA LAS FOTOS DE VARIANTE */}
                        <input type="file" multiple ref={variantImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'variant')}/>

                        <div className="flex flex-col gap-6">
                            {/* Fila 1: Color y Fotos */}
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">1. Color (O Modelo)</label>
                                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
                                        <input type="color" value={variantInput.colorHex} onChange={e => updateVariantInput('colorHex', e.target.value)} className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent shrink-0"/>
                                        <input type="text" placeholder="Ej: Negro Matte" value={variantInput.colorName} onChange={e => updateVariantInput('colorName', e.target.value)} className="flex-1 bg-transparent border-none text-sm font-bold outline-none text-gray-900 min-w-0"/>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                        <span>2. Fotos de Variante (Max 3)</span>
                                        <span>{variantInput.images.length}/3</span>
                                    </label>
                                    <div className="flex gap-2 h-[56px]">
                                        <button onClick={() => variantImageInputRef.current?.click()} disabled={variantInput.images.length >= 3 || uploading} className="w-[56px] h-full rounded-xl border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-white transition-all disabled:opacity-50 text-gray-400 hover:text-black shrink-0 bg-gray-50">
                                            {uploading ? <Loader2 className="animate-spin" size={18}/> : <Plus size={22}/>}
                                        </button>
                                        {variantInput.images.map((img, idx) => (
                                            <div key={idx} className="relative w-[56px] h-full rounded-xl border border-gray-200 overflow-hidden group bg-white shrink-0">
                                                <img src={img} className="w-full h-full object-cover"/>
                                                <button onClick={() => removeImageFromVariantInput(idx)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity"><X size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Fila 2: Tallas y Stock */}
                            <div className="flex flex-col md:flex-row gap-6 items-end">
                                <div className="flex-[2] w-full">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">3. Tallas (Separadas por coma)</label>
                                    <input 
                                        placeholder="Ej: S, M, L, XL" 
                                        value={variantInput.sizes} 
                                        onChange={e => updateVariantInput('sizes', e.target.value)} 
                                        className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3.5 font-bold text-gray-900 outline-none text-sm placeholder:text-gray-400 transition-all"
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">4. Stock Inicial</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        value={variantInput.defaultStock} 
                                        onChange={e => updateVariantInput('defaultStock', e.target.value === '' ? '' : parseInt(e.target.value))} 
                                        className="w-full bg-white border border-gray-200 focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3.5 font-black text-gray-900 outline-none text-center transition-all"
                                    />
                                </div>
                            </div>

                            <button onClick={addVariantGroup} className="w-full bg-white border border-gray-200 hover:border-black text-black py-3.5 rounded-full hover:bg-gray-50 active:bg-gray-100 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-2">
                                <Plus size={16} strokeWidth={3}/> Generar SKUs
                            </button>
                        </div>
                    </div>

                    {/* LISTA DE VARIANTES GENERADAS */}
                    {variants.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <Box size={32} className="mx-auto text-gray-300 mb-3"/>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sin variantes generadas</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {variants.map((v, i) => (
                                <div key={i} className="flex items-center justify-between bg-white border border-gray-200 p-3 md:p-4 rounded-xl hover:border-gray-300 transition-colors">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
                                            {v.variant_image ? <img src={v.variant_image} className="w-full h-full object-cover"/> : <div className="w-full h-full" style={{ backgroundColor: v.color_hex }}></div>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: v.color_hex }}></div>
                                                <p className="font-bold text-sm text-gray-900 truncate">{v.color_name}</p>
                                            </div>
                                            <div className="flex items-center mt-1">
                                                <span className="text-[10px] font-mono font-bold bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-md leading-none">Talla: {v.size}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 pl-4">
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Stock</p>
                                            <p className="font-mono font-black text-sm text-gray-900 leading-none">{v.stock}</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200 hidden md:block mx-1"></div>
                                        <button onClick={() => removeVariant(v.id)} className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors" title="Eliminar SKU">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA (ESTRATEGIA PRECIOS) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28 h-fit">
                <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><DollarSign size={20} className="text-gray-400"/> Estrategia de Precio</h3>
                    </div>
                    
                    <div className="space-y-6">
                        {/* INPUTS DE PRECIO */}
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Precio Divisa (Base)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-black transition-colors">$</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={formData.price} 
                                    onChange={e => updateForm('price', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                    placeholder="0.00" 
                                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-8 pr-4 py-3.5 font-black text-xl text-gray-900 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Margen por Conversión (Opcional)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-black transition-colors">$</span>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={formData.penalty} 
                                    onChange={e => updateForm('penalty', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                    placeholder="0.00" 
                                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-8 pr-4 py-3.5 font-bold text-lg text-gray-900 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* TARJETA NEGRA DE SIMULACIÓN (Flat Design) */}
                        <div className="bg-[#0A0A0A] rounded-2xl p-6 text-center relative overflow-hidden mt-8 border border-[#222]">
                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <span className="bg-white/10 text-white/70 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border border-white/10">
                                    {rateLabel} Actual: {activeRate.toFixed(2)}
                                </span>

                                {/* SIMULACIÓN DEL BADGE */}
                                {math.discountPercent > 0 && (
                                    <div className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transform -rotate-2 border border-gray-200 mt-2">
                                        PAGA EN DIVISA -{math.discountPercent}%
                                    </div>
                                )}

                                <div className="w-full border-t border-white/10 pt-5 mt-2">
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                                        Precio Visible al Público
                                    </p>
                                    <p className="font-black text-4xl text-white tracking-tight leading-none mb-2">
                                        Bs {math.refBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-white/40 font-medium">
                                        Equivale a ${math.listPrice.toFixed(2)} Divisa Full
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