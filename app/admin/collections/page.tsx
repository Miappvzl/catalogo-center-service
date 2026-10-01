'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
    ArrowLeft, Plus, Layers, Search, Trash2, Edit3, Check, X, 
    Upload, Loader2, Sparkles, Tag, Package, UtensilsCrossed, 
    Clock, Eye, Percent, ArrowUpRight, FolderPlus, CheckCircle2,
    Calendar, AlertCircle,
    ChevronUp,
    ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import { getOptimizedUrl } from '@/utils/cdn'
import { revalidateStoreCache } from '@/app/admin/actions'
import Swal from 'sweetalert2'

// ============================================================================
// CONTRATOS DE DATOS
// ============================================================================
interface CollectionSettings {
    badge_text: string | null
    accent_color: string | null
}

interface CollectionItemRecord {
    id?: string
    collection_id?: string
    item_type: 'product' | 'promotion' | 'category'
    product_id?: number | null
    promotion_id?: string | null
    category_name?: string | null
    display_order: number
    // Metadata poblada para la vista previa
    previewTitle?: string
    previewImage?: string | null
    previewSub?: string | null
}

interface CollectionRecord {
    id: string
    store_id: string
    name: string
    slug: string
    description: string | null
    image_url: string | null
    is_active: boolean
    display_order: number
    valid_until: string | null
    settings: CollectionSettings
    created_at: string
    collection_items?: CollectionItemRecord[]
}

