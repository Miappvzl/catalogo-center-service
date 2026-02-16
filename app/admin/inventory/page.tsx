'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Search, Filter, AlertTriangle, CheckCircle2, XCircle, Package, Save, Loader2, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

export default function InventoryPage() {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, low, out

  // Estado para control de cambios pendientes (Quick Edit)
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: number }>({})
  const [savingButtons, setSavingButtons] = useState<{ [key: string]: boolean }>({})

  // 1. CARGAR INVENTARIO (Flatten Data)
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // Traemos productos y sus variantes
        const { data: products, error } = await supabase
          .from('products')
          .select('id, name, image_url, category, product_variants(*)')
          .order('created_at', { ascending: false })

        if (error) throw error

        // "Aplanamos" la data: Creamos una fila por cada VARIANTE, no por producto
        const flatInventory: any[] = []
        
        products?.forEach((prod: any) => {
          if (prod.product_variants && prod.product_variants.length > 0) {
            prod.product_variants.forEach((variant: any) => {
              flatInventory.push({
                rowId: variant.id, // ID único para la fila
                productId: prod.id,
                name: prod.name,
                image: variant.variant_image || prod.image_url, // Prioridad foto variante
                category: prod.category,
                // Datos Variante
                variantId: variant.id,
                color: variant.color_name,
                hex: variant.color_hex,
                size: variant.size,
                stock: variant.stock
              })
            })
          } else {
            // Producto sin variantes (Raro en tu sistema actual, pero por si acaso)
            flatInventory.push({
                rowId: prod.id,
                productId: prod.id,
                name: prod.name,
                image: prod.image_url,
                category: prod.category,
                variantId: null,
                color: 'Único',
                hex: '#000000',
                size: 'U',
                stock: 0
            })
          }
        })

        setItems(flatInventory)

      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchInventory()
  }, [])

  // 2. ACTUALIZAR STOCK (Lógica Quick Edit)
  const handleStockChange = (id: string, newVal: string) => {
    const val = parseInt(newVal)
    if (isNaN(val)) return
    
    setPendingChanges(prev => ({
        ...prev,
        [id]: val
    }))
  }

  const saveStock = async (row: any) => {
    const newStock = pendingChanges[row.rowId]
    if (newStock === undefined) return

    setSavingButtons(prev => ({ ...prev, [row.rowId]: true }))

    try {
        if (row.variantId) {
            // Actualizar Variante
            const { error } = await supabase
                .from('product_variants')
                .update({ stock: newStock })
                .eq('id', row.variantId)
            
            if (error) throw error
        }

        // Actualizar estado local visualmente
        setItems(prev => prev.map(item => 
            item.rowId === row.rowId ? { ...item, stock: newStock } : item
        ))
        
        // Limpiar pendiente
        const remaining = { ...pendingChanges }
        delete remaining[row.rowId]
        setPendingChanges(remaining)

        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
            customClass: { popup: 'rounded-xl text-xs font-bold' }
        })
        Toast.fire({ icon: 'success', title: 'Stock Actualizado' })

    } catch (error) {
        Swal.fire('Error', 'No se pudo actualizar', 'error')
    } finally {
        setSavingButtons(prev => ({ ...prev, [row.rowId]: false }))
    }
  }

  // 3. FILTROS Y BÚSQUEDA
  const filteredItems = useMemo(() => {
    return items.filter(item => {
        // Filtro Texto
        const textMatch = 
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.color.toLowerCase().includes(search.toLowerCase()) ||
            item.size.toLowerCase().includes(search.toLowerCase())
        
        // Filtro Estado
        let statusMatch = true
        if (filterStatus === 'low') statusMatch = item.stock > 0 && item.stock <= 3
        if (filterStatus === 'out') statusMatch = item.stock === 0

        return textMatch && statusMatch
    })
  }, [items, search, filterStatus])

  // Estadísticas Rápidas
  const stats = useMemo(() => {
    return {
        total: items.length,
        low: items.filter(i => i.stock > 0 && i.stock <= 3).length,
        out: items.filter(i => i.stock === 0).length
    }
  }, [items])

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 font-sans text-gray-900">
        
        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 bg-white border border-gray-200 hover:border-black hover:bg-gray-50 rounded-full transition-all group">
                    <ArrowLeft size={18} className="text-gray-500 group-hover:text-black"/>
                </Link>
                <div>
                    <h1 className="font-black text-xl tracking-tight leading-none">Inventario</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Control de Stock</p>
                </div>
            </div>
            
            {/* KPI CHIPS (Solo Desktop) */}
            <div className="hidden md:flex gap-3">
                <div className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <div>
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">Agotados</span>
                        <span className="block text-sm font-black text-gray-900 leading-none">{stats.out}</span>
                    </div>
                </div>
                <div className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    <div>
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">Poco Stock</span>
                        <span className="block text-sm font-black text-gray-900 leading-none">{stats.low}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* CONTROLES */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4">
                {/* Buscador */}
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18}/>
                    <input 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, color, talla..." 
                        className="w-full bg-white border-none rounded-2xl pl-11 pr-4 py-4 font-medium shadow-sm focus:ring-2 focus:ring-black/5 outline-none placeholder:text-gray-300 transition-all"
                    />
                </div>

                {/* Filtros */}
                <div className="flex bg-gray-200/50 p-1 rounded-2xl">
                    <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
                    <button onClick={() => setFilterStatus('low')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === 'low' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Poco Stock</button>
                    <button onClick={() => setFilterStatus('out')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Agotados</button>
                </div>
            </div>

            {/* TABLA ELITE */}
            <div className="bg-white rounded-3xl overflow-x-auto shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-gray-300"/></div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 font-bold text-sm">No se encontraron items.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                <th className="p-6">Producto</th>
                                <th className="p-6 hidden md:table-cell">Variante</th>
                                <th className="p-6 text-center">Stock Real</th>
                                <th className="p-6 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => {
                                const isPending = pendingChanges[item.rowId] !== undefined
                                const currentStockDisplay = isPending ? pendingChanges[item.rowId] : item.stock
                                const isSaving = savingButtons[item.rowId]

                                // Lógica de Semáforo
                                let statusColor = 'bg-green-100 text-green-700'
                                let StatusIcon = CheckCircle2
                                let statusText = 'Disponible'

                                if (currentStockDisplay === 0) {
                                    statusColor = 'bg-red-50 text-red-600'
                                    StatusIcon = XCircle
                                    statusText = 'Agotado'
                                } else if (currentStockDisplay <= 3) {
                                    statusColor = 'bg-orange-50 text-orange-600'
                                    StatusIcon = AlertTriangle
                                    statusText = 'Bajo'
                                }

                                return (
                                    <tr key={item.rowId} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0">
                                        
                                        {/* COL 1: Producto */}
                                        <td className="p-4 md:p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                                                    {item.image ? (
                                                        <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16}/></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 leading-tight">{item.name}</p>
                                                    <div className="flex items-center gap-2 mt-1 md:hidden">
                                                        {/* Info variante móvil */}
                                                        <span className="w-2 h-2 rounded-full shadow-sm border border-gray-200" style={{background: item.hex}}></span>
                                                        <span className="text-xs text-gray-500 font-mono">{item.size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* COL 2: Variante (Desktop) */}
                                        <td className="p-6 hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full shadow-sm border border-gray-100" style={{background: item.hex}}></span>
                                                    <span className="text-xs font-bold text-gray-700">{item.color}</span>
                                                </div>
                                                <div className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm">
                                                    <span className="text-xs font-mono font-bold text-gray-600">Talla: {item.size}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* COL 3: Stock Quick Edit */}
                                        <td className="p-4 md:p-6">
                                            <div className="flex justify-center">
                                                <div className={`relative flex items-center w-24 md:w-32 transition-all duration-300 ${isPending ? 'scale-105' : ''}`}>
                                                    <input 
                                                        type="number"
                                                        value={currentStockDisplay}
                                                        onChange={(e) => handleStockChange(item.rowId, e.target.value)}
                                                        className={`w-full text-center font-mono font-bold text-lg py-2 rounded-xl border-2 outline-none transition-all ${
                                                            isPending 
                                                                ? 'border-black bg-white shadow-lg text-black' 
                                                                : 'border-transparent bg-gray-100 text-gray-600 group-hover:bg-white group-hover:border-gray-200'
                                                        }`}
                                                    />
                                                    
                                                    {/* Botón Guardar Flotante */}
                                                    {isPending && (
                                                        <button 
                                                            onClick={() => saveStock(item)}
                                                            disabled={isSaving}
                                                            className="absolute -right-4 -top-3 bg-black text-white p-1.5 rounded-full shadow-lg hover:bg-gray-800 transition-transform hover:scale-110"
                                                        >
                                                            {isSaving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* COL 4: Estado */}
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end items-center gap-4">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                                                    <StatusIcon size={12} /> {statusText}
                                                </div>
                                                <Link href={`/admin/product/edit/${item.productId}`} className="text-gray-300 hover:text-black transition-colors" title="Ir al producto">
                                                    <ArrowUpRight size={18} />
                                                </Link>
                                            </div>
                                        </td>

                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

        </div>
    </div>
  )
}