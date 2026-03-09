'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ShoppingBag, Truck, AlertCircle, Loader2, Check, ChevronLeft, ChevronRight, Minus, Plus, Flame } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'
import { AnimatePresence, motion, Variants } from 'framer-motion' // IMPORTACIÓN ÉLITE

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
    if (!product) return { cashPrice: 0, priceInBs: 0, hasDiscount: false, discountPercent: 0, exactSavings: 0 }

    const cashPrice = Number(product.usd_cash_price || 0)
    const markup = Number(product.usd_penalty || 0)
    const listPrice = cashPrice + markup
    const priceInBs = listPrice * activeRate
    const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0

    return {
        cashPrice,
        priceInBs,
        discountPercent,
        hasDiscount: markup > 0,
        exactSavings: markup // Extraemos el ahorro exacto para el badge de fuego
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

    const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' } })
    Toast.fire({ icon: 'success', title: `Bolsa Actualizada (+${quantity})` })
    onClose() 
  }

  const nextImage = () => setGalleryIndex((prev) => (prev + 1) % currentGallery.length)
  const prevImage = () => setGalleryIndex((prev) => (prev - 1 + currentGallery.length) % currentGallery.length)

  // Variantes de animación: Bottom Sheet (Móvil) / Right Drawer (Desktop)
  const modalVariants: Variants = {
      hidden: { 
          opacity: 0,
          y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0,
          x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0 
      },
      visible: { 
          opacity: 1, 
          y: 0, 
          x: 0,
          transition: { type: "spring", damping: 25, stiffness: 200 }
      },
      exit: { 
          opacity: 0,
          y: typeof window !== 'undefined' && window.innerWidth < 768 ? "100%" : 0,
          x: typeof window !== 'undefined' && window.innerWidth >= 768 ? "100%" : 0,
          transition: { damping: 25, stiffness: 200 }
      }
  }

  return (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-stretch justify-end">
                {/* Fondo oscuro (Overlay) */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                    onClick={onClose}
                />

                {/* MODAL RESPONSIVE CONTAINER */}
                {/* Mobile: Bottom Sheet (rounded top). Desktop: Right Drawer (h-full) */}
                <motion.div 
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative bg-white w-full md:w-[600px] lg:w-[800px] h-[92vh] md:h-full rounded-t-[32px] md:rounded-none flex flex-col md:flex-row overflow-hidden shadow-2xl md:border-l border-gray-200"
                >
                    
                    {/* Botón cerrar flotante (Adaptativo) */}
                    <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-white/90 p-2 rounded-full hover:bg-gray-100 transition-colors backdrop-blur border border-gray-200 text-gray-900 active:scale-95">
                        <X size={20} strokeWidth={2}/>
                    </button>

                    {/* COLUMNA 1: GALERÍA DE IMÁGENES */}
                    <div className="w-full h-[45%] md:h-full md:w-1/2 bg-[#F8F9FA] relative flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 shrink-0 group overflow-hidden">
                        {currentGallery.length > 0 ? (
                            <img 
                                src={currentGallery[galleryIndex]} 
                                alt="Producto" 
                                className="w-full h-full object-contain mix-blend-multiply p-6 md:p-10 transition-transform duration-700 ease-out group-hover:scale-105" 
                            />
                        ) : (
                            <span className="text-4xl font-black text-gray-200">P.</span>
                        )}
                        
                        {/* Controles de Galería (Clean Look) */}
                        {currentGallery.length > 1 && (
                            <>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); prevImage() }} 
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full border border-gray-200 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-gray-900 hover:bg-black hover:text-white hover:border-black"
                                >
                                    <ChevronLeft size={20} strokeWidth={2}/>
                                </button>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); nextImage() }} 
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full border border-gray-200 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-gray-900 hover:bg-black hover:text-white hover:border-black"
                                >
                                    <ChevronRight size={20} strokeWidth={2}/>
                                </button>
                                
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                    {currentGallery.map((_, idx) => (
                                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'bg-black w-4' : 'bg-gray-300 w-1.5'}`}/>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* COLUMNA 2: INFO, VARIANTES Y ACCIONES */}
                    <div className="w-full h-[55%] md:h-full md:w-1/2 flex flex-col bg-white">
                        
                        {/* 1. Contenido Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                            
                            {/* Titulo y Precios (Clean Look Editorial) */}
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2 block">{product?.category || 'General'}</span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight">{product?.name}</h2>
                                
                                {/* Badges de Descuento/Fuego integrados en la info */}
                                {(pricing.hasDiscount || product?.stock <= 0) && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {pricing.hasDiscount && pricing.exactSavings > 0 && (
                                            <span className="text-emerald-600 text-[10px] font-bold tracking-wide flex items-center gap-1">
                                                Ahorra ${pricing.exactSavings.toFixed(2)} pagando en USD 
                                                <Flame size={12} className="text-emerald-500 fill-emerald-500/20" />
                                            </span>
                                        )}
                                        {product?.stock <= 0 && (
                                            <span className="bg-white text-black border border-gray-200 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm flex items-center">
                                                Agotado
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-col gap-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">{currencySymbol}{pricing.cashPrice.toFixed(2)}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-gray-400">
                                        Bs {new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(pricing.priceInBs)}
                                    </span>
                                </div>

                                {product?.description && (
                                    <p className="text-sm text-gray-600 mt-6 leading-relaxed whitespace-pre-line border-t border-gray-100 pt-6">
                                        {product.description}
                                    </p>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="animate-spin text-gray-300" size={32}/>
                                </div>
                            ) : (
                                <div className="space-y-6 pb-4"> 
                                    {variants.length > 0 && (
                                        <>
                                            {/* Selector de Color (Sin sombras, bordes estrictos) */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">1. Color</span>
                                                    <span className="text-xs font-bold text-gray-900">{selectedColor}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    {availableColors.map((c: any) => (
                                                        <button 
                                                            key={c.name} 
                                                            onClick={() => { setSelectedColor(c.name); setSelectedSize(null) }} 
                                                            className={`w-10 h-10 rounded-full border transition-all relative flex items-center justify-center ${
                                                                selectedColor === c.name 
                                                                ? 'ring-1 ring-black ring-offset-2 scale-110 border-transparent' 
                                                                : 'hover:scale-105 border-gray-200'
                                                            }`} 
                                                            style={{ backgroundColor: c.hex }}
                                                            title={c.name}
                                                        >
                                                            {/* Checkmark sutil si el color es muy oscuro o muy claro */}
                                                            {selectedColor === c.name && <Check size={16} className="text-white/80 mix-blend-difference" strokeWidth={3}/>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Selector de Talla */}
                                            <div className="space-y-3">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">2. Talla</span>
                                                {!selectedColor ? (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
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
                                                                    ? 'bg-black text-white border-black' 
                                                                    : 'bg-white text-gray-900 border-gray-200 hover:border-black'
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

                                    {/* Badge Envío (Clean Look) */}
                                    <div className="flex items-center gap-3 p-4 bg-[#F8F9FA] rounded-2xl border border-gray-200">
                                        <div className="bg-white p-2 rounded-xl border border-gray-200 shrink-0">
                                            <Truck size={16} className="text-gray-900"/>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wide">Envío Inmediato</span>
                                            <span className="text-[11px] font-medium text-gray-500">Disponible para despacho hoy</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Footer Fijo (Controles de Compra) */}
                        <div className="p-4 md:p-6 bg-white border-t border-gray-200 shrink-0 z-10">
                            <div className="flex gap-3 md:gap-4">
                                
                                {/* Selector Cantidad (Estilo Flat) */}
                                <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shrink-0">
                                    <button onClick={decreaseQty} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-900 hover:border-black hover:bg-gray-50 active:scale-95 transition-all">
                                        <Minus size={16} strokeWidth={2.5}/>
                                    </button>
                                    <span className="font-bold text-sm md:text-base w-8 md:w-10 text-center tabular-nums text-gray-900">{quantity}</span>
                                    <button onClick={increaseQty} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black text-white rounded-lg border border-black hover:bg-gray-800 active:scale-95 transition-all">
                                        <Plus size={16} strokeWidth={2.5}/>
                                    </button>
                                </div>

                                {/* Botón Agregar */}
                                <button 
                                    onClick={handleAddToCart} 
                                    disabled={product?.stock <= 0}
                                    className="flex-1 bg-black text-white rounded-full font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-gray-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-black"
                                >
                                    <ShoppingBag size={18} className="pointer-events-none mb-0.5" /> 
                                    <span>{variants.length > 0 ? 'Agregar' : 'Agregar'}</span>
                                </button>

                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
  )
}