export default function CollectionsPage() {
    const router = useRouter()
    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)
    const [collections, setCollections] = useState<CollectionRecord[]>([])
    const [search, setSearch] = useState('')

    // Pool de datos para el creador multientidad
    const [storeProducts, setStoreProducts] = useState<any[]>([])
    const [storePromotions, setStorePromotions] = useState<any[]>([])
    const [storeCategories, setStoreCategories] = useState<string[]>([])

    // Estados del Drawer Editor
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Formulario de Colección Activa
    const [formData, setFormData] = useState({
        id: '' as string | null,
        name: '',
        slug: '',
        description: '',
        image_url: '' as string | null,
        is_active: true,
        badge_text: '',
        valid_until: '' as string,
        items: [] as CollectionItemRecord[]
    })

 // 🚀 SUB-BUSCADOR UNIFICADO: Cero confusión Detal vs Mayor
    const [pickerTab, setPickerTab] = useState<'products' | 'promotions' | 'categories'>('products')
    const [pickerSearch, setPickerSearch] = useState('')

    // 🚀 PRESETS RÁPIDOS DE EXPIRACIÓN (Cero fricción de fechas)
    const handleSetDatePreset = (hours: number | null) => {
        if (hours === null) {
            setFormData(prev => ({ ...prev, valid_until: '' }))
            return
        }
        const target = new Date(Date.now() + hours * 60 * 60 * 1000)
        // Formato para input datetime-local: YYYY-MM-DDTHH:mm
        const tzOffset = target.getTimezoneOffset() * 60000
        const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16)
        setFormData(prev => ({ ...prev, valid_until: localISOTime }))
    }
   const isRestaurant = store?.store_type === 'restaurant'
    const moduleTitle = isRestaurant ? 'Combos & Especiales' : 'Colecciones'
    const moduleSubtitle = isRestaurant 
        ? 'Curaduría de platos, combos por menú y sugerencias del chef' 
        : 'Agrupaciones temáticas de productos, promociones y venta al mayor'

    // 🚀 PRESETS RÁPIDOS DE BADGES SEGÚN NICHO
    const BADGE_PRESETS = isRestaurant
        ? ['COMBO', '2X1', 'FAMILIAR', 'EJECUTIVO', 'PROMO', 'DEL CHEF']
        : ['DROP', 'LOOK', 'SET', '2X1', 'PACK', 'OFERTA']

    // 🚀 CÁLCULO EN VIVO DEL VALOR CONSOLIDADO EN LA BANDEJA (USD)
    const totalSelectedValueUSD = useMemo(() => {
        return formData.items.reduce((acc, item) => {
            if (item.item_type === 'product' && item.product_id) {
                const prod = storeProducts.find(p => String(p.id) === String(item.product_id))
                return acc + Number(prod?.usd_cash_price || 0)
            }
            return acc
        }, 0)
    }, [formData.items, storeProducts])

    // 🚀 REORDENAMIENTO DE ÍTEMS EN LA BANDEJA (Subir / Bajar)
    const moveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= formData.items.length) return

        setFormData(prev => {
            const nextItems = [...prev.items]
            const temp = nextItems[index]
            nextItems[index] = nextItems[targetIndex]
            nextItems[targetIndex] = temp
            return { ...prev, items: nextItems }
        })
    }

    // 1. CARGA DE CONTEXTO E INVENTARIO
    const fetchContextData = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }

            const { data: storeData } = await supabase
                .from('stores')
                .select('id, name, slug, store_type, categories_order')
                .eq('user_id', user.id)
                .single()

            if (!storeData) return
            setStore(storeData)

            // Carga en paralelo del ecosistema de la tienda
            const [collectionsRes, productsRes, promosRes] = await Promise.all([
                supabase
                    .from('collections')
                    .select('*, collection_items(*)')
                    .eq('store_id', storeData.id)
                    .order('display_order', { ascending: true })
                    .order('created_at', { ascending: false }),
                supabase
                    .from('products')
                    .select('id, name, category, image_url, usd_cash_price, wholesale_active, wholesale_min_qty, wholesale_discount_pct')
                    .eq('store_id', storeData.id)
                    .eq('status', 'active'),
                supabase
                    .from('promotions')
                    .select('id, title, image_url, promo_type, discount_percentage, is_active')
                    .eq('store_id', storeData.id)
                    .eq('is_active', true)
            ])

            setCollections((collectionsRes.data as any) || [])
            setStoreProducts(productsRes.data || [])
            setStorePromotions(promosRes.data || [])

            // Extracción limpia de categorías existentes
            const rawCats = (productsRes.data || []).map((p: any) => p.category?.trim()).filter(Boolean)
            setStoreCategories(Array.from(new Set(rawCats)))

        } catch (e: any) {
            console.error('Error cargando colecciones:', e)
        } finally {
            setLoading(false)
        }
    }, [supabase, router])

    useEffect(() => {
        fetchContextData()
    }, [fetchContextData])

   const openCreateDrawer = () => {
        setFormData({
            id: null,
            name: '',
            slug: '',
            description: '',
            image_url: null,
            is_active: true,
            badge_text: '',
            valid_until: '',
            items: []
        })
        setPickerTab(isRestaurant ? 'promotions' : 'products') // 🚀 CORRECCIÓN: 'products'
        setPickerSearch('')
        setIsDrawerOpen(true)
    }

    const openEditDrawer = (collection: CollectionRecord) => {
        // Enriquecemos los items existentes con datos visuales para el drawer
        const enrichedItems: CollectionItemRecord[] = (collection.collection_items || []).map(item => {
            if (item.item_type === 'product') {
                const prod = storeProducts.find(p => p.id === item.product_id)
                return {
                    ...item,
                    previewTitle: prod?.name || `Producto #${item.product_id}`,
                    previewImage: prod?.image_url || null,
                    previewSub: prod ? `$${Number(prod.usd_cash_price).toFixed(2)} • ${prod.category}` : null
                }
            } else if (item.item_type === 'promotion') {
                const promo = storePromotions.find(p => p.id === item.promotion_id)
                return {
                    ...item,
                    previewTitle: promo?.title || 'Promoción vinculada',
                    previewImage: promo?.image_url || null,
                    previewSub: promo?.discount_percentage ? `-${promo.discount_percentage}% OFF` : 'Campaña'
                }
            } else {
                return {
                    ...item,
                    previewTitle: `Categoría: ${item.category_name}`,
                    previewImage: null,
                    previewSub: 'Todos los productos del rubro'
                }
            }
        })
setFormData({
            id: collection.id,
            name: collection.name,
            slug: collection.slug,
            description: collection.description || '',
            image_url: collection.image_url,
            is_active: collection.is_active,
            badge_text: collection.settings?.badge_text || '',
            valid_until: collection.valid_until ? collection.valid_until.slice(0, 16) : '',
            items: enrichedItems
        })
        setPickerTab('products') // 🚀 CORRECCIÓN: 'products'
        setPickerSearch('')
        setIsDrawerOpen(true)
    }

    // 3. GENERADOR AUTOMÁTICO DE SLUGS LIMPIOS
    const handleNameChange = (name: string) => {
        const generatedSlug = name
            .toLowerCase()
            .trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")

        setFormData(prev => ({
            ...prev,
            name,
            slug: prev.id ? prev.slug : generatedSlug
        }))
    }

    // 4. SUBIDA Y COMPRESIÓN DE BANNER/COVER
    const handleUploadCover = async (files: FileList | null) => {
        if (!files || files.length === 0 || !store?.id) return
        const file = files[0]
        if (!file.type.startsWith('image/')) return

        setUploadingImage(true)
        try {
            const compressed = await compressImage(file, 1200, 0.75)
            const fileExt = file.name.split('.').pop() || 'jpg'
            const fileName = `collection-${store.id}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, compressed)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
            setFormData(prev => ({ ...prev, image_url: publicUrl }))
        } catch (e: any) {
            Swal.fire({ title: 'Error', text: 'No se pudo subir la imagen.', icon: 'error', confirmButtonColor: '#171717' })
        } finally {
            setUploadingImage(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // 5. MANIPULACIÓN DEL POOL MULTIENTIDAD (ADD / REMOVE ITEMS)
    const isItemInCollection = (type: 'product' | 'promotion' | 'category', identifier: any) => {
        return formData.items.some(item => {
            if (type === 'product') return item.item_type === 'product' && String(item.product_id) === String(identifier)
            if (type === 'promotion') return item.item_type === 'promotion' && String(item.promotion_id) === String(identifier)
            if (type === 'category') return item.item_type === 'category' && item.category_name === identifier
            return false
        })
    }

    const toggleItem = (type: 'product' | 'promotion' | 'category', rawData: any) => {
        const alreadyIn = isItemInCollection(type, type === 'product' ? rawData.id : type === 'promotion' ? rawData.id : rawData)

        if (alreadyIn) {
            // Remover
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter(item => {
                    if (type === 'product') return String(item.product_id) !== String(rawData.id)
                    if (type === 'promotion') return String(item.promotion_id) !== String(rawData.id)
                    if (type === 'category') return item.category_name !== rawData
                    return true
                })
            }))
        } else {
            // Añadir
            const newItem: CollectionItemRecord = {
                item_type: type,
                product_id: type === 'product' ? rawData.id : null,
                promotion_id: type === 'promotion' ? rawData.id : null,
                category_name: type === 'category' ? rawData : null,
                display_order: formData.items.length,
                previewTitle: type === 'product' ? rawData.name : type === 'promotion' ? rawData.title : `Categoría: ${rawData}`,
                previewImage: type === 'category' ? null : rawData.image_url,
                previewSub: type === 'product' ? `$${Number(rawData.usd_cash_price).toFixed(2)}` : type === 'promotion' ? `${rawData.discount_percentage}% OFF` : 'Rubro completo'
            }

            setFormData(prev => ({
                ...prev,
                items: [...prev.items, newItem]
            }))
        }
    }

    // 6. PERSISTENCIA ATÓMICA CON ALERTA PREVENTIVA DE IMAGEN
    const handleSaveCollection = async () => {
        if (!store?.id) return
        if (!formData.name.trim()) {
            return Swal.fire({ title: 'Falta el título', text: `Asigna un nombre a este ${isRestaurant ? 'especial' : 'catálogo'}.`, icon: 'warning', confirmButtonColor: '#171717' })
        }
        if (formData.items.length === 0) {
            return Swal.fire({ title: 'Colección vacía', text: 'Selecciona al menos un producto o promoción para exhibir.', icon: 'warning', confirmButtonColor: '#171717' })
        }

        // 🛡️ ADVERTENCIA AMIGABLE: Si no subió portada, avisar del fondo oscuro antes de continuar
        if (!formData.image_url) {
            const confirmNoImage = await Swal.fire({
                title: '¿Continuar sin portada?',
                text: 'No has cargado una imagen. La tarjeta se exhibirá con un fondo Negro Carbón con gradiente cinemático en tu tienda.',
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#171717',
                cancelButtonColor: '#737373',
                confirmButtonText: 'Sí, guardar así',
                cancelButtonText: 'Subir portada primero',
                customClass: { popup: 'rounded-2xl font-sans text-xs' }
            })

            if (!confirmNoImage.isConfirmed) return
        }

        setSaving(true)
        try {
            const collectionPayload = {
                store_id: store.id,
                name: formData.name.trim(),
                slug: formData.slug.trim().toLowerCase(),
                description: formData.description.trim() || null,
                image_url: formData.image_url,
                is_active: formData.is_active,
                valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
                settings: {
                    badge_text: formData.badge_text.trim() || null,
                    accent_color: null,
                    layout_override: null
                }
            }

            let collectionId = formData.id

            if (collectionId) {
                // Actualizar colección existente
                const { error: updateError } = await supabase
                    .from('collections')
                    .update(collectionPayload)
                    .eq('id', collectionId)
                if (updateError) throw updateError

                // Borramos los ítems previos para reinsertar el nuevo estado ordenado
                const { error: deleteItemsError } = await supabase
                    .from('collection_items')
                    .delete()
                    .eq('collection_id', collectionId)
                if (deleteItemsError) throw deleteItemsError

            } else {
                // Crear nueva colección
                const { data: newCollection, error: insertError } = await supabase
                    .from('collections')
                    .insert(collectionPayload)
                    .select('id')
                    .single()
                if (insertError) throw insertError
                collectionId = newCollection.id
            }

            // Inserción masiva de los elementos vinculados
            const itemsPayload = formData.items.map((item, idx) => ({
                collection_id: collectionId,
                item_type: item.item_type,
                product_id: item.item_type === 'product' ? item.product_id : null,
                promotion_id: item.item_type === 'promotion' ? item.promotion_id : null,
                category_name: item.item_type === 'category' ? item.category_name : null,
                display_order: idx
            }))

            const { error: itemsError } = await supabase
                .from('collection_items')
                .insert(itemsPayload)
            if (itemsError) throw itemsError

           setIsDrawerOpen(false)
            await revalidateStoreCache() // 🚀 INVALIDACIÓN DE CACHÉ NEXT.JS AL GUARDAR
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: isRestaurant ? 'Especial consolidado' : 'Colección publicada con éxito',
                showConfirmButton: false,
                timer: 1800,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold' }
            })
            
            await fetchContextData()

        } catch (error: any) {
            Swal.fire({ 
                title: 'Error de Guardado', 
                text: error.message.includes('unique') ? 'Ya existe una colección con ese slug de enlace.' : error.message, 
                icon: 'error', 
                confirmButtonColor: '#171717' 
            })
        } finally {
            setSaving(false)
        }
    }

    // 7. ELIMINACIÓN DE COLECCIÓN (CASCADE DESTRUYE LOS ITEMS NATIVAMENTE)
    const handleDeleteCollection = async (collection: CollectionRecord) => {
        const confirm = await Swal.fire({
            title: `¿Eliminar "${collection.name}"?`,
            text: 'Los productos y promociones no se borrarán; solo se desarmará esta agrupación.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#171717',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-2xl font-sans text-xs' }
        })

        if (!confirm.isConfirmed) return

   try {
            const { error } = await supabase.from('collections').delete().eq('id', collection.id)
            if (error) throw error
            await revalidateStoreCache() // 🚀 INVALIDACIÓN DE CACHÉ NEXT.JS AL ELIMINAR
            setCollections(prev => prev.filter(c => c.id !== collection.id))
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Colección eliminada', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs' } })
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error')
        }
    }

    // Filtro reactivo en el explorador de colecciones
    const filteredCollections = useMemo(() => {
        return collections.filter(c => 
            c.name.toLowerCase().includes(search.toLowerCase()) || 
            c.slug.toLowerCase().includes(search.toLowerCase())
        )
    }, [collections, search])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFC] flex flex-col items-center justify-center gap-3 font-sans">
                <Loader2 className="animate-spin text-neutral-400" size={26} />
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest">
                    Cargando gestor de curadurías...
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-24 font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white">
            
        {/* CABECERA ULTRA-COMPACTA MOBILE / EXPANDIDA DESKTOP */}
            <div className="bg-[#fafafc] border-b border-neutral-200/60 sticky top-0 z-30 px-4 md:px-8 py-2.5 sm:py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <Link 
                            href="/admin" 
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-neutral-50 sm:bg-white rounded-lg flex items-center justify-center border border-neutral-200/60 hover:border-neutral-400 transition-all shrink-0 active:scale-95"
                            title="Volver"
                        >
                            <ArrowLeft className="w-4 h-4 text-neutral-700" />
                        </Link>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-sm sm:text-base md:text-lg text-neutral-900 leading-none truncate">
                                    {moduleTitle}
                                </h1>
                                <span className="bg-neutral-100 text-neutral-600 border border-neutral-200/60 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold shrink-0">
                                    {collections.length}
                                </span>
                            </div>
                            <p className="text-xs text-neutral-500 font-medium mt-1 hidden sm:block truncate">
                                {moduleSubtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center shrink-0">
                        <button
                            type="button"
                            onClick={openCreateDrawer}
                            className="bg-neutral-950 text-white hover:bg-black h-8 sm:h-9 px-3 sm:px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            <span className="hidden sm:inline">Crear {isRestaurant ? 'Especial' : 'Colección'}</span>
                            <span className="sm:hidden font-mono text-[11px]">Nuevo</span>
                        </button>
                    </div>
                </div>
            </div>
            {/* CONTENEDOR CENTRAL */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 space-y-6">
                
                {/* BUSCADOR DE COLECCIONES */}
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-neutral-200/60 shadow-xs">
                    <Search size={16} className="text-neutral-400 ml-2 shrink-0" />
                    <input 
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Buscar ${isRestaurant ? 'combo o especial' : 'colección o drop'} por título o slug...`}
                        className="w-full bg-transparent text-xs font-semibold text-neutral-900 outline-none placeholder:text-neutral-400"
                    />
                </div>

                {/* GRILLA DE COLECCIONES REGISTRADAS */}
                {filteredCollections.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-neutral-300 rounded-2xl p-8 space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center mx-auto text-neutral-400">
                            {isRestaurant ? <UtensilsCrossed size={22} /> : <Layers size={22} />}
                        </div>
                        <h3 className="font-bold text-sm text-neutral-900">
                            No hay {isRestaurant ? 'especiales' : 'colecciones'} registradas
                        </h3>
                        <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                            Crea agrupaciones transversales para destacar productos en ofertas de temporada, combos gastronómicos o campañas flash.
                        </p>
                        <button
                            type="button"
                            onClick={openCreateDrawer}
                            className="mt-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                        >
                            <Plus size={14} /> Empezar Ahora
                        </button>
                    </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCollections.map(col => {
                            const itemCount = col.collection_items?.length || 0
                            const isExpired = col.valid_until ? new Date(col.valid_until) < new Date() : false

                            // 🚀 RESOLUCIÓN DE LOS PRIMEROS 4 PRODUCTOS PARA AVATAR STACKING
                            const previewThumbs = (col.collection_items || [])
                                .filter(it => it.item_type === 'product' && it.product_id)
                                .slice(0, 4)
                                .map(it => {
                                    const p = storeProducts.find(prod => String(prod.id) === String(it.product_id))
                                    return p?.image_url || null
                                })
                                .filter(Boolean) as string[]

                            const comboTotalUSD = (col.collection_items || []).reduce((acc, it) => {
                                if (it.item_type === 'product' && it.product_id) {
                                    const p = storeProducts.find(prod => String(prod.id) === String(it.product_id))
                                    return acc + Number(p?.usd_cash_price || 0)
                                }
                                return acc
                            }, 0)

                            return (
                                <div 
                                    key={col.id} 
                                    className="bg-white border border-neutral-200/60 hover:border-neutral-400 transition-all rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group"
                                >
                                    <div>
                                        {/* Portada / Banner */}
                                        <div className="h-32 w-full bg-neutral-100 relative overflow-hidden">
                                            {col.image_url ? (
                                                <Image 
                                                    src={getOptimizedUrl(col.image_url)} 
                                                    alt={col.name} 
                                                    fill 
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50">
                                                    {isRestaurant ? <UtensilsCrossed size={28} /> : <Layers size={28} />}
                                                </div>
                                            )}

                                            {/* Micro-Badges Superpuestos */}
                                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                                {col.settings?.badge_text && (
                                                    <span className="bg-neutral-950 text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                                                        {col.settings.badge_text}
                                                    </span>
                                                )}
                                                {!col.is_active && (
                                                    <span className="bg-neutral-200/90 backdrop-blur-xs text-neutral-700 text-[9px] font-bold uppercase px-2 py-0.5 rounded">
                                                        Oculta
                                                    </span>
                                                )}
                                                {isExpired && (
                                                    <span className="bg-rose-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded">
                                                        Vencida
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                      {/* Cuerpo Informativo con Avatar Stacking y Valor */}
                                        <div className="p-4 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="font-bold text-sm text-neutral-900 truncate">
                                                    {col.name}
                                                </h3>
                                                <span className="text-[10px] font-mono font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded shrink-0">
                                                    {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] font-mono">
                                                <span className="text-neutral-400 truncate">/{col.slug}</span>
                                                {comboTotalUSD > 0 && (
                                                    <span className="font-bold text-neutral-900 font-mono">
                                                        ${comboTotalUSD.toFixed(2)} USD
                                                    </span>
                                                )}
                                            </div>

                                            {/* Avatar Stacking de Ítems incluidos */}
                                            {previewThumbs.length > 0 && (
                                                <div className="flex items-center gap-1.5 pt-1">
                                                    <div className="flex -space-x-2 overflow-hidden py-0.5">
                                                        {previewThumbs.map((imgUrl, i) => (
                                                            <div 
                                                                key={i}
                                                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white overflow-hidden relative bg-neutral-100 shrink-0"
                                                            >
                                                                <Image src={getOptimizedUrl(imgUrl)} alt="" fill className="object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-mono text-neutral-400">
                                                        {isRestaurant ? 'en combo' : 'en pack'}
                                                    </span>
                                                </div>
                                            )}

                                            {col.description && (
                                                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed pt-0.5">
                                                    {col.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer de Acciones */}
                                    <div className="p-3 bg-neutral-50/60 border-t border-neutral-100 flex items-center justify-between">
                                        <Link 
                                            href={`/${store?.slug}?c=${col.slug}`} 
                                            target="_blank" 
                                            className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-950 transition-colors flex items-center gap-1"
                                        >
                                            <span>Ver tienda</span>
                                            <ArrowUpRight size={12} />
                                        </Link>

                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => openEditDrawer(col)}
                                                className="p-1.5 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200/60 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCollection(col)}
                                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* =================================================================== */}
            {/* DRAWER CURADOR MULTIENTIDAD (SLIDE-OVER CREATOR)                   */}
            {/* =================================================================== */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !saving && setIsDrawerOpen(false)}
                            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs cursor-pointer"
                        />

                        {/* Contenedor del Drawer */}
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-xl bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-neutral-200/60 z-10 overflow-hidden"
                        >
                            {/* Cabecera del Drawer */}
                            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
                                <div>
                                    <h2 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
                                        {formData.id ? `Editar ${isRestaurant ? 'Especial' : 'Colección'}` : `Nueva ${isRestaurant ? 'Curaduría / Especial' : 'Colección'}`}
                                    </h2>
                                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mt-1">
                                        Puebla y combina los elementos que conformarán este catálogo
                                    </p>
                                </div>
                                <button 
                                    onClick={() => !saving && setIsDrawerOpen(false)}
                                    className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Área de Formulario con Scroll Interno */}
                            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 no-scrollbar">
                                
                              {/* 1. DATOS DE IDENTIDAD (CERO JERGA TÉCNICA) */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                                            1. Información de la Colección
                                        </h4>
                                        {formData.slug && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const link = `https://${store?.slug}.preziso.shop/?c=${formData.slug}`;
                                                    navigator.clipboard.writeText(link);
                                                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Enlace copiado para compartir', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold' } });
                                                }}
                                                className="text-[10px] font-mono font-bold text-neutral-600 hover:text-neutral-950 underline flex items-center gap-1"
                                                title="Copiar enlace para Instagram o WhatsApp"
                                            >
                                                <span>Copiar Enlace Directo</span>
                                                <ArrowUpRight size={12} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                                                Nombre de la Colección / Especial *
                                            </label>
                                            <input 
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleNameChange(e.target.value)}
                                                placeholder={isRestaurant ? "Ej: Combo Parejas Burger" : "Ej: Liquidación de Verano"}
                                                className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-3 py-2.5 text-xs font-semibold text-neutral-900 outline-none focus:border-neutral-950 transition-colors"
                                            />
                                        </div>

                                       <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                                                    Etiqueta Destacada (Badge)
                                                </label>
                                                {formData.badge_text && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, badge_text: '' }))}
                                                        className="text-[9px] font-mono text-neutral-400 hover:text-neutral-900"
                                                    >
                                                        Limpiar
                                                    </button>
                                                )}
                                            </div>

                                            <input 
                                                type="text"
                                                maxLength={20}
                                                value={formData.badge_text}
                                                onChange={(e) => setFormData(prev => ({ ...prev, badge_text: e.target.value.toUpperCase() }))}
                                                placeholder={isRestaurant ? "Ej: COMBO, 2X1, ALMUERZO" : "Ej: DROP, PACK, LOOK"}
                                                className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900 uppercase outline-none focus:border-neutral-950 transition-colors"
                                            />

                                            {/* Chips Rápidos de Badges */}
                                            <div className="flex flex-wrap gap-1 pt-0.5">
                                                {BADGE_PRESETS.map(badge => (
                                                    <button
                                                        key={badge}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, badge_text: badge }))}
                                                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all ${
                                                            formData.badge_text === badge
                                                                ? 'bg-neutral-950 text-white'
                                                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                                        }`}
                                                    >
                                                        {badge}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 🚀 PRESETS RÁPIDOS DE FECHA DE EXPIRACIÓN */}
                                    <div className="space-y-2 bg-neutral-50/60 p-3.5 rounded-xl border border-neutral-200/60">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                                                Duración de la Campaña (Expiración)
                                            </label>
                                            {formData.valid_until && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetDatePreset(null)}
                                                    className="text-[9px] font-mono text-rose-600 hover:underline"
                                                >
                                                    Hacer Permanente
                                                </button>
                                            )}
                                        </div>

                                        {/* Botones Presets Rápidos */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: '24 Horas', hours: 24 },
                                                { label: '3 Días', hours: 72 },
                                                { label: '7 Días', hours: 168 },
                                                { label: 'Fin de Mes', hours: 720 },
                                            ].map(preset => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => handleSetDatePreset(preset.hours)}
                                                    className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-neutral-400 rounded-lg text-[10px] font-mono font-bold text-neutral-700 hover:text-neutral-950 active:scale-95 transition-all shadow-2xs"
                                                >
                                                    + {preset.label}
                                                </button>
                                            ))}
                                        </div>

                                        <input 
                                            type="datetime-local"
                                            value={formData.valid_until}
                                            onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                                            className="w-full mt-1 bg-white border border-neutral-200/80 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-800 outline-none focus:border-neutral-950 transition-colors shadow-2xs"
                                        />
                                    </div>
                                    {/* Portada / Banner Uploader */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                                            Imagen de Cabecera (Banner)
                                        </label>
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => handleUploadCover(e.target.files)} 
                                        />

                                        {formData.image_url ? (
                                            <div className="h-28 w-full rounded-xl border border-neutral-200 overflow-hidden relative group">
                                                <Image 
                                                    src={getOptimizedUrl(formData.image_url)} 
                                                    alt="Cover" 
                                                    fill 
                                                    className="object-cover" 
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, image_url: null }))}
                                                    className="absolute top-2 right-2 p-1.5 bg-neutral-950/70 hover:bg-neutral-950 text-white rounded-md transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                type="button"
                                                disabled={uploadingImage}
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-24 border border-dashed border-neutral-300 hover:border-neutral-950 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors bg-neutral-50/50"
                                            >
                                                {uploadingImage ? (
                                                    <Loader2 size={18} className="animate-spin text-neutral-400" />
                                                ) : (
                                                    <>
                                                        <Upload size={16} className="text-neutral-400" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                                                            Cargar imagen de portada
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                               {/* 2. BANDEJA ACTIVA DEL COMBO / COLECCIÓN */}
                                <div className="space-y-3 pt-4 border-t border-neutral-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-900">
                                                {isRestaurant ? 'Charola del Combo' : 'Bandeja de la Colección'}
                                            </h4>
                                            <span className="bg-neutral-950 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                                                {formData.items.length}
                                            </span>
                                        </div>

                                        {totalSelectedValueUSD > 0 && (
                                            <span className="text-[11px] font-mono font-bold text-neutral-900 bg-neutral-100 border border-neutral-200/80 px-2 py-0.5 rounded-md">
                                                Valor Base: ${totalSelectedValueUSD.toFixed(2)} USD
                                            </span>
                                        )}
                                    </div>

                                    {/* Lista de Ítems en Bandeja (Reordenables) */}
                                    {formData.items.length === 0 ? (
                                        <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 text-center">
                                            <p className="text-xs text-neutral-400 font-medium">
                                                {isRestaurant 
                                                    ? 'La charola está vacía. Añade platos o bebidas desde el catálogo abajo.' 
                                                    : 'La bandeja está vacía. Selecciona productos o promociones para exhibir.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar border border-neutral-200/80 rounded-xl p-2 bg-neutral-50/60 divide-y divide-neutral-100">
                                            {formData.items.map((item, idx) => (
                                                <div 
                                                    key={`${item.item_type}-${item.product_id || item.promotion_id || item.category_name}-${idx}`}
                                                    className="pt-1.5 first:pt-0 flex items-center justify-between gap-2.5 text-left"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <span className="text-[10px] font-mono font-bold text-neutral-400 w-3 text-center">
                                                            {idx + 1}
                                                        </span>

                                                        <div className="w-7 h-7 rounded bg-white border border-neutral-200/80 relative overflow-hidden shrink-0">
                                                            {item.previewImage ? (
                                                                <Image src={getOptimizedUrl(item.previewImage)} alt="" fill className="object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[9px] font-mono font-bold text-neutral-400">
                                                                    #
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-neutral-900 truncate leading-tight">
                                                                {item.previewTitle}
                                                            </p>
                                                            {item.previewSub && (
                                                                <p className="text-[10px] font-mono text-neutral-500 truncate leading-tight">
                                                                    {item.previewSub}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Controles: Reordenar y Eliminar */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={idx === 0}
                                                            onClick={() => moveItem(idx, 'up')}
                                                            className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 transition-colors"
                                                            title="Subir posición"
                                                        >
                                                            <ChevronUp size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={idx === formData.items.length - 1}
                                                            onClick={() => moveItem(idx, 'down')}
                                                            className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 transition-colors"
                                                            title="Bajar posición"
                                                        >
                                                            <ChevronDown size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    items: prev.items.filter((_, i) => i !== idx)
                                                                }))
                                                            }}
                                                            className="p-1 text-neutral-400 hover:text-rose-600 transition-colors ml-1"
                                                            title="Quitar de la bandeja"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 3. SELECTOR MULTIENTIDAD (EL CATÁLOGO) */}
                                <div className="space-y-3 pt-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                                            3. Añadir más elementos al catálogo
                                        </h4>
                                    </div>
{/* 🚀 PESTAÑAS SIMPLIFICADAS Y LIMPIAS (3 SECCIONES PURAS) */}
                                    <div className="flex gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60 overflow-x-auto no-scrollbar">
                                        {[
                                            { id: 'products', label: isRestaurant ? 'Platos del Menú' : 'Productos', icon: Package },
                                            { id: 'promotions', label: 'Promociones Activas', icon: Tag },
                                            { id: 'categories', label: 'Categorías Completas', icon: Layers },
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => { setPickerTab(tab.id as any); setPickerSearch(''); }}
                                                className={`flex-1 py-1.5 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                                                    pickerTab === tab.id 
                                                        ? 'bg-white text-neutral-950 shadow-xs' 
                                                        : 'text-neutral-500 hover:text-neutral-900'
                                                }`}
                                            >
                                                <tab.icon size={11} />
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Buscador de Catálogo */}
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        <input 
                                            type="text"
                                            value={pickerSearch}
                                            onChange={(e) => setPickerSearch(e.target.value)}
                                            placeholder="Buscar por nombre de producto o plato..."
                                            className="w-full bg-neutral-50 border border-neutral-200/70 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-neutral-900 outline-none focus:border-neutral-950 transition-colors"
                                        />
                                    </div>

                                    {/* Listado Unificado de Productos con Indicador de Venta al Mayor */}
                                    <div className="border border-neutral-200/80 rounded-xl bg-white max-h-56 overflow-y-auto divide-y divide-neutral-100 no-scrollbar">
                                        
                                        {/* A) CATÁLOGO UNIFICADO */}
                                        {pickerTab === 'products' && (
                                            storeProducts
                                                .filter(p => p.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                                                .map(prod => {
                                                    const selected = isItemInCollection('product', prod.id)
                                                    return (
                                                        <div 
                                                            key={prod.id} 
                                                            onClick={() => toggleItem('product', prod)}
                                                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                                                selected ? 'bg-neutral-100/80' : 'hover:bg-neutral-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-8 h-8 rounded bg-neutral-100 relative overflow-hidden shrink-0">
                                                                    {prod.image_url ? (
                                                                        <Image src={getOptimizedUrl(prod.image_url)} alt="" fill className="object-cover" />
                                                                    ) : null}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className="font-bold text-xs text-neutral-900 truncate">{prod.name}</p>
                                                                        {prod.wholesale_active && (
                                                                            <span className="bg-emerald-50 text-emerald-700 text-[8px] font-mono font-bold uppercase px-1 rounded border border-emerald-200/60">
                                                                                Mayorista (-{prod.wholesale_discount_pct}%)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] font-mono text-neutral-400">${Number(prod.usd_cash_price).toFixed(2)} • {prod.category}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                                                selected ? 'bg-neutral-950 border-neutral-950 text-white' : 'border-neutral-300'
                                                            }`}>
                                                                {selected && <Check size={12} strokeWidth={3} />}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                        )}

                                 
                                        {/* C) PROMOCIONES */}
                                        {pickerTab === 'promotions' && (
                                            storePromotions
                                                .filter(p => p.title.toLowerCase().includes(pickerSearch.toLowerCase()))
                                                .map(promo => {
                                                    const selected = isItemInCollection('promotion', promo.id)
                                                    return (
                                                        <div 
                                                            key={promo.id} 
                                                            onClick={() => toggleItem('promotion', promo)}
                                                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                                                selected ? 'bg-neutral-100/80' : 'hover:bg-neutral-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-8 h-8 rounded bg-neutral-100 relative overflow-hidden shrink-0">
                                                                    {promo.image_url ? (
                                                                        <Image src={getOptimizedUrl(promo.image_url)} alt="" fill className="object-cover" />
                                                                    ) : null}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-xs text-neutral-900 truncate">{promo.title}</p>
                                                                    <p className="text-[10px] font-mono text-purple-700">{promo.discount_percentage ? `-${promo.discount_percentage}% OFF` : 'Campaña'}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                                                selected ? 'bg-neutral-950 border-neutral-950 text-white' : 'border-neutral-300'
                                                            }`}>
                                                                {selected && <Check size={12} strokeWidth={3} />}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                        )}

                                        {/* D) CATEGORÍAS COMPLETAS */}
                                        {pickerTab === 'categories' && (
                                            storeCategories
                                                .filter(c => c.toLowerCase().includes(pickerSearch.toLowerCase()))
                                                .map(cat => {
                                                    const selected = isItemInCollection('category', cat)
                                                    return (
                                                        <div 
                                                            key={cat} 
                                                            onClick={() => toggleItem('category', cat)}
                                                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                                                selected ? 'bg-neutral-100/80' : 'hover:bg-neutral-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Layers size={14} className="text-neutral-500 shrink-0" />
                                                                <p className="font-bold text-xs text-neutral-900 truncate">{cat}</p>
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                                                selected ? 'bg-neutral-950 border-neutral-950 text-white' : 'border-neutral-300'
                                                            }`}>
                                                                {selected && <Check size={12} strokeWidth={3} />}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer de Guardado */}
                            <div className="p-4 md:p-5 border-t border-neutral-100 bg-white shrink-0 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => !saving && setIsDrawerOpen(false)}
                                    className="px-4 py-3 rounded-xl border border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={handleSaveCollection}
                                    className="flex-1 bg-neutral-950 hover:bg-black text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                    <span>Guardar y Publicar</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}