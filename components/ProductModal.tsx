'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ShoppingBag, Truck, AlertCircle, Loader2, Check, ChevronLeft, ChevronRight, Minus, Plus, Flame } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'
import { AnimatePresence, motion, Variants } from 'framer-motion'

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

  const isEur = currency === 'eur'
  const activeRate = isEur ? rates.eur : rates.usd
  const currencySymbol = '$'

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
        exactSavings: markup 
    }
  }, [product, activeRate])

  // --- FETCHING (AHORA TRAEMOS TODO, INCLUSO STOCK 0) ---
  useEffect(() => {
    if (isOpen && product) {
      setLoading(true)
      const fetchData = async () => {
        const { data: vars } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', product.id)
          // ELIMINADO: .gt('stock', 0) -> Ahora necesitamos saber cuáles están en 0 para tacharlos
        
        setFullProduct(product)
        setCurrentGallery([product.image_url])
        setGalleryIndex(0)
        setQuantity(1) 

        if (vars && vars.length > 0) {
          setVariants(vars)
          
          // Seleccionar el primer color que tenga AL MENOS una talla con stock
          const availableVar = vars.find((v: any) => v.stock > 0) || vars[0]
          setSelectedColor(availableVar.color_name)
          
          let images = []
          if (availableVar.gallery && availableVar.gallery.length > 0) images = availableVar.gallery
          else if (availableVar.variant_image) images = [availableVar.variant_image]
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

  // --- STOCK ENGINE (Cálculos de Límites) ---
  const availableColors = useMemo(() => {
    const map = new Map()
    variants.forEach(v => { 
        if (!map.has(v.color_name)) {
            // Un color está disponible si al menos una de sus tallas tiene stock
            const isColorAvailable = variants.some(varCheck => varCheck.color_name === v.color_name && varCheck.stock > 0)
            map.set(v.color_name, { name: v.color_name, hex: v.color_hex, isAvailable: isColorAvailable }) 
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

  const currentMaxStock = useMemo(() => {
      if (variants.length === 0) return product?.stock || 0; // Si no hay variantes, usa stock general
      if (!selectedColor || !selectedSize) return 0;
      const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize);
      return specificVariant ? specificVariant.stock : 0;
  }, [variants, selectedColor, selectedSize, product])

  // Resetea cantidad si cambiamos de talla/color y excede el nuevo límite
  useEffect(() => {
      if (quantity > currentMaxStock && currentMaxStock > 0) {
          setQuantity(currentMaxStock)
      } else if (currentMaxStock === 0) {
          setQuantity(1) // Si no hay stock, dejamos en 1 visualmente pero el botón estará bloqueado
      }
  }, [currentMaxStock, quantity])

  const increaseQty = () => {
      if (quantity < currentMaxStock) setQuantity(prev => prev + 1)
  }
  const decreaseQty = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1))

  const handleAddToCart = () => {
    if (variants.length > 0) {
        if (!selectedColor) return Swal.fire({ title: 'Falta Color', text: 'Selecciona un color', icon: 'warning', confirmButtonColor: '#000' })
        if (!selectedSize) return Swal.fire({ title: 'Falta Talla', text: 'Selecciona tu talla', icon: 'warning', confirmButtonColor: '#000' })
        
        const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize)
        if (specificVariant) {
            if (specificVariant.stock <= 0) return Swal.fire({ title: 'Agotado', text: 'Esta talla está agotada', icon: 'error', confirmButtonColor: '#000' })
            addItem(product, specificVariant, quantity)
        }
    } else {
        if (product.stock <= 0) return Swal.fire({ title: 'Agotado', text: 'Este producto está agotado', icon: 'error', confirmButtonColor: '#000' })
        addItem(product, null, quantity)
    }

    const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' } })
    Toast.fire({ icon: 'success', title: `Bolsa Actualizada (+${quantity})` })
    onClose() 
  }

  const nextImage = () => setGalleryIndex((prev) => (prev + 1) % currentGallery.length)
  const prevImage = () => setGalleryIndex((prev) => (prev - 1 + currentGallery.length) % currentGallery.length)

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

// NUEVO: CÁLCULO BLINDADO CONTRA VALORES NULOS
  const isCompletelyOutOfStock = variants.length > 0 
      ? variants.every(v => (v.stock || 0) <= 0) 
      : (product?.stock || 0) <= 0;

  return (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-stretch justify-end">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                    onClick={onClose}
                />

                <motion.div 
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative bg-white w-full md:w-[600px] lg:w-[800px] h-[92vh] md:h-full rounded-t-[32px] md:rounded-none flex flex-col md:flex-row overflow-hidden shadow-2xl md:border-l border-gray-200"
                >
                    
                    <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-white/90 p-2 rounded-full hover:bg-gray-100 transition-colors backdrop-blur border border-gray-200 text-gray-900 active:scale-95">
                        <X size={20} strokeWidth={2}/>
                    </button>

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
                        
                        {currentGallery.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prevImage() }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full border border-gray-200 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-gray-900 hover:bg-black hover:text-white hover:border-black"><ChevronLeft size={20} strokeWidth={2}/></button>
                                <button onClick={(e) => { e.stopPropagation(); nextImage() }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full border border-gray-200 active:scale-95 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10 text-gray-900 hover:bg-black hover:text-white hover:border-black"><ChevronRight size={20} strokeWidth={2}/></button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                    {currentGallery.map((_, idx) => (<div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'bg-black w-4' : 'bg-gray-300 w-1.5'}`}/>))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="w-full h-[55%] md:h-full md:w-1/2 flex flex-col bg-white">
                        
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                            
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2 block">{product?.category || 'General'}</span>
                                <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight tracking-tight">{product?.name}</h2>
                                
                                {(pricing.hasDiscount || isCompletelyOutOfStock) && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {pricing.hasDiscount && pricing.exactSavings > 0 && (
                                            <span className="text-emerald-600 text-[10px] font-bold tracking-wide flex items-center gap-1">
                                                Ahorra ${pricing.exactSavings.toFixed(2)} pagando en USD <Flame size={12} className="text-emerald-500 fill-emerald-500/20" />
                                            </span>
                                        )}
                                        {isCompletelyOutOfStock && (
                                            <span className="bg-gray-100 text-gray-500 border border-gray-200 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm flex items-center">
                                                Agotado Temporalmente
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
                                    {variants.length > 0 && !isCompletelyOutOfStock && (
                                        <>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">1. Color</span>
                                                    <span className="text-xs font-bold text-gray-900">{selectedColor}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    {availableColors.map((c: any) => (
                                                        <button 
                                                            key={c.name} 
                                                            onClick={() => { if(c.isAvailable) { setSelectedColor(c.name); setSelectedSize(null) } }} 
                                                            disabled={!c.isAvailable}
                                                            className={`w-10 h-10 rounded-full border transition-all relative flex items-center justify-center ${
                                                                selectedColor === c.name ? 'ring-1 ring-black ring-offset-2 scale-110 border-transparent' : 'hover:scale-105 border-gray-200'
                                                            } ${!c.isAvailable ? 'opacity-30 cursor-not-allowed grayscale' : ''}`} 
                                                            style={{ backgroundColor: c.hex }}
                                                            title={!c.isAvailable ? 'Agotado' : c.name}
                                                        >
                                                            {selectedColor === c.name && <Check size={16} className="text-white/80 mix-blend-difference" strokeWidth={3}/>}
                                                            {/* Linea tachada si no hay stock del color completo */}
                                                            {!c.isAvailable && <div className="absolute inset-0 w-full h-[1px] bg-red-500 top-1/2 -rotate-45" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">2. Talla</span>
                                                    {selectedSize && currentMaxStock > 0 && (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                            Quedan {currentMaxStock} und.
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {!selectedColor ? (
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                                        <AlertCircle size={16}/> Selecciona un color primero
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {availableSizes.map(v => {
                                                            const isOutOfStock = v.stock <= 0;
                                                            return (
                                                                <button 
                                                                    key={v.id} 
                                                                    onClick={() => { if(!isOutOfStock) setSelectedSize(v.size) }} 
                                                                    disabled={isOutOfStock}
                                                                    className={`relative min-w-[3rem] px-3 py-2.5 rounded-lg text-xs font-bold border transition-all overflow-hidden ${
                                                                        selectedSize === v.size 
                                                                        ? 'bg-black text-white border-black' 
                                                                        : isOutOfStock 
                                                                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60' 
                                                                            : 'bg-white text-gray-900 border-gray-200 hover:border-black'
                                                                    }`}
                                                                >
                                                                    {v.size}
                                                                    {/* TACHADO CSS PARA TALLAS AGOTADAS */}
                                                                    {isOutOfStock && (
                                                                        <svg className="absolute inset-0 w-full h-full text-gray-300" preserveAspectRatio="none" viewBox="0 0 100 100">
                                                                            <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="2" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {!isCompletelyOutOfStock && (
                                        <div className="flex items-center gap-3 p-4 bg-[#F8F9FA] rounded-2xl border border-gray-200">
                                            <div className="bg-white p-2 rounded-xl border border-gray-200 shrink-0">
                                                <Truck size={16} className="text-gray-900"/>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wide">Envío Inmediato</span>
                                                <span className="text-[11px] font-medium text-gray-500">Disponible para despacho hoy</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Footer Fijo (Controles de Compra) */}
                        <div className="p-4 md:p-6 bg-white border-t border-gray-200 shrink-0 z-10">
                            <div className="flex gap-3 md:gap-4">
                                
                                <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200 shrink-0">
                                    <button onClick={decreaseQty} disabled={isCompletelyOutOfStock || quantity <= 1} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-900 hover:border-black hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Minus size={16} strokeWidth={2.5}/>
                                    </button>
                                    <span className="font-bold text-sm md:text-base w-8 md:w-10 text-center tabular-nums text-gray-900">{quantity}</span>
                                    <button onClick={increaseQty} disabled={isCompletelyOutOfStock || quantity >= currentMaxStock || (variants.length > 0 && !selectedSize)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black text-white rounded-lg border border-black hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed">
    <Plus size={16} strokeWidth={2.5}/>
</button>
                                </div>

                                <button 
                                    onClick={handleAddToCart} 
                                    disabled={isCompletelyOutOfStock || (variants.length > 0 && !selectedSize)}
                                    className="flex-1 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-gray-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-black"
                                >
                                    <ShoppingBag size={18} className="pointer-events-none mb-0.5" /> 
                                    <span>{isCompletelyOutOfStock ? 'Agotado' : (variants.length > 0 ? 'Agregar Selección' : 'Agregar a Bolsa')}</span>
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