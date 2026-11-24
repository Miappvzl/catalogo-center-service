'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Search, AlertTriangle, CheckCircle2, XCircle, Package, Save, Loader2, ArrowUpRight, Receipt, Star, GripVertical, X, Zap, ChevronRight, Barcode, ArrowUpDown, ChevronDown, Check, Eye, EyeOff, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { revalidateStoreCache, checkAndTriggerStockAlert } from '@/app/admin/actions'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { Zain } from 'next/font/google'
import TaxCatalogToggle from '@/components/admin/TaxCatalogToggle'
import { getVariantSwatchStyle } from '@/utils/ColorUtils'
import { deleteStoreDemoProducts } from '@/app/admin/orders/action'
import { formatUSD } from '@/utils/currency'

type InventorySortOption = 'recent' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';

const INVENTORY_SORT_OPTIONS: { value: InventorySortOption; label: string; shortLabel: string }[] = [
    { value: 'recent', label: 'Más recientes', shortLabel: 'Recientes' },
    { value: 'price_asc', label: 'Precio: menor a mayor', shortLabel: 'Menor precio' },
    { value: 'price_desc', label: 'Precio: mayor a menor', shortLabel: 'Mayor precio' },
    { value: 'stock_asc', label: 'Stock: menor a mayor', shortLabel: 'Menor stock' },
    { value: 'stock_desc', label: 'Stock: mayor a menor', shortLabel: 'Mayor stock' },
];

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
    sku: string | null;
    stock: number;
    status: 'active' | 'draft';
    cashPrice: number;
    listPrice: number;
    isTaxExempt: boolean;
    isFeatured: boolean;
    displayOrder: number;
    requiresShipping: boolean;
    hasModifiers?: boolean;
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

    const [demoProductIds, setDemoProductIds] = useState<string[]>([]);
    const [isCleaningDemos, setIsCleaningDemos] = useState(false);

    // Nombres oficiales de los productos pre-cargados en la academia
    const DEMO_TITLES = useMemo(() => [
        'Hamburguesa Doble Smash Clásica',
        'Pizza Especial de Champiñones',
        'Hamburguesa Especial Bacon BBQ',
        'Pizza Familiar Cuatro Quesos',
        'Parrilla Mixta Mar y Tierra',
        'Franela Oversize Streetwear',
        'Zapatos Nike Air Max (Prueba)',
        'Reloj Inteligente Pro',
        'Perfume Importado Premium',
    ], []);

    // Detectar si existen productos de prueba en el inventario actual
    const detectedDemoIds = useMemo(() => {
        const ids = new Set<string>(demoProductIds);
        items.forEach((item) => {
            if (
                DEMO_TITLES.includes(item.name) ||
                (item.sku && item.sku.startsWith('DEMO-'))
            ) {
                ids.add(String(item.productId));
            }
        });
        return Array.from(ids);
    }, [items, demoProductIds, DEMO_TITLES]);

    const hasDemoProducts = detectedDemoIds.length > 0;

    const handleCleanDemoProducts = async () => {
        if (!storeId || detectedDemoIds.length === 0) return;

        const result = await Swal.fire({
            title: '¿Limpiar productos de prueba?',
            text: `Se eliminarán permanentemente los ${detectedDemoIds.length} artículos creados durante tus misiones de la Academia para dejar tu catálogo limpio.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#171717',
            confirmButtonText: 'Sí, limpiar catálogo',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-xl font-sans text-xs p-6 border border-neutral-200/60 shadow-xl',
                confirmButton: 'rounded-xl text-xs font-semibold px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white',
                cancelButton: 'rounded-xl text-xs font-semibold px-4 py-2.5 bg-neutral-100 text-neutral-700 border border-neutral-200',
            },
        });

        if (!result.isConfirmed) return;

        setIsCleaningDemos(true);
        try {
            const res = await deleteStoreDemoProducts(storeId, detectedDemoIds);
            if (!res.success) throw new Error(res.error || 'Error al eliminar');

            // Actualización atómica en memoria (La tabla se vacía de inmediato sin recargar)
            const demoIdSet = new Set(detectedDemoIds);
            setItems((prev) => prev.filter((item) => !demoIdSet.has(String(item.productId))));
            setDemoProductIds([]);

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' },
            });
            Toast.fire({ icon: 'success', title: 'Catálogo de prueba limpiado con éxito' });
        } catch (err: any) {
            Swal.fire({
                title: 'Error',
                text: err.message || 'No se pudieron eliminar los artículos.',
                icon: 'error',
                confirmButtonColor: '#171717',
            });
        } finally {
            setIsCleaningDemos(false);
        }
    };
    const [editingIndex, setEditingIndex] = useState<string | null>(null)

    const [storeType, setStoreType] = useState<'retail' | 'restaurant'>('retail')
    const isRestaurant = storeType === 'restaurant'

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

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'low' | 'out'>('all')
    const [sortBy, setSortBy] = useState<InventorySortOption>('recent')
    const [isSortOpen, setIsSortOpen] = useState(false)
    const sortDropdownRef = useRef<HTMLDivElement>(null)

    const [pendingChanges, setPendingChanges] = useState<{ [key: string]: number | '' }>({})
    const [savingButtons, setSavingButtons] = useState<{ [key: string]: boolean }>({})
    const [fiscalProfile, setFiscalProfile] = useState<string | null>(null)
    const [showTaxInCatalog, setShowTaxInCatalog] = useState(false)

    // Cierre automático del menú de ordenamiento al hacer clic fuera o presionar Escape
    useEffect(() => {
        if (!isSortOpen) return
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
                setIsSortOpen(false)
            }
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsSortOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isSortOpen])

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: store } = await supabase
                    .from('stores')
                    .select('id, fiscal_profile, show_tax_in_catalog, store_type, onboarding_missions')
                    .eq('user_id', user.id)
                    .single();
                if (!store) return

                setStoreId(store.id)
                setFiscalProfile(store.fiscal_profile)
                setShowTaxInCatalog(store.show_tax_in_catalog || false)
                setStoreType(store.store_type || 'retail')

                if (store.onboarding_missions?.demo_product_ids) {
                    setDemoProductIds(store.onboarding_missions.demo_product_ids.map(String));
                }

                const { data: products } = await supabase
                    .from('products')
                    .select('id, name, image_url, category, stock, sku, status, usd_cash_price, usd_penalty, display_order, is_tax_exempt, is_featured, requires_shipping, product_variants(*), product_modifier_groups(group_id)')
                    .eq('store_id', store.id)
                    .order('created_at', { ascending: false })

                const flatInventory: InventoryItem[] = []

                products?.forEach((prod: any) => {
                    const isExempt = prod.is_tax_exempt || false
                    const isFeat = prod.is_featured || false
                    const dOrder = prod.display_order || 0
                    const reqShipping = prod.requires_shipping ?? true
                    const prodStatus: 'active' | 'draft' = prod.status === 'draft' ? 'draft' : 'active'
                    const baseCash = Number(prod.usd_cash_price || 0)
                    const basePenalty = Number(prod.usd_penalty || 0)

                    if (prod.product_variants && prod.product_variants.length > 0) {
                        prod.product_variants.forEach((variant: any) => {
                            const vCash = variant.override_usd_price !== null && variant.override_usd_price !== undefined
                                ? Number(variant.override_usd_price)
                                : baseCash
                            const vPenalty = variant.override_usd_penalty !== null && variant.override_usd_penalty !== undefined
                                ? Number(variant.override_usd_penalty)
                                : basePenalty

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
                                sku: variant.sku || prod.sku || null,
                                stock: variant.stock,
                                status: prodStatus,
                                cashPrice: vCash,
                                listPrice: vCash + vPenalty,
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
                            sku: prod.sku || null,
                            stock: prod.stock || 0,
                            status: prodStatus,
                            cashPrice: baseCash,
                            listPrice: baseCash + basePenalty,
                            isTaxExempt: isExempt,
                            isFeatured: isFeat,
                            displayOrder: dOrder,
                            requiresShipping: reqShipping,
                            hasModifiers: Boolean(prod.product_modifier_groups && prod.product_modifier_groups.length > 0)
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
                const isGenericColor = !row.color || ['talla', 'tallas', 'medida', 'medidas', 'único', 'unico', 'estándar', 'estandar'].includes(row.color.trim().toLowerCase());
                const isGenericSize = !row.size || ['única', 'unica', 'u'].includes(row.size.trim().toLowerCase());
                const cleanVariantName = !row.variantId ? null
                    : (isGenericColor && !isGenericSize) ? `Talla ${row.size}`
                        : (!isGenericColor && isGenericSize) ? row.color
                            : `${row.color} / Talla ${row.size}`;

                checkAndTriggerStockAlert({
                    storeId,
                    productId: Number(row.productId),
                    productName: row.name,
                    newStock,
                    variantName: cleanVariantName
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

    const [visibilityModalTarget, setVisibilityModalTarget] = useState<InventoryItem | null>(null)
    const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)

    const confirmToggleProductStatus = async () => {
        if (!visibilityModalTarget) return;
        const { productId, status: currentStatus } = visibilityModalTarget;
        const newStatus: 'active' | 'draft' = currentStatus === 'active' ? 'draft' : 'active';

        setIsUpdatingVisibility(true);
        try {
            const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', productId);
            if (error) throw error;

            setItems(prev => prev.map(item => item.productId === productId ? { ...item, status: newStatus } : item));
            await revalidateStoreCache();

            setVisibilityModalTarget(null);

            const Toast = Swal.mixin({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2200,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
            });
            Toast.fire({
                icon: 'success',
                title: newStatus === 'active' ? 'Producto publicado en la Vitrina' : 'Producto ocultado en Borradores'
            });
        } catch (error) {
            Swal.fire({ title: 'Error', text: 'No se pudo cambiar la visibilidad del producto.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } });
        } finally {
            setIsUpdatingVisibility(false);
        }
    };

    const filteredItems = useMemo(() => {
        const term = search.toLowerCase().trim();

        const baseFiltered = items.filter(item => {
            const textMatch =
                !term ||
                item.name.toLowerCase().includes(term) ||
                item.color.toLowerCase().includes(term) ||
                item.size.toLowerCase().includes(term) ||
                (item.sku && item.sku.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term));

            let statusMatch = true;
            if (filterStatus === 'active') statusMatch = item.status === 'active';
            else if (filterStatus === 'draft') statusMatch = item.status === 'draft';
            else if (filterStatus === 'low') statusMatch = item.stock > 0 && item.stock <= 3;
            else if (filterStatus === 'out') statusMatch = item.stock === 0;

            return textMatch && statusMatch;
        });

        if (sortBy === 'recent') return baseFiltered;

        return [...baseFiltered].sort((a, b) => {
            if (sortBy === 'price_asc') return a.listPrice - b.listPrice;
            if (sortBy === 'price_desc') return b.listPrice - a.listPrice;
            if (sortBy === 'stock_asc') return a.stock - b.stock;
            if (sortBy === 'stock_desc') return b.stock - a.stock;
            return 0;
        });
    }, [items, search, filterStatus, sortBy]);

    const stats = useMemo(() => ({
        total: items.length,
        active: items.filter(i => i.status === 'active').length,
        draft: items.filter(i => i.status === 'draft').length,
        low: items.filter(i => i.stock > 0 && i.stock <= 3).length,
        out: items.filter(i => i.stock === 0).length
    }), [items]);

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

                    {/* BARRA DE CONTROLES (Arquitectura de 2 Niveles sin Amontonamiento Horizontal) */}
                    <div className="flex flex-col gap-3 w-full">

                        {/* NIVEL 1: Pestañas de Visibilidad (Vitrina vs Borrador) y Salud de Stock + Acciones Rápidas */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
                            <div className="flex bg-neutral-100/70 p-1 rounded-xl border border-neutral-200/60 overflow-x-auto no-scrollbar w-full lg:w-auto max-w-full shrink-0 gap-0.5">
                                {[
                                    { id: 'all', label: 'Todo', count: stats.total },
                                    { id: 'active', label: 'En Vitrina', count: stats.active },
                                    { id: 'draft', label: 'Borradores (Ocultos)', count: stats.draft },
                                    { id: 'low', label: 'Stock Bajo', count: stats.low },
                                    { id: 'out', label: 'Agotados', count: stats.out }
                                ].map(tab => {
                                    const isActive = filterStatus === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setFilterStatus(tab.id as any)}
                                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${isActive
                                                    ? 'bg-white text-neutral-950 shadow-2xs border border-neutral-200/60'
                                                    : 'text-neutral-500 hover:text-neutral-900 border border-transparent hover:bg-white/50'
                                                }`}
                                        >
                                            <span>{tab.label}</span>
                                            <span className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-md ${isActive
                                                    ? 'bg-neutral-900 text-white font-bold'
                                                    : 'bg-neutral-200/60 text-neutral-600'
                                                }`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ACCIONES RÁPIDAS DE CATÁLOGO */}
                            <div className="flex items-center gap-2 shrink-0">
                                {!isRestaurant && (
                                    <Link
                                        href="/admin/inventory/skus"
                                        className="flex-1 sm:flex-initial bg-white border border-neutral-200/60 hover:border-neutral-900 text-neutral-800 hover:text-neutral-950 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-2 whitespace-nowrap group active:scale-[0.98]"
                                    >
                                        <Barcode size={14} className="text-neutral-500 group-hover:text-neutral-950 transition-colors" />
                                        <span>Matriz de SKUs</span>
                                    </Link>
                                )}

                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={openReorderModal}
                                        className="flex-1 sm:flex-initial bg-neutral-950 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xs hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                                    >
                                        <Zap size={13} className="fill-white" />
                                        <span>Merchandising</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* NIVEL 2: Buscador Omnicanal + Selector Desplegable de Ordenamiento (Precio / Stock / Recientes) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                            <div className="relative group flex-1 min-w-0">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-900 transition-colors" size={15} />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={isRestaurant ? "Filtrar por plato, categoría o SKU..." : "Filtrar por nombre del artículo, SKU, categoría, talla o color..."}
                                    className="w-full bg-white border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] rounded-xl pl-9 pr-9 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* SELECTOR DESPLEGABLE DE ORDENAMIENTO (Precio menor/mayor, Stock, Recientes) */}
                            <div ref={sortDropdownRef} className="relative shrink-0 z-20">
                                {(() => {
                                    const activeSort = INVENTORY_SORT_OPTIONS.find(o => o.value === sortBy) || INVENTORY_SORT_OPTIONS[0];
                                    const isCustomSort = sortBy !== 'recent';

                                    return (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setIsSortOpen(prev => !prev)}
                                                className={`w-full sm:w-auto min-h-[38px] px-3.5 py-2 rounded-xl border bg-white text-xs flex items-center justify-between gap-2.5 transition-all cursor-pointer active:scale-[0.99] shadow-2xs ${isCustomSort || isSortOpen
                                                        ? 'border-neutral-900 text-neutral-950'
                                                        : 'border-neutral-200/60 hover:border-neutral-400 text-neutral-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ArrowUpDown size={13} className={isCustomSort ? 'text-neutral-950' : 'text-neutral-400'} />
                                                    <span className="text-neutral-400 font-normal">Ordenar:</span>
                                                    <span className="font-semibold text-neutral-900 whitespace-nowrap">
                                                        {activeSort.label}
                                                    </span>
                                                </div>
                                                <ChevronDown
                                                    size={14}
                                                    className={`text-neutral-400 transition-transform duration-200 ${isSortOpen ? 'rotate-180 text-neutral-900' : ''}`}
                                                />
                                            </button>

                                            <AnimatePresence>
                                                {isSortOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                                                        className="absolute right-0 mt-1.5 w-full sm:w-56 bg-white border border-neutral-200/80 rounded-xl p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)] z-30"
                                                    >
                                                        <div className="px-2.5 py-1.5 border-b border-neutral-100 mb-1">
                                                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                                                                Criterio de Orden
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            {INVENTORY_SORT_OPTIONS.map(option => {
                                                                const isSelected = sortBy === option.value;
                                                                return (
                                                                    <button
                                                                        key={option.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSortBy(option.value);
                                                                            setIsSortOpen(false);
                                                                        }}
                                                                        className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${isSelected
                                                                                ? 'bg-neutral-950 text-white font-semibold'
                                                                                : 'text-neutral-700 hover:bg-neutral-100/80 font-medium'
                                                                            }`}
                                                                    >
                                                                        <span>{option.label}</span>
                                                                        {isSelected && <Check size={13} strokeWidth={2.5} />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
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
                                                <th className="px-4 py-3 md:px-6 md:py-3.5">{isRestaurant ? 'Plato / Menú' : 'Producto'}</th>
                                                <th className="px-4 py-3 md:px-6 md:py-3.5 hidden md:table-cell">{isRestaurant ? 'Personalización' : 'Variante'}</th>
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
                                                                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                                                        {/* Precio Unitario Tabular para Verificación de Ordenamiento */}
                                                                        <span className="font-mono text-[11px] font-bold text-neutral-900 tabular-nums leading-none">
                                                                            {formatUSD(item.listPrice)}
                                                                        </span>

                                                                        {item.category && (
                                                                            <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-semibold hidden md:block">
                                                                                · {item.category}
                                                                            </p>
                                                                        )}

                                                                        {/* Badge de Borrador si está oculto */}
                                                                        {item.status === 'draft' && (
                                                                            <span className="inline-flex items-center gap-1 font-mono text-[8.5px] font-bold uppercase tracking-wider bg-neutral-200/80 text-neutral-700 px-1.5 py-0.5 rounded leading-none">
                                                                                <EyeOff size={9} /> Borrador
                                                                            </span>
                                                                        )}

                                                                        {/* SKU Badge en Desktop */}
                                                                        {item.sku ? (
                                                                            <span className="hidden md:inline-flex items-center font-mono text-[9px] font-bold tabular-nums uppercase tracking-widest bg-neutral-100/90 text-neutral-600 border border-neutral-200/60 px-1.5 py-0.2 rounded leading-none">
                                                                                {item.sku}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="hidden md:inline-flex items-center font-mono text-[8px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50/80 border border-amber-200/50 px-1.5 py-0.2 rounded leading-none">
                                                                                Sin SKU
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Variantes & SKU en Móvil */}
                                                                    {!isRestaurant ? (
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
                                                                            {!item.variantId ? (
                                                                                <div className="flex items-center px-1.5 py-0.5 bg-neutral-50 border border-neutral-200/50 rounded text-[9px] font-mono text-neutral-500">
                                                                                    <span>Único</span>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {item.color && !['talla', 'tallas', 'medida', 'medidas'].includes(item.color.trim().toLowerCase()) && (
                                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-neutral-50 border border-neutral-200/50 rounded text-[9px] font-mono text-neutral-600 transition-colors">
                                                                                            {item.hex && item.hex !== 'transparent' && item.hex !== '#transparent' && (
                                                                                                <span
                                                                                                    className="w-2 h-2 rounded-full shrink-0 border border-neutral-200/50"
                                                                                                    style={getVariantSwatchStyle(item.hex)}
                                                                                                />
                                                                                            )}
                                                                                            <span className="truncate max-w-[80px]">{item.color}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {item.size && !['única', 'unica', 'u'].includes(item.size.trim().toLowerCase()) && (
                                                                                        <div className="flex items-center px-1.5 py-0.5 bg-neutral-50 border border-neutral-200/50 rounded text-[9px] font-mono text-neutral-600 transition-colors">
                                                                                            <span>Talla: {item.size}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            {item.sku ? (
                                                                                <span className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200/60 rounded text-[8px] font-mono font-bold uppercase tracking-widest text-neutral-600">
                                                                                    {item.sku}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-1 py-0.5 bg-amber-50 border border-amber-200/60 rounded text-[8px] font-mono font-semibold text-amber-700">
                                                                                    Sin SKU
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1.5 mt-1 md:hidden">
                                                                            {item.hasModifiers ? (
                                                                                <span className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200/60 rounded text-[8px] font-mono font-bold uppercase tracking-wider text-neutral-800">
                                                                                    Con Modificadores
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-1.5 py-0.5 bg-neutral-50 border border-neutral-200/40 rounded text-[8px] font-mono text-neutral-400 uppercase tracking-wider">
                                                                                    Plato Directo
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Link>
                                                        </td>

                                                        <td className="px-4 py-3 md:px-6 md:py-4 hidden md:table-cell align-middle">
                                                            {!item.variantId ? (
                                                                <span className="px-2 py-1 rounded bg-neutral-50 border border-neutral-200/50 text-[10px] font-mono font-medium text-neutral-400">
                                                                    Producto Único
                                                                </span>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    {item.color && !['talla', 'tallas', 'medida', 'medidas'].includes(item.color.trim().toLowerCase()) && (
                                                                        <div className="px-2 py-1 rounded bg-neutral-50 border border-neutral-200/50 flex items-center gap-1.5 max-w-[130px]">
                                                                            {item.hex && item.hex !== 'transparent' && item.hex !== '#transparent' && (
                                                                                <span
                                                                                    className="w-2.5 h-2.5 rounded-full border border-neutral-200/50 shrink-0"
                                                                                    style={getVariantSwatchStyle(item.hex)}
                                                                                />
                                                                            )}
                                                                            <span className="text-[10px] font-mono font-semibold text-neutral-600 truncate">{item.color}</span>
                                                                        </div>
                                                                    )}
                                                                    {item.size && (
                                                                        <div className="px-2 py-1 rounded bg-neutral-50 border border-neutral-200/50 flex items-center">
                                                                            <span className="text-[10px] font-mono font-semibold text-neutral-600 leading-none">
                                                                                {['única', 'unica', 'u'].includes(item.size.trim().toLowerCase()) ? item.size : `Talla: ${item.size}`}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* GESTIÓN RÁPIDA (STOCK, VISIBILIDAD, IVA, LOGÍSTICA) */}
                                                        <td className="px-4 py-3 md:px-6 md:py-4 align-middle">
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
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

                                                                {/* GATILLO CON MODAL DE CONFIRMACIÓN (En Vitrina vs Borrador Oculto) */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setVisibilityModalTarget(item)}
                                                                    className={`flex items-center justify-center gap-1 px-2 py-0.5 w-[84px] rounded text-[8px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${item.status === 'active'
                                                                            ? 'bg-white border-neutral-200/70 text-neutral-700 hover:border-neutral-400'
                                                                            : 'bg-neutral-200/70 border-neutral-300/80 text-neutral-600 hover:bg-neutral-300/70'
                                                                        }`}
                                                                    title="Cambiar visibilidad del producto"
                                                                >
                                                                    {item.status === 'active' ? (
                                                                        <><Eye size={10} /> Vitrina</>
                                                                    ) : (
                                                                        <><EyeOff size={10} /> Borrador</>
                                                                    )}
                                                                </button>

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

                                                                {!isRestaurant && (
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
                                                                )}
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
                    {/* 🚀 ENLACE EDITORIAL: LIMPIEZA DE PRODUCTOS DEL TUTORIAL AL PIE DE LA TABLA */}
                    {hasDemoProducts && !loading && (
                        <div className="px-4 md:px-6 py-3.5 border-t border-t-[#d3cdcdfc]  flex items-center justify-center sm:justify-end bg-neutral-50/40">
                            <button
                                type="button"
                                onClick={handleCleanDemoProducts}
                                disabled={isCleaningDemos}
                                className="text-[11px] font-normal text-neutral-400 hover:text-rose-600 underline underline-offset-4 decoration-neutral-300 hover:decoration-rose-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isCleaningDemos && <Loader2 size={12} className="animate-spin text-rose-500" />}
                                <span>Limpiar productos de prueba del tutorial ({detectedDemoIds.length})</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL EJECUTIVO DE CONFIRMACIÓN DE VISIBILIDAD (VITRINA ⇄ BORRADOR) */}
            <AnimatePresence>
                {visibilityModalTarget && (() => {
                    const isCurrentlyActive = visibilityModalTarget.status === 'active';
                    const siblingRows = items.filter(i => i.productId === visibilityModalTarget.productId);
                    const totalProductStock = siblingRows.reduce((acc, r) => acc + (Number(r.stock) || 0), 0);
                    const variantCount = siblingRows.length;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-neutral-900/35 backdrop-blur-xs"
                                onClick={() => !isUpdatingVisibility && setVisibilityModalTarget(null)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 30 } }}
                                exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.16 } }}
                                className="relative bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-neutral-200/70 z-10"
                            >
                                {/* Cabecera */}
                                <div className="p-5 pb-4 border-b border-neutral-100 flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${isCurrentlyActive
                                                ? 'bg-neutral-100 border-neutral-200/80 text-neutral-800'
                                                : 'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                                            }`}>
                                            {isCurrentlyActive ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-neutral-900 tracking-tight leading-snug">
                                                {isCurrentlyActive ? '¿Ocultar producto en Borradores?' : '¿Publicar producto en la Vitrina?'}
                                            </h3>
                                            <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 mt-0.5">
                                                {isCurrentlyActive ? 'Pasará de Vitrina a Oculto' : 'Pasará de Borrador a Público'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isUpdatingVisibility}
                                        onClick={() => setVisibilityModalTarget(null)}
                                        className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                                    >
                                        <X size={15} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Cuerpo del Modal */}
                                <div className="p-5 space-y-4">
                                    {/* Ficha Resumen del Producto */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                                        <div className="w-11 h-11 rounded-lg bg-white border border-neutral-200/60 overflow-hidden shrink-0 relative">
                                            {visibilityModalTarget.image ? (
                                                <Image src={getOptimizedUrl(visibilityModalTarget.image)} alt={visibilityModalTarget.name} fill sizes="44px" className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-300"><Package size={16} /></div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-xs text-neutral-900 truncate">{visibilityModalTarget.name}</p>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-neutral-500">
                                                <span className="font-bold text-neutral-800">{formatUSD(visibilityModalTarget.listPrice)}</span>
                                                <span>·</span>
                                                <span>Stock total: <strong className="text-neutral-800">{totalProductStock} und</strong></span>
                                                {variantCount > 1 && (
                                                    <>
                                                        <span>·</span>
                                                        <span>{variantCount} variantes</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Explicación Clara del Cambio */}
                                    <div className="text-xs text-neutral-600 leading-relaxed space-y-2">
                                        {isCurrentlyActive ? (
                                            <p>
                                                Al pasar a <strong className="text-neutral-900">Borrador (Oculto)</strong>, este artículo {variantCount > 1 ? `y sus ${variantCount} variantes dejarán` : 'dejará'} de mostrarse a los clientes en tu tienda pública. Su inventario, precios y fotos se mantendrán guardados para cuando decidas volver a activarlo.
                                            </p>
                                        ) : (
                                            <p>
                                                Al pasar a <strong className="text-neutral-900">En Vitrina</strong>, este artículo {variantCount > 1 ? `y sus ${variantCount} variantes serán` : 'será'} visible de inmediato para todos los clientes que visiten tu catálogo y podrá ser agregado al carrito.
                                            </p>
                                        )}

                                        {/* Aviso Defensivo si intenta publicar a vitrina un producto sin stock o con precio $0 */}
                                        {!isCurrentlyActive && (totalProductStock <= 0 || visibilityModalTarget.listPrice <= 0) && (
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-800 mt-2">
                                                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                <span>
                                                    {visibilityModalTarget.listPrice <= 0
                                                        ? 'Atención: Este artículo tiene un precio de $0,00. Verifica su precio antes de publicarlo.'
                                                        : 'Nota: Este artículo tiene 0 unidades disponibles, por lo que se mostrará como "Agotado" en la vitrina.'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer de Acción */}
                                <div className="px-5 py-4 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        disabled={isUpdatingVisibility}
                                        onClick={() => setVisibilityModalTarget(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isUpdatingVisibility}
                                        onClick={confirmToggleProductStatus}
                                        className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98] disabled:opacity-50 ${isCurrentlyActive
                                                ? 'bg-neutral-950 hover:bg-black'
                                                : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                    >
                                        {isUpdatingVisibility ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : isCurrentlyActive ? (
                                            <EyeOff size={13} />
                                        ) : (
                                            <Eye size={13} />
                                        )}
                                        <span>
                                            {isCurrentlyActive ? 'Sí, ocultar en Borrador' : 'Sí, publicar en Vitrina'}
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>


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

