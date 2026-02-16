'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ShoppingBag, Truck, AlertCircle, Loader2, ChevronLeft, ChevronRight, Minus, Plus, Tag } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: any 
  currency: 'usd' | 'eur'
  rates: { usd: number, eur: number }
}

export default function ProductModal({ isOpen, onClose, product, currency, rates }: ProductModalProps) {
  const { addItem } = useCart()
  const [supabase] = useState(() => getSupabase())
  
  const [fullProduct, setFullProduct] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  
  const [currentGallery, setCurrentGallery] = useState<string[]>([])
  const [galleryIndex, setGalleryIndex] = useState(0)

  // LOGICA DE MONEDA
  const isEur = currency === 'eur'
  const activeRate = isEur ? rates.eur : rates.usd
  const currencySymbol = '$'

  // --- ENGINE PRECIOS ---
  const pricing = useMemo(() => {
    if (!product) return { cashPrice: 0, priceInBs: 0, hasDiscount: false, discountPercent: 0 }

    const cashPrice = Number(product.usd_cash_price || 0)
    const markup = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + markup
    const priceInBs = listPrice * activeRate
    const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0

    return {
        cashPrice,
        priceInBs,
        discountPercent,
        hasDiscount: markup > 0
    }
  }, [product, activeRate])

  // --- FETCHING ---
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
        setQuantity(1) 

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
  }, [isOpen, product, supabase])

  // --- GALERIA UPDATE ---
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
  }, [selectedColor, variants, product, currentGallery])

  // --- HELPERS ---
  const availableColors = useMemo(() => {
    const map = new Map()
    variants.forEach(v => { if (!map.has(v.color_name)) map.set(v.color_name, { name: v.color_name, hex: v.color_hex }) })
    return Array.from(map.values())
  }, [variants])

  const availableSizes = useMemo(() => {
    if (!selectedColor) return []
    return variants.filter(v => v.color_name === selectedColor).sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
  }, [variants, selectedColor])

  const increaseQty = () => setQuantity(prev => prev + 1)
  const decreaseQty = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1))

  const handleAddToCart = () => {
    if (variants.length > 0) {
        if (!selectedColor) return Swal.fire({ title: 'Falta Color', text: 'Selecciona un color', icon: 'warning', confirmButtonColor: '#000' })
        if (!selectedSize) return Swal.fire({ title: 'Falta Talla', text: 'Selecciona tu talla', icon: 'warning', confirmButtonColor: '#000' })
        
        const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize)
        if (specificVariant) addItem(product, specificVariant, quantity)
    } else {
        addItem(product, null, quantity)
    }
    
    const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1000, customClass: { popup: 'bg-black text-white rounded-none' } })
    Toast.fire({ icon: 'success', title: `AGREGADO (+${quantity})` })
    onClose() 
  }

  const nextImage = () => setGalleryIndex((prev) => (prev + 1) % currentGallery.length)
  const prevImage = () => setGalleryIndex((prev) => (prev - 1 + currentGallery.length) % currentGallery.length)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

        {/* MODAL CONTAINER - Altura fija y flex para scroll */}
        <div className="bg-white w-full max-w-4xl h-[90vh] md:h-[85vh] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
            
            {/* Botón cerrar flotante */}
            <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-white/80 p-2 rounded-full hover:bg-gray-100 transition-colors backdrop-blur shadow-sm border border-gray-100">
                <X size={20} className="pointer-events-none"/>
            </button>

            {/* COLUMNA 1: GALERÍA (40% Alto en Móvil / 50% Ancho en Desktop) */}
            <div className="w-full h-[40%] md:h-full md:w-1/2 bg-gray-50 relative flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 shrink-0 group">
                {currentGallery.length > 0 ? (
                    <img 
                        src={currentGallery[galleryIndex]} 
                        alt="Producto" 
                        className="w-full h-full object-contain mix-blend-multiply p-8 transition-all duration-500 ease-out" 
                    />
                ) : (
                    <span className="text-4xl font-black text-gray-200">P.</span>
                )}
                
                {/* Navegación Carrusel (Botones SIEMPRE visibles en móvil) */}
                {currentGallery.length > 1 && (
                    <>
                        {/* Botón Izquierda - Visible en móvil (opacity-100) */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); prevImage() }} 
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2.5 rounded-full shadow-lg border border-gray-100 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
                        >
                            <ChevronLeft size={20} className="pointer-events-none"/>
                        </button>
                        
                        {/* Botón Derecha - Visible en móvil (opacity-100) */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); nextImage() }} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2.5 rounded-full shadow-lg border border-gray-100 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
                        >
                            <ChevronRight size={20} className="pointer-events-none"/>
                        </button>
                        
                        {/* Puntos indicadores */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-1 bg-white/50 backdrop-blur rounded-full z-10">
                            {currentGallery.map((_, idx) => (
                                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'bg-black w-4' : 'bg-gray-400 w-1.5'}`}/>
                            ))}
                        </div>
                    </>
                )}

                {/* ETIQUETA PRECIO FLOTANTE SOBRE IMAGEN */}
                <div className="absolute top-4 left-4 flex flex-col items-start gap-2 pointer-events-none z-10">
                    {pricing.hasDiscount && (
                        <div className="bg-black/90 backdrop-blur text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                            <Tag size={12} className="text-emerald-400"/>
                            -{pricing.discountPercent}% OFF
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMNA 2: INFO Y ACCIONES (Flex Column para manejar el scroll) */}
            <div className="w-full h-[60%] md:h-full md:w-1/2 flex flex-col bg-white">
                
                {/* 1. CONTENIDO SCROLLABLE (flex-1 overflow-y-auto) */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    
                    {/* Header Info */}
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">{product?.category || 'General'}</span>
                        <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight mt-3 tracking-tight">{product?.name}</h2>
                        
                        {/* Precio Principal */}
                        <div className="mt-4 flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-gray-900 tracking-tighter">{currencySymbol}{pricing.cashPrice.toFixed(2)}</span>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Precio Cash</span>
                            </div>
                            <span className="text-xs font-medium text-gray-400">
                                Ref Bs: {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
                            </span>
                        </div>

                        {product?.description && <p className="text-sm text-gray-500 mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="animate-spin text-gray-300" size={32}/>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-4"> 
                            {/* SELECTOR DE COLOR */}
                            {variants.length > 0 && (
                                <>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">1. Color</span>
                                            <span className="text-xs font-medium text-gray-500">{selectedColor}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {availableColors.map((c: any) => (
                                                <button 
                                                    key={c.name} 
                                                    onClick={() => { setSelectedColor(c.name); setSelectedSize(null) }} 
                                                    className={`w-10 h-10 rounded-full border shadow-sm transition-all relative ${
                                                        selectedColor === c.name 
                                                        ? 'ring-2 ring-black ring-offset-2 scale-110' 
                                                        : 'hover:scale-105 border-gray-200'
                                                    }`} 
                                                    style={{ backgroundColor: c.hex }}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* SELECTOR DE TALLA */}
                                    <div className="space-y-3">
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wide block">2. Talla</span>
                                        {!selectedColor ? (
                                            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                                                <AlertCircle size={16}/> Selecciona un color primero
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {availableSizes.map(v => (
                                                    <button 
                                                        key={v.id} 
                                                        onClick={() => setSelectedSize(v.size)} 
                                                        className={`min-w-[3rem] px-3 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                                                            selectedSize === v.size 
                                                            ? 'bg-black text-white border-black shadow-md' 
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-black'
                                                        }`}
                                                    >
                                                        {v.size}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Badge Envío */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="bg-white p-1.5 rounded-full shadow-sm">
                                    <Truck size={16} className="text-black"/>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-900 uppercase">Envío Inmediato</span>
                                    <span className="text-[10px] text-gray-500">Disponible para despacho hoy</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. FOOTER FIJO (shrink-0 para que no desaparezca) */}
                <div className="p-4 md:p-6 bg-white border-t border-gray-100 shrink-0 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex gap-3 md:gap-4">
                        {/* Selector Cantidad */}
                        <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shrink-0">
                            <button onClick={decreaseQty} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 text-gray-600 hover:text-black active:scale-95 transition-all">
                                <Minus size={16} className="pointer-events-none"/>
                            </button>
                            <span className="font-bold text-sm w-8 text-center tabular-nums">{quantity}</span>
                            <button onClick={increaseQty} className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-lg shadow-sm border border-black hover:bg-gray-800 active:scale-95 transition-all">
                                <Plus size={16} className="pointer-events-none"/>
                            </button>
                        </div>

                        {/* Botón Agregar */}
                        <button 
                            onClick={handleAddToCart} 
                            disabled={product?.stock <= 0}
                            className="flex-1 bg-black text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-900 transition-all shadow-xl shadow-black/10 active:scale-[0.98] flex items-center justify-center gap-[1.33px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ShoppingBag size={18} className="pointer-events-none mb-0.5" /> 
                            <span>{variants.length > 0 ? 'Agregar Selección' : 'Agregar al Carrito'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
    </div>
  )
}