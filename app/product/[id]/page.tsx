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
  
  // ESTADOS DE SELECCIÓN (La Lógica Kinetic)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState<string>('')

  // 1. Cargar Datos
  useEffect(() => {
    const fetchProduct = async () => {
      // Cargar Producto Padre
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
      setCurrentImage(prod.image_url) // Imagen inicial

      // Cargar Variantes
      const { data: vars } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id)
        .gt('stock', 0) // Solo traer lo que tiene stock (Elite UX)
      
      if (vars && vars.length > 0) {
        setVariants(vars)
        // Auto-seleccionar primer color disponible para evitar clicks extra
        const firstColor = vars[0].color_name
        setSelectedColor(firstColor)
      }

      setLoading(false)
    }
    fetchProduct()
  }, [id, router])

  // 2. Lógica de Agrupación (Matrix)
  const availableColors = useMemo(() => {
    // Extraer colores únicos y sus hex
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
    // Filtrar tallas disponibles SOLO para el color seleccionado
    return variants
        .filter(v => v.color_name === selectedColor)
        .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true })) // Ordenar tallas lógicamente
  }, [variants, selectedColor])

  // 3. Manejadores (Handlers)
  const handleColorSelect = (colorName: string, imageOverride: string | null) => {
    setSelectedColor(colorName)
    setSelectedSize(null) // Resetear talla al cambiar color
    // Kinetic Image Swap
    if (imageOverride) setCurrentImage(imageOverride)
    else setCurrentImage(product.image_url) // Volver a la original si no hay override
  }

  const handleAddToCart = () => {
    // Validación Estricta
    if (variants.length > 0) {
        if (!selectedColor) return Swal.fire('Falta Color', 'Selecciona un color', 'warning')
        if (!selectedSize) return Swal.fire('Falta Talla', 'Selecciona tu talla', 'warning')
        
        // Encontrar la variante exacta (El ID real de la base de datos)
        const specificVariant = variants.find(v => v.color_name === selectedColor && v.size === selectedSize)
        
        if (specificVariant) {
            addItem(product, specificVariant)
        }
    } else {
        // Producto simple (sin variantes)
        addItem(product)
    }

    const Toast = Swal.mixin({
        toast: true, position: 'top', showConfirmButton: false, timer: 1500,
        customClass: { popup: 'bg-black text-white rounded-none' }
    })
    Toast.fire({ icon: 'success', title: 'AGREGADO AL CARRITO' })
  }

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><span className="animate-pulse font-bold text-xs tracking-widest">CARGANDO PRODUCTO...</span></div>

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-32 animate-in fade-in duration-500">
      
      {/* NAV SIMPLE */}
      <div className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-40 px-4 py-4 flex justify-between items-center border-b border-gray-100">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
        </Link>
        <span className="font-bold text-sm tracking-wide uppercase truncate max-w-[200px]">{product.name}</span>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="pt-20 max-w-md mx-auto px-4">
        
        {/* IMAGEN HERO (KINETIC) */}
        <div className="aspect-square bg-gray-50 rounded-2xl mb-8 relative overflow-hidden group border border-gray-100">
            {currentImage ? (
                <img 
                    src={currentImage} 
                    alt={product.name} 
                    className="w-full h-full object-contain p-6 mix-blend-multiply transition-all duration-500 group-hover:scale-105"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-4xl">P.</div>
            )}
            
            {/* Badge de Precio */}
            <div className="absolute bottom-4 right-4 bg-black/90 text-white backdrop-blur px-4 py-2 rounded-lg shadow-lg">
                <span className="text-xs font-bold text-gray-400 mr-1">$</span>
                <span className="text-xl font-black tracking-tighter">{product.usd_cash_price}</span>
            </div>
        </div>

        {/* INFO PRINCIPAL */}
        <div className="mb-8">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.category}</span>
            <h1 className="text-3xl font-black tracking-tight leading-none mt-1 mb-3 text-black">{product.name}</h1>
            {product.description && <p className="text-gray-500 text-sm leading-relaxed">{product.description}</p>}
        </div>

        {/* --- SELECTORES "ELITE" --- */}
        {variants.length > 0 && (
            <div className="space-y-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                
                {/* 1. SELECTOR DE COLOR */}
                <div>
                    <div className="flex justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color</span>
                        <span className="text-xs font-bold text-black">{selectedColor}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {availableColors.map((c: any) => (
                            <button
                                key={c.name}
                                onClick={() => handleColorSelect(c.name, c.image)}
                                className={`w-10 h-10 rounded-full border-2 shadow-sm transition-all duration-300 relative ${selectedColor === c.name ? 'border-black scale-110 ring-2 ring-black ring-offset-2' : 'border-gray-200 hover:scale-105'}`}
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                            >
                                {/* Check visual si está seleccionado */}
                                {selectedColor === c.name && c.hex.toLowerCase() === '#ffffff' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-black rounded-full"></div></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. SELECTOR DE TALLA */}
                <div>
                     <div className="flex justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Talla / Medida</span>
                        {selectedSize && <span className="text-xs font-bold text-black animate-in fade-in">Seleccionada: {selectedSize}</span>}
                    </div>
                    
                    {!selectedColor ? (
                        <div className="flex items-center gap-2 text-xs text-orange-500 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                            <AlertCircle size={14} /> Selecciona un color primero
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {availableSizes.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedSize(v.size)}
                                    className={`py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                                        selectedSize === v.size 
                                        ? 'bg-black text-white border-black shadow-lg transform -translate-y-0.5' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
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

        {/* --- GARANTÍAS (Micro-copy de conversión) --- */}
        <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Truck size={20} className="text-gray-400"/>
                <span className="text-[10px] font-bold text-gray-500 uppercase leading-tight">Envío Nacional<br/>Disponible</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <ShieldCheck size={20} className="text-gray-400"/>
                <span className="text-[10px] font-bold text-gray-500 uppercase leading-tight">Compra Segura<br/>Verificada</span>
            </div>
        </div>

      </div>

      {/* FOOTER FIJO DE ACCIÓN */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-100 p-4 safe-area-pb z-50">
         <div className="max-w-md mx-auto flex gap-4">
             <div className="flex flex-col justify-center">
                 <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                 <span className="text-2xl font-black text-black tracking-tight">${product.usd_cash_price}</span>
             </div>
             <button 
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2"
             >
                <ShoppingBag size={18} /> Agregar
             </button>
         </div>
      </div>

    </div>
  )
}