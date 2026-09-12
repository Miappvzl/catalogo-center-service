'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
    ArrowLeft, 
    Search, 
    Zap, 
    Check, 
    Loader2, 
    AlertCircle, 
    Package,
    HelpCircle
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { getOptimizedUrl } from '@/utils/cdn'
import { generateSmartSKU } from '@/utils/skuGenerator'
import Swal from 'sweetalert2'
import SkuFeatureModal from '@/components/admin/SkuFeatureModal'
import SkuHelpBanner from '@/components/admin/SkuHelpBanner'

interface SkuRow {
    key: string
    type: 'product' | 'variant'
    id: string | number
    name: string
    category: string
    image: string
    variantLabel: string | null
    sku: string
    stock: number
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function SkuMatrixPage() {
    const router = useRouter()
    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [storeId, setStoreId] = useState<string | null>(null)
    const [rows, setRows] = useState<SkuRow[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filterOnlyMissing, setFilterOnlyMissing] = useState(false)
    const [isGeneratingBulk, setIsGeneratingBulk] = useState(false)
    const [isHelpOpen, setIsHelpOpen] = useState(false)

    // Estados de guardado por celda
    const [cellStatuses, setCellStatuses] = useState<Record<string, SaveStatus>>({})
    
    // Refs para navegación por teclado (Desktop)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Carga inicial de datos
    const loadInventoryData = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: store } = await supabase
                .from('stores')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!store) return

            setStoreId(store.id)

            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    id, name, category, image_url, stock, sku,
                    product_variants (
                        id, size, color_name, variant_image, stock, sku
                    )
                `)
                .eq('store_id', store.id)
                .order('name', { ascending: true })

            if (error) throw error

            const flattened: SkuRow[] = []
            products?.forEach((p: any) => {
                if (!p.product_variants || p.product_variants.length === 0) {
                    flattened.push({
                        key: `prod-${p.id}`,
                        type: 'product',
                        id: p.id,
                        name: p.name,
                        category: p.category || 'General',
                        image: p.image_url || '',
                        variantLabel: null,
                        sku: p.sku || '',
                        stock: p.stock || 0
                    })
                } else {
                    p.product_variants.forEach((v: any) => {
                        const labelParts = [v.color_name, v.size].filter(Boolean)
                        flattened.push({
                            key: `var-${v.id}`,
                            type: 'variant',
                            id: v.id,
                            name: p.name,
                            category: p.category || 'General',
                            image: v.variant_image || p.image_url || '',
                            variantLabel: labelParts.length > 0 ? labelParts.join(' / ') : 'Variante',
                            sku: v.sku || '',
                            stock: v.stock || 0
                        })
                    })
                }
            })

            setRows(flattened)
        } catch (error: any) {
            Swal.fire({
                title: 'Error de carga',
                text: error.message || 'No se pudo obtener el inventario.',
                icon: 'error',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInventoryData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Filtrado interactivo
    const filteredRows = useMemo(() => {
        return rows.filter(row => {
            const matchesSearch = 
                row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (row.variantLabel && row.variantLabel.toLowerCase().includes(searchQuery.toLowerCase()))

            if (filterOnlyMissing) {
                return matchesSearch && (!row.sku || row.sku.trim() === '')
            }
            return matchesSearch
        })
    }, [rows, searchQuery, filterOnlyMissing])

    const missingCount = useMemo(() => {
        return rows.filter(r => !r.sku || r.sku.trim() === '').length
    }, [rows])

    // Actualización local de SKU
    const handleSkuChange = (key: string, value: string) => {
        setRows(prev => prev.map(r => r.key === key ? { ...r, sku: value.toUpperCase() } : r))
    }

    // Persistencia quirúrgica a base de datos
    const saveSkuToDatabase = async (row: SkuRow) => {
        const cleanSku = row.sku.trim().toUpperCase()
        setCellStatuses(prev => ({ ...prev, [row.key]: 'saving' }))

        try {
            if (row.type === 'product') {
                const { error } = await supabase
                    .from('products')
                    .update({ sku: cleanSku ? cleanSku : null })
                    .eq('id', row.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('product_variants')
                    .update({ sku: cleanSku ? cleanSku : null })
                    .eq('id', row.id)
                if (error) throw error
            }

            setCellStatuses(prev => ({ ...prev, [row.key]: 'saved' }))
            setTimeout(() => {
                setCellStatuses(prev => ({ ...prev, [row.key]: 'idle' }))
            }, 1500)
        } catch (error) {
            setCellStatuses(prev => ({ ...prev, [row.key]: 'error' }))
        }
    }

    // Navegación fluida por teclado
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, row: SkuRow) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault()
            saveSkuToDatabase(row)
            const nextIndex = currentIndex + 1
            if (nextIndex < filteredRows.length && inputRefs.current[nextIndex]) {
                inputRefs.current[nextIndex]?.focus()
                inputRefs.current[nextIndex]?.select()
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            saveSkuToDatabase(row)
            const prevIndex = currentIndex - 1
            if (prevIndex >= 0 && inputRefs.current[prevIndex]) {
                inputRefs.current[prevIndex]?.focus()
                inputRefs.current[prevIndex]?.select()
            }
        }
    }

    // Generador masivo
    const handleBulkGenerate = async (overwrite = false) => {
        if (!storeId) return

        const result = await Swal.fire({
            title: overwrite ? '¿Sobrescribir todos los SKUs?' : '¿Autogenerar SKUs faltantes?',
            text: overwrite 
                ? 'Esto reemplazará los códigos de todo el catálogo por nuevos identificadores inteligentes.'
                : `Se asignarán códigos a los ${missingCount} artículos que actualmente no tienen SKU.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#171717',
            cancelButtonColor: '#f5f5f5',
            confirmButtonText: overwrite ? 'Sobrescribir todo' : 'Generar faltantes',
            cancelButtonText: 'Cancelar',
            customClass: { 
                popup: 'rounded-xl font-sans text-xs',
                cancelButton: 'text-neutral-700'
            }
        })

        if (!result.isConfirmed) return

        setIsGeneratingBulk(true)
        try {
            const { data, error } = await supabase.rpc('bulk_generate_store_skus', {
                p_store_id: storeId,
                p_overwrite: overwrite
            })

            if (error) throw error

            await loadInventoryData()

            Swal.fire({
                title: 'Catálogo Sincronizado',
                text: `Se asignaron identificadores a ${data?.total_updated || 0} artículos con éxito.`,
                icon: 'success',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            })
        } catch (error: any) {
            Swal.fire({
                title: 'Error de proceso',
                text: error.message || 'No se pudieron generar los SKUs.',
                icon: 'error',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            })
        } finally {
            setIsGeneratingBulk(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFC] gap-3 antialiased">
                <Loader2 className="animate-spin text-neutral-400" size={24} />
                <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider font-mono">
                    Construyendo matriz de inventario...
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-32 md:pb-24 font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white antialiased overflow-x-hidden w-full max-w-[100vw]">
            
            {/* CABECERA PRINCIPAL */}
            <div className="bg-white/95 backdrop-blur-md border-b border-neutral-200/50 sticky top-0 z-30 px-3.5 md:px-8 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                    
                    {/* Identidad / Back */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button 
                            onClick={() => router.push('/admin/inventory')}
                            className="w-8 h-8 md:w-9 md:h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-all shrink-0 shadow-xs active:scale-[0.98]"
                            title="Volver a Inventario"
                        >
                            <ArrowLeft className="w-4 h-4 text-neutral-600" />
                        </button>
                        
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h1 className="font-bold text-sm md:text-base text-neutral-900 tracking-tight leading-none truncate">
                                    Matriz SKUs
                                </h1>
                                <span className="bg-neutral-100 text-neutral-700 border border-neutral-200/50 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shrink-0">
                                    {rows.length}
                                </span>
                            </div>
                            <p className="text-[10px] text-neutral-400 font-medium truncate hidden sm:block mt-0.5">
                                Asignación rápida de códigos para despacho y Punto de Venta.
                            </p>
                        </div>
                    </div>

                    {/* Acciones de Cabecera */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Botón Guía / Ayuda */}
                        <button
                            onClick={() => setIsHelpOpen(!isHelpOpen)}
                            className={`px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 ${
                                isHelpOpen 
                                    ? 'bg-neutral-900 text-white border-neutral-900' 
                                    : 'bg-white text-neutral-600 border-neutral-200/60 hover:text-neutral-950 hover:border-neutral-400'
                            }`}
                            title="¿Cómo funciona?"
                        >
                            <HelpCircle size={14} />
                            <span className="hidden sm:inline text-[11px] font-bold">Guía</span>
                        </button>

                        {/* Botón Autogenerar */}
                        <button
                            onClick={() => handleBulkGenerate(false)}
                            disabled={isGeneratingBulk || missingCount === 0}
                            className="bg-neutral-950 text-white hover:bg-black disabled:opacity-40 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98] shrink-0"
                        >
                            {isGeneratingBulk ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Zap size={12} className="text-amber-400 fill-amber-400" />
                            )}
                            <span className="hidden sm:inline">Autogenerar ({missingCount})</span>
                            <span className="sm:hidden">Auto ({missingCount})</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DE PRIMER USO (SOLO 1 VEZ) */}
            <SkuFeatureModal onQuickGenerate={() => handleBulkGenerate(false)} />

            {/* CONTENIDO PRINCIPAL */}
            <div className="max-w-6xl mx-auto px-3.5 md:px-8 pt-3.5 md:pt-6 space-y-3">
                
                {/* BANNER DE AYUDA DESPLEGABLE */}
                <SkuHelpBanner isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

                {/* BARRA DE BÚSQUEDA Y FILTROS */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2 rounded-xl border border-neutral-200/50 shadow-xs">
                    
                    {/* Buscador */}
                    <div className="relative flex-1 min-w-0">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar artículo, SKU o talla..."
                            className="w-full bg-transparent pl-8 pr-7 py-1 text-xs font-semibold text-neutral-900 outline-none placeholder:text-neutral-400"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-neutral-400 hover:text-neutral-900 uppercase bg-neutral-100 px-1.5 py-0.5 rounded"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Selector de Pestaña */}
                    <div className="flex items-center gap-1 bg-neutral-100/70 p-0.5 rounded-lg shrink-0 border border-neutral-200/40">
                        <button
                            onClick={() => setFilterOnlyMissing(false)}
                            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[10px] font-bold transition-all text-center ${
                                !filterOnlyMissing 
                                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/40' 
                                    : 'text-neutral-500 hover:text-neutral-900 border border-transparent'
                            }`}
                        >
                            Todos ({rows.length})
                        </button>
                        <button
                            onClick={() => setFilterOnlyMissing(true)}
                            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                                filterOnlyMissing 
                                    ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/40' 
                                    : 'text-neutral-500 hover:text-neutral-900 border border-transparent'
                            }`}
                        >
                            <span>Sin SKU</span>
                            {missingCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            )}
                        </button>
                    </div>
                </div>

                {/* VISTA MÓVIL Y TABLET VERTICAL (< 1024px / iPad Mini & Phones) */}
                <div className="lg:hidden space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                    {filteredRows.length === 0 ? (
                        <div className="col-span-full p-8 text-center bg-white rounded-xl border border-neutral-200/50 text-neutral-400 text-xs font-medium">
                            No se encontraron artículos que coincidan con la búsqueda.
                        </div>
                    ) : (
                        filteredRows.map((row) => {
                            const status = cellStatuses[row.key] || 'idle'

                            return (
                                <div 
                                    key={row.key} 
                                    className="bg-white p-3 rounded-xl border border-neutral-200/50 shadow-xs space-y-2.5 min-w-0"
                                >
                                    {/* Fila 1: Miniatura + Info + Stock */}
                                    <div className="flex items-center justify-between gap-2.5 min-w-0">
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-md bg-neutral-50 border border-neutral-200/50 overflow-hidden shrink-0 relative">
                                                {row.image ? (
                                                    <Image 
                                                        src={getOptimizedUrl(row.image)} 
                                                        alt="" 
                                                        fill 
                                                        sizes="32px" 
                                                        className="object-cover mix-blend-multiply" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                                        <Package size={12} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-xs text-neutral-900 truncate leading-tight">
                                                    {row.name}
                                                </p>
                                                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                                    <span className="text-[9px] text-neutral-400 truncate">
                                                        {row.category}
                                                    </span>
                                                    {row.variantLabel && (
                                                        <span className="bg-neutral-100 text-neutral-700 text-[8px] font-mono font-bold px-1 py-0.2 rounded shrink-0">
                                                            {row.variantLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stock Tag */}
                                        <div className="shrink-0 text-right">
                                            <span className="text-[9px] font-mono font-bold text-neutral-600 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200/50">
                                                {row.stock} uds
                                            </span>
                                        </div>
                                    </div>

                                    {/* Fila 2: Input de SKU Integrado */}
                                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-100 min-w-0">
                                        <div className="relative flex-1 min-w-0">
                                            <input 
                                                type="text"
                                                value={row.sku}
                                                onChange={(e) => handleSkuChange(row.key, e.target.value)}
                                                onBlur={() => saveSkuToDatabase(row)}
                                                placeholder="SIN SKU"
                                                className={`w-full bg-neutral-50/60 border rounded-md px-2.5 py-1.5 text-xs font-mono font-bold tabular-nums uppercase tracking-wider outline-none transition-all ${
                                                    status === 'saved' 
                                                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950' 
                                                        : status === 'error'
                                                            ? 'border-rose-500 bg-rose-50/20 text-rose-950'
                                                            : 'border-neutral-200/60 focus:bg-white focus:border-neutral-950 text-neutral-900 placeholder:text-neutral-300'
                                                }`}
                                            />
                                        </div>

                                        {!row.sku && (
                                            <button 
                                                onClick={() => {
                                                    const auto = generateSmartSKU(row.category, `${row.name} ${row.variantLabel || ''}`)
                                                    handleSkuChange(row.key, auto)
                                                    saveSkuToDatabase({ ...row, sku: auto })
                                                }}
                                                className="px-2.5 py-1.5 bg-neutral-100 border border-neutral-200/70 text-neutral-700 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider active:scale-95 transition-all shrink-0"
                                            >
                                                Auto
                                            </button>
                                        )}

                                        {status === 'saving' && <Loader2 size={13} className="animate-spin text-neutral-400 shrink-0" />}
                                        {status === 'saved' && <Check size={13} className="text-emerald-600 shrink-0 stroke-[3]" />}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* VISTA DESKTOP (TABLA SPREADSHEET >= 1024px) */}
                <div className="hidden lg:block bg-white border border-neutral-200/50 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-200/50 bg-neutral-50/50 text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                                    <th className="py-3 px-4 w-12 text-center">#</th>
                                    <th className="py-3 px-4">Artículo</th>
                                    <th className="py-3 px-4">Variante / Opción</th>
                                    <th className="py-3 px-4 text-center">Stock</th>
                                    <th className="py-3 px-4 min-w-[260px]">Código SKU (Editable en vivo)</th>
                                    <th className="py-3 px-4 w-28 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 text-xs">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-14 text-center text-neutral-400 font-medium">
                                            No se encontraron artículos que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row, index) => {
                                        const status = cellStatuses[row.key] || 'idle'

                                        return (
                                            <tr key={row.key} className="hover:bg-neutral-50/40 transition-colors group">
                                                <td className="py-3 px-4 text-center font-mono text-[10px] text-neutral-400">
                                                    {index + 1}
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-200/50 overflow-hidden shrink-0 relative shadow-xs">
                                                            {row.image ? (
                                                                <Image 
                                                                    src={getOptimizedUrl(row.image)} 
                                                                    alt="" 
                                                                    fill 
                                                                    sizes="32px" 
                                                                    className="object-cover mix-blend-multiply" 
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-300 font-mono">
                                                                    <Package size={13} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-xs text-neutral-900 truncate leading-snug">
                                                                {row.name}
                                                            </p>
                                                            <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                                                                {row.category}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    {row.variantLabel ? (
                                                        <span className="inline-flex items-center bg-neutral-50 border border-neutral-200/60 text-neutral-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded leading-none">
                                                            {row.variantLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-neutral-400 font-medium font-mono">
                                                            Base
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-center font-mono font-bold text-xs text-neutral-800 tabular-nums">
                                                    {row.stock}
                                                </td>

                                                <td className="py-2.5 px-4">
                                                    <div className="relative flex items-center">
                                                        <input 
                                                            ref={el => { inputRefs.current[index] = el }}
                                                            type="text"
                                                            value={row.sku}
                                                            onChange={(e) => handleSkuChange(row.key, e.target.value)}
                                                            onBlur={() => saveSkuToDatabase(row)}
                                                            onKeyDown={(e) => handleKeyDown(e, index, row)}
                                                            placeholder="SIN CÓDIGO"
                                                            className={`w-full bg-neutral-50/50 border rounded-lg px-3 py-1.5 text-xs font-mono font-bold tabular-nums uppercase tracking-wider outline-none transition-all ${
                                                                status === 'saved' 
                                                                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 bg-emerald-50/20' 
                                                                    : status === 'error'
                                                                        ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-900 bg-rose-50/20'
                                                                        : 'border-neutral-200/60 focus:bg-white focus:border-neutral-950 text-neutral-900 placeholder:text-neutral-300'
                                                            }`}
                                                        />

                                                        {!row.sku && (
                                                            <button 
                                                                onClick={() => {
                                                                    const auto = generateSmartSKU(row.category, `${row.name} ${row.variantLabel || ''}`)
                                                                    handleSkuChange(row.key, auto)
                                                                    saveSkuToDatabase({ ...row, sku: auto })
                                                                }}
                                                                className="absolute right-2 text-[9px] font-mono text-neutral-400 hover:text-neutral-950 uppercase tracking-wider font-bold bg-neutral-100 hover:bg-neutral-200 px-1.5 py-0.5 rounded transition-colors"
                                                                title="Autogenerar código inteligente"
                                                            >
                                                                Auto
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4 text-center">
                                                    {status === 'saving' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-400 font-mono">
                                                            <Loader2 size={11} className="animate-spin" /> Guardando
                                                        </span>
                                                    )}
                                                    {status === 'saved' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 font-mono animate-in fade-in">
                                                            <Check size={12} strokeWidth={3} /> Guardado
                                                        </span>
                                                    )}
                                                    {status === 'error' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 font-mono">
                                                            <AlertCircle size={11} /> Error
                                                        </span>
                                                    )}
                                                    {status === 'idle' && (
                                                        <span className="text-[10px] text-neutral-300 font-mono font-bold">
                                                            {row.sku ? '✓' : '—'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ATAJOS DE TECLADO (DESKTOP) */}
                <div className="hidden lg:flex items-center justify-between gap-3 text-[11px] text-neutral-500 font-medium px-1">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <kbd className="bg-neutral-100 border border-neutral-200/80 text-neutral-800 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-xs">↵ Enter</kbd> Guardar y bajar
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="bg-neutral-100 border border-neutral-200/80 text-neutral-800 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-xs">↑ / ↓</kbd> Navegar celdas
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="bg-neutral-100 border border-neutral-200/80 text-neutral-800 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-xs">Tab</kbd> Siguiente
                        </span>
                    </div>

                    <p className="text-[10px] text-neutral-400 font-mono">
                        Sincronización atómica al salir de la celda.
                    </p>
                </div>

            </div>
        </div>
    )
}