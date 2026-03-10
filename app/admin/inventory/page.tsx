'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Search, AlertTriangle, CheckCircle2, XCircle, Package, Save, Loader2, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

interface InventoryItem {
    rowId: string
    productId: string
    name: string
    image: string | null
    category: string
    variantId: string | null
    color: string
    hex: string
    size: string
    stock: number
}

export default function InventoryPage() {
    const supabase = getSupabase()
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<InventoryItem[]>([])
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')

    // UX Fix: Permitimos string vacío ('') para que el input se pueda borrar por completo
    const [pendingChanges, setPendingChanges] = useState<{ [key: string]: number | '' }>({})
    const [savingButtons, setSavingButtons] = useState<{ [key: string]: boolean }>({})

    // 1. CARGAR INVENTARIO (Blindado por Tienda)
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                // A. Obtenemos el usuario activo
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // B. Obtenemos el ID de su tienda
                const { data: store } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                if (!store) return

                // C. Cargamos SOLO los productos de su tienda
                const { data: products, error } = await supabase
                    .from('products')
                    .select('id, name, image_url, category, stock, product_variants(*)')
                    .eq('store_id', store.id) // <--- EL CANDADO DE SEGURIDAD
                    .order('created_at', { ascending: false })

                if (error) throw error

                const flatInventory: InventoryItem[] = []

                products?.forEach((prod: any) => {
                    if (prod.product_variants && prod.product_variants.length > 0) {
                        prod.product_variants.forEach((variant: any) => {
                            flatInventory.push({
                                rowId: variant.id,
                                productId: prod.id,
                                name: prod.name,
                                image: variant.variant_image || prod.image_url,
                                category: prod.category,
                                variantId: variant.id,
                                color: variant.color_name,
                                hex: variant.color_hex,
                                size: variant.size,
                                stock: variant.stock
                            })
                        })
                    } else {
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
                            stock: prod.stock || 0 
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
    }, [supabase])


    // 2. ACTUALIZAR STOCK
    const handleStockChange = (id: string, newVal: string) => {
        // Si el usuario borra todo, guardamos el estado visual como vacío
        if (newVal === '') {
            setPendingChanges(prev => ({ ...prev, [id]: '' }))
            return
        }

        const val = parseInt(newVal)
        if (isNaN(val) || val < 0) return

        setPendingChanges(prev => ({
            ...prev,
            [id]: val
        }))
    }

    const saveStock = async (row: InventoryItem) => {
    const pendingVal = pendingChanges[row.rowId]
    if (pendingVal === undefined) return
    const newStock = pendingVal === '' ? 0 : pendingVal

    setSavingButtons(prev => ({ ...prev, [row.rowId]: true }))

    try {
        if (row.variantId) {
            // Actualiza variante
            const { error } = await supabase.from('product_variants').update({ stock: newStock }).eq('id', row.variantId)
            if (error) throw error
        } else {
            // NUEVO: Actualiza el producto principal si no tiene variantes
            const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', row.productId)
            if (error) throw error
        }

        setItems(prev => prev.map(item => item.rowId === row.rowId ? { ...item, stock: newStock } : item))
        const remaining = { ...pendingChanges }
        delete remaining[row.rowId]
        setPendingChanges(remaining)

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl text-xs font-bold' } })
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
            const textMatch =
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.color.toLowerCase().includes(search.toLowerCase()) ||
                item.size.toLowerCase().includes(search.toLowerCase())

            let statusMatch = true
            if (filterStatus === 'low') statusMatch = item.stock > 0 && item.stock <= 3
            if (filterStatus === 'out') statusMatch = item.stock === 0

            return textMatch && statusMatch
        })
    }, [items, search, filterStatus])

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
                        <ArrowLeft size={18} className="text-gray-500 group-hover:text-black" />
                    </Link>
                    <div>
                        <h1 className="font-black text-xl tracking-tight leading-none">Inventario</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Control de Stock</p>
                    </div>
                </div>

                {/* KPI CHIPS */}
                <div className="hidden md:flex gap-3">
                    <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <div>
                            <span className="block text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">Agotados</span>
                            <span className="block text-sm font-black text-gray-900 leading-none">{stats.out}</span>
                        </div>
                    </div>
                    <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div>
                            <span className="block text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">Poco Stock</span>
                            <span className="block text-sm font-black text-gray-900 leading-none">{stats.low}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLES */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">

                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">

                    {/* Filtros Estilo "Clean Look" */}
                    <div className="flex bg-gray-50 border border-gray-200 p-1.5 rounded-full overflow-x-auto no-scrollbar w-full md:w-auto">
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'low', label: 'Poco Stock' },
                            { id: 'out', label: 'Agotados' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterStatus(tab.id)}
                                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filterStatus === tab.id
                                        ? 'bg-white text-black border border-gray-200'
                                        : 'text-gray-500 hover:text-gray-900 border border-transparent'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Buscador */}
                    <div className="relative group w-full md:flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, color, talla..."
                            className="w-full bg-white border border-gray-200 rounded-full pl-11 pr-4 py-3 text-sm font-medium focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                        />
                    </div>
                </div>

                {/* TABLA ELITE */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                                <Package size={24} className="text-gray-300" />
                            </div>
                            <p className="text-gray-400 font-bold text-sm">No se encontraron items.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                        {/* Ajuste UI: Mismos paddings que los td para alineación perfecta */}
                                        <th className="p-4 md:p-6">Producto</th>
                                        <th className="p-4 md:p-6 hidden md:table-cell">Variante</th>
                                        <th className="p-4 md:p-6 text-center">Stock Real</th>
                                        <th className="p-4 md:p-6 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item) => {
                                        const isPending = pendingChanges[item.rowId] !== undefined
                                        const currentStockDisplay = isPending ? pendingChanges[item.rowId] : item.stock
                                        const isSaving = savingButtons[item.rowId]

                                        // Lógica de Semáforo
                                        let statusColor = 'bg-green-50 text-green-700 border-green-200'
                                        let StatusIcon = CheckCircle2
                                        let statusText = 'Disponible'

                                        if (currentStockDisplay === 0 || currentStockDisplay === '') {
                                            statusColor = 'bg-red-50 text-red-600 border-red-200'
                                            StatusIcon = XCircle
                                            statusText = 'Agotado'
                                        } else if (currentStockDisplay <= 3) {
                                            statusColor = 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            StatusIcon = AlertTriangle
                                            statusText = 'Bajo'
                                        }

                                        return (
                                            <tr key={item.rowId} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">

                                                {/* COL 1: Producto */}
                                                <td className="p-4 md:p-6 align-middle">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden shrink-0">
                                                            {item.image ? (
                                                                <img src={item.image} className="w-full h-full object-cover mix-blend-multiply" alt={item.name} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16} /></div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-900 leading-tight group-hover:text-black">{item.name}</p>
                                                            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium hidden md:block">{item.category}</p>

                                                            {/* UI Móvil: Talla y color idénticos en altura */}
                                                            <div className="flex items-center gap-2 mt-1.5 md:hidden">
                                                                <div className="flex items-center gap-1.5 px-1.5 py-1 bg-gray-50 border border-gray-200 rounded-md">
                                                                    <span className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ background: item.hex }}></span>
                                                                    <span className="text-[10px] text-gray-600 font-bold capitalize leading-none">{item.color}</span>
                                                                </div>
                                                                <div className="flex items-center px-2 py-1 bg-gray-50 border border-gray-200 rounded-md">
                                                                    <span className="text-[10px] text-gray-500 font-mono font-bold leading-none">{item.size}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* COL 2: Variante (Desktop) */}
                                                <td className="p-4 md:p-6 hidden md:table-cell align-middle">
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center gap-2">
                                                            <span className="w-3 h-3 rounded-full border border-gray-200" style={{ background: item.hex }}></span>
                                                            <span className="text-xs font-bold text-gray-700 capitalize">{item.color}</span>
                                                        </div>
                                                        <div className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center">
                                                            <span className="text-xs font-mono font-bold text-gray-600 leading-none">Talla: {item.size}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* COL 3: Stock Quick Edit */}
                                                <td className="p-4 md:p-6 align-middle">
                                                    <div className="flex justify-center">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={currentStockDisplay}
                                                                onChange={(e) => handleStockChange(item.rowId, e.target.value)}
                                                                className={`w-16 md:w-20 text-center font-mono font-bold text-sm md:text-base py-2 rounded-xl border transition-all outline-none ${isPending
                                                                        ? 'border-black bg-white text-black ring-1 ring-black'
                                                                        : 'border-transparent bg-gray-50 text-gray-700 hover:border-gray-300 focus:border-gray-400 focus:bg-white'
                                                                    }`}
                                                            />

                                                            {isPending && (
                                                                <button
                                                                    onClick={() => saveStock(item)}
                                                                    disabled={isSaving}
                                                                    className="bg-black text-white p-2 md:px-3 md:py-2 rounded-xl hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-black"
                                                                    title="Guardar Stock"
                                                                >
                                                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                                    <span className="hidden md:block text-xs font-bold">Guardar</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* COL 4: Estado */}
                                                <td className="p-4 md:p-6 text-right align-middle">
                                                    <div className="flex justify-end items-center gap-4">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusColor}`}>
                                                            <StatusIcon size={12} strokeWidth={2.5} /> {statusText}
                                                        </div>
                                                        <Link href={`/admin/product/edit/${item.productId}`} className="text-gray-300 hover:text-black transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-lg border border-transparent hover:border-gray-200" title="Editar producto completo">
                                                            <ArrowUpRight size={16} />
                                                        </Link>
                                                    </div>
                                                </td>

                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}