'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ShoppingBag, Truck, AlertCircle, Loader2, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: any 
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  // NOTA: Asegúrate de que tu addItem en useCart acepte la cantidad como 3er argumento
  const { addItem } = useCart()
  
  const [fullProduct, setFullProduct] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1) // <--- NUEVO ESTADO
  
  // --- LÓGICA DE GALERÍA ---
  const [currentGallery, setCurrentGallery] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true)
      const fetchData = async () => {
        const { data: vars } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', product.id)
          .gt('stock', 0)
        
        setFullProduct(product)
        setCurrentGallery([product.image_url])
        setGalleryIndex(0)
        setQuantity(1) // Reiniciar cantidad al abrir

        if (vars && vars.length > 0) {
          setVariants(vars)
          const firstColor = vars[0].color_name
          setSelectedColor(firstColor)
          
          const firstVar = vars[0]
          let images = []
          if (firstVar.gallery && firstVar.gallery.length > 0) images = firstVar.gallery
          else if (firstVar.variant_image) images = [firstVar.variant_image]
          else images = [product.image_url]
          
          setCurrentGallery(images)
        } else {
            setVariants([])
            setSelectedColor(null)
            setSelectedSize(null)
        }
        setLoading(false)
      }
      fetchData()
    } else {
        setFullProduct(null)
        setVariants([])
        setSelectedColor(null)
        setSelectedSize(null)
        setCurrentGallery([])
        setGalleryIndex(0)
        setQuantity(1)
    }
  }, [isOpen, product])

  // ... (Efecto de cambio de foto igual que antes) ...
  useEffect(() => {
    if (!selectedColor || variants.length === 0) return
    const variant = variants.find(v => v.color_name === selectedColor)
    if (variant) {
        let images = []
        if (variant.gallery && variant.gallery.length > 0) images = variant.gallery
        else if (variant.variant_image) images = [variant.variant_image]
        else images = [product.image_url]

        if (JSON.stringify(images) !== JSON.stringify(currentGallery)) {
            setCurrentGallery(images)
            setGalleryIndex(0)
        }
    }
  }, [selectedColor, variants])

  const availableColors = useMemo(() => {
    const map = new Map()
    variants.forEach(v => {
        if (!map.has(v.color_name)) {
            map.set(v.color_name, { name: v.color_name, hex: v.color_hex })
        }
    })
    return Array.from(map.values())
  }, [variants])

  const availableSizes = useMemo(() => {
    if (!selectedColor) return []
    return variants
        .filter(v => v.color_name === selectedColor)
        .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
  }, [variants, selectedColor])

  // --- HANDLERS CONTADOR ---
  const increaseQty = () => {
      // Opcional: Podrías validar contra el stock máximo aquí si quisieras
      setQuantity(prev => prev + 1)
  }
  
  const decreaseQty = () => {
      setQuantity(prev => (prev > 1 ? prev - 1 : 1))
  }

  const handleAddToCart = () => {
    if (variants.length > 0) {
        if (!selectedColor) return Swal.fire('Falta Color', 'Selecciona un color', 'warning')
        if (!selectedSize) return Swal.fire('Falta Talla', 'Selecciona tu talla', 'warning')
        
        const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize)
        
        if (specificVariant) {
            // Pasamos la cantidad al store (asegúrate de actualizar useCart si es necesario)
            // @ts-ignore
            addItem(product, specificVariant, quantity)
        }
    } else {
        // @ts-ignore
        addItem(product, null, quantity)
    }

    const Toast = Swal.mixin({
        toast: true, position: 'top', showConfirmButton: false, timer: 1000,
        customClass: { popup: 'bg-black text-white rounded-none' }
    })
    Toast.fire({ icon: 'success', title: `AGREGADO (+${quantity})` })
    onClose() 
  }

  const nextImage = () => setGalleryIndex((prev) => (prev + 1) % currentGallery.length)
  const prevImage = () => setGalleryIndex((prev) => (prev - 1 + currentGallery.length) % currentGallery.length)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
            
            <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-white/80 p-2 rounded-full hover:bg-gray-100 transition-colors backdrop-blur shadow-sm">
                <X size={20} />
            </button>

            {/* COLUMNA 1: GALERÍA */}
            <div className="w-full md:w-1/2 bg-gray-50 relative min-h-[350px] md:min-h-full flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 p-0 md:p-8 overflow-hidden group">
                {currentGallery.length > 0 ? (
                    <img 
                        src={currentGallery[galleryIndex]} 
                        alt="Producto" 
                        className="w-full h-full object-contain mix-blend-multiply transition-all duration-500" 
                    />
                ) : (
                    <span className="text-4xl font-black text-gray-200">P.</span>
                )}
                
                {currentGallery.length > 1 && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); prevImage() }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md hover:bg-white active:scale-95 transition-all opacity-0 group-hover:opacity-100">
                            <ChevronLeft size={20}/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); nextImage() }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md hover:bg-white active:scale-95 transition-all opacity-0 group-hover:opacity-100">
                            <ChevronRight size={20}/>
                        </button>
                        
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {currentGallery.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === galleryIndex ? 'bg-black w-3' : 'bg-gray-300'}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur border border-gray-100 px-4 py-2 rounded-xl shadow-sm z-10">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Precio</span>
                    <span className="text-2xl font-black tracking-tight">${product?.usd_cash_price}</span>
                </div>
            </div>

            {/* COLUMNA 2: DETALLES */}
            <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto flex flex-col">
                <div className="mb-6">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product?.category}</span>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight mt-1">{product?.name}</h2>
                    {product?.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">{product.description}</p>}
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-10">
                        <Loader2 className="animate-spin text-gray-300" size={32}/>
                    </div>
                ) : (
                    <div className="space-y-6 flex-1">
                        {variants.length > 0 && (
                            <>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-900 uppercase">1. Elige Color</span>
                                        <span className="text-xs font-medium text-gray-500">{selectedColor}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {availableColors.map((c: any) => (
                                            <button
                                                key={c.name}
                                                onClick={() => {
                                                    setSelectedColor(c.name)
                                                    setSelectedSize(null)
                                                }}
                                                className={`w-9 h-9 rounded-full border shadow-sm transition-transform ${selectedColor === c.name ? 'ring-2 ring-black ring-offset-2 scale-110' : 'hover:scale-105 border-gray-200'}`}
                                                style={{ backgroundColor: c.hex }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* SECCIÓN TALLA Y CANTIDAD (LADO A LADO) */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-gray-900 uppercase">2. Elige Talla</span>
                                    </div>
                                    
                                    {!selectedColor ? (
                                        <div className="flex items-center gap-2 text-xs text-orange-500 bg-orange-50 p-2 rounded-lg">
                                            <AlertCircle size={14}/> Primero selecciona un color
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-4">
                                            {/* LISTA DE TALLAS */}
                                            <div className="flex-1 grid grid-cols-3 gap-2">
                                                {availableSizes.map(v => (
                                                    <button
                                                        key={v.id}
                                                        onClick={() => setSelectedSize(v.size)}
                                                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${selectedSize === v.size ? 'bg-black text-white border-black' : 'border-gray-200 hover:border-black text-gray-600'}`}
                                                    >
                                                        {v.size}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* CONTADOR DE CANTIDAD (AQUÍ ESTÁ DONDE LO QUERÍAS) */}
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 mr-1">Cant.</span>
                                                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1">
                                                    <button 
                                                        onClick={decreaseQty}
                                                        className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-100 text-black hover:bg-gray-100 active:scale-95 transition-all"
                                                    >
                                                        <Minus size={14}/>
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-sm tabular-nums">{quantity}</span>
                                                    <button 
                                                        onClick={increaseQty}
                                                        className="w-8 h-8 flex items-center justify-center bg-black rounded-md shadow-sm border border-black text-white hover:bg-gray-800 active:scale-95 transition-all"
                                                    >
                                                        <Plus size={14}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mt-4">
                            <Truck size={18} className="text-black"/>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-900 uppercase">Envío Inmediato</span>
                                <span className="text-[10px] text-gray-500">Disponible para despacho hoy mismo</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 pt-4 border-t border-gray-100">
                    <button 
                        onClick={handleAddToCart}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        <ShoppingBag size={18} /> 
                        {variants.length > 0 ? `Agregar ${quantity > 1 ? `(${quantity})` : ''}` : 'Agregar al Carrito'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  )
}