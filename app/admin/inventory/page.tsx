'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Search, AlertTriangle, CheckCircle2, XCircle, Package, Save, Loader2, ArrowUpRight, Receipt, Star, GripVertical, X, Zap, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { revalidateStoreCache, checkAndTriggerStockAlert } from '@/app/admin/actions'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { Zain } from 'next/font/google'
import TaxCatalogToggle from '@/components/admin/TaxCatalogToggle'

interface InventoryItem {
    rowId: string;
    productId: string;
    name: string;
    image: string | null;
    category: string;
    variantId: string | null;
    color: string;
    hex: string;
    size: string;
    stock: number;
    isTaxExempt: boolean; 
    isFeatured: boolean; 
    displayOrder: number; 
    requiresShipping: boolean; 
}

export default function InventoryPage() {
    const supabase = getSupabase()
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<InventoryItem[]>([])
    const [search, setSearch] = useState('')
    
    const [storeId, setStoreId] = useState<string | null>(null)
    const [isReordering, setIsReordering] = useState(false)
    const [reorderList, setReorderList] = useState<any[]>([])
    const [isSavingOrder, setIsSavingOrder] = useState(false)
    const [editingIndex, setEditingIndex] = useState<string | null>(null)

    const openReorderModal = () => {
        const allProducts = Array.from(new Map(
            items.map(i => [i.productId, {
                id: i.productId,
                name: i.name,
                image: i.image,
                displayOrder: i.displayOrder,
                isFeatured: i.isFeatured 
            }])
        ).values()).sort((a, b) => a.displayOrder - b.displayOrder)

        setReorderList(allProducts)
        setIsReordering(true)
    }

    const handleQuantumLeap = (productId: string, newPosStr: string) => {
        const newPos = parseInt(newPosStr)
        if (isNaN(newPos) || newPos < 1) return;

        const currentIndex = reorderList.findIndex(p => p.id === productId)
        if (currentIndex === -1) return;

        let targetIndex = newPos - 1
        if (targetIndex > reorderList.length - 1) targetIndex = reorderList.length - 1

        const newList = [...reorderList]
        const [movedItem] = newList.splice(currentIndex, 1)
        newList.splice(targetIndex, 0, movedItem) 

        setReorderList(newList)
    }

    const saveReorder = async () => {
        setIsSavingOrder(true)
        try {
            const updates = reorderList.map((item, index) => ({
                id: item.id,
                display_order: index + 1 
            }))

            await Promise.all(updates.map(u =>
                supabase.from('products').update({ display_order: u.display_order }).eq('id', u.id)
            ))

            setItems(prev => prev.map(item => {
                const match = updates.find(u => u.id === item.productId)
                return match ? { ...item, displayOrder: match.display_order } : item
            }))

            await revalidateStoreCache() 

            setIsReordering(false)
            const Toast = Swal.mixin({ 
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
            })
            Toast.fire({ icon: 'success', title: 'Escaparate Reorganizado' })
        } catch (e) {
            Swal.fire({ title: 'Error', text: 'No se pudo guardar el orden', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        } finally {
            setIsSavingOrder(false)
        }
    }

    const [filterStatus, setFilterStatus] = useState('all')
    const [pendingChanges, setPendingChanges] = useState<{ [key: string]: number | '' }>({})
    const [savingButtons, setSavingButtons] = useState<{ [key: string]: boolean }>({})
    const [fiscalProfile, setFiscalProfile] = useState<string | null>(null) 
    const [showTaxInCatalog, setShowTaxInCatalog] = useState(false) 

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: store } = await supabase.from('stores').select('id, fiscal_profile, show_tax_in_catalog').eq('user_id', user.id).single() 
                if (!store) return

                setStoreId(store.id) 
                setFiscalProfile(store.fiscal_profile) 
                setShowTaxInCatalog(store.show_tax_in_catalog || false) 
                
                const { data: products, error } = await supabase.from('products').select('id, name, image_url, category, stock, is_tax_exempt, is_featured, requires_shipping, product_variants(*)').eq('store_id', store.id).order('created_at', { ascending: false })

                const flatInventory: InventoryItem[] = []

                products?.forEach((prod: any) => {
                    const isExempt = prod.is_tax_exempt || false
                    const isFeat = prod.is_featured || false
                    const dOrder = prod.display_order || 0
                    const reqShipping = prod.requires_shipping ?? true

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
                                stock: variant.stock,
                                isTaxExempt: isExempt,
                                isFeatured: isFeat,
                                displayOrder: dOrder,
                                requiresShipping: reqShipping
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
                            stock: prod.stock || 0,
                            isTaxExempt: isExempt,
                            isFeatured: isFeat,
                            displayOrder: dOrder,
                            requiresShipping: reqShipping
                        })
                    }
                })

                setItems(flatInventory)
            } catch (error) { console.error(error) } finally { setLoading(false) }
        }
        fetchInventory()
    }, [supabase])

    const handleStockChange = (id: string, newVal: string) => {
        if (newVal === '') { setPendingChanges(prev => ({ ...prev, [id]: '' })); return }
        const val = parseInt(newVal)
        if (isNaN(val) || val < 0) return
        setPendingChanges(prev => ({ ...prev, [id]: val }))
    }

    const saveStock = async (row: InventoryItem) => {
        const pendingVal = pendingChanges[row.rowId]
        if (pendingVal === undefined) return
        const newStock = pendingVal === '' ? 0 : pendingVal
        setSavingButtons(prev => ({ ...prev, [row.rowId]: true }))
        try {
            if (row.variantId) {
                const { error } = await supabase.from('product_variants').update({ stock: newStock }).eq('id', row.variantId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', row.productId)
                if (error) throw error
            }
            
            setItems(prev => prev.map(item => item.rowId === row.rowId ? { ...item, stock: newStock } : item))
            await revalidateStoreCache()
            
            if (newStock <= 3 && storeId) {
                checkAndTriggerStockAlert({
                    storeId,
                    productId: Number(row.productId),
                    productName: row.name,
                    newStock,
                    variantName: row.variantId ? `${row.color} / Talla ${row.size}` : null
                }).catch(err => console.error("Error al disparar alerta de stock:", err));
            }

            const remaining = { ...pendingChanges }
            delete remaining[row.rowId]
            setPendingChanges(remaining)
            
            const Toast = Swal.mixin({ 
                toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
            })
            Toast.fire({ icon: 'success', title: 'Stock Sincronizado' })
        } catch (error) { 
            Swal.fire({ title: 'Error', text: 'No se pudo actualizar el inventario.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        } finally { 
            setSavingButtons(prev => ({ ...prev, [row.rowId]: false })) 
        }
    }

    const toggleTaxExempt = async (productId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus
        setItems(prev => prev.map(item => item.productId === productId ? { ...item, isTaxExempt: newStatus } : item))

        try {
            const { error } = await supabase.from('products').update({ is_tax_exempt: newStatus }).eq('id', productId)
            if (error) throw error

            const Toast = Swal.mixin({ 
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
            })
            Toast.fire({ icon: 'success', title: newStatus ? 'Producto Exento de IVA' : 'IVA Activado' })
        } catch (error) {
            setItems(prev => prev.map(item => item.productId === productId ? { ...item, isTaxExempt: currentStatus } : item))
            Swal.fire({ title: 'Error', text: 'No se pudo actualizar la configuración fiscal.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        }
    }

    const toggleFeatured = async (productId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus
        setItems(prev => prev.map(item => item.productId === productId ? { ...item, isFeatured: newStatus } : item))

        try {
            const { error } = await supabase.from('products').update({ is_featured: newStatus }).eq('id', productId)
            if (error) throw error
            const Toast = Swal.mixin({ 
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
            })
            Toast.fire({ icon: 'success', title: newStatus ? 'Fijado en Lo Más Vendido' : 'Removido de Lo Más Vendido' })
        } catch (error) {
            setItems(prev => prev.map(item => item.productId === productId ? { ...item, isFeatured: currentStatus } : item))
            Swal.fire({ title: 'Error', text: 'No se pudo actualizar el estado de exhibición.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        }
    }

    const toggleRequiresShipping = async (productId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setItems(prev => prev.map(item => item.productId === productId ? { ...item, requiresShipping: newStatus } : item));

        try {
            const { error } = await supabase.from('products').update({ requires_shipping: newStatus }).eq('id', productId);
            if (error) throw error;

            await revalidateStoreCache();
            const Toast = Swal.mixin({ 
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
            });
            Toast.fire({ icon: 'success', title: newStatus ? 'Logística: Producto Físico' : 'Logística: Servicio/Digital' });
        } catch (error) {
            setItems(prev => prev.map(item => item.productId === productId ? { ...item, requiresShipping: currentStatus } : item));
            Swal.fire({ title: 'Error', text: 'No se pudo actualizar el tipo de logística.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        }
    }

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const textMatch = item.name.toLowerCase().includes(search.toLowerCase()) || item.color.toLowerCase().includes(search.toLowerCase()) || item.size.toLowerCase().includes(search.toLowerCase())
            let statusMatch = true
            if (filterStatus === 'low') statusMatch = item.stock > 0 && item.stock <= 3
            if (filterStatus === 'out') statusMatch = item.stock === 0
            return textMatch && statusMatch
        })
    }, [items, search, filterStatus])

    const stats = useMemo(() => ({ total: items.length, low: items.filter(i => i.stock > 0 && i.stock <= 3).length, out: items.filter(i => i.stock === 0).length }), [items])

    // SENSOR DE SCROLL HORIZONTAL
    const tableScrollRef = useRef<HTMLDivElement>(null)
    const [isScrolledToEnd, setIsScrolledToEnd] = useState(false)
    const [isScrollable, setIsScrollable] = useState(false)

    const checkScroll = () => {
        if (tableScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current
            setIsScrollable(scrollWidth > clientWidth)
            setIsScrolledToEnd(Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 5)
        }
    }

    const scrollRight = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation() 
        if (tableScrollRef.current) {
            tableScrollRef.current.scrollBy({ left: 180, behavior: 'smooth' })
        }
    }

    useEffect(() => {
        checkScroll()
        window.addEventListener('resize', checkScroll)
        return () => window.removeEventListener('resize', checkScroll)
    }, [filteredItems])
    
    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-24 font-sans text-neutral-900 flex flex-col antialiased selection:bg-neutral-950 selection:text-white">
            
            {/* HEADER STICKY (Cleanlook) */}
            <div className="bg-[#FAFAFC]/95 backdrop-blur-md border-b border-neutral-200/50 sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3.5">
                    <Link href="/admin" className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-colors shrink-0 shadow-xs active:scale-[0.98]">
                        <ArrowLeft size={16} className="text-neutral-500 hover:text-neutral-900" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-base tracking-tight leading-none text-neutral-900">Control de Inventario</h1>
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">Stock, Impuestos y Logística</p>
                    </div>
                </div>
                
                {/* KPI CHIPS (Muted & Borderless style) */}
                <div className="hidden md:flex gap-2.5">
                    <div className="px-3.5 py-1.5 bg-white/80  rounded-lg flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-rose-700 font-mono">{stats.out}</span>
                            <span className="text-[9px] font-semibold text-rose-600/80 uppercase tracking-wider">Agotados</span>
                        </div>
                    </div>
                    <div className="px-3.5 py-1.5 bg-white/80  rounded-lg flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-bold text-amber-700 font-mono">{stats.low}</span>
                            <span className="text-[9px] font-semibold text-amber-600/80 uppercase tracking-wider">Stock Bajo</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-[100vw] flex-1 relative">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
                    
                    {/* INYECCIÓN: TOGGLE GLOBAL DE IVA */}
                    {storeId && fiscalProfile && fiscalProfile !== 'informal' && !loading && (
                        <TaxCatalogToggle 
                            storeId={storeId} 
                            initialState={showTaxInCatalog} 
                            fiscalProfile={fiscalProfile} 
                        />
                    )}

                    {/* BARRA DE CONTROLES */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center w-full">
                        
                        {/* Filtros Estilo "Pill" (Clean Look) */}
                        <div className="flex bg-neutral-100/50 p-1 rounded-lg border border-neutral-200/50 overflow-x-auto no-scrollbar w-full md:w-auto max-w-full shrink-0">
                            {[
                                { id: 'all', label: 'Todo el Catálogo' },
                                { id: 'low', label: 'Atención Requerida' },
                                { id: 'out', label: 'Agotados' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilterStatus(tab.id)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${filterStatus === tab.id
                                        ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/50'
                                        : 'text-neutral-500 hover:text-neutral-900 border border-transparent hover:bg-neutral-50/50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        {/* Buscador Integrado */}
                        <div className="relative group w-full md:flex-1 shrink-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors" size={15} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filtrar por nombre del artículo, talla o color..."
                                className="w-full bg-white border-b-2 border-neutral-100  shadow-[0_1px_2px_rgba(0,0,0,0.01)] rounded-xl pl-9 pr-10 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-neutral-300 transition-all"
                            />
                        </div>
                        
                        {/* BOTÓN ORGANIZAR ESCAPARATE */}
                        {items.length > 1 && (
                            <button
                                onClick={openReorderModal}
                                className="bg-neutral-950 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                            >
                                <Zap size={13} className="fill-white" /> <span>Merchandising</span>
                            </button>
                        )}
                    </div>

                    {/* TABLA ELITE (Executive Cleanlook) */}
                    <div className="bg-white rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] w-full max-w-full relative overflow-hidden">
                        {loading ? (
                            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-neutral-300" size={24} /></div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-16 text-center flex flex-col items-center gap-2.5">
                                <div className="w-12 h-12 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center">
                                    <Package size={20} className="text-neutral-300" />
                                </div>
                                <p className="text-neutral-400 font-semibold text-xs">No se encontraron artículos en el inventario.</p>
                            </div>
                        ) : (
                            <div className="relative w-full max-w-full">
                                {/* INDICADOR DE PROFUNDIDAD Y PÍLDORA MAGNÉTICA (Mobile Scroll Hint) */}
                                <div 
                                    className={`absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-neutral-900/5 via-neutral-900/[0.02] to-transparent pointer-events-none z-10 md:hidden transition-opacity duration-500 ${isScrollable && !isScrolledToEnd ? 'opacity-100' : 'opacity-0'}`}
                                >
                                    <div 
                                        onClick={scrollRight}
                                        className="sticky top-[50vh] ml-auto mr-1.5 w-7 h-7 flex items-center justify-center bg-white/90 backdrop-blur-md border border-neutral-200/50 rounded-full shadow-sm pointer-events-auto cursor-pointer active:scale-95 transition-transform"
                                    >
                                        <ChevronRight size={14} className="text-neutral-600 animate-pulse" />
                                    </div>
                                </div>
                                
                                <div 
                                    ref={tableScrollRef}
                                    onScroll={checkScroll}
                                    className="overflow-x-auto w-full max-w-full no-scrollbar relative z-0"
                                >
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead className="bg-neutral-50/50 border-b border-neutral-200/50 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3 md:px-6 md:py-3.5">Producto</th>
                                                <th className="px-4 py-3 md:px-6 md:py-3.5 hidden md:table-cell">Variante</th>
                                                <th className="px-4 py-3 md:px-6 md:py-3.5 text-center">Gestión Rápida</th>
                                                <th className="px-4 py-3 md:px-6 md:py-3.5 text-center">Exhibición</th>
                                                <th className="px-4 py-3 md:px-6 md:py-3.5 text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {filteredItems.map((item) => {
                                                const isPending = pendingChanges[item.rowId] !== undefined
                                                const currentStockDisplay = isPending ? pendingChanges[item.rowId] : item.stock
                                                const isSaving = savingButtons[item.rowId]

                                                let statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100/40'
                                                let StatusIcon = CheckCircle2
                                                let statusText = 'Disponible'

                                                if (currentStockDisplay === 0 || currentStockDisplay === '') {
                                                    statusColor = 'bg-rose-50 text-rose-700 border-rose-100/40'
                                                    StatusIcon = XCircle
                                                    statusText = 'Agotado'
                                                } else if (currentStockDisplay <= 3) {
                                                    statusColor = 'bg-amber-50 text-amber-700 border-amber-100/40'
                                                    StatusIcon = AlertTriangle
                                                    statusText = 'Bajo'
                                                }

                                                return (
                                                    <tr key={item.rowId} className="group hover:bg-neutral-50/40 transition-colors">
                                                        <td className="px-4 py-3 md:px-6 md:py-4 align-middle">
                                                            {/* PORTAL FRONTAL: Enlace directo al editor */}
                                                            
                                                            <Link href={`/admin/product/edit/${item.productId}`} prefetch={false} className="flex items-center gap-3.5 group/portal active:scale-[0.98] transition-all duration-200 origin-left" title="Editar producto">
                                                                <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-neutral-50 border border-neutral-200/50 overflow-hidden shrink-0 relative transition-colors group-hover/portal:border-neutral-300">
                                                                    {item.image ? (
                                                                        <Image
                                                                            src={getOptimizedUrl(item.image)}
                                                                            alt={item.name}
                                                                            fill
                                                                            sizes="44px"
                                                                            className="object-cover mix-blend-multiply group-hover/portal:scale-105 transition-transform duration-500"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-neutral-300"><Package size={14} /></div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className="font-bold text-xs text-neutral-900 leading-tight truncate">{item.name}</p>
                                                                        <ArrowUpRight size={12} className="text-neutral-400 md:opacity-0 md:-translate-x-2 md:group-hover/portal:opacity-100 md:group-hover/portal:translate-x-0 transition-all duration-300 shrink-0" />
                                                                    </div>
                                                                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold hidden md:block">{item.category}</p>
                                                                    
                                                                    {/* Variantes en Móvil */}
                                                                    <div className="flex items-center gap-1.5 mt-1 md:hidden">
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-50 border border-neutral-200/50 rounded text-[9px] font-mono text-neutral-600 transition-colors">
                                                                            <span className="w-2 h-2 rounded-full shrink-0 border border-neutral-200/50" style={{ background: item.hex }}></span>
                                                                            <span className="truncate max-w-[50px]">{item.color}</span>
                                                                        </div>
                                                                        <div className="flex items-center px-1.5 py-0.5 bg-neutral-50 border border-neutral-200/50 rounded text-[9px] font-mono text-neutral-600 transition-colors">
                                                                            <span>{item.size}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        </td>
                                                        
                                                        <td className="px-4 py-3 md:px-6 md:py-4 hidden md:table-cell align-middle">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="px-2 py-1 rounded bg-neutral-50 border border-neutral-200/50 flex items-center gap-1.5 max-w-[110px]">
                                                                    <span className="w-2.5 h-2.5 rounded-full border border-neutral-200/50 shrink-0" style={{ background: item.hex }}></span>
                                                                    <span className="text-[10px] font-mono font-semibold text-neutral-600 truncate">{item.color}</span>
                                                                </div>
                                                                <div className="px-2 py-1 rounded bg-neutral-50 border border-neutral-200/50 flex items-center">
                                                                    <span className="text-[10px] font-mono font-semibold text-neutral-600 leading-none">Talla: {item.size}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        
                                                        <td className="px-4 py-3 md:px-6 md:py-4 align-middle">
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                {/* STOCK INPUT (Telemetría) */}
                                                                <div className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={currentStockDisplay}
                                                                        onChange={(e) => handleStockChange(item.rowId, e.target.value)}
                                                                        className={`w-16 md:w-21 text-center font-mono font-bold text-xs py-1.5 border-b rounded-md transition-all outline-none ${isPending
                                                                            ? 'border-black/10 bg-white text-neutral-900 shadow-xs'
                                                                            : 'border-black/10 bg-neutral-50/50 text-neutral-700 hover:bg-white focus:bg-white'
                                                                            }`}
                                                                    />
                                                                    {isPending && (
                                                                        <button
                                                                            onClick={() => saveStock(item)}
                                                                            disabled={isSaving}
                                                                            className="bg-neutral-950 text-white p-1.5 md:px-2.5 md:py-1.5 rounded-md shadow-xs hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-1"
                                                                            title="Guardar Stock"
                                                                        >
                                                                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                                            <span className="hidden md:block text-[10px] font-semibold">Guardar</span>
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* BOTÓN DE EXENCIÓN FISCAL (Muted Emerald) */}
                                                                {fiscalProfile !== 'informal' && (
                                                                    <button
                                                                        onClick={() => toggleTaxExempt(item.productId, item.isTaxExempt)}
                                                                        className={`flex items-center justify-center gap-1 px-2 py-0.5 w-[84px] rounded text-[8px] font-bold uppercase tracking-wider transition-all border ${item.isTaxExempt ? 'bg-neutral-50 border-neutral-200/50 text-neutral-400 hover:bg-neutral-100' : 'bg-emerald-50 border-emerald-100/40 text-emerald-700 hover:bg-emerald-100/60'}`}
                                                                        title="Toca para alternar si este producto paga IVA"
                                                                    >
                                                                        <Receipt size={10} className={item.isTaxExempt ? "opacity-50" : ""} />
                                                                        {item.isTaxExempt ? 'Exento' : 'IVA 16%'}
                                                                    </button>
                                                                )}
                                                                
                                                                {/* BOTÓN LOGÍSTICO (Muted Purple vs Neutral) */}
                                                                <button
                                                                    onClick={() => toggleRequiresShipping(item.productId, item.requiresShipping)}
                                                                    className={`flex items-center justify-center gap-1 px-2 py-0.5 w-[84px] rounded text-[8px] font-bold uppercase tracking-wider transition-all border ${item.requiresShipping ? 'bg-neutral-50 border-neutral-200/50 text-neutral-500 hover:bg-neutral-100' : 'bg-purple-50 border-purple-100/40 text-purple-700 hover:bg-purple-100/60'}`}
                                                                    title="Toca para cambiar entre Producto Físico o Servicio (Experiencia)"
                                                                >
                                                                    {item.requiresShipping ? (
                                                                        <><Package size={10} /> Físico</>
                                                                    ) : (
                                                                        <><Zap size={10} /> Servicio</>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        
                                                        {/* CELDA: EXHIBICIÓN */}
                                                        <td className="px-4 py-3 md:px-6 md:py-4 align-middle text-center">
                                                            <button
                                                                onClick={() => toggleFeatured(item.productId, item.isFeatured)}
                                                                className={`p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center mx-auto border ${item.isFeatured ? 'bg-amber-50 text-amber-500 border-amber-200/50 shadow-xs' : 'bg-neutral-50/50 text-neutral-300 border-neutral-200/50 hover:bg-white hover:text-neutral-400'}`}
                                                                title="Destacar en la tienda (Lo más vendido)"
                                                            >
                                                                <Star size={16} fill={item.isFeatured ? "currentColor" : "none"} strokeWidth={2} />
                                                            </button>
                                                        </td>
                                                        
                                                        {/* CELDA: ESTADO */}
                                                        <td className="px-4 py-3 md:px-6 md:py-4 text-right align-middle">
                                                            <div className="flex justify-end items-center gap-3">
                                                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 ${statusColor}`}>
                                                                    <StatusIcon size={10} strokeWidth={2.5} /> <span className="hidden sm:inline">{statusText}</span>
                                                                </div>
                                                                <Link href={`/admin/product/edit/${item.productId}`} prefetch={false} className="hidden md:flex text-neutral-400 hover:text-neutral-900 transition-colors bg-white border border-neutral-200/50 hover:bg-neutral-50 p-1.5 rounded-md shrink-0 shadow-xs" title="Editar producto completo">
                                                                    <ArrowUpRight size={14} />
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE REORDENAMIENTO (VISUAL MERCHANDISING) */}
            <AnimatePresence>
                {isReordering && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
                        {/* Backdrop Cleanlook */}
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs" 
                            onClick={() => setIsReordering(false)} 
                        />
                        
                        {/* Tarjeta del Modal */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: 10 }} 
                            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }} 
                            exit={{ opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.2 } }} 
                            className="relative bg-[#FAFAFC] w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh] border border-neutral-200/50 z-10"
                        >

                            {/* Cabecera del Modal */}
                            <div className="p-5 md:p-6 bg-white border-b border-neutral-200/50 flex justify-between items-center shrink-0">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <Zap size={14} className="fill-neutral-900 text-neutral-900" />
                                        <h3 className="font-bold text-sm md:text-base text-neutral-900 tracking-tight">Visual Merchandising</h3>
                                    </div>
                                    <p className="text-[10px] font-semibold text-neutral-400 mt-1 uppercase tracking-wider font-mono">Arrastre las filas o toque el # para fijar posición</p>
                                </div>
                                <button 
                                    onClick={() => setIsReordering(false)} 
                                    className="p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors border border-neutral-200/50 active:scale-95 shadow-xs"
                                >
                                    <X size={15} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Lista de Arrastre Reorder */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar space-y-2.5">
                                <Reorder.Group axis="y" values={reorderList} onReorder={setReorderList} className="space-y-2.5">
                                    {reorderList.map((item, index) => (
                                        <Reorder.Item 
                                            key={item.id} 
                                            value={item} 
                                            className="bg-white p-2.5 rounded-xl border border-neutral-200/50 flex items-center gap-3 cursor-grab active:cursor-grabbing relative group hover:border-neutral-300 transition-colors shadow-xs"
                                        >

                                            {/* El Salto Cuántico (Input de Posición) */}
                                            <div className="shrink-0 flex items-center justify-center">
                                                {editingIndex === item.id ? (
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        min="1"
                                                        max={reorderList.length}
                                                        className="w-9 h-7 text-center font-mono font-bold text-xs bg-white border border-neutral-400 rounded-md outline-none shadow-xs text-neutral-900"
                                                        onBlur={(e) => { setEditingIndex(null); handleQuantumLeap(item.id, e.target.value) }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { setEditingIndex(null); handleQuantumLeap(item.id, e.currentTarget.value) } }}
                                                    />
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingIndex(item.id)}
                                                        className="w-9 h-7 flex items-center justify-center font-mono font-bold text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 rounded-md transition-colors shadow-xs"
                                                        title="Clic para cambiar posición exacta"
                                                    >
                                                        #{index + 1}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Miniatura e Info */}
                                            <div className="w-10 h-10 rounded-lg bg-neutral-50 overflow-hidden shrink-0 relative border border-neutral-200/50">
                                                {item.image ? (
                                                    <Image src={getOptimizedUrl(item.image)} alt={item.name} fill sizes="40px" className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neutral-300"><Package size={14} /></div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pr-2 space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-semibold text-xs text-neutral-900 truncate">{item.name}</p>
                                                    {item.isFeatured && (
                                                        <Star size={11} className="fill-amber-500 text-amber-500 shrink-0" />
                                                    )}
                                                </div>
                                                {item.isFeatured && (
                                                    <span className="inline-block text-[8px] font-semibold text-amber-700 bg-amber-50 border border-amber-100/40 uppercase tracking-wider px-1.5 py-0.5 rounded">
                                                        Destacado en Carrusel
                                                    </span>
                                                )}
                                            </div>

                                            {/* Icono de Arrastre */}
                                            <div className="pr-1 text-neutral-300 group-hover:text-neutral-600 transition-colors">
                                                <GripVertical size={16} />
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>
                            </div>

                            {/* Footer de Guardado */}
                            <div className="p-4 md:p-5 bg-white border-t border-neutral-200/50 shrink-0">
                                <button
                                    onClick={saveReorder}
                                    disabled={isSavingOrder}
                                    className="w-full bg-neutral-950 text-white py-3 rounded-lg font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 shadow-xs"
                                >
                                    {isSavingOrder ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    <span>Guardar Posición Exacta</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

