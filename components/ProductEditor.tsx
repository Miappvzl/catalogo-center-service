'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { 
    ArrowLeft, 
    Upload, 
    Plus, 
    Save, 
    Loader2, 
    DollarSign, 
    Trash2, 
    X, 
    Box, 
    AlertTriangle, 
    ImageIcon, 
    ChevronDown, 
    ChevronUp, 
    ImagePlus, 
    Receipt, 
    Star, 
    FileText,
    Percent,
    Eye
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import MissionTour from '@/components/MissionTour'
import { getSupabase } from '@/lib/supabase-client'
import { revalidateStoreCache } from '@/app/admin/actions'
import { compressImage } from '@/utils/imageOptimizer'
import Swal from 'sweetalert2'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { NumberInput } from './NumberInput'
import ProductWholesaleConfig from '@/components/admin/ProductWholesaleConfig';

interface ProductEditorProps {
    productId?: string
    rates: { usd: number, eur: number }
    storeSettings?: { id: string, currency: string, fiscalProfile: string }
}

const COMMON_SIZES = ['S', 'M', 'L', 'XL', '38', '40', '42', 'Única']

export default function ProductEditor({ productId, rates, storeSettings }: ProductEditorProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = getSupabase()

    // --- LÓGICA DE MISIONES (SPOTLIGHT ENGINE) ---
    const mission = searchParams.get('mission')
    const isMission1 = mission === '1'
    const isMission2 = mission === '2'
    const isMission3 = mission === '3'
    const isMission4 = mission === '4'
    const [tourStep, setTourStep] = useState(1)

    const getSpotlightClass = (targetMission: string | number, step: number, type: 'input' | 'button' | 'container' = 'input') => {
        if (String(mission) !== String(targetMission) || tourStep !== step) return 'transition-all duration-300'
        
        const base = 'relative z-[60] ring-4 ring-neutral-900/10 shadow-lg transition-all duration-300 scale-[1.01] pointer-events-auto'
        if (type === 'button') return `${base} ring-white/20` 
        if (type === 'container') return `${base}`
        return `${base} bg-white rounded-xl` 
    }
    const mainImageInputRef = useRef<HTMLInputElement>(null)
    const productGalleryInputRef = useRef<HTMLInputElement>(null)
    const variantImageInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(!!productId)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
     // 🚀 NUEVO: Control de apertura del zoom de previsualización
    const [isPreviewZoomOpen, setIsPreviewZoomOpen] = useState(false)

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
        shipping_badge_title: '', 
        shipping_badge_desc: '',   
        is_tax_exempt: false, 
        is_featured: false, 
        display_order: 0 as number | '',
        wholesale_active: false,
        wholesale_min_qty: 6,
        wholesale_discount_pct: 0,
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

    // AUTO-PRELLENADO Y AUTO-SCROLL DE LA ACADEMIA PREZISO
    useEffect(() => {
        if (!productId) {
            if (isMission2) {
                setFormData(prev => ({ ...prev, name: 'Zapatos Nike Air Max (Prueba)', category: 'Calzado', price: 120, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600' }))
                setTimeout(() => document.getElementById('tour-step-2-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
            }
            if (isMission3) {
                setFormData(prev => ({ ...prev, name: 'Reloj Inteligente Pro', category: 'Electrónica', price: 45, image_url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=600' }))
                setTimeout(() => document.getElementById('tour-step-3-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
            }
            if (isMission4) {
                setFormData(prev => ({ ...prev, name: 'Perfume Importado Premium', category: 'Belleza', price: 50, image_url: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }))
                setTimeout(() => document.getElementById('tour-step-4-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
            }
        }
    }, [isMission2, isMission3, isMission4, productId])

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
                    Swal.fire({
                        title: 'Error',
                        text: 'El producto solicitado no existe.',
                        icon: 'error',
                        confirmButtonColor: '#171717',
                        customClass: { popup: 'rounded-xl font-sans text-xs' }
                    })
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
                    shipping_badge_title: product.shipping_badge_title || '', 
                    shipping_badge_desc: product.shipping_badge_desc || '',    
                    is_tax_exempt: product.is_tax_exempt || false, 
                    is_featured: product.is_featured || false, 
                    display_order: product.display_order || 0,  
                    wholesale_active: product.wholesale_active || false,
                    wholesale_min_qty: product.wholesale_min_qty || 6,
                    wholesale_discount_pct: product.wholesale_discount_pct || 0,
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
            text: 'Tienes cambios pendientes de registrar.',
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Descartar cambios',
            denyButtonText: 'Guardar cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            denyButtonColor: '#171717',
            customClass: { 
                popup: 'rounded-xl font-sans p-6 shadow-sm',
                confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2',
                denyButton: 'rounded-lg text-xs font-semibold px-4 py-2',
                cancelButton: 'rounded-lg text-xs font-semibold px-4 py-2'
            }
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
                if (!file.type.startsWith('image/')) throw new Error('Solo se permiten archivos de imagen')
                const compressedFile = await compressImage(file, 1080, 0.8)
                const fileName = `main-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
                const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
                if (error) throw error
                const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)
                updateForm('image_url', publicUrl)
            }
            else if (target === 'productGallery') {
                const currentSlots = 3 - productGallery.length
                if (currentSlots <= 0) return Swal.fire({ title: 'Límite alcanzado', text: 'Máximo 3 fotos para la galería principal', icon: 'warning', confirmButtonColor: '#171717' })
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
                    if (!file.type.startsWith('image/')) throw new Error('Solo se permiten archivos de imagen')
                    const compressedFile = await compressImage(file, 800, 0.7)
                    const fileName = `var-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
                    const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile)
                    if (error) throw error
                    const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

                    setVariants(prev => prev.map(v => {
                        if (v.id === variantId) {
                            return { ...v, variant_image: publicUrl, gallery: [publicUrl] }
                        }
                        return v
                    }))
                    setIsDirty(true)

                } else {
                    const currentSlots = 3 - variantInput.images.length
                    if (currentSlots <= 0) return Swal.fire({ title: 'Límite alcanzado', text: 'Máximo 3 fotos por variante de producto', icon: 'warning', confirmButtonColor: '#171717' })
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
            Swal.fire({ title: 'Error', text: errorMessage, icon: 'error', confirmButtonColor: '#171717' });
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

        if (!variantInput.colorName) return Swal.fire({ title: 'Faltan datos', text: 'Escriba un nombre para este color u opción', icon: 'warning', confirmButtonColor: '#171717' })
        if (sizeTags.length === 0 && sizeInputValue.trim() === '') return Swal.fire({ title: 'Atributo Secundario', text: 'Agregue al menos una medida (S, M, talla).', icon: 'warning', confirmButtonColor: '#171717' })

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

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-neutral-900 text-white rounded-lg text-xs font-semibold' } })
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
            title: '¿Eliminar producto?',
            text: 'Esta acción no se puede deshacer de forma directa.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#171717',
            confirmButtonText: 'Confirmar Eliminación',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-xl font-sans text-xs' }
        });

        if (!confirm.isConfirmed) return;
        setSaving(true);
        try {
            const { data: orderItems, error: orderError } = await supabase.from('order_items').select('id').eq('product_id', productId).limit(1);
            if (orderError) throw orderError;

            if (orderItems && orderItems.length > 0) {
                await Swal.fire({
                    title: 'Historial detectado',
                    text: 'Este artículo tiene órdenes registradas. Por seguridad, se cambiará a estado "Borrador" (Oculto) para no alterar sus estadísticas históricas.',
                    icon: 'info',
                    confirmButtonColor: '#171717',
                    customClass: { popup: 'rounded-xl font-sans text-xs' }
                });
                const { error: updateError } = await supabase.from('products').update({ status: 'draft' }).eq('id', productId);
                if (updateError) throw updateError;
                return router.push('/admin/inventory');
            }

            const { error: varError } = await supabase.from('product_variants').delete().eq('product_id', productId);
            if (varError) throw varError;
            const { error: prodError } = await supabase.from('products').delete().eq('id', productId);
            if (prodError) throw prodError;

            await revalidateStoreCache()

            setIsDirty(false);
            Swal.fire({ title: 'Eliminado', text: 'El producto se ha removido de su inventario.', icon: 'success', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } });
            router.push('/admin/inventory');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
            Swal.fire({ title: 'Error', text: errorMessage, icon: 'error', confirmButtonColor: '#171717' });
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (hasVariants && sizeInputValue.trim() !== '') addSizeFromInput()
        if (!formData.name) return Swal.fire({ title: 'Falta información', text: 'El producto debe tener un nombre descriptivo.', icon: 'warning', confirmButtonColor: '#171717' })
        if (Number(formData.price) <= 0) return Swal.fire({ title: 'Precio Inválido', text: 'El valor monetario del producto debe ser mayor a 0.', icon: 'warning', confirmButtonColor: '#171717' })

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Acceso no autorizado.")

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
                shipping_badge_title: formData.shipping_badge_title || null, 
                shipping_badge_desc: formData.shipping_badge_desc || null,
                is_tax_exempt: formData.is_tax_exempt, 
                is_featured: formData.is_featured, 
                wholesale_active: formData.wholesale_active,
                wholesale_min_qty: formData.wholesale_min_qty,
                wholesale_discount_pct: formData.wholesale_discount_pct
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

            if (isMission1 || isMission2 || isMission3 || isMission4) {
                const { data: st } = await supabase.from('stores').select('onboarding_missions').eq('id', storeSettings!.id).single()
                const currentMissions = st?.onboarding_missions || { mission_1: false, mission_2: false, mission_3: false, mission_4: false }
                
                const missionPayload = isMission1 ? { ...currentMissions, mission_1: true }
                              : isMission2 ? { ...currentMissions, mission_2: true }
                              : isMission3 ? { ...currentMissions, mission_3: true }
                              : { ...currentMissions, mission_4: true }

                await supabase.from('stores').update({ onboarding_missions: missionPayload }).eq('id', storeSettings!.id)
                
                Swal.fire({ 
                    title: '¡Academia Preziso Completada!', 
                    text: 'Felicidades. Ya dominas la catalogación avanzada de productos.', 
                    icon: 'success', 
                    confirmButtonColor: '#171717', 
                    customClass: { popup: 'rounded-xl font-sans text-xs' } 
                })
                router.push('/admin')
                return
            }

            await revalidateStoreCache()

            setIsDirty(false)
            Swal.fire({ title: '¡Guardado con éxito!', icon: 'success', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
            router.push('/admin/inventory')
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
            Swal.fire({ title: 'Error', text: errorMessage, icon: 'error', confirmButtonColor: '#171717' });
        } finally {
            setSaving(false)
        }
    }

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 50) {
                setIsHeaderVisible(true);
            } else if (currentScrollY > lastScrollY.current) {
                setIsHeaderVisible(false); 
            } else {
                setIsHeaderVisible(true);  
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

   if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFC] gap-3">
            <Loader2 className="animate-spin text-neutral-300" size={24} />
            <p className="text-xs font-semibold text-neutral-400">Cargando ficha de producto...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-32 font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white overflow-x-clip w-full max-w-[100vw] antialiased">

            {/* STICKY SMART HEADER */}
            <div className={` bg-[#FAFAFC]/95 backdrop-blur-md  z-30 px-4 md:px-8 py-4 flex justify-between items-center border-b border-neutral-200/50   sticky top-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'} ${((isMission1 && tourStep === 4) || (isMission2 && tourStep === 5) || (isMission3 && tourStep === 4) || (isMission4 && tourStep === 3)) ? 'z-[60] bg-white shadow-[0_15px_40px_rgba(0,0,0,0.08)] ring-4 ring-neutral-900/5 relative' : 'z-40 bg-[#FAFAFC]/95'}`}>
                <div className="flex items-center gap-3.5 min-w-0">
                    <button onClick={handleExit} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-all shrink-0 shadow-xs active:scale-[0.98]" title="Volver">
                        <ArrowLeft className="text-neutral-400 group-hover:text-neutral-900 transition-colors w-4 h-4 md:w-4.5 md:h-4.5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="font-bold text-sm md:text-base leading-none tracking-tight truncate">{productId ? 'Editar Producto' : 'Nuevo Producto'}</h1>
                        <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                            <span className={`flex items-center gap-1.5 text-[0.65rem] font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded ${isEur ? 'bg-blue-50/50 text-blue-700 ' : 'bg-emerald-50/50 text-emerald-700 border-emerald-200/40'}`}>
                                {isEur ? 'EUR' : 'USD'} Base
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                    <button onClick={handleExit} className="hidden md:block px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-900 transition-colors uppercase tracking-wider">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className={`bg-neutral-950 text-white px-4 md:px-5 py-2 rounded-lg shadow-xs font-semibold text-xs hover:bg-black active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-70 transition-all ${isMission1 ? getSpotlightClass('1', 4, 'button') : isMission2 ? getSpotlightClass('2', 5, 'button') : isMission3 ? getSpotlightClass('3', 4, 'button') : getSpotlightClass('4', 3, 'button')}`}
                    >
                        {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Save strokeWidth={2} className="w-3.5 h-3.5" />}
                        <span className="hidden sm:block">Guardar Producto</span>
                        <span className="sm:hidden">Guardar</span>
                    </button>
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL - ESCALADO A MAX-W-5XL (CLOSER TO SCREEN) */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">

                {isDirty && (
                    <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-xl flex items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-white border border-amber-100/40 p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                            <AlertTriangle className="text-amber-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-amber-800 leading-tight">Modificaciones sin confirmar</p>
                            <p className="text-[11px] text-amber-700/80">Recuerde presionar el botón <span className="font-semibold text-amber-900">Guardar Producto</span> en la cabecera antes de salir.</p>
                        </div>
                    </div>
                )}

              {/* CARD 1: INFORMACIÓN GENERAL */}
<div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-5">
    <div>
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-200/50 flex items-center gap-2">
            <FileText size={16} className="text-neutral-400" />
            <span>1. Información Básica</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1">Configure los campos principales y la visibilidad de su artículo en catálogo.</p>
    </div>
                    
                    <div className="space-y-4">
                        <div className={getSpotlightClass('1', 1)}>
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Nombre del Producto</label>
                            <input 
                                value={formData.name} 
                                onChange={e => updateForm('name', e.target.value)} 
                                placeholder="Ej: Zapatillas Deportivas Run Pro" 
                                className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300" 
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative" ref={categoryDropdownRef}>
                                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Categoría de Colección</label>
                                <input 
                                    value={formData.category} 
                                    onChange={e => { updateForm('category', e.target.value); setIsCategoryDropdownOpen(true) }} 
                                    onFocus={() => setIsCategoryDropdownOpen(true)} 
                                    placeholder="Ej: Calzado, Accesorios..." 
                                    className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300" 
                                />
                                
                                <AnimatePresence>
                                    {isCategoryDropdownOpen && (
                                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-50 w-full mt-2 bg-white border border-neutral-200/50 rounded-lg shadow-sm overflow-hidden max-h-60 flex flex-col">
                                            {existingCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).length > 0 && (
                                                <div className="p-1.5 overflow-y-auto no-scrollbar">
                                                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2.5 py-1.5 block">Existentes</span>
                                                    {existingCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).map(cat => (
                                                        <button 
                                                            key={cat} 
                                                            onClick={(e) => { e.preventDefault(); updateForm('category', cat); setIsCategoryDropdownOpen(false); }} 
                                                            className="w-full text-left px-2.5 py-2 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {formData.category.trim() !== '' && !existingCategories.some(c => c.toLowerCase() === formData.category.trim().toLowerCase()) && (
                                                <div className="p-1.5 border-t border-neutral-100 bg-neutral-50/50 shrink-0">
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); setIsCategoryDropdownOpen(false) }} 
                                                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-neutral-900 flex items-center gap-1.5 hover:bg-white hover:shadow-xs border border-neutral-200/50 transition-all"
                                                    >
                                                        <Plus size={12} strokeWidth={2.5} className="text-neutral-500" /> 
                                                        <span>Crear nueva categoría: &quot;{formData.category}&quot;</span>
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Estado de Publicación</label>
                                <div className="relative">
                                    <select 
                                        value={formData.status} 
                                        onChange={e => updateForm('status', e.target.value)} 
                                        className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="active">Activo (Visible en tienda)</option>
                                        <option value="draft">Borrador (Oculto)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Descripción Detallada</label>
                            <textarea 
                                value={formData.description} 
                                onChange={e => updateForm('description', e.target.value)} 
                                placeholder="Escriba especificaciones del producto, dimensiones, materiales, o información clave para el comprador..." 
                                className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300 min-h-24 resize-none" 
                            />
                        </div>
                        
                       {/* Etiqueta Logística con Vista Previa Visual */}
        <div className="pt-4 border-t border-neutral-200/50">
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Sobrescribir Mensaje de Entrega (Opcional)</label>
            <p className="text-xs text-neutral-400 mb-4">Fije un mensaje logístico específico solo para este producto. Déjelo vacío para heredar las reglas de despacho generales de la tienda.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                
                {/* Inputs de entrada (Toman 2 columnas en pantallas grandes) */}
                <div className="lg:col-span-2 space-y-4 flex flex-col justify-center">
                    <div>
                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Título breve</label>
                        <input
                            maxLength={20}
                            value={formData.shipping_badge_title}
                            onChange={e => updateForm('shipping_badge_title', e.target.value)}
                            placeholder="Ej: Sobre Pedido"
                            className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300 font-medium"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Descripción extendida</label>
                        <input
                            maxLength={50}
                            value={formData.shipping_badge_desc}
                            onChange={e => updateForm('shipping_badge_desc', e.target.value)}
                            placeholder="Ej: Tiempo de entrega: de 2 a 7 días hábiles"
                            className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300 font-medium"
                        />
                    </div>
                </div>

               {/* Previsualización en Tienda Física (Toma 1 columna) - CLICABLE */}
                <div 
                    onClick={() => setIsPreviewZoomOpen(true)}
                    className="bg-neutral-50/40 border border-neutral-200/50 rounded-lg p-3.5 flex flex-col justify-between items-center text-center cursor-zoom-in group hover:bg-neutral-50 hover:border-neutral-300 transition-colors shadow-xs"
                >
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5 block">Ejemplo en Catálogo</span>
                    
                    {/* Contenedor de la imagen */}
                    <div className="relative w-full aspect-[4/4] rounded bg-white border border-neutral-200/50 overflow-hidden flex items-center justify-center">
                        <Image 
                            src="/shipping-badge-preview.webp" 
                            alt="Vista previa del mensaje de envío en la app"
                            fill
                            sizes="(max-width: 1024px) 100vw, 250px"
                            className="object-contain p-0 group-hover:scale-106 transition-transform duration-300"
                            priority
                        />
                        {/* Micro-overlay de hover para indicar que se puede ampliar */}
                        <div className="absolute inset-0 bg-neutral-950/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white/95 text-neutral-800 text-[10px] font-semibold px-2.5 py-1 rounded shadow-sm border border-neutral-200/50 inline-flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                                <Eye size={11} /> 
                                <span>Ampliar vista</span>
                            </span>
                        </div>
                    </div>
                    
                    <span className="text-[9px] text-neutral-400 mt-2 font-medium">Así lo visualizará su cliente debajo de la descripción.</span>
                </div>

            </div>
        </div>
                    </div>
                </div>

                {/* CARD 1.5: MERCHANDISING Y ESCAPARATE */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-100 flex items-center gap-1.5">
                            <Star size={16} className="fill-amber-500 text-amber-500" /> Exhibición Destacada
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">Configure si desea que este artículo gane mayor relevancia dentro de su catálogo virtual.</p>
                    </div>
                    
                    <div id="tour-step-3-3" className={`p-1.5 -m-1.5 rounded-xl ${getSpotlightClass('3', 3, 'container')}`}>
                        <div
                            className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${formData.is_featured ? 'bg-neutral-950 border-transparent text-white' : 'bg-neutral-50/50 border-neutral-200/50 hover:bg-neutral-50 text-neutral-800'}`}
                            onClick={() => updateForm('is_featured', !formData.is_featured)}
                        >
                            <div className="pr-4 mb-3 sm:mb-0 space-y-0.5">
                                <p className="font-bold text-xs flex items-center gap-1.5">
                                    <Star size={14} className={formData.is_featured ? 'fill-amber-500 text-amber-500' : 'text-neutral-400'} />
                                    Fijar en Carrusel de Destacados
                                </p>
                                <p className={`text-xs ${formData.is_featured ? 'text-neutral-400' : 'text-neutral-400'}`}>
                                    El producto se anclará en la sección principal de su tienda para maximizar su conversión de venta.
                                </p>
                            </div>
                            <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 ${formData.is_featured ? 'bg-white border-white justify-end' : 'bg-neutral-100 border-neutral-200 justify-start'}`}>
                                <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 30 }} className={`w-4 h-4 rounded-full ${formData.is_featured ? 'bg-neutral-950' : 'bg-neutral-300'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: MEDIOS Y GALERÍA */}
<div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-5">
    <div>
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-100 flex items-center gap-2">
            <ImageIcon size={16} className="text-neutral-400" />
            <span>2. Galería de Imágenes</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1">Gestione el material gráfico promocional de su producto.</p>
    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        
                        {/* Foto Principal */}
                        <div id="tour-step-2" className={`w-full md:w-1/3 p-1.5 ${getSpotlightClass('1', 2, 'container')}`}>
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Imagen Principal (Portada)</label>
                            <input type="file" ref={mainImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'main')} />
                            
                            <div 
                                onClick={() => mainImageInputRef.current?.click()} 
                                className={`aspect-square bg-neutral-50/50 rounded-lg border border-dashed border-neutral-200/50 ${uploading ? 'animate-pulse bg-neutral-50' : 'hover:border-neutral-400'} flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-colors shadow-xs`}
                            >
                                {formData.image_url ? (
                                    <Image
                                        src={getOptimizedUrl(formData.image_url)}
                                        alt="Portada del producto"
                                        fill
                                        sizes="300px"
                                        className="object-contain p-2 mix-blend-multiply group-hover:scale-102 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="text-center p-4 flex flex-col items-center">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2.5 text-neutral-400 border border-neutral-200/50 transition-colors">
                                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                                        </div>
                                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Subir Portada</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Galería Adicional */}
                        <div className="flex-1 w-full space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                <span>Tomas de apoyo (Carrusel)</span>
                                <span>{productGallery.length}/3</span>
                            </div>
                            
                            <input type="file" multiple ref={productGalleryInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'productGallery')} />
                            
                            <div className="flex gap-3 h-28 md:h-32 overflow-x-auto no-scrollbar snap-x pb-2">
                                <button 
                                    onClick={() => productGalleryInputRef.current?.click()} 
                                    disabled={productGallery.length >= 3 || uploading} 
                                    className="w-28 md:w-32 h-full rounded-lg border border-dashed border-neutral-200/50 flex flex-col gap-2 items-center justify-center hover:border-neutral-400 hover:bg-white transition-all disabled:opacity-50 text-neutral-400 hover:text-neutral-900 shrink-0 bg-neutral-50/50 shadow-xs"
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <><ImagePlus size={18} /><span className="text-[10px] font-bold uppercase tracking-wider">Añadir</span></>}
                                </button>
                                
                                {productGallery.map((img, idx) => (
                                    <div key={idx} className="relative w-28 md:w-32 h-full rounded-lg border border-neutral-200/50 overflow-hidden group bg-white shrink-0 shadow-xs">
                                        <Image
                                            src={getOptimizedUrl(img)}
                                            alt={`Galería ${idx + 1}`}
                                            fill
                                            sizes="160px"
                                            className="object-cover"
                                        />
                                        <button onClick={() => removeImageFromGallery(idx)} className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-neutral-400 leading-relaxed">Estas imágenes se desplegarán como un carrusel secundario en su catálogo, a menos que el cliente filtre variantes con fotos específicas asociadas.</p>
                        </div>
                    </div>
                </div>

             {/* CARD 3: ESTRATEGIA DE PRECIO E IMPUESTOS */}
<div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
    <div>
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-100 flex items-center gap-2">
            <DollarSign size={16} className="text-neutral-400" />
            <span>3. Configuración de Precios</span>
        </h3>
        <p className="text-xs text-neutral-400 mt-1">Establezca los valores comerciales y los impuestos aplicables al producto.</p>
    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div id="tour-step-3" className={`p-2.5 -m-2.5 ${getSpotlightClass('1', 3)}`}>
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-[0.125rem] block">Precio Divisa (Base) *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                <NumberInput min="0" value={formData.price} onChangeValue={(val) => updateForm('price', val)} placeholder="0.00" className="w-full bg-neutral-50/50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg pl-7 pr-3 py-2.5 text-xs font-bold text-neutral-900 outline-none transition-all font-mono text-center" />
                            </div>
                        </div>
                        
                        <div id="tour-step-3-1" className={`p-2.5 -m-2.5 rounded-xl ${getSpotlightClass('3', 1, 'container')}`}>
                            <label className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-[0.125rem] block">Precio Anterior (Tachado)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xs font-mono">$</span>
                                <NumberInput min="0" value={formData.compareAt} onChangeValue={(val) => updateForm('compareAt', val)} placeholder="0.00" className="w-full placeholder:text-red-500 text-rose-600 bg-neutral-50/50 border border-rose-400 focus:bg-white focus:border-rose-400 rounded-lg pl-7 pr-3 py-2.5 text-xs font-bold text-rose-500 outline-none transition-all font-mono text-center" />
                            </div>
                        </div>
                        
                        <div id="tour-step-4-1" className={`p-2.5 -m-2.5 rounded-xl ${getSpotlightClass('4', 1, 'container')}`}>
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-[0.125rem] block">Margen Conversión (Opcional)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                <NumberInput min="0" value={formData.penalty} onChangeValue={(val) => updateForm('penalty', val)} placeholder="0.00" className="w-full bg-neutral-50/50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg pl-7 pr-3 py-2.5 text-xs font-bold text-neutral-900 outline-none transition-all font-mono text-center" />
                            </div>
                        </div>
                    </div>

                    {/* EXENCIÓN FISCAL */}
                    {storeSettings?.fiscalProfile !== 'informal' && (
                        <div
                            className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${formData.is_tax_exempt ? 'bg-emerald-50 border-emerald-100/40 text-emerald-800' : 'bg-neutral-50/50 border-neutral-200/50 hover:bg-neutral-50 text-neutral-800'}`}
                            onClick={() => updateForm('is_tax_exempt', !formData.is_tax_exempt)}
                        >
                            <div className="pr-4 mb-3 sm:mb-0 space-y-0.5">
                                <p className="font-bold text-xs flex items-center gap-1.5">
                                    <Receipt size={14} className={formData.is_tax_exempt ? 'text-emerald-600' : 'text-neutral-400'} />
                                    Producto Exento de IVA (Alícuota 0%)
                                </p>
                                <p className={`text-xs ${formData.is_tax_exempt ? 'text-emerald-700/80' : 'text-neutral-400'}`}>
                                    Marcar si este rubro califica como exento o exonerado de impuestos según la normativa del SENIAT.
                                </p>
                            </div>
                            <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 ${formData.is_tax_exempt ? 'bg-emerald-500 border-white justify-end' : 'bg-neutral-100 border-neutral-200 justify-start'}`}>
                                <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 30 }} className={`w-4 h-4 rounded-full ${formData.is_tax_exempt ? 'bg-white' : 'bg-neutral-300'}`} />
                            </div>
                        </div>
                    )}
                </div>

                {/* TARJETA NEGRA DE PULSO CAMBIARIO */}
                <div id="tour-step-4-2" className={`p-2.5 -m-2.5 rounded-xl ${getSpotlightClass('4', 2, 'container')}`}>
                    <div className="bg-neutral-950 text-white rounded-xl p-6 text-center relative overflow-hidden border border-neutral-200/50 shadow-xs">
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <span className="bg-white/10 text-white/70 px-2.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider border border-white/10">
                                {rateLabel}: {activeRate.toFixed(2)} Bs.
                            </span>
                            {math.discountPercent > 0 && (
                                <div className="bg-white text-neutral-950 px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider shadow-xs">
                                    Incentivo Divisa: -{math.discountPercent}%
                                </div>
                            )}
                            <div className="w-full border-t border-white/10 pt-4 mt-1 space-y-1">
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Referencia de cara al público</p>
                                <p className="font-bold text-3xl text-white tracking-tight leading-none font-mono">
                                    Bs {math.refBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-[10px] text-white/40">Equivalente a un total de ${math.listPrice.toFixed(2)} USD</p>
                            </div>
                        </div>
                    </div>
                </div>

               <div id="tour-step-3-2" className={`p-2.5 -m-2.5 rounded-xl mb-2 mt-2 ${getSpotlightClass('3', 2, 'container')}`}>
    <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
        <div className="flex items-center gap-2 text-neutral-900 pb-3 border-b border-neutral-100">
            <Percent size={16} className="text-neutral-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Regla Mayorista Individual</h3>
        </div>
        <ProductWholesaleConfig 
            initialActive={formData.wholesale_active}
            initialMinQty={formData.wholesale_min_qty}
            initialDiscountPct={formData.wholesale_discount_pct}
            onChange={(wholesaleData) => {
                setFormData(prev => ({ 
                    ...prev, 
                    wholesale_active: wholesaleData.wholesale_active,
                    wholesale_min_qty: wholesaleData.wholesale_min_qty,
                    wholesale_discount_pct: wholesaleData.wholesale_discount_pct
                }));
                setIsDirty(true); 
            }}
        />
    </div>
</div>

                {/* CARD 4: INVENTARIO Y VARIANTES */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-neutral-100 pb-3">
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Box size={16} className="text-neutral-500" /> 
                            <span>4. Inventario y Variantes</span>
                        </h3>
                        
                        <div id="tour-step-2-1" className={`flex bg-neutral-100/60 border border-neutral-200/50 rounded-lg p-0.5 w-full sm:w-auto ${getSpotlightClass('2', 1, 'container')}`}>
                            <button onClick={(e) => { e.preventDefault(); setHasVariants(false); setIsDirty(true); }} className={`flex-1 sm:flex-none px-4 py-1 rounded-md text-xs font-bold transition-all ${!hasVariants ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/10' : 'text-neutral-400 hover:text-neutral-900 border border-transparent'}`}>
                                Producto Único
                            </button>
                            <button onClick={(e) => { e.preventDefault(); setHasVariants(true); setIsDirty(true); }} className={`flex-1 sm:flex-none px-4 py-1 rounded-md text-xs font-bold transition-all ${hasVariants ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/10' : 'text-neutral-400 hover:text-neutral-900 border border-transparent'}`}>
                                Con Variantes
                            </button>
                        </div>
                    </div>

                    {!hasVariants ? (
                        <div className="bg-neutral-50/50 rounded-lg p-5 border border-neutral-200/50 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-sm space-y-2">
                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Stock Disponible</label>
                            <NumberInput min="0" value={simpleStock} onChangeValue={(val) => { setSimpleStock(val); setIsDirty(true) }} className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-lg px-3 py-2 text-sm font-bold text-neutral-900 outline-none transition-all shadow-xs font-mono text-center" />
                            <p className="text-xs text-neutral-400">El cliente agregará el artículo al carrito sin selección de atributos secundarios de talla o color.</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 w-full space-y-6">
                            
                            {/* CREADOR RÁPIDO DE VARIANTES */}
                            <div className="bg-neutral-50/50 rounded-lg p-5 border border-neutral-200/50 space-y-5 w-full">
                                <input type="file" multiple ref={variantImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'variant')} />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div id="tour-step-2-2" className={`p-2.5 -m-2.5 rounded-xl ${getSpotlightClass('2', 2, 'container')}`}>
                                        <div className="flex justify-between items-center gap-2 mb-2">
                                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Atributo Primario (Nombre)</label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" checked={useColor} onChange={(e) => setUseColor(e.target.checked)} className="accent-neutral-900 cursor-pointer" />
                                                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">¿Lleva Color?</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-neutral-200/50 focus-within:border-neutral-400 transition-colors shadow-xs h-12">
                                            {useColor && <input type="color" value={variantInput.colorHex} onChange={e => updateVariantInput('colorHex', e.target.value)} className="w-8 h-8 rounded border-none cursor-pointer bg-transparent shrink-0" />}
                                            <input type="text" placeholder={useColor ? "Ej: Negro, Dorado, Azul..." : "Ej: Licencia Estándar..."} value={variantInput.colorName} onChange={e => updateVariantInput('colorName', e.target.value)} className="flex-1 bg-transparent border-none text-xs font-semibold outline-none text-neutral-900 px-2" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center gap-2 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                            <span>Fotos de la variante</span>
                                            <span>{variantInput.images.length}/3</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => variantImageInputRef.current?.click()} disabled={variantInput.images.length >= 3 || uploading} className="w-12 h-12 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center hover:border-neutral-400 hover:bg-white transition-all disabled:opacity-50 text-neutral-400 hover:text-neutral-900 shrink-0 bg-white shadow-xs">
                                                {uploading ? <Loader2 className="animate-spin text-neutral-300" size={16} /> : <Plus size={18} />}
                                            </button>
                                            {variantInput.images.map((img, idx) => (
                                                <div key={idx} className="relative w-12 h-12 rounded-lg border border-neutral-200/50 overflow-hidden group bg-white shrink-0 shadow-xs">
                                                    <Image
                                                        src={getOptimizedUrl(img)}
                                                        alt={`Exclusiva ${idx + 1}`}
                                                        fill
                                                        sizes="48px"
                                                        className="object-cover"
                                                    />
                                                    <button onClick={() => removeImageFromVariantInput(idx)} className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div id="tour-step-2-3" className={`p-2.5 -m-2.5 rounded-xl ${getSpotlightClass('2', 3, 'container')}`}>
                                        <div className="flex justify-between items-center gap-2 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                            <label className="block">Atributo Secundario (Medida/Talla)</label>
                                            <span className="font-normal font-mono">Separar por comas ( , )</span>
                                        </div>
                                        <div className="w-full bg-white border border-neutral-200/50 focus-within:border-neutral-400 rounded-lg p-2 min-h-12 flex flex-wrap items-center gap-1.5 transition-colors shadow-xs">
                                            {sizeTags.map(tag => (
                                                <span key={tag} className="flex items-center gap-1 bg-neutral-900 text-white px-2 py-0.5 rounded text-[10px] font-bold animate-in fade-in">
                                                    {tag}
                                                    <button onClick={() => removeSizeTag(tag)} className="hover:text-rose-400 transition-colors"><X size={10} /></button>
                                                </span>
                                            ))}
                                            <div className="flex-1 min-w-[100px] flex items-center">
                                                <input placeholder={sizeTags.length === 0 ? "Ej: S, M, L..." : ""} value={sizeInputValue} onChange={handleSizeInputChange} onKeyDown={handleSizeKeyDown} onBlur={handleSizeBlur} className="w-full bg-transparent outline-none text-xs font-semibold text-neutral-900 placeholder:text-neutral-300" />
                                                {sizeInputValue.trim() !== '' && (
                                                    <button onClick={(e) => { e.preventDefault(); addSizeFromInput() }} className="shrink-0 p-1 bg-neutral-50 text-neutral-700 rounded hover:bg-neutral-100 transition-colors">
                                                        <Plus size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                                            {COMMON_SIZES.map(size => (
                                                <button key={size} onClick={(e) => handleQuickPillClick(e, size)} className="px-2 py-0.5 text-[9px] font-bold bg-white border border-neutral-200/50 text-neutral-500 rounded hover:border-neutral-400 hover:text-neutral-900 transition-colors shadow-xs">
                                                    + {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="w-full">
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Stock por cada opción</label>
                                        <NumberInput min="0" value={variantInput.defaultStock} onChangeValue={(val) => updateVariantInput('defaultStock', val)} className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-lg px-3 py-2 text-sm font-bold text-neutral-900 outline-none text-center transition-colors h-12 shadow-xs font-mono" />
                                    </div>
                                </div>

                                {/* PRECIOS EN LA GENERACIÓN MASIVA */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-200/50">
                                    <div>
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Precio de variante (Opcional)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                            <NumberInput min="0" placeholder="Hereda base" value={variantInput.priceOverride} onChangeValue={(val) => updateVariantInput('priceOverride', val)} className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 font-mono" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block text-rose-700">Tachado propio (Opcional)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                            <NumberInput min="0" placeholder="Hereda base" value={variantInput.compareAtOverride} onChangeValue={(val) => updateVariantInput('compareAtOverride', val)} className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold text-rose-700 outline-none transition-colors placeholder:text-neutral-300 font-mono" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Margen propio (Opcional)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                            <NumberInput min="0" placeholder="Hereda base" value={variantInput.penaltyOverride} onChangeValue={(val) => updateVariantInput('penaltyOverride', val)} className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 font-mono" />
                                        </div>
                                    </div>
                                </div>

                                <button id="tour-step-2-4" onClick={addVariantGroup} className={`w-full bg-neutral-950 text-white py-2.5 rounded-lg hover:bg-black active:scale-[0.98] transition-all font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs border border-transparent ${getSpotlightClass('2', 4, 'button')}`}>
                                    <Plus size={14} /> 
                                    <span>Generar Matriz de Variantes</span>
                                </button>
                            </div>

                            {/* LISTADO DE VARIANTES CREADAS */}
                            <div className="flex justify-between items-center mb-3.5 mt-6 px-1">
                                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Matriz de SKUs</h4>
                                <span className="bg-neutral-100 border border-neutral-200/50 px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-500 font-mono">{variants.length} Creadas</span>
                            </div>

                            {variants.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-neutral-200/50 rounded-lg bg-neutral-50/20 flex flex-col items-center justify-center space-y-2">
                                    <Box size={24} className="text-neutral-300" />
                                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Sin variaciones activas</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {variants.map((v, i) => (
                                        <div key={v.id || i} className="flex flex-col bg-white border border-neutral-200/50 hover:border-neutral-400 rounded-lg transition-colors animate-in fade-in shadow-xs overflow-hidden">
                                            
                                            {/* Cabecera SKU */}
                                            <div className="flex items-center justify-between p-3.5 cursor-pointer select-none" onClick={() => setExpandedVariantId(expandedVariantId === v.id ? null : v.id)}>
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="w-10 h-10 rounded bg-neutral-50 border border-neutral-200/50 overflow-hidden shrink-0 flex items-center justify-center relative">
                                                        {v.variant_image ? (
                                                            <Image
                                                                src={getOptimizedUrl(v.variant_image)}
                                                                alt=""
                                                                fill
                                                                sizes="40px"
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full" style={{ backgroundColor: v.color_hex === 'transparent' ? '#f5f5f7' : v.color_hex }} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 space-y-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            {v.color_hex && v.color_hex !== 'transparent' && v.color_hex !== '#transparent' && <div className="w-2 h-2 rounded-full border border-neutral-200 shrink-0" style={{ backgroundColor: v.color_hex }}></div>}
                                                            <p className="font-semibold text-xs text-neutral-900 truncate">{v.color_name}</p>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[10px] font-mono font-bold bg-neutral-50 border border-neutral-200/50 text-neutral-500 px-1.5 py-0.5 rounded leading-none">{v.size}</span>
                                                            {v.override_usd_price !== null && v.override_usd_price !== undefined && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100/40 rounded flex items-center gap-0.5 font-mono"><DollarSign size={10} /> {v.override_usd_price}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Cantidad</p>
                                                        <p className="font-mono font-bold text-xs text-neutral-900 leading-none mt-0.5">{v.stock}</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-neutral-200 hidden sm:block" />
                                                    <div className={`p-1.5 rounded text-neutral-500 transition-colors flex items-center gap-1 ${expandedVariantId === v.id ? 'bg-neutral-150' : 'hover:bg-neutral-50'}`}>
                                                        <span className="text-[10px] font-semibold hidden sm:inline">Editar</span>
                                                        {expandedVariantId === v.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); removeVariant(v.id) }} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={15} /></button>
                                                </div>
                                            </div>

                                            {/* Desplegable de Edición Fina de la Variante */}
                                            <AnimatePresence>
                                                {expandedVariantId === v.id && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-neutral-200/50 bg-neutral-50/50">
                                                        <div className="p-4 space-y-4">
                                                            
                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                {/* Foto Variante */}
                                                                <div className="shrink-0 flex flex-col gap-1.5 group relative">
                                                                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Foto</label>
                                                                    <input type="file" id={`file-${v.id}`} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'variant', v.id)} />

                                                                    {v.variant_image ? (
                                                                        <div className="relative w-14 h-14 rounded border border-neutral-200/50 overflow-hidden bg-white shrink-0 flex items-center justify-center">
                                                                            <Image
                                                                                src={getOptimizedUrl(v.variant_image)}
                                                                                alt=""
                                                                                fill
                                                                                sizes="56px"
                                                                                className="object-cover"
                                                                            />
                                                                            <button
                                                                                onClick={() => document.getElementById(`file-${v.id}`)?.click()}
                                                                                className="absolute inset-0 bg-neutral-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                                                                                title="Cambiar Foto"
                                                                            >
                                                                                {uploading ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={16} />}
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => document.getElementById(`file-${v.id}`)?.click()}
                                                                            className="w-14 h-14 rounded border border-dashed border-neutral-300 bg-white hover:border-neutral-400 flex items-center justify-center overflow-hidden transition-all text-neutral-400 hover:text-neutral-900"
                                                                            title="Añadir Foto"
                                                                        >
                                                                            {uploading ? <Loader2 className="animate-spin" size={14} /> : <ImagePlus size={16} />}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Atributos específicos del SKU */}
                                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">Talla / Identificador</label>
                                                                        <input type="text" value={v.size} onChange={(e) => updateVariantOverride(v.id, 'size', e.target.value)} className="w-full bg-white border border-neutral-200/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-900 outline-none transition-colors" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">Stock</label>
                                                                        <NumberInput min="0" value={v.stock} onChangeValue={(val) => updateVariantOverride(v.id, 'stock', val)} className="w-full bg-white border border-neutral-200/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-neutral-900 outline-none transition-colors" />
                                                                    </div>
                                                                    <div className="sm:col-span-2">
                                                                        <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                                                                            <span>Atributo de opción</span>
                                                                            <label className="flex items-center gap-1 cursor-pointer">
                                                                                <input type="checkbox" checked={v.color_hex !== 'transparent' && v.color_hex !== '#transparent'} onChange={(e) => updateVariantOverride(v.id, 'color_hex', e.target.checked ? '#000000' : 'transparent')} className="accent-neutral-900" />
                                                                                <span className="text-[9px] font-semibold text-neutral-400">Lleva Color</span>
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 bg-white border border-neutral-200/50 rounded-lg p-1 transition-colors">
                                                                            {v.color_hex !== 'transparent' && v.color_hex !== '#transparent' && <input type="color" value={v.color_hex} onChange={e => updateVariantOverride(v.id, 'color_hex', e.target.value)} className="w-6 h-6 rounded shrink-0 border-none cursor-pointer bg-transparent" />}
                                                                            <input type="text" value={v.color_name} onChange={e => updateVariantOverride(v.id, 'color_name', e.target.value)} className="flex-1 bg-transparent border-none text-xs font-bold outline-none text-neutral-900 px-1" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Sobrescribir Precios por SKU */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3.5 border-t border-neutral-200/50">
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider mb-1 block">Precio Propio $</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                        <NumberInput min="0" placeholder="Heredado" value={v.override_usd_price ?? ''} onChangeValue={(val) => updateVariantOverride(v.id, 'override_usd_price', val)} className="w-full bg-white border border-neutral-200/50 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 font-mono" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-rose-800 uppercase tracking-wider mb-1 block">Tachado Propio $</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                        <NumberInput min="0" placeholder="Heredado" value={v.override_compare_at_usd ?? ''} onChangeValue={(val) => updateVariantOverride(v.id, 'override_compare_at_usd', val)} className="w-full bg-white border border-neutral-200/50 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-bold text-rose-700 outline-none transition-colors placeholder:text-neutral-300 font-mono" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider mb-1 block">Margen Propio $</label>
                                                                    <div className="relative">
                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                        <NumberInput min="0" placeholder="Heredado" value={v.override_usd_penalty ?? ''} onChangeValue={(val) => updateVariantOverride(v.id, 'override_usd_penalty', val)} className="w-full bg-white border border-neutral-200/50 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 font-mono" />
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

            {/* MOTOR DE ACADEMIA PREZISO */}
            <MissionTour 
                isActive={isMission1 || isMission2 || isMission3 || isMission4}
                currentStep={tourStep}
                totalSteps={isMission1 ? 4 : isMission2 ? 5 : isMission3 ? 4 : 3}
                title={
                    isMission1 ? (
                        tourStep === 1 ? "1. Nombra tu Creación" : tourStep === 2 ? "2. La Primera Impresión" : tourStep === 3 ? "3. La Magia de Preziso" : "4. ¡Lanza tu Producto!"
                    ) : isMission2 ? (
                        tourStep === 1 ? "1. Activar Variantes" : tourStep === 2 ? "2. Define un Atributo" : tourStep === 3 ? "3. Añade las Tallas" : tourStep === 4 ? "4. ¡Crea la Magia!" : "5. Guarda tu Catálogo"
                    ) : isMission3 ? (
                        tourStep === 1 ? "1. El Efecto Oferta" :
                        tourStep === 2 ? "2. Venta al Mayor" :
                        tourStep === 3 ? "3. El Escaparate" :
                        "4. Guarda la Estrategia"
                    ) : (
                        tourStep === 1 ? "1. El Margen de Protección" :
                        tourStep === 2 ? "2. El Descuento Mágico" :
                        "3. ¡Misión Cumplida!"
                    )
                }
                description={
                    isMission1 ? (
                        tourStep === 1 ? "Escribe un nombre corto y llamativo para tu primer producto. Ej: Franela Oversize." :
                        tourStep === 2 ? "Sube la mejor foto que tengas. Una buena imagen es el 80% de la venta." :
                        tourStep === 3 ? `¿Cuánto cuesta en ${isEur ? 'Euros' : 'Dólares'}? Escríbelo y mira cómo calculamos los Bolívares.` :
                        "¡Todo listo! Haz clic en Guardar para publicar tu primer producto y completar la misión."
                    ) : isMission2 ? (
                        tourStep === 1 ? "Vamos a simular que vendes unos Zapatos (luego podrás borrarlos). Haz clic en 'Con Variantes' para abrir el organizador." :
                        tourStep === 2 ? "Aquí defines el color (Ej: Rojo). Fíjate en el interruptor '¿Lleva Color?': si vendieras algo sin color (como un software), lo apagarías." :
                        tourStep === 3 ? "Añade las tallas del zapato (Ej: 40, 42) y presiona Enter, o usa los botones rápidos de abajo." :
                        tourStep === 4 ? "Preziso cruzará el Color con las Tallas para crear tu inventario ordenado. ¡Haz clic en 'Generar SKUs'!" :
                        "Fíjate cómo se creó la lista abajo. Haz clic en 'Guardar Producto' para completar tu misión."
                    ) : isMission3 ? (
                        tourStep === 1 ? "¿Quieres hacer una oferta? Pon aquí un precio más alto (Ej: 60). Tus clientes lo verán tachado y sentirán que es una ganga." :
                        tourStep === 2 ? "Enciende esto si quieres dar un descuento automático a los clientes que te compren muchas cantidades." :
                        tourStep === 3 ? "Enciende la estrellita para que este producto aparezca de primero en tu tienda como 'Lo más vendido'." :
                        "¡Estrategia lista! Haz clic en Guardar Producto para aplicar estos ganchos de venta."
                    ) : (
                        tourStep === 1 ? "Añade un margen extra (Ej: 10). Este monto se sumará al precio en Bolívares para protegerte de la inflación." :
                        tourStep === 2 ? "Mira la tarjeta negra. Si el cliente te paga en Divisas, Preziso le descontará ese margen automáticamente como incentivo." :
                        "¡Has dominado el secreto de las divisas! Guarda el producto para finalizar la Academia Preziso."
                    )
                }
                onNext={() => {
                    if (isMission1) {
                        if (tourStep === 1 && !formData.name) return Swal.fire({ title: 'Falta el nombre', text: 'Escribe un nombre para continuar', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 2 && !formData.image_url) return Swal.fire({ title: 'Falta la foto', text: 'Sube una foto para continuar', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 3 && Number(formData.price) <= 0) return Swal.fire({ title: 'Falta el precio', text: 'Coloca un precio válido', icon: 'info', confirmButtonColor: '#171717' })
                    }
                    if (isMission2) {
                        if (tourStep === 1 && !hasVariants) return Swal.fire({ title: 'Acción requerida', text: 'Haz clic en el botón "Con Variantes" resaltado.', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 2 && useColor && !variantInput.colorName) return Swal.fire({ title: 'Acción requerida', text: 'Escribe el nombre del color.', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 3 && sizeTags.length === 0 && sizeInputValue.trim() === '') return Swal.fire({ title: 'Acción requerida', text: 'Añade al menos una talla (ej: M).', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 4 && variants.length === 0) return Swal.fire({ title: 'Acción requerida', text: 'Haz clic en el botón "Generar Matriz de Variantes".', icon: 'info', confirmButtonColor: '#171717' })
                    }
                    if (isMission3) {
                        if (tourStep === 1 && Number(formData.compareAt) <= Number(formData.price)) return Swal.fire({ title: 'Acción requerida', text: 'Pon un precio tachado mayor al precio base (45) para simular una oferta real.', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 2 && !formData.wholesale_active) return Swal.fire({ title: 'Acción requerida', text: 'Encienda el interruptor de Venta al Mayor.', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 3 && !formData.is_featured) return Swal.fire({ title: 'Acción requerida', text: 'Encienda la estrella para destacar el producto.', icon: 'info', confirmButtonColor: '#171717' })
                    }
                    if (isMission4) {
                        if (tourStep === 1 && Number(formData.penalty) <= 0) return Swal.fire({ title: 'Acción requerida', text: 'Añade un margen mayor a 0 (Ej: 10) para ver la magia contable.', icon: 'info', confirmButtonColor: '#171717' })
                    }
                    
                    const maxSteps = isMission1 ? 4 : isMission2 ? 5 : isMission3 ? 4 : 3;
                    if (tourStep < maxSteps) {
                        const nextStep = tourStep + 1
                        setTourStep(nextStep)
                        
                        setTimeout(() => {
                            if (isMission1) {
                                if (nextStep === 2) document.getElementById('tour-step-2')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 3) document.getElementById('tour-step-3')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 4) window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                            if (isMission2) {
                                if (nextStep === 2) document.getElementById('tour-step-2-2')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 3) document.getElementById('tour-step-2-3')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 4) document.getElementById('tour-step-2-4')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 5) window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                            if (isMission3) {
                                if (nextStep === 2) document.getElementById('tour-step-3-2')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 3) document.getElementById('tour-step-3-3')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 4) window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                            if (isMission4) {
                                if (nextStep === 2) document.getElementById('tour-step-4-2')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                if (nextStep === 3) window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                        }, 100)
                    } else {
                        handleSave()
                    }
                }}
                onCancel={() => router.push('/admin')}
            />
                       
            {/* ZONA DE PELIGRO CONTABLE */}
            {productId && (
                <div className="max-w-5xl mx-auto px-4 md:px-8 mb-10">
                    <div className="border border-rose-200/50 bg-rose-50/20 rounded-xl p-6 md:p-8 animate-in fade-in duration-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-bold text-rose-700 flex items-center gap-1.5"><AlertTriangle size={16} /> Zona de Peligro</h3>
                                <p className="text-xs text-rose-600/80 max-w-xl leading-relaxed">Remover permanentemente este producto de su catálogo público. Si el producto ya posee historial de órdenes facturadas, se archivará automáticamente como borrador.</p>
                            </div>
                            <button onClick={(e) => { e.preventDefault(); handleDeleteProduct(); }} disabled={saving} className="shrink-0 px-5 py-2.5 bg-white border border-rose-200/50 text-rose-700 hover:bg-rose-700 hover:text-white hover:border-rose-700 font-semibold text-xs rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"><Trash2 size={14} /> Eliminar Producto</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX DE PREVISUALIZACIÓN DE LOGÍSTICA (CLEANLOOK ZOOM) */}
            <AnimatePresence>
                {isPreviewZoomOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                        {/* Fondo traslúcido difuminado con descarte al hacer click */}
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsPreviewZoomOpen(false)}
                            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs cursor-zoom-out"
                        />
                        
                        {/* Contenedor de la Imagen con bordes estandarizados */}
                        <motion.div 
                            initial={{ scale: 0.98, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.98, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            className="relative bg-white w-full max-w-3xl rounded-xl border border-neutral-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[85vh] z-10"
                        >
                            {/* Cabecera del Lightbox */}
                            <div className="p-4 flex justify-between items-center border-b border-neutral-200/50 shrink-0 bg-neutral-50/50">
                                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Vista Previa de Interfaz (Detalle)</span>
                                <button 
                                    onClick={() => setIsPreviewZoomOpen(false)} 
                                    className="p-1.5 text-neutral-400 hover:text-neutral-900 bg-white border border-neutral-200/50 hover:bg-neutral-50 rounded-full transition-colors shadow-xs"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            
                            {/* Imagen en resolución completa */}
                            <div className="flex-1 p-6 md:p-8 overflow-y-auto flex items-center justify-center bg-white min-h-[300px]">
                                <div className="relative w-full h-full min-h-[250px] md:min-h-[450px] aspect-[4/3]">
                                    <Image 
                                        src="/shipping-badge-preview.webp" 
                                        alt="Ejemplo de mensaje de envío ampliado"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}