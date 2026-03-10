'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingBag, Truck, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/app/store/useCart'
import Swal from 'sweetalert2'

export default function ProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const { addItem } = useCart()

  const [product, setProduct] = useState<any>(null)
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // ESTADOS DE SELECCIÓN
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState<string>('')

  // 1. Cargar Datos
  useEffect(() => {
    const fetchProduct = async () => {
      const { data: prod, error } = await supabase
        .from('products')
        .select('*, stores(name, id, currency_symbol, usd_price, currency_type)')
        .eq('id', id)
        .single()
      
      if (error || !prod) {
        router.push('/')
        return
      }

      setProduct(prod)
      setCurrentImage(prod.image_url) 

      const { data: vars } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id)
        .gt('stock', 0) 
      
      if (vars && vars.length > 0) {
        setVariants(vars)
        const firstColor = vars[0].color_name
        setSelectedColor(firstColor)
      }

      setLoading(false)
    }
    fetchProduct()
  }, [id, router])

  // 2. Lógica de Agrupación
  const availableColors = useMemo(() => {
    const map = new Map()
    variants.forEach(v => {
        if (!map.has(v.color_name)) {
            map.set(v.color_name, { name: v.color_name, hex: v.color_hex, image: v.variant_image })
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

  // 3. Manejadores
  const handleColorSelect = (colorName: string, imageOverride: string | null) => {
    setSelectedColor(colorName)
    setSelectedSize(null) 
    if (imageOverride) setCurrentImage(imageOverride)
    else setCurrentImage(product.image_url) 
  }

  const handleAddToCart = () => {

    
    if (variants.length > 0) {
        if (!selectedColor) return Swal.fire('Falta Color', 'Selecciona un color', 'warning')
        if (!selectedSize) return Swal.fire('Falta Talla', 'Selecciona tu talla', 'warning')
        
        const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize)
        
        if (specificVariant) {
            addItem(product, specificVariant)
        }
    } else {
        addItem(product)
        
    }

    const Toast = Swal.mixin({
        toast: true, position: 'top', showConfirmButton: false, timer: 1500,
        customClass: { popup: 'bg-black text-white rounded-none shadow-2xl' }
    })
    Toast.fire({ icon: 'success', title: 'AGREGADO AL CARRITO' })
  }

  if (loading) return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          <span className="font-bold text-xs tracking-widest text-gray-400">PREPARANDO CATÁLOGO...</span>
      </div>
  )

  return (
    // Padding bottom incrementado a pb-40 en móvil para evitar que el footer fijo tape contenido
    <div className="min-h-screen bg-white text-gray-900 pb-40 md:pb-12 animate-in fade-in duration-500 selection:bg-black selection:text-white">
      
      {/* NAV OPTIMIZADA PARA NO ROMPERSE: Grid de 3 columnas */}
      <div className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-40 border-b border-gray-100 transform-gpu">
        <div className="grid grid-cols-3 items-center max-w-7xl mx-auto px-4 md:px-8 py-3 h-16">
            <div className="flex justify-start">
                <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 -ml-2">
                    <ArrowLeft size={20} />
                </Link>
            </div>
            {/* Título centrado perfecto, no empuja a los lados */}
            <div className="flex justify-center overflow-hidden">
                <span className="font-bold text-xs md:text-sm tracking-widest uppercase truncate text-center">
                    {product.stores?.name || 'Tienda'}
                </span>
            </div>
            <div></div> {/* Spacer invisible para mantener el grid perfecto */}
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="pt-20 md:pt-28 max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-start">
            
            {/* COLUMNA IZQUIERDA: IMAGEN (Sticky Desktop) */}
            <div className="md:sticky md:top-28">
                <div className="aspect-[4/5] md:aspect-square bg-gray-50/80 rounded-3xl md:rounded-[2.5rem] relative overflow-hidden group border border-gray-100 shadow-sm flex items-center justify-center">
                    {currentImage ? (
                        <img 
                            src={currentImage} 
                            alt={product.name} 
                            decoding="async"
                            className="w-full h-full object-contain p-6 md:p-12 mix-blend-multiply transform-gpu transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                    ) : (
                        <div className="text-gray-200 font-black text-6xl">P.</div>
                    )}
                    
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-lg border border-black/5">
                        <span className="text-[10px] md:text-xs font-bold text-gray-400 mr-0.5 md:mr-1">$</span>
                        <span className="text-lg md:text-2xl font-black tracking-tighter">{product.usd_cash_price}</span>
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA: INFO Y SELECTORES */}
            <div className="flex flex-col gap-6 md:gap-8 md:pt-4">
                
                {/* Info Principal */}
                <div>
                    <span className="inline-block px-3 py-1 bg-gray-100 text-[10px] font-bold text-gray-600 rounded-full uppercase tracking-widest mb-3">
                        {product.category}
                    </span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-black mb-3">
                        {product.name}
                    </h1>
                    {product.description && (
                        <p className="text-gray-500 text-sm leading-relaxed">
                            {product.description}
                        </p>
                    )}
                </div>

                {/* Selectores */}
                {variants.length > 0 && (
                    <div className="space-y-6 bg-gray-50/50 md:bg-transparent p-5 md:p-0 rounded-3xl border border-gray-100 md:border-transparent">
                        
                        {/* Selector de Color */}
                        <div>
                            <div className="flex items-end justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Seleccionar Color</span>
                                <span className="text-sm font-black text-black">{selectedColor || '-'}</span>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {availableColors.map((c: any) => (
                                    <button
                                        key={c.name}
                                        onClick={() => handleColorSelect(c.name, c.image)}
                                        className={`w-11 h-11 md:w-14 md:h-14 rounded-full shadow-sm transition-all duration-300 relative transform-gpu flex-shrink-0 ${
                                            selectedColor === c.name 
                                            ? 'scale-110 ring-2 ring-black ring-offset-2 border-none' 
                                            : 'border border-gray-200 hover:scale-105 hover:shadow-md'
                                        }`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                        aria-label={`Seleccionar color ${c.name}`}
                                    >
                                        {selectedColor === c.name && c.hex.toLowerCase() === '#ffffff' && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px w-full bg-gray-200/60 md:hidden"></div>

                        {/* Selector de Talla (SOLUCIÓN FLEX-WRAP PARA EVITAR DESBORDAMIENTO) */}
                        <div>
                             <div className="flex items-end justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Talla (EU)</span>
                                {selectedSize && <span className="text-sm font-black text-black animate-in fade-in slide-in-from-bottom-1">Sel: {selectedSize}</span>}
                            </div>
                            
                            {!selectedColor ? (
                                <div className="flex items-center gap-3 text-xs md:text-sm font-medium text-orange-600 bg-orange-50/50 p-4 rounded-xl border border-orange-100/50">
                                    <AlertCircle size={16} className="text-orange-500" /> Selecciona un color para ver tallas
                                </div>
                            ) : (
                                /* Usamos flex-wrap en lugar de grid estricto para que se adapte al contenido de la talla */
                                <div className="flex flex-wrap gap-2 md:gap-3">
                                    {availableSizes.map((v) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setSelectedSize(v.size)}
                                            className={`py-3 px-5 min-w-[3.5rem] md:min-w-[4.5rem] rounded-xl text-sm font-black border transition-all duration-200 transform-gpu active:scale-95 ${
                                                selectedSize === v.size 
                                                ? 'bg-black text-white border-black shadow-lg shadow-black/20 -translate-y-1' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black shadow-sm'
                                            }`}
                                        >
                                            {v.size}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* BOTÓN DE COMPRA DESKTOP */}
                <div className="hidden md:flex pt-4">
                    <button 
                        onClick={handleAddToCart}
                        className="w-full bg-black text-white py-5 rounded-full font-black uppercase tracking-widest text-sm hover:bg-gray-800 hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-black/10 flex items-center justify-center gap-3"
                    >
                        <ShoppingBag size={18} /> Agregar al Carrito — ${product.usd_cash_price}
                    </button>
                </div>

                {/* Garantías (Solución Responsive: Stacking en móviles extra pequeños) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="flex items-center sm:items-start sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-colors hover:border-gray-200">
                        <div className="bg-white p-2 sm:p-0 sm:bg-transparent rounded-lg shadow-sm sm:shadow-none border border-gray-100 sm:border-transparent">
                            <Truck size={20} className="text-black"/>
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-xs font-black text-black uppercase leading-tight">Envío Nacional</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">Seguro y rastreable</p>
                        </div>
                    </div>
                    <div className="flex items-center sm:items-start sm:flex-col gap-3 sm:gap-2 p-3 sm:p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-colors hover:border-gray-200">
                        <div className="bg-white p-2 sm:p-0 sm:bg-transparent rounded-lg shadow-sm sm:shadow-none border border-gray-100 sm:border-transparent">
                            <ShieldCheck size={20} className="text-black"/>
                        </div>
                        <div>
                            <p className="text-[11px] sm:text-xs font-black text-black uppercase leading-tight">Compra Segura</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">Datos encriptados</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>

      {/* FOOTER FIJO MÓVIL (Solución: Flex-shrink para evitar compresión del botón) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-4 pt-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 transform-gpu">
         {/* Agregado padding bottom extra manual para separar del borde del telefono */}
         <div className="flex items-center gap-4 pb-4 pt-1 max-w-md mx-auto">
             <div className="flex flex-col justify-center flex-shrink-0">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total</span>
                 {/* Truncate evita que un precio loco empuje el boton */}
                 <span className="text-2xl font-black text-black tracking-tighter truncate max-w-[100px] mt-0.5">${product.usd_cash_price}</span>
             </div>
             <button 
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white h-12 rounded-full font-black uppercase tracking-widest text-xs hover:bg-gray-800 active:scale-95 transition-all shadow-xl shadow-black/20 flex items-center justify-center gap-2"
             >
                <ShoppingBag size={16} /> Agregar
             </button>
         </div>
      </div>

    </div>
  )
}