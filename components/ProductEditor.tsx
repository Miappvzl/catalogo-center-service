'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Upload, Plus, Save, Loader2, DollarSign, Trash2, X, Box, AlertTriangle, ImageIcon, ChevronDown, ChevronUp, ImagePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { revalidateStoreCache } from '@/app/admin/actions'
import { compressImage } from '@/utils/imageOptimizer'
import Swal from 'sweetalert2'
import { AnimatePresence, motion } from 'framer-motion'

interface ProductEditorProps {
    productId?: string
    rates: { usd: number, eur: number }
    storeSettings?: { id: string, currency: string }
}

const COMMON_SIZES = ['S', 'M', 'L', 'XL', '38', '40', '42', 'Única']

export default function ProductEditor({ productId, rates, storeSettings }: ProductEditorProps) {
    const router = useRouter()
    const supabase = getSupabase()

    const mainImageInputRef = useRef<HTMLInputElement>(null)
    const productGalleryInputRef = useRef<HTMLInputElement>(null)
    const variantImageInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(!!productId)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isDirty, setIsDirty] = useState(false)


    const isEur = storeSettings?.currency === 'eur'
    const activeRate = isEur ? rates.eur : rates.usd
    const rateLabel = isEur ? 'Tasa Euro' : 'Tasa BCV'

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        image_url: '',
        price: '' as number | '',
        penalty: '' as number | '',
        compareAt: '' as number | '',
        status: 'active',
        shipping_badge_title: '', // NUEVO
        shipping_badge_desc: ''   // NUEVO
    })

    const [productGallery, setProductGallery] = useState<string[]>([])
    const [variants, setVariants] = useState<any[]>([])
    const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([])

    const [useColor, setUseColor] = useState(true)
    const [variantInput, setVariantInput] = useState({
        colorName: '',
        colorHex: '#000000',
        defaultStock: 10 as number | '',
        priceOverride: '' as number | '',
        penaltyOverride: '' as number | '',
        compareAtOverride: '' as number | '',
        images: [] as string[]
    })

    const [hasVariants, setHasVariants] = useState(false)
    const [simpleStock, setSimpleStock] = useState<number | ''>(10)
    const [sizeInputValue, setSizeInputValue] = useState('')
    const [sizeTags, setSizeTags] = useState<string[]>([])
    const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null)

    const [existingCategories, setExistingCategories] = useState<string[]>([])
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const categoryDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchCategories = async () => {
            if (!storeSettings?.id) return
            const { data } = await supabase.from('products').select('category').eq('store_id', storeSettings.id)
            if (data) {
                const uniqueCategories = Array.from(new Set(data.map((p: any) => p.category).filter(Boolean))) as string[]
                setExistingCategories(uniqueCategories.sort())
            }
        }
        fetchCategories()
    }, [storeSettings?.id, supabase])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const addSizeFromInput = (value: string = sizeInputValue) => {
        const cleanValue = value.replace(/,/g, '').trim().toUpperCase()
        if (cleanValue && !sizeTags.includes(cleanValue)) {
            setSizeTags(prev => [...prev, cleanValue])
            setSizeInputValue('')
            setIsDirty(true)
        }
    }



    const handleSizeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addSizeFromInput()
        }
    }

    const handleSizeBlur = () => { if (sizeInputValue.trim() !== '') addSizeFromInput() }

    const handleQuickPillClick = (e: React.MouseEvent, size: string) => {
        e.preventDefault()
        if (!sizeTags.includes(size.toUpperCase())) {
            setSizeTags([...sizeTags, size.toUpperCase()])
            setIsDirty(true)
        }
    }

    const handleSizeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        if (val.endsWith(',')) addSizeFromInput(val)
        else setSizeInputValue(val)
    }

    const removeSizeTag = (sizeToRemove: string) => {
        setSizeTags(sizeTags.filter(s => s !== sizeToRemove))
        setIsDirty(true)
    }

    const updateForm = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setIsDirty(true)
    }

    const updateVariantInput = (field: string, value: any) => {
        setVariantInput(prev => ({ ...prev, [field]: value }))
        setIsDirty(true)
    }

    const updateVariantOverride = (id: string, field: string, value: any) => {
        setVariants(variants.map(v => {
            if (v.id === id) return { ...v, [field]: value }
            return v
        }))
        setIsDirty(true)
    }

    const math = useMemo(() => {
        const cashPrice = Number(formData.price) || 0
        const markup = Number(formData.penalty) || 0
        const listPrice = cashPrice + markup
        const discountPercent = listPrice > 0 ? Math.round((markup / listPrice) * 100) : 0
        const refBs = listPrice * activeRate
        return { listPrice, discountPercent, refBs }
    }, [formData.price, formData.penalty, activeRate])

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) { e.preventDefault(); e.returnValue = ''; }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    useEffect(() => {
        if (productId) {
            const fetchProduct = async () => {
                const { data: product, error } = await supabase.from('products').select(`*, product_variants(*)`).eq('id', productId).single()
                if (error || !product) {
                    Swal.fire('Error', 'Producto no encontrado', 'error')
                    router.push('/admin/inventory')
                    return
                }





                setFormData({
                    name: product.name,
                    category: product.category,
                    description: product.description || '',
                    image_url: product.image_url || '',
                    price: product.usd_cash_price || 0,
                    penalty: product.usd_penalty || 0,
                    compareAt: product.compare_at_usd || '',
                    status: product.status || 'active',
                    shipping_badge_title: product.shipping_badge_title || '', // NUEVO
                    shipping_badge_desc: product.shipping_badge_desc || ''    // NUEVO
                })

                setProductGallery(product.gallery || [])

                if (product.product_variants && product.product_variants.length > 0) {
                    setVariants(product.product_variants.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)))
                    setHasVariants(true)
                } else {
                    setVariants([])
                    setHasVariants(false)
                    setSimpleStock(product.stock || 0)
                }
                setLoading(false)
                setIsDirty(false)
            }
            fetchProduct()
        } else {
            setLoading(false)
        }
    }, [productId, router, supabase])

    const handleExit = (e?: React.MouseEvent) => {
        if (e) e.preventDefault()
        if (!isDirty) return router.back()

        Swal.fire({
            title: '¿Salir sin guardar?',
            text: 'Tienes cambios pendientes. Si sales ahora, se perderán.',
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Sí, descartar',
            denyButtonText: 'Guardar producto',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            denyButtonColor: '#000000',
            customClass: { popup: 'rounded-(--radius-card)' }
        }).then((result) => {
            if (result.isConfirmed) { setIsDirty(false); router.back() }
            else if (result.isDenied) { handleSave() }
        })
    }

    const handleImageUpload = async (files: FileList | File[], target: 'main' | 'productGallery' | 'variant', variantId?: string) => {
        const fileArray = Array.from(files)
        if (fileArray.length === 0) return

        try {
            setUploading(true)

            if (target === 'main') {
                const file = fileArray[0]
                if (!file.type.startsWith('image/')) throw new Error('Solo imágenes permitidas')
                const compressedFile = await compressImage(file, 1080, 0.8)
                const fileName = `main-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
                const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
                if (error) throw error
                const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
                updateForm('image_url', publicUrl)
            }
            else if (target === 'productGallery') {
                const currentSlots = 3 - productGallery.length
                if (currentSlots <= 0) return Swal.fire('Límite alcanzado', 'Máximo 3 fotos extra para la galería', 'warning')
                const filesToUpload = fileArray.slice(0, currentSlots)

                const uploadPromises = filesToUpload.map(async (file) => {
                    if (!file.type.startsWith('image/')) return null
                    const compressedFile = await compressImage(file, 800, 0.7)
                    const fileName = `pgal-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
                    const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
                    if (!error) {
                        const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
                        return publicUrl
                    }
                    return null
                })

                const newUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[]
                setProductGallery(prev => [...prev, ...newUrls])
                setIsDirty(true)
            }
            else if (target === 'variant') {
                if (variantId) {
                    const file = fileArray[0]
                    if (!file.type.startsWith('image/')) throw new Error('Solo imágenes permitidas')
                    const compressedFile = await compressImage(file, 800, 0.7)
                    const fileName = `var-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
                    const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
                    if (error) throw error
                    const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
                    updateVariantOverride(variantId, 'variant_image', publicUrl)
                } else {
                    const currentSlots = 3 - variantInput.images.length
                    if (currentSlots <= 0) return Swal.fire('Límite alcanzado', 'Máximo 3 fotos por variante', 'warning')
                    const filesToUpload = fileArray.slice(0, currentSlots)

                    const uploadPromises = filesToUpload.map(async (file) => {
                        if (!file.type.startsWith('image/')) return null
                        const compressedFile = await compressImage(file, 800, 0.7)
                        const fileName = `var-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
                        const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
                        if (!error) {
                            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
                            return publicUrl
                        }
                        return null
                    })

                    const newUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[]
                    setVariantInput(prev => ({ ...prev, images: [...prev.images, ...newUrls] }))
                    setIsDirty(true)
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
            Swal.fire('Error', errorMessage, 'error');
        } finally {
            setUploading(false)
            if (target === 'main' && mainImageInputRef.current) mainImageInputRef.current.value = ''
            if (target === 'productGallery' && productGalleryInputRef.current) productGalleryInputRef.current.value = ''
            if (target === 'variant' && variantImageInputRef.current) variantImageInputRef.current.value = ''
        }
    }

    const removeImageFromGallery = (index: number) => {
        const newImages = [...productGallery]
        newImages.splice(index, 1)
        setProductGallery(newImages)
        setIsDirty(true)
    }

    const removeImageFromVariantInput = (index: number) => {
        const newImages = [...variantInput.images]
        newImages.splice(index, 1)
        updateVariantInput('images', newImages)
    }

    const addVariantGroup = () => {
        if (sizeInputValue.trim() !== '') addSizeFromInput()

        if (!variantInput.colorName) return Swal.fire('Falta Atributo', 'Define un nombre para la opción', 'warning')
        if (sizeTags.length === 0 && sizeInputValue.trim() === '') return Swal.fire('Faltan Tallas/Medidas', 'Agrega al menos una medida.', 'warning')

        const tagsToUse = sizeInputValue.trim() !== '' && !sizeTags.includes(sizeInputValue.trim().toUpperCase())
            ? [...sizeTags, sizeInputValue.trim().toUpperCase().replace(/,/g, '')]
            : sizeTags;

        const stockToApply = Number(variantInput.defaultStock) || 0
        const finalHex = useColor ? variantInput.colorHex : 'transparent'

        const newVariants = tagsToUse.map(s => ({
            id: `temp-${crypto.randomUUID()}`,
            color_name: variantInput.colorName,
            color_hex: finalHex,
            size: s,
            stock: stockToApply,
            gallery: variantInput.images,
            variant_image: variantInput.images[0] || '',
            override_usd_price: variantInput.priceOverride !== '' ? Number(variantInput.priceOverride) : null,
            override_usd_penalty: variantInput.penaltyOverride !== '' ? Number(variantInput.penaltyOverride) : null,
            override_compare_at_usd: variantInput.compareAtOverride !== '' ? Number(variantInput.compareAtOverride) : null,
        }))

        setVariants([...variants, ...newVariants])
        setVariantInput({ colorName: '', colorHex: '#000000', defaultStock: 10, priceOverride: '', penaltyOverride: '', compareAtOverride: '', images: [] })
        setSizeTags([])
        setSizeInputValue('')
        setIsDirty(true)

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-(--radius-btn) text-xs font-bold' } })
        Toast.fire({ icon: 'success', title: 'Variantes Generadas' })
    }

    const removeVariant = (id: string) => {
        if (!id.startsWith('temp-')) setDeletedVariantIds(prev => [...prev, id])
        setVariants(variants.filter(v => v.id !== id))
        setIsDirty(true)
    }

    const handleDeleteProduct = async () => {
        if (!productId) return;
        const confirm = await Swal.fire({
            title: '¿Eliminar este producto?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#000000',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-(--radius-card)' }
        });

        if (!confirm.isConfirmed) return;
        setSaving(true);
        try {
            const { data: orderItems, error: orderError } = await supabase.from('order_items').select('id').eq('product_id', productId).limit(1);
            if (orderError) throw orderError;

            if (orderItems && orderItems.length > 0) {
                await Swal.fire({
                    title: 'Producto con Historial',
                    text: 'Este producto ya tiene ventas registradas. Se cambiará a "Borrador" (Oculto) para no dañar tu contabilidad.',
                    icon: 'info',
                    confirmButtonColor: '#000',
                    customClass: { popup: 'rounded-(--radius-card)' }
                });
                const { error: updateError } = await supabase.from('products').update({ status: 'draft' }).eq('id', productId);
                if (updateError) throw updateError;
                return router.push('/admin/inventory');
            }

            const { error: varError } = await supabase.from('product_variants').delete().eq('product_id', productId);
            if (varError) throw varError;
            const { error: prodError } = await supabase.from('products').delete().eq('id', productId);
            if (prodError) throw prodError;

            // 🚀 MATA LA CACHÉ DE LA TIENDA PÚBLICA
            await revalidateStoreCache()

            setIsDirty(false);
            Swal.fire({ title: 'Eliminado', text: 'El producto fue borrado.', icon: 'success', confirmButtonColor: '#000', customClass: { popup: 'rounded-(--radius-card)' } });
            router.push('/admin/inventory');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
            Swal.fire('Error', errorMessage, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (hasVariants && sizeInputValue.trim() !== '') addSizeFromInput()
        if (!formData.name) return Swal.fire('Falta información', 'El producto debe tener un nombre', 'warning')
        if (Number(formData.price) <= 0) return Swal.fire('Error', 'El precio base debe ser mayor a 0', 'warning')

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No auth")

            const payload = {
                name: formData.name,
                category: formData.category,
                description: formData.description,
                image_url: formData.image_url,
                gallery: productGallery,
                usd_cash_price: Number(formData.price) || 0,
                usd_penalty: Number(formData.penalty) || 0,
                compare_at_usd: formData.compareAt !== '' ? Number(formData.compareAt) : null,
                status: formData.status,
                user_id: user.id,
                store_id: storeSettings!.id,
                stock: hasVariants ? 0 : (Number(simpleStock) || 0),
                shipping_badge_title: formData.shipping_badge_title || null, // NUEVO (Null para heredar)
                shipping_badge_desc: formData.shipping_badge_desc || null    // NUEVO
            }

            let currentId = productId
            if (currentId) {
                const { error } = await supabase.from('products').update(payload).eq('id', currentId)
                if (error) throw error
            } else {
                const { data, error } = await supabase.from('products').insert(payload).select().single()
                if (error) throw error
                currentId = data.id
            }

            if (currentId) {
                if (!hasVariants) {
                    await supabase.from('product_variants').delete().eq('product_id', currentId)
                } else {
                    if (deletedVariantIds.length > 0) {
                        await supabase.from('product_variants').delete().in('id', deletedVariantIds)
                    }

                    const toInsert: any[] = []
                    const toUpdate: any[] = []

                    variants.forEach(v => {
                        const vPayload = {
                            product_id: currentId,
                            color_name: v.color_name,
                            color_hex: v.color_hex,
                            size: v.size,
                            stock: v.stock,
                            variant_image: v.variant_image,
                            gallery: v.gallery,
                            override_usd_price: v.override_usd_price ?? null,
                            override_usd_penalty: v.override_usd_penalty ?? null,
                            override_compare_at_usd: v.override_compare_at_usd ?? null
                        }
                        if (v.id.startsWith('temp-')) toInsert.push(vPayload)
                        else toUpdate.push({ ...vPayload, id: v.id })
                    })

                    if (toInsert.length > 0) await supabase.from('product_variants').insert(toInsert)
                    if (toUpdate.length > 0) await supabase.from('product_variants').upsert(toUpdate)
                }
            }

// 🚀 MATA LA CACHÉ DE LA TIENDA PÚBLICA
            await revalidateStoreCache()

            setIsDirty(false)
            Swal.fire({ title: '¡Guardado con éxito!', icon: 'success', confirmButtonColor: '#000', customClass: { popup: 'rounded-(--radius-card)' } })
            router.push('/admin/inventory')
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
            Swal.fire('Error', errorMessage, 'error');
        } finally {
            setSaving(false)
        }
    }

    // 🚀 AQUI VAN LOS HOOKS DEL SMART HEADER (ANTES DEL IF)
    // 1. Estados del Smart Header
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    // 2. Motor de Scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 50) {
                setIsHeaderVisible(true);
            } else if (currentScrollY > lastScrollY.current) {
                setIsHeaderVisible(false); // Bajando: esconder
            } else {
                setIsHeaderVisible(true);  // Subiendo: mostrar
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-gray-400" size={32} /></div>




    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-32 font-sans text-gray-900 selection:bg-black selection:text-white overflow-x-clip w-full max-w-[100vw]">

            {/* HEADER */}
            <div className={`bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center gap-3 md:gap-6 min-w-0">
                    <button onClick={handleExit} className="p-2 shrink-0 hover:bg-gray-100 border border-gray-100 rounded-full transition-colors group" title="Volver">
                        <ArrowLeft className="text-gray-500 group-hover:text-black transition-colors w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="font-black text-lg md:text-2xl leading-none truncate">{productId ? 'Editar Producto' : 'Nuevo Producto'}</h1>
                        <div className="flex items-center gap-2 mt-1.5 md:mt-2 overflow-hidden">
                            <span className={`text-[9px] px-2 py-0.5 rounded-[var(--radius-badge)] font-bold uppercase whitespace-nowrap ${isEur ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {isEur ? 'EUR' : 'USD'} Base
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-5 shrink-0 pl-2">
                    <button onClick={handleExit} className="hidden md:block px-4 py-2 text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide">Cancelar</button>
                    <button onClick={handleSave} disabled={saving} className="bg-black text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full shadow-subtle font-bold text-xs md:text-sm hover:bg-gray-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 border border-black">
                        {saving ? <Loader2 className="animate-spin w-3.5 h-3.5 md:w-4 md:h-4" /> : <Save strokeWidth={2.5} className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        <span className="hidden sm:block">Guardar Producto</span>
                        <span className="sm:hidden">Guardar</span>
                    </button>
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL (LAYOUT VERTICAL F-PATTERN) */}
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">

                {isDirty && (
                    <div className="bg-yellow-50/80 border border-yellow-200/80 p-4 rounded-(--radius-card) flex items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-yellow-100 p-2 md:p-2.5 rounded-(--radius-btn) shrink-0 mt-0.5 sm:mt-0 border border-yellow-200">
                            <AlertTriangle className="text-yellow-600 w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-yellow-800 leading-tight">Cambios sin guardar</p>
                            <p className="text-xs font-medium text-yellow-700/80 mt-1">Presiona <span className="font-bold">Guardar</span> antes de salir para no perder tu progreso.</p>
                        </div>
                    </div>
                )}

                {/* CARD 1: INFORMACIÓN GENERAL */}
                <div className="bg-white p-6 md:p-8 rounded-(--radius-card) border border-transparent space-y-6">
                    <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3">1. Información Básica</h3>
                    <div className="space-y-5">
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Nombre del Producto</label>
                            <input value={formData.name} onChange={e => updateForm('name', e.target.value)} placeholder="Ej: Nike Air Force 1" className="w-full bg-[#f6f6f6] border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-bold text-[16px] md:text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="relative" ref={categoryDropdownRef}>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Categoría</label>
                                <input value={formData.category} onChange={e => { updateForm('category', e.target.value); setIsCategoryDropdownOpen(true) }} onFocus={() => setIsCategoryDropdownOpen(true)} placeholder="Ej: Zapatos, Relojes..." className="w-full bg-[#f6f6f6] border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-bold text-[16px] md:text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none" />
                                <AnimatePresence>
                                    {isCategoryDropdownOpen && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-(--radius-card) shadow-xl overflow-hidden max-h-60 flex flex-col">
                                            {existingCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).length > 0 && (
                                                <div className="p-1.5 overflow-y-auto no-scrollbar">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 block">Usadas anteriormente</span>
                                                    {existingCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).map(cat => (
                                                        <button key={cat} onClick={(e) => { e.preventDefault(); updateForm('category', cat); setIsCategoryDropdownOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-(--radius-btn) text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">{cat}</button>
                                                    ))}
                                                </div>
                                            )}
                                            {formData.category.trim() !== '' && !existingCategories.some(c => c.toLowerCase() === formData.category.trim().toLowerCase()) && (
                                                <div className="p-1.5 border-t border-gray-100 bg-gray-50 shrink-0">
                                                    <button onClick={(e) => { e.preventDefault(); setIsCategoryDropdownOpen(false) }} className="w-full text-left px-3 py-2.5 rounded-(--radius-btn) text-sm font-bold text-black flex items-center gap-2 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">
                                                        <div className="bg-black text-white p-0.5 rounded-md"><Plus size={14} strokeWidth={3} /></div> Añadir &quot;{formData.category}&quot;
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Estado en Tienda</label>
                                <select value={formData.status} onChange={e => updateForm('status', e.target.value)} className="w-full bg-[#f6f6f6] border-none focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-bold text-[16px] md:text-sm text-gray-900 transition-all outline-none cursor-pointer appearance-none">
                                    <option value="active">Activo (Visible)</option>
                                    <option value="draft">Borrador (Oculto)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Descripción</label>
                            <textarea value={formData.description} onChange={e => updateForm('description', e.target.value)} placeholder="Añade detalles, materiales, cuidados..." className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-medium text-[16px] md:text-sm text-gray-900 placeholder:text-gray-400 min-h-25 resize-none transition-all outline-none" />
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Etiqueta de Logística (Opcional)</label>
                            <p className="text-[11px] text-gray-500 mb-3 ml-1">Sobrescribe el mensaje de entrega solo para este producto. Déjalo en blanco para usar la configuración general de la tienda.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <input
                                        maxLength={20}
                                        value={formData.shipping_badge_title}
                                        onChange={e => updateForm('shipping_badge_title', e.target.value)}
                                        placeholder="Título (Ej: Entrega Inmediata)"
                                        className="w-full bg-[#f6f6f6] border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-bold text-[16px] md:text-sm text-gray-900 placeholder:text-gray-400 placeholder:font-medium transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <input
                                        maxLength={50}
                                        value={formData.shipping_badge_desc}
                                        onChange={e => updateForm('shipping_badge_desc', e.target.value)}
                                        placeholder="Descripción (Ej: Despacho hoy mismo)"
                                        className="w-full bg-[#f6f6f6] border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-bold text-[16px] md:text-sm text-gray-900 placeholder:text-gray-400 placeholder:font-medium transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: MEDIOS Y GALERÍA */}
                <div className="bg-white p-6 md:p-8 rounded-(--radius-card) border border-transparent  space-y-6 mb-auto">
                    <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3">2. Fotos del Producto</h3>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Foto Principal */}
                        <div className="w-full md:w-1/3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Foto Portada (Obligatoria)</label>
                            <input type="file" ref={mainImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'main')} />
                            <div onClick={() => mainImageInputRef.current?.click()} className={`aspect-square bg-[#f6f6f6] rounded-(--radius-card) border border-dashed ${uploading ? 'border-gray-300 animate-pulse' : 'border-gray-300 hover:border-black'} flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all`}>
                                {formData.image_url ? (
                                    <img src={formData.image_url} className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt="Producto Principal" />
                                ) : (
                                    <div className="text-center p-4 flex flex-col items-center">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 text-gray-400 border border-gray-200 group-hover:text-black group-hover:border-gray-300 transition-colors ">
                                            {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Galería Adicional */}
                        <div className="flex-1 w-full">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex justify-between ml-1">
                                <span>Fotos Extra (Galería)</span>
                                <span>{productGallery.length}/3</span>
                            </label>
                            <input type="file" multiple ref={productGalleryInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'productGallery')} />
                            <div className="flex gap-3 h-30 md:h-40 overflow-x-auto no-scrollbar snap-x pb-2">
                                <button onClick={() => productGalleryInputRef.current?.click()} disabled={productGallery.length >= 3 || uploading} className="w-30 md:w-40 h-full rounded-(--radius-card) border border-dashed border-gray-300 flex items-center justify-center hover:border-black hover:bg-white transition-all disabled:opacity-50 text-gray-400 hover:text-black shrink-0 bg-[#f6f6f6] flex-col gap-2">
                                    {uploading ? <Loader2 className="animate-spin" size={24} /> : <><ImagePlus size={24} /><span className="text-[10px] font-bold uppercase">Añadir</span></>}
                                </button>
                                {productGallery.map((img, idx) => (
                                    <div key={idx} className="relative w-30 md:w-40 h-full rounded-(--radius-card) border border-gray-100 overflow-hidden group bg-white shrink-0 shadow-sm">
                                        <img src={img} alt={`Galería ${idx + 1}`} className="w-full h-full object-cover" />
                                        <button onClick={() => removeImageFromGallery(idx)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity"><X size={20} /></button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] font-medium text-gray-500 mt-3 ml-1">Estas fotos se mostrarán como carrusel en la tienda web si el producto no tiene variantes con fotos propias.</p>
                        </div>
                    </div>
                </div>

                {/* CARD 3: ESTRATEGIA DE PRECIO BASE */}
                <div className="bg-white relative top-13 p-5 pb-14 rounded-(--radius-card) border border-transparentbg-white border-transparent space-y-0 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Precio Divisa (Base) *</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-black transition-colors">$</span>
                            <input type="number" min="0" value={formData.price} onChange={e => updateForm('price', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0.00" className="w-full bg-[#f6f6f6] border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) pl-8 pr-4 py-3.5 font-black text-[16px] md:text-xl text-gray-900 outline-none transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Precio Anterior (Tachado)</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-red-500 transition-colors">$</span>
                            <input type="number" min="0" value={formData.compareAt} onChange={e => updateForm('compareAt', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0.00" className="w-full bg-[#f6f6f6] border border-transparent focus:bg-white focus:border-red-500 focus:shadow-subtle rounded-(--radius-btn) pl-8 pr-4 py-3.5 font-bold text-[16px] md:text-lg text-red-600 outline-none transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Margen Conversión (Opcional)</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-black transition-colors">$</span>
                            <input type="number" min="0" value={formData.penalty} onChange={e => updateForm('penalty', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0.00" className="w-full bg-[#f6f6f6] border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-(--radius-btn) pl-8 pr-4 py-3.5 font-bold text-[16px] md:text-lg text-gray-900 outline-none transition-all" />
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0A] rounded-(--radius-card) p-6 text-center relative overflow-hidden mt-4 border border-[#222] shadow-xl">
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        <span className="bg-white/10 text-white/70 px-2.5 py-1 rounded-(--radius-badge) text-[9px] font-bold uppercase tracking-wider border border-white/10">
                            {rateLabel} Actual: {activeRate.toFixed(2)}
                        </span>
                        {math.discountPercent > 0 && (
                            <div className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transform -rotate-2 border border-gray-200 mt-1 shadow-subtle">
                                PAGA EN DIVISA -{math.discountPercent}%
                            </div>
                        )}
                        <div className="w-full border-t border-white/10 pt-4 mt-1">
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Precio Visible al Público</p>
                            <p className="font-black text-4xl text-white tracking-tight leading-none mb-1">Bs {math.refBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-white/40 font-medium">Equivale a ${math.listPrice.toFixed(2)} Divisa Full</p>
                        </div>
                    </div>
                </div>

                {/* CARD 4: INVENTARIO Y LOGÍSTICA */}
                <div className="bg-white p-6 md:p-8 rounded-(--radius-card) border border-transparent shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 border-b border-gray-100 pb-3">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Box size={20} /> 4. Inventario y Variantes</h3>
                        <div className="flex bg-gray-50 border border-gray-100 rounded-(--radius-btn) p-1 w-full sm:w-auto">
                            <button onClick={(e) => { e.preventDefault(); setHasVariants(false); setIsDirty(true); }} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-(--radius-badge) text-xs font-bold transition-all ${!hasVariants ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-500 hover:text-black border border-transparent'}`}>
                                Producto Único
                            </button>
                            <button onClick={(e) => { e.preventDefault(); setHasVariants(true); setIsDirty(true); }} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-(--radius-badge) text-xs font-bold transition-all ${hasVariants ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-500 hover:text-black border border-transparent'}`}>
                                Con Variantes
                            </button>
                        </div>
                    </div>

                    {!hasVariants ? (
                        <div className="bg-gray-50 rounded-(--radius-card) p-6 border border-transparent animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-sm">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Stock Disponible</label>
                            <input type="number" min="0" value={simpleStock} onChange={e => { setSimpleStock(e.target.value === '' ? '' : parseInt(e.target.value)); setIsDirty(true) }} className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-black text-xl text-gray-900 outline-none transition-all shadow-sm" />
                            <p className="text-xs font-medium text-gray-500 mt-3 ml-1">No se pedirán medidas ni colores al cliente.</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 w-full">
                            {/* CREADOR RÁPIDO DE VARIANTES (100% MOBILE RESPONSIVE) */}
                            <div className="bg-gray-50 rounded-(--radius-card) p-5 md:p-6 border border-transparent mb-8 w-full overflow-hidden box-border">
                                <input type="file" multiple ref={variantImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'variant')} />
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Atributo Primario</label>
                                                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                                                    <input type="checkbox" checked={useColor} onChange={(e) => setUseColor(e.target.checked)} className="accent-black" />
                                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">¿Lleva Color?</span>
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white p-2 rounded-(--radius-btn) border border-transparent focus-within:border-black focus-within:shadow-subtle transition-all shadow-sm h-14">
                                                {useColor && <input type="color" value={variantInput.colorHex} onChange={e => updateVariantInput('colorHex', e.target.value)} className="w-10 h-10 rounded-(--radius-badge) border-none cursor-pointer bg-transparent shrink-0" />}
                                                <input type="text" placeholder={useColor ? "Ej: Negro, Dorado..." : "Ej: Licencia Pro..."} value={variantInput.colorName} onChange={e => updateVariantInput('colorName', e.target.value)} className="flex-1 bg-transparent border-none text-[16px] md:text-sm font-bold outline-none text-gray-900 min-w-0 px-2" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Fotos Exclusivas</span>
                                                <span className="text-[9px] font-bold text-gray-400">{variantInput.images.length}/3</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => variantImageInputRef.current?.click()} disabled={variantInput.images.length >= 3 || uploading} className="w-14 h-14 rounded-(--radius-btn) border border-dashed border-gray-300 flex items-center justify-center hover:border-black hover:bg-white transition-all disabled:opacity-50 text-gray-400 hover:text-black shrink-0 bg-white shadow-sm">
                                                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={22} />}
                                                </button>
                                                {variantInput.images.map((img, idx) => (
                                                    <div key={idx} className="relative w-14 h-14 rounded-(--radius-btn) border border-gray-100 overflow-hidden group bg-white shrink-0 shadow-sm"><img src={img} alt={`Exclusiva ${idx + 1}`} className="w-full h-full object-cover" /><button onClick={() => removeImageFromVariantInput(idx)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity"><X size={16} /></button></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6 items-start">
                                        <div className="flex-2 w-full min-w-0">
                                            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Atributo Secundario (Talla)</label>
                                                <span className="text-[9px] font-medium text-gray-400 shrink-0">Separa con ( , )</span>
                                            </div>
                                            <div className="w-full bg-white border border-transparent focus-within:border-black focus-within:shadow-subtle rounded-(--radius-btn) px-3 py-2.5 min-h-14 flex flex-wrap items-center gap-2 transition-all shadow-sm">
                                                {sizeTags.map(tag => (<span key={tag} className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1 rounded-(--radius-badge) text-xs font-bold animate-in fade-in">{tag}<button onClick={() => removeSizeTag(tag)} className="hover:text-red-400 transition-colors"><X size={12} /></button></span>))}
                                                <div className="flex-1 min-w-20 flex items-center">
                                                    <input placeholder={sizeTags.length === 0 ? "Ej: S, 42, 50cm..." : ""} value={sizeInputValue} onChange={handleSizeInputChange} onKeyDown={handleSizeKeyDown} onBlur={handleSizeBlur} className="w-full min-w-0 bg-transparent outline-none text-[16px] md:text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium" />
                                                    {sizeInputValue.trim() !== '' && <button onClick={(e) => { e.preventDefault(); addSizeFromInput() }} className="shrink-0 p-1 bg-gray-100 text-black rounded-md hover:bg-gray-200 transition-colors"><Plus size={14} /></button>}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {COMMON_SIZES.map(size => (<button key={size} onClick={(e) => handleQuickPillClick(e, size)} className="px-2 py-1 text-[10px] font-bold bg-white border border-gray-200 text-gray-600 rounded-(--radius-badge) hover:border-black hover:text-black transition-colors active:scale-95 shadow-sm">+ {size}</button>))}
                                            </div>
                                        </div>
                                        <div className="flex-1 w-full min-w-0">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Stock x Variante</label>
                                            <input type="number" min="0" value={variantInput.defaultStock} onChange={e => updateVariantInput('defaultStock', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-(--radius-btn) px-4 py-3.5 font-black text-xl text-gray-900 outline-none text-center transition-all h-14 shadow-sm" />
                                        </div>
                                    </div>

                                    {/* 🚀 Precios en la Generación Masiva */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
                                        <div className="min-w-0">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Precio Propio (Opcional)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input type="number" placeholder="Hereda" value={variantInput.priceOverride} onChange={e => updateVariantInput('priceOverride', e.target.value)} className="w-full bg-white border border-gray-200 focus:border-black focus:shadow-subtle rounded-lg pl-7 pr-3 py-2.5 text-[16px] md:text-sm font-bold text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400" />
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <label className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-1.5 block">Tachado Propio (Opcional)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input type="number" placeholder="Hereda" value={variantInput.compareAtOverride} onChange={e => updateVariantInput('compareAtOverride', e.target.value)} className="w-full bg-white border border-red-200 focus:border-red-500 focus:shadow-subtle rounded-lg pl-7 pr-3 py-2.5 text-[16px] md:text-sm font-bold text-red-600 outline-none transition-all placeholder:font-normal placeholder:text-gray-400" />
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Margen Propio (Opcional)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input type="number" placeholder="Hereda" value={variantInput.penaltyOverride} onChange={e => updateVariantInput('penaltyOverride', e.target.value)} className="w-full bg-white border border-gray-200 focus:border-black focus:shadow-subtle rounded-lg pl-7 pr-3 py-2.5 text-[16px] md:text-sm font-bold text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={addVariantGroup} className="w-full bg-black text-white py-3.5 rounded-(--radius-btn) hover:bg-gray-800 active:scale-98 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-subtle border border-black">
                                        <Plus size={16} strokeWidth={3} /> Generar SKUs
                                    </button>
                                </div>
                            </div>

                            {/* LISTA DE VARIANTES (FULL EDITOR) */}
                            <div className="flex justify-between items-center mb-4 mt-8 px-2">
                                <h4 className="text-sm font-black text-gray-900">Matriz de SKUs</h4>
                                <span className="bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-(--radius-badge) text-[10px] font-bold text-gray-600">{variants.length} Creados</span>
                            </div>

                            {variants.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-gray-200 rounded-(--radius-card) bg-white/50">
                                    <Box size={32} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aún no hay variantes</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {variants.map((v, i) => (
                                        <div key={v.id || i} className="flex flex-col bg-white border border-gray-100 hover:border-black rounded-(--radius-btn) transition-colors animate-in fade-in slide-in-from-bottom-2 shadow-sm overflow-hidden">

                                            {/* Cabecera de la Fila */}
                                            <div className="flex items-center justify-between p-3 md:p-4 cursor-pointer select-none" onClick={() => setExpandedVariantId(expandedVariantId === v.id ? null : v.id)}>
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-(--radius-badge) border border-gray-100 overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center relative">
                                                        {v.variant_image ? <img src={v.variant_image} alt={`Variante ${v.color_name || i}`} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: v.color_hex === 'transparent' ? '#f3f4f6' : v.color_hex }}></div>}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            {v.color_hex && v.color_hex !== 'transparent' && v.color_hex !== '#transparent' && <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0 shadow-sm" style={{ backgroundColor: v.color_hex }}></div>}
                                                            <p className="font-bold text-sm text-gray-900 truncate">{v.color_name}</p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                            <span className="text-[10px] font-mono font-bold bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-(--radius-badge) leading-none">{v.size}</span>
                                                            {v.override_usd_price !== null && v.override_usd_price !== undefined && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5"><DollarSign size={10} /> ${v.override_usd_price}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 md:gap-4 shrink-0 pl-2">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Stock</p>
                                                        <p className="font-mono font-black text-sm text-gray-900 leading-none">{v.stock}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-gray-100 hidden md:block mx-1"></div>
                                                    <div className={`p-2 rounded-(--radius-badge) text-gray-500 transition-colors flex items-center gap-1 ${expandedVariantId === v.id ? 'bg-black text-white' : 'hover:bg-gray-100 hover:text-black'}`}>
                                                        <span className="text-[10px] font-bold hidden sm:inline">Editar</span>
                                                        {expandedVariantId === v.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); removeVariant(v.id) }} className="p-2 rounded-(--radius-badge) text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent transition-colors"><Trash2 size={18} /></button>
                                                </div>
                                            </div>

                                            {/* 🚀 El Full Editor (Desplegado) */}
                                            <AnimatePresence>
                                                {expandedVariantId === v.id && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100 bg-gray-50">
                                                        <div className="p-4 md:p-5 space-y-5">

                                                            {/* Fila 1: Imagen y Atributos Básicos */}
                                                            <div className="flex flex-col sm:flex-row gap-5">
                                                                <div className="shrink-0 flex flex-col gap-2">
                                                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Foto</label>
                                                                    <input type="file" id={`file-${v.id}`} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'variant', v.id)} />
                                                                    <button onClick={() => document.getElementById(`file-${v.id}`)?.click()} className="w-16 h-16 rounded-(--radius-badge) border border-gray-200 bg-white hover:border-black flex items-center justify-center overflow-hidden transition-all group shadow-sm">
                                                                        {v.variant_image ? (
                                                                            <img src={v.variant_image} alt={`Editar variante ${v.color_name || ''}`} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                                                        ) : (
                                                                            <ImagePlus size={20} className="text-gray-400 group-hover:text-black" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Talla/Medida</label>
                                                                        <input type="text" value={v.size} onChange={(e) => updateVariantOverride(v.id, 'size', e.target.value)} className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-[16px] md:text-sm font-bold text-gray-900 outline-none transition-all" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Stock</label>
                                                                        <input type="number" min="0" value={v.stock} onChange={(e) => updateVariantOverride(v.id, 'stock', e.target.value === '' ? 0 : parseInt(e.target.value))} className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-[16px] md:text-sm font-bold text-gray-900 outline-none transition-all" />
                                                                    </div>
                                                                    <div className="sm:col-span-2">
                                                                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                                                                            <span>Atributo Primario</span>
                                                                            <label className="flex items-center gap-1 cursor-pointer">
                                                                                <input type="checkbox" checked={v.color_hex !== 'transparent' && v.color_hex !== '#transparent'} onChange={(e) => updateVariantOverride(v.id, 'color_hex', e.target.checked ? '#000000' : 'transparent')} className="accent-black" />
                                                                                <span className="text-[9px] font-bold">Lleva Color</span>
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 bg-white border border-gray-200 focus-within:border-black rounded-lg p-1.5 transition-all">
                                                                            {v.color_hex !== 'transparent' && v.color_hex !== '#transparent' && <input type="color" value={v.color_hex} onChange={e => updateVariantOverride(v.id, 'color_hex', e.target.value)} className="w-8 h-8 rounded shrink-0 border-none cursor-pointer bg-transparent" />}
                                                                            <input type="text" value={v.color_name} onChange={e => updateVariantOverride(v.id, 'color_name', e.target.value)} className="flex-1 bg-transparent border-none text-[16px] md:text-sm font-bold outline-none text-gray-900 px-2" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Fila 2: Precios */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 block">Sobrescribir Precio $</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                                        <input type="number" placeholder="Hereda" value={v.override_usd_price ?? ''} onChange={(e) => updateVariantOverride(v.id, 'override_usd_price', e.target.value)} className="w-full bg-white border border-emerald-100 focus:border-emerald-500 rounded-lg pl-7 pr-3 py-2 text-[16px] md:text-sm font-bold text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-1.5 block">Sobrescribir Tachado $</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                                        <input type="number" placeholder="Hereda" value={v.override_compare_at_usd ?? ''} onChange={(e) => updateVariantOverride(v.id, 'override_compare_at_usd', e.target.value)} className="w-full bg-white border border-red-100 focus:border-red-500 rounded-lg pl-7 pr-3 py-2 text-[16px] md:text-sm font-bold text-red-600 outline-none transition-all placeholder:font-normal placeholder:text-gray-400" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 block">Sobrescribir Margen $</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                                        <input type="number" placeholder="Hereda" value={v.override_usd_penalty ?? ''} onChange={(e) => updateVariantOverride(v.id, 'override_usd_penalty', e.target.value)} className="w-full bg-white border border-emerald-100 focus:border-emerald-500 rounded-lg pl-7 pr-3 py-2 text-[16px] md:text-sm font-bold text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ZONA DE PELIGRO */}
            {productId && (
                <div className="max-w-4xl mx-auto px-4 md:px-8 mb-10">
                    <div className="border border-red-200 bg-red-50/30 rounded-(--radius-card) p-6 md:p-8 animate-in fade-in shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-lg font-black text-red-600 flex items-center gap-2"><AlertTriangle size={20} /> Zona de Peligro</h3>
                                <p className="text-sm font-medium text-red-900/70 mt-1 max-w-xl">Eliminar este producto lo removerá permanentemente de tu catálogo. Si ya tiene ventas, se ocultará como &quot;Borrador&quot; automáticamente.</p>
                            </div>
                            <button onClick={(e) => { e.preventDefault(); handleDeleteProduct(); }} disabled={saving} className="shrink-0 px-6 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold text-sm rounded-(--radius-btn) transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"><Trash2 size={18} /> Eliminar Producto</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}