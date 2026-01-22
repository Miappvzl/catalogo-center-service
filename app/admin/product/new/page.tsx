'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon, Box, DollarSign, Layers } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'

// Colores Predefinidos (Estilo Elite)
const PRESET_COLORS = [
  { name: 'Negro', hex: '#000000' },
  { name: 'Blanco', hex: '#FFFFFF' },
  { name: 'Rojo', hex: '#EF4444' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Beige', hex: '#F5F5DC' },
]

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)

  // --- ESTADO DEL PRODUCTO BASE ---
  const [product, setProduct] = useState({
    name: '',
    category: '',
    image_url: '',
    usd_cash_price: 0,
    usd_penalty: 0,
    description: '' // Opcional
  })

  // --- ESTADO DE VARIANTES (MATRIX) ---
  const [variants, setVariants] = useState<any[]>([])
  const [newVariant, setNewVariant] = useState({
    size: '',
    color_name: 'Unico', // Default para productos sin color
    color_hex: '#000000',
    stock: 1,
    image_override: ''
  })

  // Cargar ID de la tienda (Del usuario logueado)
  useEffect(() => {
    const fetchStore = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if(user) {
        const { data } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
        if(data) setStoreId(data.id)
      }
    }
    fetchStore()
  }, [])

  // --- LÓGICA DE VARIANTES ---
  const addVariant = () => {
    if (!newVariant.size) return Swal.fire('Falta Talla', 'Ingresa una talla (ej: M, 42)', 'warning')
    
    setVariants([...variants, { ...newVariant, id: Date.now() }]) // ID temporal para la UI
    setNewVariant({ ...newVariant, size: '' }) // Limpiar solo la talla para agregar otra rapido
  }

  const removeVariant = (id: number) => {
    setVariants(variants.filter(v => v.id !== id))
  }

  // --- GUARDADO MAESTRO ---
  const handleSave = async () => {
    if (!product.name || !product.usd_cash_price) return Swal.fire('Error', 'Nombre y Precio son obligatorios', 'error')
    if (!storeId) return

    setLoading(true)

    try {
        // 1. Guardar Producto Padre
        const { data: newProd, error: prodError } = await supabase
            .from('products')
            .insert({
                ...product,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                // store_id no está en tu esquema original de products, asumo que se vincula por user_id
                // Si agregaste store_id a products, inclúyelo aquí.
            })
            .select()
            .single()

        if (prodError) throw prodError

        // 2. Guardar Variantes (Si existen)
        if (variants.length > 0 && newProd) {
            const variantsToInsert = variants.map(v => ({
                product_id: newProd.id,
                size: v.size,
                color_name: v.color_name,
                color_hex: v.color_hex,
                stock: v.stock,
                variant_image: v.image_override || null // Si está vacío usa null
            }))

            const { error: varError } = await supabase
                .from('product_variants')
                .insert(variantsToInsert)
            
            if (varError) throw varError
        }

        Swal.fire('¡Éxito!', 'Producto creado correctamente', 'success')
        router.push('/admin')

    } catch (error: any) {
        Swal.fire('Error', error.message, 'error')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={20}/></Link>
                <h1 className="font-black text-xl tracking-tight">Nuevo Producto</h1>
            </div>
            <button 
                onClick={handleSave}
                disabled={loading}
                className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all shadow-lg flex items-center gap-2"
            >
                {loading ? 'Guardando...' : <><Save size={18}/> Publicar</>}
            </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMNA IZQUIERDA: DATOS GENERALES */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* TARJETA 1: INFO BÁSICA */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Box size={18}/> Información Base</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Producto</label>
                            <input 
                                type="text" 
                                value={product.name}
                                onChange={e => setProduct({...product, name: e.target.value})}
                                placeholder="Ej: Nike Air Force 1"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                                <input 
                                    type="text" 
                                    value={product.category}
                                    onChange={e => setProduct({...product, category: e.target.value})}
                                    placeholder="Ej: Zapatos"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Imagen Principal (URL)</label>
                                <div className="relative">
                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                    <input 
                                        type="text" 
                                        value={product.image_url}
                                        onChange={e => setProduct({...product, image_url: e.target.value})}
                                        placeholder="https://..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 font-mono text-xs focus:ring-2 focus:ring-black outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: GESTOR DE VARIANTES (ELITE) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-black">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Layers size={18}/> Variantes (Tallas y Colores)</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono font-bold text-gray-500">{variants.length} Agregadas</span>
                    </div>

                    {/* CONTROL DE CREACIÓN */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            
                            {/* Selector de Color */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Color</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {PRESET_COLORS.map(c => (
                                        <button 
                                            key={c.hex}
                                            onClick={() => setNewVariant({...newVariant, color_name: c.name, color_hex: c.hex})}
                                            className={`w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110 ${newVariant.color_hex === c.hex ? 'ring-2 ring-offset-2 ring-black' : 'border-gray-200'}`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                                <input 
                                    type="text" 
                                    value={newVariant.color_name}
                                    onChange={e => setNewVariant({...newVariant, color_name: e.target.value})}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold"
                                    placeholder="Nombre Color"
                                />
                            </div>

                            {/* Talla */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Talla / Medida</label>
                                <input 
                                    type="text" 
                                    value={newVariant.size}
                                    onChange={e => setNewVariant({...newVariant, size: e.target.value})}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-black outline-none"
                                    placeholder="Ej: 42 o M"
                                />
                            </div>

                            {/* Stock */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stock Disp.</label>
                                <input 
                                    type="number" 
                                    value={newVariant.stock}
                                    onChange={e => setNewVariant({...newVariant, stock: parseInt(e.target.value)})}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-1 focus:ring-black outline-none"
                                />
                            </div>

                            {/* Botón Agregar */}
                            <button 
                                onClick={addVariant}
                                className="bg-black text-white h-[38px] rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-gray-800 flex items-center justify-center gap-1"
                            >
                                <Plus size={16}/> Agregar
                            </button>
                        </div>
                        
                        {/* Campo Opcional: Imagen Específica */}
                        <div className="mt-3 pt-3 border-t border-gray-200/50">
                             <div className="flex items-center gap-2">
                                <ImageIcon size={14} className="text-gray-400"/>
                                <input 
                                    type="text" 
                                    value={newVariant.image_override}
                                    onChange={e => setNewVariant({...newVariant, image_override: e.target.value})}
                                    placeholder="URL de foto específica para este color (Opcional)"
                                    className="flex-1 bg-transparent border-none text-xs text-gray-600 placeholder:text-gray-300 focus:ring-0 p-0"
                                />
                             </div>
                        </div>
                    </div>

                    {/* LISTA DE VARIANTES (LA TABLA) */}
                    {variants.length > 0 ? (
                        <div className="space-y-2">
                            {variants.map((v, idx) => (
                                <div key={v.id || idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-black transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full border border-gray-200 shadow-inner" style={{ backgroundColor: v.color_hex }}></div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{v.color_name} - Talla {v.size}</p>
                                            <p className="text-xs text-gray-400 font-mono">Stock: {v.stock} | {v.image_override ? '📸 Foto Propia' : '🖼️ Foto Base'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeVariant(v.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm italic border border-dashed border-gray-200 rounded-xl">
                            No has agregado variantes. Se creará como producto único.
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA: PRECIOS */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-24">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><DollarSign size={18}/> Estrategia de Precio</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Base (Divisa/Zelle)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                <input 
                                    type="number" 
                                    value={product.usd_cash_price}
                                    onChange={e => setProduct({...product, usd_cash_price: parseFloat(e.target.value)})}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 font-mono text-lg font-bold focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Penalización (Sobreprecio)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                <input 
                                    type="number" 
                                    value={product.usd_penalty}
                                    onChange={e => setProduct({...product, usd_penalty: parseFloat(e.target.value)})}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 font-mono text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                                Este monto se sumará al precio base si el cliente paga en Bolívares (para cubrir la brecha cambiaria).
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Precio Final Bs:</span>
                                <span className="font-bold font-mono">{(product.usd_cash_price + product.usd_penalty).toFixed(2)} $</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  )
}