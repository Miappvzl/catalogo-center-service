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
    Eye,
    Copy,
    Gift,
    Check
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
import FoodModifierManager from './admin/FoodModifierManager';
import { generateSmartSKU } from '@/utils/skuGenerator';
import EliteVariantColorPicker from './admin/EliteVariantColorPicker'
import { revalidateAdminDashboard } from '@/app/admin/orders/action';



interface ProductEditorProps {
    productId?: string
    rates: { usd: number, eur: number }
    storeSettings?: {
        id: string
        currency: string
        fiscalProfile: string
        storeType: string
        defaultTaxActive?: boolean
        defaultTaxPercentage?: number
        showTaxInCatalog?: boolean
        wholesaleConfig?: { active?: boolean, min_items?: number, discount_percentage?: number } | null
        affiliateConfig?: { active?: boolean, buyer_discount_pct?: number, global_commission_pct?: number } | null
    }
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

    const isRestaurant = storeSettings?.storeType === 'restaurant'

    // 🚀 DICCIONARIO DECLARATIVO MAESTRO: Mapea cada paso con su ID exacto
    // 🚀 DICCIONARIO DECLARATIVO MAESTRO
    const getActiveTargetId = (missionNum: string | null, step: number, isRest: boolean): string | null => {
        if (!missionNum) return null

        if (isRest) {
            // Dominio Gastronómico (FoodTech)
            switch (missionNum) {
                case '1':
                    return step === 1 ? 'tour-step-1-name' :
                        step === 2 ? 'tour-step-1-image' :
                            step === 3 ? 'tour-step-1-price' : 'tour-save-btn'
                case '2':
                    return step === 1 ? 'tour-preset-sizes-btn' :
                        step === 2 ? 'tour-modifier-options-sizes' :
                            step === 3 ? 'tour-preset-extras-btn' :
                                step === 4 ? 'tour-modifier-rules-extras' : 'tour-save-btn'
                case '3':
                    return step === 1 ? 'tour-step-3-pricing-grid' :
                        step === 2 ? 'tour-food-time' :
                            step === 3 ? 'tour-step-3-featured' : 'tour-save-btn'
                case '4':
                    return step === 1 ? 'tour-step-4-penalty' :
                        step === 2 ? 'tour-step-4-card' : 'tour-save-btn'
                default:
                    return null
            }
        } else {
            // Dominio Comercio Minorista (Retail)
            switch (missionNum) {
                case '1':
                    return step === 1 ? 'tour-step-1-name' :
                        step === 2 ? 'tour-step-1-image' :
                            step === 3 ? 'tour-step-1-price' : 'tour-save-btn'
                case '2':
                    // 🚀 AHORA INCLUYE EL PASO 5 PARA INSPECCIONAR LA MATRIZ GENERADA
                    return step === 1 ? 'tour-step-2-has-variants' :
                        step === 2 ? 'tour-step-2-color' :
                            step === 3 ? 'tour-step-2-sizes' :
                                step === 4 ? 'tour-step-2-generate' :
                                    step === 5 ? 'tour-step-2-matrix' : 'tour-save-btn'
                case '3':
                    // 🚀 PASO 1 ILUMINA TODA LA GRILLA DE PRECIOS (PRECIO BASE + TACHADO)
                    return step === 1 ? 'tour-step-3-pricing-grid' :
                        step === 2 ? 'tour-step-3-wholesale' :
                            step === 3 ? 'tour-step-3-featured' : 'tour-save-btn'
                case '4':
                    return step === 1 ? 'tour-step-4-penalty' :
                        step === 2 ? 'tour-step-4-card' : 'tour-save-btn'
                default:
                    return null
            }
        }
    }

    const currentTargetId = getActiveTargetId(mission, tourStep, isRestaurant)

    // 🚀 ÚNICO MOTOR MAESTRO DE AUTO-DESPLAZAMIENTO NATIVO (100% AUTOMATIZADO)
    useEffect(() => {
        if (!mission) return

        const targetId = getActiveTargetId(mission, tourStep, isRestaurant)
        if (!targetId) return

        if (targetId === 'tour-save-btn') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        let attempts = 0
        const maxAttempts = 15

        const executeScroll = () => {
            const el = document.getElementById(targetId)
            if (el) {
                // Utiliza la API nativa de scroll del navegador respetando el scroll-margin-top
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            } else if (attempts < maxAttempts) {
                attempts++
                setTimeout(executeScroll, 80)
            }
        }

        const timer = setTimeout(executeScroll, 100)
        return () => clearTimeout(timer)
    }, [mission, tourStep, isRestaurant])

    // Función universal para aplicar la elevación sin alterar los colores naturales
    const getUniversalSpotlightClass = (elementId: string) => {
        if (!mission || elementId !== currentTargetId) return 'transition-all duration-300'
        return 'relative z-[60] ring-4 ring-white/95 shadow-2xl pointer-events-auto transition-all duration-300'
    }

    // 🚀 ÚNICO AUTO-PRELLENADO DE DATOS (CERO DUPLICACIONES)
    useEffect(() => {
        if (!productId) {
            if (isRestaurant) {
                if (isMission1) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Hamburguesa Doble Smash Clásica',
                        category: 'Hamburguesas',
                        price: 9.5,
                        description: 'Dos carnes smash de 100g, doble queso cheddar fundido, cebolla crispy y salsa secreta en pan brioche.',
                        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600'
                    }))
                }
                if (isMission2) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Pizza Especial de Champiñones',
                        category: 'Pizzas',
                        price: 10,
                        description: 'Masa madre tradicional, salsa pomodoro italiana, mozzarella fresca y champiñones salteados.',
                        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600'
                    }))
                    setFoodModifiers([]) // 🚀 Cero grupos inyectados: arranca totalmente limpia
                }
                if (isMission3) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Pizza Familiar Cuatro Quesos',
                        category: 'Pizzas',
                        price: 15,
                        compareAt: 19,
                        shipping_badge_title: '⏱️ 15-20 min',
                        shipping_badge_desc: 'Horneada al momento a la piedra',
                        is_featured: true,
                        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600'
                    }))
                }
                if (isMission4) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Parrilla Mixta Mar y Tierra',
                        category: 'Parrillas',
                        price: 25,
                        penalty: 3,
                        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600'
                    }))
                }
            } else {
                if (isMission1) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Franela Oversize Streetwear',
                        category: 'Ropa',
                        price: 25,
                        image_url: 'https://images.unsplash.com/photo-1727129289434-c0f0589a7b50?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
                    }))
                }
                if (isMission2) {
                    setFormData(prev => ({ ...prev, name: 'Zapatos Nike Air Max (Prueba)', category: 'Calzado', price: 120, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600' }))
                }
                if (isMission3) {
                    setFormData(prev => ({ ...prev, name: 'Reloj Inteligente Pro', category: 'Electrónica', price: 45, image_url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=600' }))
                }
                if (isMission4) {
                    setFormData(prev => ({ ...prev, name: 'Perfume Importado Premium', category: 'Belleza', price: 50, image_url: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?q=80&w=735&auto=format&fit=crop' }))
                }
            }
        }
    }, [isMission1, isMission2, isMission3, isMission4, productId, isRestaurant])

    const mainImageInputRef = useRef<HTMLInputElement>(null)
    const productGalleryInputRef = useRef<HTMLInputElement>(null)
    const variantImageInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(!!productId)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    const [foodModifiers, setFoodModifiers] = useState<any[]>([])
    const [isPreviewZoomOpen, setIsPreviewZoomOpen] = useState(false)

    const isEur = storeSettings?.currency === 'eur'
    const activeRate = isEur ? rates.eur : rates.usd
    const rateLabel = isEur ? 'Tasa Euro' : 'Tasa BCV'
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        description: '',
        image_url: '',
        price: '' as number | '',
        penalty: '' as number | '',
        compareAt: '' as number | '',
        cost: '' as number | '',
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
    const [variantMode, setVariantMode] = useState<'sizes_only' | 'color' | 'model'>('color')
    const [variantInput, setVariantInput] = useState({
        colorName: '',
        colorHex: '#000000',
        defaultStock: 10 as number | '',
        priceOverride: '' as number | '',
        penaltyOverride: '' as number | '',
        compareAtOverride: '' as number | '',
        costOverride: '' as number | '',
        images: [] as string[]
    })

    // 💎 Estados UI Mobile-First: Desplegable de Costo, Ayudas (?) y Guía "¿Qué hacer?"
    const [isCostPanelOpen, setIsCostPanelOpen] = useState(false)
    const [activePriceHelp, setActivePriceHelp] = useState<'base' | 'penalty' | 'compare' | null>(null)
    const [openWhatToDoId, setOpenWhatToDoId] = useState<string | null>(null)

    const [hasVariants, setHasVariants] = useState(false)
    const [simpleStock, setSimpleStock] = useState<number | ''>(10)
    const [sizeInputValue, setSizeInputValue] = useState('')
    const [sizeTags, setSizeTags] = useState<string[]>([])
    // 🚀 ELITE: Divulgación Progresiva para precios de variantes y paquetes de tallas
    const [showVariantPricing, setShowVariantPricing] = useState(false)

    const handleAddSizePack = (packSizes: string[]) => {
        const cleanPacks = packSizes.map(s => s.toUpperCase());
        const combined = Array.from(new Set([...sizeTags, ...cleanPacks]));
        setSizeTags(combined);
        setIsDirty(true);
    }
    const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null)

    const [existingCategories, setExistingCategories] = useState<string[]>([])
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const categoryDropdownRef = useRef<HTMLDivElement>(null)
    const [storeSlug, setStoreSlug] = useState<string>('');
    const [copiedMagicLink, setCopiedMagicLink] = useState(false);

    useEffect(() => {
        if (!storeSettings?.id) return;
        supabase
            .from('stores')
            .select('slug')
            .eq('id', storeSettings.id)
            .single()
            .then(({ data }: { data: { slug: string } | null }) => {
                if (data?.slug) setStoreSlug(data.slug);
            });
    }, [storeSettings?.id, supabase]);

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









    // AUTO-PRELLENADO Y AUTO-SCROLL DE LA ACADEMIA PREZISO (POLIMÓRFICO FOODTECH / RETAIL)
    useEffect(() => {
        if (!productId) {
            if (isRestaurant) {
                // Dominio Gastronómico (Appetite-First)
                if (isMission1) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Hamburguesa Doble Smash Clásica',
                        category: 'Hamburguesas',
                        price: 9.5,
                        description: 'Dos carnes smash de 100g, doble queso cheddar fundido, cebolla crispy y salsa secreta en pan brioche artesanal.',
                        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600'
                    }))
                }
                if (isMission2) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Hamburguesa Especial Bacon BBQ',
                        category: 'Hamburguesas',
                        price: 12,
                        description: 'Doble carne angus, tocineta ahumada crujiente, queso americano y salsa BBQ de la casa.',
                        image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=600'
                    }))
                    setFoodModifiers([
                        {
                            id: `temp-group-${Date.now()}`,
                            name: 'Punto de Cocción de la Carne',
                            is_required: true,
                            min_selections: 1,
                            max_selections: 1,
                            modifier_options: [
                                { id: `temp-opt-1`, name: 'Término Medio (Jugosa)', price_adjustment_usd: 0 },
                                { id: `temp-opt-2`, name: 'Bien Cocida', price_adjustment_usd: 0 }
                            ]
                        }
                    ])
                    setTimeout(() => document.getElementById('tour-food-modifiers')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
                }
                if (isMission3) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Pizza Familiar Cuatro Quesos',
                        category: 'Pizzas',
                        price: 15,
                        compareAt: 19,
                        shipping_badge_title: '⏱️ 15-20 min',
                        shipping_badge_desc: 'Horneada al momento a la piedra',
                        is_featured: true,
                        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600'
                    }))
                    setTimeout(() => document.getElementById('tour-step-3-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
                }
                if (isMission4) {
                    setFormData(prev => ({
                        ...prev,
                        name: 'Parrilla Mixta Mar y Tierra',
                        category: 'Parrillas',
                        price: 25,
                        penalty: 3,
                        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600'
                    }))
                    setTimeout(() => document.getElementById('tour-step-4-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
                }
            } else {
                // Dominio Retail (Moda, Calzado, Tecnología)
                if (isMission2) {
                    setFormData(prev => ({ ...prev, name: 'Zapatos Nike Air Max (Prueba)', category: 'Calzado', price: 120, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600' }))
                    setTimeout(() => document.getElementById('tour-step-2-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
                }
                if (isMission3) {
                    setFormData(prev => ({ ...prev, name: 'Reloj Inteligente Pro', category: 'Electrónica', price: 45, image_url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=600' }))
                    setTimeout(() => document.getElementById('tour-step-3-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
                }
                if (isMission4) {
                    setFormData(prev => ({ ...prev, name: 'Perfume Importado Premium', category: 'Belleza', price: 50, image_url: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?q=80&w=735&auto=format&fit=crop' }))
                    setTimeout(() => document.getElementById('tour-step-4-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 800)
                }
            }
        }
    }, [isMission1, isMission2, isMission3, isMission4, productId, isRestaurant])


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



    // 💎 SANEAMIENTO AUTOMÁTICO: Si el usuario vacía el input o pone 0, se resetea a null para que herede
    const updateVariantOverride = (id: string, field: string, value: any) => {
        let sanitizedValue = value;
        if (field.startsWith('override_')) {
            const num = Number(value);
            if (value === '' || value === null || value === undefined || isNaN(num) || num <= 0) {
                sanitizedValue = null; // Vuelve a heredar el precio base
            } else {
                sanitizedValue = num;
            }
        }

        setVariants(variants.map(v => {
            if (v.id === id) return { ...v, [field]: sanitizedValue }
            return v
        }))
        setIsDirty(true)
    }

    // 🚀 ELITE: Sincronizador de Colorway a nivel de Grupo completo
    const updateVariantGroupColor = (oldColorName: string, newColorName: string, newColorHex: string) => {
        setVariants(prev => prev.map(v => {
            if (v.color_name === oldColorName) {
                return {
                    ...v,
                    color_name: newColorName,
                    color_hex: newColorHex
                }
            }
            return v
        }))
        setIsDirty(true)
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-neutral-900 text-white rounded-lg text-xs font-semibold' } })
        Toast.fire({ icon: 'success', title: `Color actualizado en todas las tallas de "${oldColorName}"` })
    }

    // 🚀 ELITE: Interceptor con alerta de confirmación para evitar desincronizaciones accidentales
    const handleVariantColorChangeWithGuard = (targetVariant: any, newName: string, newHex: string) => {
        // Si no hay cambios reales de valor, ignorar
        if (targetVariant.color_name === newName && targetVariant.color_hex === newHex) return;

        const siblings = variants.filter(item => item.color_name === targetVariant.color_name);

        // Si existen múltiples tallas compartiendo este color, exigimos confirmación estricta
        if (siblings.length > 1) {
            Swal.fire({
                title: '¿Sincronizar todo el grupo?',
                html: `Se detectaron <b>${siblings.length} tallas</b> asociadas al color <b>${targetVariant.color_name}</b>.<br><br>¿Deseas aplicar este nuevo color a todas las tallas del grupo o cancelar la acción?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0a0a0a',
                cancelButtonColor: '#737373',
                confirmButtonText: 'Sí, aplicar a todas',
                cancelButtonText: 'Cancelar',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-2xl font-sans text-xs p-6 shadow-xl border border-neutral-200/60',
                    confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5 bg-neutral-950 text-white',
                    cancelButton: 'rounded-xl text-xs font-bold px-4 py-2.5 bg-neutral-100 text-neutral-700 border border-neutral-200'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    // OK: Se le cambia a todos automáticamente
                    updateVariantGroupColor(targetVariant.color_name, newName, newHex);
                } else {
                    // CANCELAR O CLIC FUERA: No cambia nada
                    // Forzamos un re-render suave para que el selector visual revierta al color original
                    setVariants([...variants]);
                }
            });
        } else {
            // Si es un SKU con color exclusivo (sin tallas hermanas), actualiza directo
            updateVariantOverride(targetVariant.id, 'color_name', newName);
            updateVariantOverride(targetVariant.id, 'color_hex', newHex);
        }
    };

    // 🚀 DETECTOR DE CAMPAÑAS PROMOCIONALES ACTIVAS VINCULADAS A ESTE PRODUCTO
    const [linkedActivePromos, setLinkedActivePromos] = useState<any[]>([])
    const [isUnlinkingPromo, setIsUnlinkingPromo] = useState(false)

    useEffect(() => {
        if (!productId || !storeSettings?.id) return
        const fetchLinkedPromos = async () => {
            const { data } = await supabase
                .from('promotions')
                .select('id, title, promo_type, discount_percentage, bogo_buy, bogo_pay, is_active, expires_at, linked_products')
                .eq('store_id', storeSettings.id)
                .eq('is_active', true)

            if (data) {
                const nowMs = Date.now()
                const matching = data.filter((p: any) => {
                    if (p.expires_at && new Date(p.expires_at).getTime() <= nowMs) return false
                    return Array.isArray(p.linked_products) && p.linked_products.some((id: any) => String(id) === String(productId))
                })
                setLinkedActivePromos(matching)
            }
        }
        fetchLinkedPromos()
    }, [productId, storeSettings?.id, supabase])

    const bestActiveCampaign = useMemo(() => {
        if (linkedActivePromos.length === 0) return null
        const getEff = (p: any) =>
            p.promo_type === 'percentage'
                ? Number(p.discount_percentage || 0)
                : p.promo_type === 'bogo' && Number(p.bogo_buy) > 0
                    ? ((Number(p.bogo_buy) - Number(p.bogo_pay)) / Number(p.bogo_buy)) * 100
                    : 0
        return linkedActivePromos.reduce((best, curr) => (getEff(curr) > getEff(best) ? curr : best), linkedActivePromos[0])
    }, [linkedActivePromos])

    const handleUnlinkFromCampaign = async (promoToUnlink: any) => {
        if (!productId || !promoToUnlink?.id) return
        setIsUnlinkingPromo(true)
        try {
            const updatedLinked = (promoToUnlink.linked_products || []).filter((id: any) => String(id) !== String(productId))
            const { error } = await supabase
                .from('promotions')
                .update({ linked_products: updatedLinked })
                .eq('id', promoToUnlink.id)

            if (error) throw error

            setLinkedActivePromos(prev => prev.filter(p => p.id !== promoToUnlink.id))
            await revalidateStoreCache(storeSlug, storeSettings?.id)

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2200,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
            })
            Toast.fire({ icon: 'success', title: `Excluido de "${promoToUnlink.title}"` })
        } catch {
            Swal.fire({ title: 'Error', text: 'No se pudo desvincular de la campaña.', icon: 'error', confirmButtonColor: '#171717' })
        } finally {
            setIsUnlinkingPromo(false)
        }
    }

    const math = useMemo(() => {
        const cashPrice = Number(formData.price) || 0
        const markup = Number(formData.penalty) || 0
        const listPrice = Number((cashPrice + markup).toFixed(2))
        const rawCompareAt = Number(formData.compareAt) || 0

        // Costo Unitario Real: Solo se activa cuando el usuario ingresa un costo mayor a 0 (Evita el falso 100% cuando está vacío o en 0.00)
        const rawCostNum = Number(formData.cost)
        const hasCost = formData.cost !== '' && formData.cost !== null && formData.cost !== undefined && !isNaN(rawCostNum) && rawCostNum > 0
        const unitCost = hasCost ? Number(rawCostNum.toFixed(2)) : null

        const isCompareAtValid = rawCompareAt > listPrice && listPrice > 0
        const isCompareAtInvalid = rawCompareAt > 0 && rawCompareAt <= listPrice

     // Precio tachado sugerido: +15% fijo sobre el precio de vitrina redondeado a entero (No salta mientras el usuario escribe)
        const suggestedCompareAt = Math.ceil(listPrice * 1.15)

        // Impacto si el producto está dentro de una Campaña Activa (Porcentual o BOGO 2x1 / 3x2)
        const campaignDiscountPct =
            bestActiveCampaign && bestActiveCampaign.promo_type === 'percentage' && Number(bestActiveCampaign.discount_percentage) > 0
                ? Number(bestActiveCampaign.discount_percentage)
                : 0

        const bogoEffectiveDiscountPct =
            bestActiveCampaign && bestActiveCampaign.promo_type === 'bogo' && Number(bestActiveCampaign.bogo_buy) > 0 && Number(bestActiveCampaign.bogo_pay) > 0 && Number(bestActiveCampaign.bogo_buy) > Number(bestActiveCampaign.bogo_pay)
                ? Number((((Number(bestActiveCampaign.bogo_buy) - Number(bestActiveCampaign.bogo_pay)) / Number(bestActiveCampaign.bogo_buy)) * 100).toFixed(2))
                : 0

        const hasCampaignOverride = campaignDiscountPct > 0
        const finalStoreListPrice = hasCampaignOverride
            ? Number((listPrice * (1 - campaignDiscountPct / 100)).toFixed(2))
            : listPrice
        const finalStoreCashPrice = hasCampaignOverride
            ? Number((cashPrice * (1 - campaignDiscountPct / 100)).toFixed(2))
            : cashPrice
        const finalStoreCompareAt = hasCampaignOverride
            ? listPrice
            : (isCompareAtValid ? rawCompareAt : 0)

        const promoDiscountPercent = hasCampaignOverride
            ? Math.round(campaignDiscountPct)
            : (isCompareAtValid ? Math.round(((rawCompareAt - listPrice) / rawCompareAt) * 100) : 0)

        const effectiveFxSavings = Number((finalStoreListPrice - finalStoreCashPrice).toFixed(2))
        const discountPercent = finalStoreListPrice > 0 ? Math.round((effectiveFxSavings / finalStoreListPrice) * 100) : 0
        const refBs = finalStoreListPrice * activeRate

        // 1. CÁLCULO FISCAL: Solo aplica si el perfil en Configuración es Contribuyente Ordinario o Especial
        const isTaxableStore = storeSettings?.fiscalProfile === 'ordinary' || storeSettings?.fiscalProfile === 'special'
        const taxRatePct = isTaxableStore && !formData.is_tax_exempt ? Number(storeSettings?.defaultTaxPercentage ?? 16) : 0
        const taxAmountOnCash = Number((cashPrice * (taxRatePct / 100)).toFixed(2))
        const cashPriceWithTax = Number((cashPrice + taxAmountOnCash).toFixed(2))
        const taxAmountOnList = Number((listPrice * (taxRatePct / 100)).toFixed(2))
        const listPriceWithTax = Number((listPrice + taxAmountOnList).toFixed(2))

        // 2. RENTABILIDAD SOBRE PRECIO BASE (SIN IVA)
        const netProfitCash = unitCost !== null ? Number((cashPrice - unitCost).toFixed(2)) : null
        const grossMarginCashPct = unitCost !== null && cashPrice > 0
            ? Number((((cashPrice - unitCost) / cashPrice) * 100).toFixed(1))
            : null
        const markupOnCostPct = unitCost !== null && unitCost > 0
            ? Number((((cashPrice - unitCost) / unitCost) * 100).toFixed(1))
            : null

        const netProfitList = unitCost !== null ? Number((listPrice - unitCost).toFixed(2)) : null
        const grossMarginListPct = unitCost !== null && listPrice > 0
            ? Number((((listPrice - unitCost) / listPrice) * 100).toFixed(1))
            : null

        // 3. DIAGNÓSTICO INTELIGENTE DE PÉRDIDAS CON GUÍA "¿QUÉ HACER?"
        interface ErosionScenario {
            id: string
            title: string
            summary: string
            whatToDo: string
            suggestedBasePrice: number | null
            suggestedWholesalePct?: number | null
            netRevenueUsd: number
            profitUsd: number
            marginPct: number
            status: 'loss' | 'critical' | 'healthy'
        }

        const erosionScenarios: ErosionScenario[] = []

        if (unitCost !== null && cashPrice > 0) {
            const safeBasePrice20 = Math.ceil(unitCost / 0.8)

            // CASO RAÍZ: Si el Precio de Venta ya es menor al costo, mostramos SOLO esta alerta raíz
            if (cashPrice < unitCost) {
                const lossUsd = Number((unitCost - cashPrice).toFixed(2))
                erosionScenarios.push({
                    id: 'base_cash_loss',
                    title: 'Tu precio de venta es menor a tu costo',
                    summary: `Lo vendes en $${cashPrice.toFixed(2)}, pero a ti te cuesta $${unitCost.toFixed(2)}. Pierdes $${lossUsd.toFixed(2)} en cada venta.`,
                    whatToDo: `Para no perder dinero, sube el "1. Precio de Venta" por encima de $${unitCost.toFixed(2)} (por ejemplo a $${safeBasePrice20.toFixed(2)} para ganar un 20% libre), o revisa si escribiste mal el costo.`,
                    suggestedBasePrice: safeBasePrice20,
                    netRevenueUsd: cashPrice,
                    profitUsd: -lossUsd,
                    marginPct: -100,
                    status: 'loss'
                })
            } else {
                // Si el precio base es saludable (>= costo), auditamos si algún descuento activo perfora el costo
                const checkDiscountChannel = (
                    id: string,
                    title: string,
                    discountDesc: string,
                    netRev: number,
                    whatToDo: string,
                    minSafeBasePrice: number | null = null,
                    safeWholesalePct: number | null = null
                ) => {
                    const cleanRev = Number(netRev.toFixed(2))
                    const prof = Number((cleanRev - unitCost).toFixed(2))
                    const marg = cleanRev > 0 ? Number(((prof / cleanRev) * 100).toFixed(1)) : -100
                    if (cleanRev < unitCost) {
                        erosionScenarios.push({
                            id,
                            title,
                            summary: `Con ${discountDesc}, recibes $${cleanRev.toFixed(2)} y pierdes $${Math.abs(prof).toFixed(2)} por unidad (tu costo es $${unitCost.toFixed(2)}).`,
                            whatToDo,
                            suggestedBasePrice: minSafeBasePrice,
                            suggestedWholesalePct: safeWholesalePct,
                            netRevenueUsd: cleanRev,
                            profitUsd: prof,
                            marginPct: marg,
                            status: 'loss'
                        })
                    }
                }

                // Canal A: Campaña Promocional Activa (Porcentaje o BOGO)
                if (bestActiveCampaign) {
                    if (campaignDiscountPct > 0) {
                        const neededBase = Math.ceil(unitCost / (1 - campaignDiscountPct / 100))
                        checkDiscountChannel(
                            'active_campaign',
                            `Pérdida en campaña "${bestActiveCampaign.title}"`,
                            `el descuento de -${campaignDiscountPct}%`,
                            finalStoreCashPrice,
                            `El descuento de esta campaña (-${campaignDiscountPct}%) supera tu margen de ganancia. Puedes tocar el botón "Excluir de esta campaña" aquí abajo, o subir el Precio de Venta al menos a $${neededBase.toFixed(2)}.`,
                            neededBase
                        )
                    } else if (bogoEffectiveDiscountPct > 0) {
                        const bogoUnitRev = cashPrice * (Number(bestActiveCampaign.bogo_pay) / Number(bestActiveCampaign.bogo_buy))
                        const neededBase = Math.ceil(unitCost * (Number(bestActiveCampaign.bogo_buy) / Number(bestActiveCampaign.bogo_pay)))
                        checkDiscountChannel(
                            'active_bogo',
                            `Pérdida en promoción ${bestActiveCampaign.bogo_buy}x${bestActiveCampaign.bogo_pay} "${bestActiveCampaign.title}"`,
                            `la promoción ${bestActiveCampaign.bogo_buy}x${bestActiveCampaign.bogo_pay}`,
                            bogoUnitRev,
                            `En un ${bestActiveCampaign.bogo_buy}x${bestActiveCampaign.bogo_pay} entregas ${bestActiveCampaign.bogo_buy} unidades pero cobras ${bestActiveCampaign.bogo_pay}. Excluye este producto de la campaña o sube su Precio de Venta por encima de $${neededBase.toFixed(2)}.`,
                            neededBase
                        )
                    }
                }

                // Canal B: Regla Mayorista (Individual o Global de la Tienda)
                const isIndividualWholesale = formData.wholesale_active && Number(formData.wholesale_discount_pct) > 0
                const isGlobalWholesale = !formData.wholesale_active && Boolean(storeSettings?.wholesaleConfig?.active) && Number(storeSettings?.wholesaleConfig?.discount_percentage) > 0
                const activeWholesalePct = isIndividualWholesale
                    ? Number(formData.wholesale_discount_pct)
                    : isGlobalWholesale
                        ? Number(storeSettings?.wholesaleConfig?.discount_percentage)
                        : 0

                if (activeWholesalePct > 0 && activeWholesalePct < 100) {
                    const wholesaleRev = cashPrice * (1 - activeWholesalePct / 100)
                    const maxSafePct = Math.max(0, Math.floor(((cashPrice - unitCost) / cashPrice) * 100))
                    const recommendedSafeWholesalePct = Math.max(5, Math.min(15, Math.floor(maxSafePct * 0.7)))
                    checkDiscountChannel(
                        'wholesale',
                        isIndividualWholesale ? 'Pérdida en tu Regla Mayorista Individual' : 'Pérdida con tu Descuento Mayorista Global',
                        `tu descuento al mayor de -${activeWholesalePct}%`,
                        wholesaleRev,
                        isIndividualWholesale
                            ? `Con tu precio actual ($${cashPrice.toFixed(2)}) y costo ($${unitCost.toFixed(2)}), el descuento al mayor máximo sin perder dinero es ${maxSafePct}%. Toca el botón para bajarlo a un ${recommendedSafeWholesalePct}% seguro.`
                            : `Tienes un descuento al mayor global de -${activeWholesalePct}% en tu tienda. Toca el botón para asignarle a este producto una regla individual segura del ${recommendedSafeWholesalePct}%, o baja el descuento general en Configuración > Reglas de Negocio.`,
                        null,
                        recommendedSafeWholesalePct
                    )
                }

                // Canal C: Programa de Afiliados / Promotores
                if (storeSettings?.affiliateConfig?.active) {
                    const buyerDisc = Number(storeSettings.affiliateConfig.buyer_discount_pct || 0)
                    const commPct = Number(storeSettings.affiliateConfig.global_commission_pct || 0)
                    if (buyerDisc + commPct > 0) {
                        const pricePaidByBuyer = cashPrice * (1 - buyerDisc / 100)
                        const commissionUsd = pricePaidByBuyer * (commPct / 100)
                        const netAfterAffiliate = pricePaidByBuyer - commissionUsd
                        checkDiscountChannel(
                            'affiliate',
                            'Pérdida en ventas con Código de Afiliado',
                            `el -${buyerDisc}% al cliente y -${commPct}% de comisión al promotor`,
                            netAfterAffiliate,
                            `Cuando venden con código de afiliado se descuenta un ${buyerDisc}% al comprador y pagas ${commPct}% de comisión. Sube ligeramente el Precio de Venta o reduce los porcentajes de afiliados en Configuración > Reglas de Negocio.`
                        )
                    }
                }
            }
        }

        // 4. AUDITORÍA DE VARIANTES EN RIESGO
        const variantsBelowCost = hasVariants
            ? variants.filter(v => {
                const vPrice = v.override_usd_price !== null && v.override_usd_price !== undefined && v.override_usd_price !== ''
                    ? Number(v.override_usd_price)
                    : cashPrice
                const vCost = v.override_cost_usd !== null && v.override_cost_usd !== undefined && v.override_cost_usd !== ''
                    ? Number(v.override_cost_usd)
                    : unitCost
                return vCost !== null && vPrice > 0 && vPrice < vCost
            })
            : []

        const lossScenarios = erosionScenarios.filter(s => s.status === 'loss')
        const criticalScenarios = erosionScenarios.filter(s => s.status === 'critical')

        return {
            cashPrice,
            markup,
            listPrice,
            rawCompareAt,
            hasCost,
            unitCost,
            isCompareAtValid,
            isCompareAtInvalid,
            suggestedCompareAt,
            hasCampaignOverride,
            campaignDiscountPct,
            bogoEffectiveDiscountPct,
            finalStoreListPrice,
            finalStoreCashPrice,
            finalStoreCompareAt,
            effectiveFxSavings,
            promoDiscountPercent,
            discountPercent,
            refBs,
            isTaxableStore,
            taxRatePct,
            taxAmountOnCash,
            cashPriceWithTax,
            taxAmountOnList,
            listPriceWithTax,
            netProfitCash,
            grossMarginCashPct,
            markupOnCostPct,
            netProfitList,
            grossMarginListPct,
            erosionScenarios,
            lossScenarios,
            criticalScenarios,
            variantsBelowCost
        }
    }, [
        formData.price,
        formData.penalty,
        formData.compareAt,
        formData.cost,
        formData.is_tax_exempt,
        formData.wholesale_active,
        formData.wholesale_min_qty,
        formData.wholesale_discount_pct,
        activeRate,
        bestActiveCampaign,
        storeSettings,
        hasVariants,
        variants
    ])

    // 🛡️ MEMORIA DE PRECIO BASE ORIGINAL (Para saber si el usuario lo modificó en esta sesión)
    const initialBasePriceRef = useRef<number | null>(null);

    // Solo cuenta como precio propio si es estrictamente un número mayor a 0
    const variantsWithCustomPrice = useMemo(() => {
        if (!hasVariants || !variants || variants.length === 0) return []
        return variants.filter(v => Number(v.override_usd_price || 0) > 0)
    }, [hasVariants, variants])

    // 💎 DETECTOR DE INTENCIÓN: Solo es true si el comerciante cambió el precio base original
    const isBasePriceModified = useMemo(() => {
        if (initialBasePriceRef.current === null) return false;
        const current = Number(formData.price || 0);
        return current !== initialBasePriceRef.current;
    }, [formData.price]);

    const scrollToVariantMatrix = () => {
        const el = document.getElementById('tour-step-2-matrix')
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Abrimos la primera variante con precio desacoplado para edición inmediata
            if (variantsWithCustomPrice.length > 0) {
                setExpandedVariantId(variantsWithCustomPrice[0].id)
            }
        }
    }

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
                const { data: product, error } = await supabase
                    .from('products')
                    .select(`
        *, 
        product_variants(*),
        product_modifier_groups(
          modifier_groups(
            *,
            modifier_options(*)
          )
        )
    `)
                    .eq('id', productId)
                    .single()

                if (product.product_modifier_groups) {
                    const rawModifiers = product.product_modifier_groups.map((pmg: any) => pmg.modifier_groups).filter(Boolean)
                    setFoodModifiers(rawModifiers)
                }
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
                // 🚀 Memorizamos el precio base original para el centinela reactivo
                initialBasePriceRef.current = Number(product.usd_cash_price || 0);

                setFormData({
                    name: product.name,
                    sku: product.sku || '',
                    category: product.category,
                    description: product.description || '',
                    image_url: product.image_url || '',
                    price: product.usd_cash_price || 0,
                    penalty: product.usd_penalty || 0,
                    compareAt: product.compare_at_usd || '',
                    cost: product.cost_usd !== null && product.cost_usd !== undefined ? Number(product.cost_usd) : '',
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

        const rawTags = sizeInputValue.trim() !== '' && !sizeTags.includes(sizeInputValue.trim().toUpperCase())
            ? [...sizeTags, sizeInputValue.trim().toUpperCase().replace(/,/g, '')]
            : sizeTags;

        const cleanColorName = variantInput.colorName.trim();

        // Validación inteligente 1D / 2D
        if (useColor && !cleanColorName) {
            return Swal.fire({ title: 'Falta el Color', text: 'Escriba un nombre para el color o desactive la casilla "Con color" si el producto solo tiene tallas.', icon: 'warning', confirmButtonColor: '#171717' })
        }
        if (!useColor && !cleanColorName && rawTags.length === 0) {
            return Swal.fire({ title: 'Faltan Datos', text: 'Agregue al menos una talla (ej: 28, 30, M) o escriba un nombre de opción.', icon: 'warning', confirmButtonColor: '#171717' })
        }

        // Si desactivó el color y dejó el nombre vacío, es un producto de "Solo Tallas" -> asignamos 'Talla'
        const resolvedColorName = cleanColorName || 'Talla';
        // Si puso un Color u Opción pero no puso tallas, es un producto de "Solo Color/Opción" -> asignamos 'ÚNICA'
        const tagsToUse = rawTags.length > 0 ? rawTags : ['ÚNICA'];

        const stockToApply = Number(variantInput.defaultStock) || 0
        const finalHex = useColor ? variantInput.colorHex : 'transparent'

        const newVariants = tagsToUse.map(s => ({
            id: `temp-${crypto.randomUUID()}`,
            color_name: resolvedColorName,
            color_hex: finalHex,
            size: s,
            stock: stockToApply,
            sku: generateSmartSKU(formData.category, `${formData.name || 'PRD'} ${resolvedColorName === 'Talla' ? '' : resolvedColorName} ${s}`),
            gallery: variantInput.images,
            variant_image: variantInput.images[0] || '',
            override_usd_price: variantInput.priceOverride !== '' ? Number(variantInput.priceOverride) : null,
            override_usd_penalty: variantInput.penaltyOverride !== '' ? Number(variantInput.penaltyOverride) : null,
            override_compare_at_usd: variantInput.compareAtOverride !== '' ? Number(variantInput.compareAtOverride) : null,
            override_cost_usd: variantInput.costOverride !== '' ? Number(variantInput.costOverride) : null,
        }))

        setVariants([...variants, ...newVariants])
        setVariantInput({ colorName: '', colorHex: '#000000', defaultStock: 10, priceOverride: '', penaltyOverride: '', compareAtOverride: '', costOverride: '', images: [] })
        setSizeTags([])
        setSizeInputValue('')
        setIsDirty(true)

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-neutral-900 text-white rounded-lg text-xs font-semibold' } })
        Toast.fire({ icon: 'success', title: 'Variantes Generadas' })

        // 🚀 AVANCE AUTOMÁTICO AL PASO DE REVISIÓN DE MATRIZ EN RETAIL
        if (isMission2 && !isRestaurant && tourStep === 4) {
            setTourStep(5);
        }
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
            await revalidateStoreCache(storeSlug, storeSettings?.id)

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
        if (!formData.name) return Swal.fire({ title: 'Falta información', text: 'El producto debe tener un nombre descriptivo.', icon: 'warning', confirmButtonColor: '#171717' });

        const priceNum = Number(formData.price);
        if (String(formData.price).trim() === '' || isNaN(priceNum) || priceNum < 0) {
            return Swal.fire({
                title: 'Precio Inválido',
                text: 'El valor monetario del producto no puede ser negativo.',
                icon: 'warning',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            });
        }

        // 🛡️ GUARDIÁN DE PRECIO TACHADO: Previene guardar una oferta invisible cuando compareAt <= Precio Base + Margen
        let resolvedCompareAt: number | null = formData.compareAt !== '' ? Number(formData.compareAt) : null;

        if (math.isCompareAtInvalid && !mission) {
            const confirmFix = await Swal.fire({
                title: 'Precio Tachado menor al Precio en Vitrina',
                html: `Tu producto se muestra en la tienda a <b>$${math.listPrice.toFixed(2)}</b> ($${math.cashPrice.toFixed(2)} base + $${math.markup.toFixed(2)} de margen).<br><br>Como el Precio Anterior Tachado (<b>$${math.rawCompareAt.toFixed(2)}</b>) es menor o igual a <b>$${math.listPrice.toFixed(2)}</b>, el descuento no se verá en la tienda.<br><br>¿Deseas ajustarlo automáticamente a <b>$${math.suggestedCompareAt.toFixed(2)}</b> (sumándole el margen) para que la oferta sea visible?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0a0a0a',
                cancelButtonColor: '#737373',
                confirmButtonText: `Sí, ajustar a $${math.suggestedCompareAt.toFixed(2)} y Guardar`,
                cancelButtonText: 'Volver a revisar',
                customClass: {
                    popup: 'rounded-2xl font-sans text-xs p-6 shadow-xl border border-neutral-200/60',
                    confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5 bg-neutral-950 text-white',
                    cancelButton: 'rounded-xl text-xs font-bold px-4 py-2.5 bg-neutral-100 text-neutral-700 border border-neutral-200'
                }
            });

            if (!confirmFix.isConfirmed) return;
            resolvedCompareAt = math.suggestedCompareAt;
            updateForm('compareAt', math.suggestedCompareAt);
        }

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Acceso no autorizado.")

            const baseSkuResolved = formData.sku?.trim() || generateSmartSKU(formData.category, formData.name);

            const payload = {
                name: formData.name,
                sku: baseSkuResolved,
                category: formData.category,
                description: formData.description,
                image_url: formData.image_url,
                gallery: productGallery,
                usd_cash_price: Number(formData.price) || 0,
                usd_penalty: Number(formData.penalty) || 0,
                compare_at_usd: resolvedCompareAt,
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
                // 🚀 BIFURCACIÓN FOODTECH VS RETAIL
                if (storeSettings?.storeType === 'restaurant') {

                    await supabase.from('product_modifier_groups').delete().eq('product_id', currentId);

                    for (let i = 0; i < foodModifiers.length; i++) {
                        const group = foodModifiers[i];
                        let finalGroupId = group.id;

                        if (group.id.startsWith('temp-group-')) {
                            const { data: newGroup, error: groupErr } = await supabase
                                .from('modifier_groups')
                                .insert({
                                    store_id: storeSettings.id,
                                    name: group.name,
                                    is_required: group.is_required,
                                    min_selections: group.min_selections,
                                    max_selections: group.max_selections,
                                    selection_type: group.selection_type || 'single' // 🚀 FIX: Persistencia en BD
                                })
                                .select()
                                .single();

                            if (groupErr) throw groupErr;
                            finalGroupId = newGroup.id;

                            // 🚀 INCLUSIÓN DE image_url EN NUEVAS OPCIONES
                            if (group.modifier_options && group.modifier_options.length > 0) {
                                const optionsPayload = group.modifier_options.map((opt: any, optIdx: number) => ({
                                    group_id: finalGroupId,
                                    name: opt.name,
                                    price_adjustment_usd: Number(opt.price_adjustment_usd) || 0,
                                    image_url: opt.image_url || null, // 👈 AQUÍ
                                    is_available: true,
                                    display_order: optIdx
                                }));
                                const { error: optErr } = await supabase.from('modifier_options').insert(optionsPayload);
                                if (optErr) throw optErr;
                            }
                        } else {
                            const { error: updateErr } = await supabase
                                .from('modifier_groups')
                                .update({
                                    name: group.name,
                                    is_required: group.is_required,
                                    min_selections: group.min_selections,
                                    max_selections: group.max_selections,
                                    selection_type: group.selection_type || 'single' // 🚀 FIX: Persistencia en BD
                                })
                                .eq('id', group.id);

                            if (updateErr) throw updateErr;

                            await supabase.from('modifier_options').delete().eq('group_id', group.id);

                            // 🚀 INCLUSIÓN DE image_url EN OPCIONES ACTUALIZADAS
                            if (group.modifier_options && group.modifier_options.length > 0) {
                                const optionsPayload = group.modifier_options.map((opt: any, optIdx: number) => ({
                                    group_id: group.id,
                                    name: opt.name,
                                    price_adjustment_usd: Number(opt.price_adjustment_usd) || 0,
                                    image_url: opt.image_url || null, // 👈 AQUÍ
                                    is_available: true,
                                    display_order: optIdx
                                }));
                                await supabase.from('modifier_options').insert(optionsPayload);
                            }
                        }

                        await supabase.from('product_modifier_groups').insert({
                            product_id: currentId,
                            group_id: finalGroupId,
                            display_order: i
                        });
                    }
                } else {
                    // --- LÓGICA ORIGINAL DE RETAIL (ROPA / ACCESORIOS) ---
                    if (!hasVariants) {
                        await supabase.from('product_variants').delete().eq('product_id', currentId)
                    } else {
                        if (deletedVariantIds.length > 0) {
                            await supabase.from('product_variants').delete().in('id', deletedVariantIds)
                        }

                        const toInsert: any[] = []
                        const toUpdate: any[] = []

                        variants.forEach(v => {
                            const variantSkuResolved = v.sku?.trim() || generateSmartSKU(formData.category, `${formData.name || 'PRD'} ${v.color_name} ${v.size}`);
                            const vPayload = {
                                product_id: currentId,
                                sku: variantSkuResolved,
                                color_name: v.color_name,
                                color_hex: v.color_hex,
                                size: v.size,
                                stock: v.stock,
                                variant_image: v.variant_image,
                                gallery: v.gallery,
                                override_usd_price: v.override_usd_price ?? null,
                                override_usd_penalty: v.override_usd_penalty ?? null,
                                override_compare_at_usd: v.override_compare_at_usd ?? null,
                                override_cost_usd: v.override_cost_usd ?? null
                            }
                            if (v.id.startsWith('temp-')) toInsert.push(vPayload)
                            else toUpdate.push({ ...vPayload, id: v.id })
                        })

                        if (toInsert.length > 0) await supabase.from('product_variants').insert(toInsert)
                        if (toUpdate.length > 0) await supabase.from('product_variants').upsert(toUpdate)
                    }

                    // 🚀 CALIBRACIÓN LOGÍSTICA MULTIMODAL NON-BLOCKING (TrueWeight™ AI - Gemini 2.5 Flash)
                    // Analiza en segundo plano la foto (image_url) + título + variantes sin retrasar el guardado
                    fetch('/api/ai/logistics-enricher', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        keepalive: true,
                        body: JSON.stringify({
                            storeId: storeSettings!.id,
                            productIds: [Number(currentId)],
                        }),
                    }).catch(() => { });
                }
            }
            if (isMission1 || isMission2 || isMission3 || isMission4) {
                const { data: st } = await supabase.from('stores').select('onboarding_missions').eq('id', storeSettings!.id).single();
                const currentMissions = st?.onboarding_missions || { mission_1: false, mission_2: false, mission_3: false, mission_4: false };

                const missionKey = isMission1 ? 'mission_1' : isMission2 ? 'mission_2' : isMission3 ? 'mission_3' : 'mission_4';

                // 🚀 Trazabilidad: Guardamos el ID del producto demo en la tienda para borrado seguro futuro
                const prevDemoIds = Array.isArray(currentMissions.demo_product_ids) ? currentMissions.demo_product_ids : [];
                const updatedDemoIds = Array.from(new Set([...prevDemoIds, String(currentId)]));

                const missionPayload = {
                    ...currentMissions,
                    [missionKey]: true,
                    demo_product_ids: updatedDemoIds,
                };

                await supabase.from('stores').update({ onboarding_missions: missionPayload }).eq('id', storeSettings!.id);

                // 🚀 Purgar caché de servidor con tags
                await revalidateAdminDashboard();
                await revalidateStoreCache(storeSlug, storeSettings?.id);

                setIsDirty(false);

                await Swal.fire({
                    title: '¡Misión Completada!',
                    text: 'Felicidades. Tu avance ha quedado registrado en tu panel.',
                    icon: 'success',
                    confirmButtonColor: '#171717',
                    customClass: { popup: 'rounded-xl font-sans text-xs' }
                });

                // 🚀 Purgar caché del cliente y navegar (Se actualiza inmediatamente sin presionar F5)
                router.refresh();
                router.push('/admin');
                return;
            }
            await revalidateStoreCache(storeSlug, storeSettings?.id)

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
            <Loader2 className="animate-spin text-neutral-400" size={24} />
            <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider font-mono">Cargando ficha de producto...</p>
        </div>
    )

    const renderVariantColor = (hex: string) => {
        if (!hex || hex === 'transparent' || hex === '#transparent') return null;
        if (hex.includes(',')) {
            const [c1, c2] = hex.split(',');
            return (
                <div
                    className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0 shadow-xs"
                    style={{ background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}
                    title="Bicolor"
                />
            );
        }
        return (
            <div
                className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0 shadow-xs"
                style={{ backgroundColor: hex }}
            />
        );
    };


    return (
        <div className={`min-h-screen bg-[#FAFAFC] font-sans text-neutral-900 selection:bg-neutral-950 selection:text-white overflow-x-clip w-full max-w-[100vw] antialiased ${mission ? 'pb-80 md:pb-52' : 'pb-32'}`}>

            {/* 🚀 STICKY SMART HEADER: Solo se descubre e ilumina en el paso final exacto */}
            <div
                className={`bg-[#FAFAFC]/95 backdrop-blur-md px-4 md:px-8 py-4 flex justify-between items-center border-b border-neutral-200/50 sticky top-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${isHeaderVisible || currentTargetId === 'tour-save-btn' ? 'translate-y-0' : '-translate-y-full'
                    } ${currentTargetId === 'tour-save-btn'
                        ? 'z-[60] bg-white shadow-[0_15px_40px_rgba(0,0,0,0.08)] ring-4 ring-neutral-900/10 relative'
                        : 'z-40 bg-[#FAFAFC]/95'
                    }`}
            >
                <div className="flex items-center gap-3.5 min-w-0">
                    <button onClick={handleExit} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-400 transition-all shrink-0 shadow-xs active:scale-[0.98]" title="Volver">
                        <ArrowLeft className="text-neutral-600 group-hover:text-neutral-900 transition-colors w-4 h-4 md:w-4.5 md:h-4.5" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="font-bold text-sm md:text-base leading-none tracking-tight truncate text-neutral-900">{productId ? 'Editar Producto' : 'Nuevo Producto'}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                    <button onClick={handleExit} className="hidden md:block px-3 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-950 transition-colors uppercase tracking-wider">Cancelar</button>

                    {/* Botón Guardar Producto */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        id="tour-save-btn"
                        className={`bg-neutral-950 text-white px-4 md:px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-black active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-70 transition-all ${currentTargetId === 'tour-save-btn'
                            ? 'relative z-[70] ring-4 ring-neutral-950/20 shadow-[0_0_0_2px_#000000,0_10px_35px_rgba(0,0,0,0.35)] scale-105 pointer-events-auto cursor-pointer'
                            : 'shadow-xs'
                            }`}
                    >
                        {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Save strokeWidth={2} className="w-3.5 h-3.5" />}
                        <span className="hidden sm:block">Guardar Producto</span>
                        <span className="sm:hidden">Guardar</span>
                    </button>
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
                {isDirty && (
                    <div className="bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-white border border-amber-200 p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                            <AlertTriangle className="text-amber-600 w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-amber-900 leading-tight">Modificaciones sin confirmar</p>
                            <p className="text-[11px] font-medium text-amber-800">Recuerde presionar el botón <span className="font-bold text-amber-950 underline">Guardar Producto</span> en la cabecera antes de salir.</p>
                        </div>
                    </div>
                )}

                {/* CARD 1: INFORMACIÓN GENERAL */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-5">
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-200/50 flex items-center gap-2">
                            <FileText size={16} className="text-neutral-500" />
                            <span>1. Información Básica</span>
                        </h3>
                        <p className="text-xs text-neutral-600 font-medium mt-1">Configure los campos principales y la visibilidad de su artículo en catálogo.</p>
                    </div>

                    <div className="space-y-4">
                        <div id="tour-step-1-name" className={`scroll-mt-28 p-2 rounded-2xl md:scroll-mt-32 ${getUniversalSpotlightClass('tour-step-1-name')}`}>
                            <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5 block">Nombre del Producto</label>
                            <input
                                value={formData.name}
                                onChange={e => updateForm('name', e.target.value)}
                                placeholder={storeSettings?.storeType === 'restaurant' ? "Ej: Hamburguesa Doble Bacon BBQ, Pizza Familiar..." : "Ej: Zapatillas Deportivas Run Pro"}
                                className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-400"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative" ref={categoryDropdownRef}>
                                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5 block">Categoría de Colección</label>
                                <input
                                    value={formData.category}
                                    onChange={e => { updateForm('category', e.target.value); setIsCategoryDropdownOpen(true) }}
                                    onFocus={() => setIsCategoryDropdownOpen(true)}
                                    placeholder={storeSettings?.storeType === 'restaurant' ? "Ej: Hamburguesas, Entradas, Bebidas, Postres..." : "Ej: Calzado, Accesorios..."}
                                    className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-400"
                                />

                                <AnimatePresence>
                                    {isCategoryDropdownOpen && (
                                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-50 w-full mt-2 bg-white border border-neutral-200/50 rounded-lg shadow-sm overflow-hidden max-h-60 flex flex-col">
                                            {existingCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).length > 0 && (
                                                <div className="p-1.5 overflow-y-auto no-scrollbar">
                                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-2.5 py-1.5 block font-mono">Categorías Existentes</span>
                                                    {existingCategories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={(e) => { e.preventDefault(); updateForm('category', cat); setIsCategoryDropdownOpen(false); }}
                                                            className="w-full text-left px-2.5 py-2 rounded text-xs font-bold text-neutral-800 hover:bg-neutral-50 hover:text-neutral-950 transition-colors"
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
                                                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-neutral-900 flex items-center gap-1.5 hover:bg-white hover:shadow-xs border border-neutral-200/50 transition-all"
                                                    >
                                                        <Plus size={12} strokeWidth={2.5} className="text-neutral-700" />
                                                        <span>Crear nueva categoría: &quot;{formData.category}&quot;</span>
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5 block">Estado de Publicación</label>
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
                            <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5 block">Descripción Detallada</label>
                            <textarea
                                value={formData.description}
                                onChange={e => updateForm('description', e.target.value)}
                                placeholder={storeSettings?.storeType === 'restaurant' ? "Escriba los ingredientes principales, tamaño de porción, notas de alérgenos..." : "Escriba especificaciones del producto, dimensiones, materiales..."}
                                className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-400 min-h-24 resize-none leading-relaxed"
                            />
                        </div>

                        {/* ETIQUETA LOGÍSTICA / TIEMPO DE COCINA (POLIMÓRFICO) */}
                        <div className="pt-5 border-t border-neutral-200/50">
                            {storeSettings?.storeType === 'restaurant' ? (
                                // 🍔 VISTA FOODTECH: TIEMPO DE COCINA
                                <div id="tour-food-time" className={`space-y-4 p-3 rounded-xl transition-all scroll-mt-28 md:scroll-mt-32 ${getUniversalSpotlightClass('tour-food-time')}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <label className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider block">
                                                ⏱️ Tiempo de Cocina / Preparación (Opcional)
                                            </label>
                                            <p className="text-xs text-neutral-500 font-medium">
                                                Informa al comensal cuánto tarda en salir este plato para reducir la ansiedad de espera.
                                            </p>
                                        </div>

                                        {/* Botones de 1 Clic */}
                                        <div className="flex flex-wrap gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateForm('shipping_badge_title', '⚡ Inmediato');
                                                    updateForm('shipping_badge_desc', 'Listo para servir o despachar');
                                                }}
                                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[10px] font-bold transition-colors"
                                            >
                                                ⚡ Inmediato
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateForm('shipping_badge_title', '⏱️ 15-20 min');
                                                    updateForm('shipping_badge_desc', 'Preparado fresco al momento');
                                                }}
                                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[10px] font-bold transition-colors"
                                            >
                                                ⏱️ 15-20 min
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateForm('shipping_badge_title', '🔥 25-35 min');
                                                    updateForm('shipping_badge_desc', 'Cocción lenta a la plancha / horno');
                                                }}
                                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[10px] font-bold transition-colors"
                                            >
                                                🔥 25-35 min
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    updateForm('shipping_badge_title', '📅 Por Encargo');
                                                    updateForm('shipping_badge_desc', 'Requiere 24h de anticipación');
                                                }}
                                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[10px] font-bold transition-colors"
                                            >
                                                📅 Por Encargo
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                                        <div className="lg:col-span-2 space-y-4 flex flex-col justify-center">
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block font-mono">
                                                    Etiqueta visible (Corto)
                                                </label>
                                                <input
                                                    maxLength={25}
                                                    value={formData.shipping_badge_title}
                                                    onChange={e => updateForm('shipping_badge_title', e.target.value)}
                                                    placeholder="Ej: ⏱️ 15-20 min, Sale rápido..."
                                                    className="w-full bg-neutral-50/50 border border-neutral-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-900 outline-none transition-all placeholder:text-neutral-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block font-mono">
                                                    Detalle de cocina (Secundario)
                                                </label>
                                                <input
                                                    maxLength={60}
                                                    value={formData.shipping_badge_desc}
                                                    onChange={e => updateForm('shipping_badge_desc', e.target.value)}
                                                    placeholder="Ej: Hecho al momento en horno a la leña"
                                                    className="w-full bg-neutral-50/50 border border-neutral-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-900 outline-none transition-all placeholder:text-neutral-400"
                                                />
                                            </div>
                                        </div>

                                        {/* VISTA PREVIA EN VIVO DINÁMICA DE COMIDA (Cero Zapatos) */}
                                        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col justify-between items-center text-center shadow-2xs">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 font-mono">
                                                Vista Previa en Tienda
                                            </span>

                                            <div className="w-full bg-white border border-neutral-200 rounded-lg p-3.5 shadow-xs flex items-center gap-3 text-left">
                                                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 text-sm">
                                                    ⏱️
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-black text-neutral-900 truncate">
                                                        {formData.shipping_badge_title || 'Tiempo Estimado'}
                                                    </p>
                                                    <p className="text-[10px] font-medium text-neutral-500 truncate mt-0.5">
                                                        {formData.shipping_badge_desc || 'Preparación en cocina'}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="text-[10px] text-neutral-400 mt-2 font-medium">
                                                El comensal verá este distintivo al pedir.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // 👕 VISTA RETAIL (TU CÓDIGO ORIGINAL CON LA FOTO DEL NIKE)
                                <>
                                    <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1 block">
                                        Sobrescribir Mensaje de Entrega (Opcional)
                                    </label>
                                    <p className="text-xs text-neutral-500 font-medium mb-4">
                                        Fije un mensaje logístico específico solo para este producto. Déjelo vacío para heredar las reglas de despacho generales de la tienda.
                                    </p>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                                        <div className="lg:col-span-2 space-y-4 flex flex-col justify-center">
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block font-mono">Título breve</label>
                                                <input
                                                    maxLength={20}
                                                    value={formData.shipping_badge_title}
                                                    onChange={e => updateForm('shipping_badge_title', e.target.value)}
                                                    placeholder="Ej: Sobre Pedido"
                                                    className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block font-mono">Descripción extendida</label>
                                                <input
                                                    maxLength={50}
                                                    value={formData.shipping_badge_desc}
                                                    onChange={e => updateForm('shipping_badge_desc', e.target.value)}
                                                    placeholder="Ej: Tiempo de entrega: de 2 a 7 días hábiles"
                                                    className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-400"
                                                />
                                            </div>
                                        </div>

                                        {/* PREVISUALIZACIÓN RETAIL CON LIGHTBOX */}
                                        <div
                                            onClick={() => setIsPreviewZoomOpen(true)}
                                            className="bg-neutral-50/50 border border-neutral-200/50 rounded-lg p-3.5 flex flex-col justify-between items-center text-center cursor-zoom-in group hover:bg-neutral-100/50 hover:border-neutral-300 transition-colors shadow-xs"
                                        >
                                            <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-2 block font-mono">Ejemplo en Catálogo</span>

                                            <div className="relative w-full aspect-square rounded bg-white border border-neutral-200/50 overflow-hidden flex items-center justify-center">
                                                <Image
                                                    src="/shipping-badge-preview.webp"
                                                    alt="Vista previa del mensaje de envío"
                                                    fill
                                                    sizes="(max-width: 1024px) 100vw, 250px"
                                                    className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                                                    priority
                                                />
                                                <div className="absolute inset-0 bg-neutral-950/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="bg-white/95 text-neutral-900 text-[10px] font-bold px-2.5 py-1 rounded shadow-sm border border-neutral-200/50 inline-flex items-center gap-1">
                                                        <Eye size={11} />
                                                        <span>Ampliar vista</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="text-[10px] text-neutral-500 mt-2 font-medium">Así lo visualizará su cliente en el checkout.</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* CARD 1.5: MERCHANDISING Y ESCAPARATE */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-200/50 flex items-center gap-1.5">
                            <Star size={16} className="fill-amber-500 text-amber-500" />
                            <span>Exhibición Destacada</span>
                        </h3>
                        <p className="text-xs text-neutral-600 font-medium mt-1">Configure si desea que este artículo gane mayor relevancia dentro de su catálogo virtual.</p>
                    </div>

                    <div id="tour-step-3-featured" className={`p-1.5 -m-1.5 rounded-xl scroll-mt-28 md:scroll-mt-32 ${getUniversalSpotlightClass('tour-step-3-featured')}`}>
                        <div
                            className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${formData.is_featured ? 'bg-neutral-950 border-transparent text-white' : 'bg-neutral-50/50 border-neutral-200/50 hover:bg-neutral-100/50 text-neutral-800'}`}
                            onClick={() => updateForm('is_featured', !formData.is_featured)}
                        >
                            <div className="pr-4 mb-3 sm:mb-0 space-y-0.5">
                                <p className="font-bold text-xs flex items-center gap-1.5">
                                    <Star size={14} className={formData.is_featured ? 'fill-amber-400 text-amber-400' : 'text-neutral-500'} />
                                    <span>Fijar en Carrusel de Destacados</span>
                                </p>
                                <p className={`text-xs ${formData.is_featured ? 'text-neutral-300 font-normal' : 'text-neutral-600 font-medium'}`}>
                                    El producto se anclará en la sección principal de su tienda para maximizar su conversión de venta.
                                </p>
                            </div>
                            <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 ${formData.is_featured ? 'bg-white border-white justify-end' : 'bg-neutral-200 border-neutral-300 justify-start'}`}>
                                <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 30 }} className={`w-4 h-4 rounded-full ${formData.is_featured ? 'bg-neutral-950' : 'bg-neutral-400'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: MEDIOS Y GALERÍA */}
                <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-5">
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-200/50 flex items-center gap-2">
                            <ImageIcon size={16} className="text-neutral-500" />
                            <span>2. Galería de Imágenes</span>
                        </h3>
                        <p className="text-xs text-neutral-600 font-medium mt-1">Gestione el material gráfico promocional de su producto.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Foto Principal */}
                        <div id="tour-step-1-image" className={`w-full md:w-1/3 p-1.5 rounded-2xl scroll-mt-28 md:scroll-mt-32 ${getUniversalSpotlightClass('tour-step-1-image')}`}>
                            <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5 block">Imagen Principal (Portada)</label>
                            <input type="file" ref={mainImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'main')} />

                            <div
                                onClick={() => mainImageInputRef.current?.click()}
                                className={`aspect-square bg-neutral-50/50 rounded-lg border border-dashed border-neutral-300 ${uploading ? 'animate-pulse bg-neutral-100' : 'hover:border-neutral-500 hover:bg-neutral-50'} flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all shadow-xs`}
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
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2.5 text-neutral-500 border border-neutral-200/60 transition-colors shadow-xs">
                                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                                        </div>
                                        <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Subir Portada</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Galería Adicional */}
                        <div className="flex-1 w-full space-y-3">
                            <div className="flex justify-between items-center text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                                <span>Tomas de apoyo (Carrusel)</span>
                                <span className="font-mono text-neutral-600">{productGallery.length}/3</span>
                            </div>

                            <input type="file" multiple ref={productGalleryInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'productGallery')} />

                            <div className="flex gap-3 h-28 md:h-32 overflow-x-auto no-scrollbar snap-x pb-2">
                                <button
                                    onClick={() => productGalleryInputRef.current?.click()}
                                    disabled={productGallery.length >= 3 || uploading}
                                    className="w-28 md:w-32 h-full rounded-lg border border-dashed border-neutral-300 flex flex-col gap-2 items-center justify-center hover:border-neutral-500 hover:bg-white transition-all disabled:opacity-50 text-neutral-600 hover:text-neutral-950 shrink-0 bg-neutral-50/50 shadow-xs"
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={20} /> : <><ImagePlus size={18} /><span className="text-[10px] font-bold uppercase tracking-wider">Añadir Foto</span></>}
                                </button>

                                {productGallery.map((img, idx) => (
                                    <div key={idx} className="relative w-28 md:w-32 h-full rounded-lg border border-neutral-200/60 overflow-hidden group bg-white shrink-0 shadow-xs">
                                        <Image
                                            src={getOptimizedUrl(img)}
                                            alt={`Galería ${idx + 1}`}
                                            fill
                                            sizes="160px"
                                            className="object-cover"
                                        />
                                        <button onClick={() => removeImageFromGallery(idx)} className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white transition-opacity">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-neutral-600 font-medium leading-relaxed">Estas imágenes se desplegarán como un carrusel secundario en su catálogo, a menos que el cliente filtre variantes con fotos específicas asociadas.</p>
                        </div>
                    </div>
                </div>

                {/* CARD 3: CONFIGURACIÓN DE PRECIOS (ESTÁNDAR STRIPE / LINEAR · MOBILE-FIRST) */}
                <div className="bg-white p-5 md:p-8 rounded-xl border border-neutral-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-5">
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-3 border-b border-neutral-200/50 flex items-center gap-2">
                            <DollarSign size={16} className="text-neutral-500" />
                            <span>3. Precio del Producto</span>
                        </h3>
                        <p className="text-xs text-neutral-500 font-normal mt-1.5 leading-relaxed">
                            Define el precio de venta de tu artículo. Los campos de margen operativo, oferta y cálculo de ganancia son opcionales.
                        </p>
                    </div>

                    {/* GRILLA SIMÉTRICA DE 3 CAMPOS (MISMA SUPERFICIE LIMPIA EN LOS 3 INPUTS) */}
                    <div
                        id="tour-step-3-pricing-grid"
                        className={`grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 scroll-mt-28 md:scroll-mt-32 rounded-xl transition-all ${currentTargetId === 'tour-step-3-pricing-grid'
                            ? 'relative z-[60] bg-white p-2.5 -m-2.5 ring-4 ring-neutral-900/15 shadow-2xl pointer-events-auto'
                            : ''
                            }`}
                    >
                        {/* 1. PRECIO DE VENTA (BASE) */}
                        <div id="tour-step-1-price" className={`rounded-xl ${currentTargetId === 'tour-step-1-price' ? `p-2 -m-2 ${getUniversalSpotlightClass('tour-step-1-price')}` : ''}`}>
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider truncate">
                                    1. Precio de Venta *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setActivePriceHelp(activePriceHelp === 'base' ? null : 'base')}
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors shrink-0 cursor-pointer border ${activePriceHelp === 'base'
                                        ? 'bg-neutral-950 text-white border-neutral-950'
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500 border-neutral-200/80'
                                        }`}
                                    title="Ayuda sobre Precio de Venta"
                                >
                                    ?
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                <NumberInput
                                    min="0"
                                    value={formData.price}
                                    onChangeValue={(val) => updateForm('price', val)}
                                    placeholder="0.00"
                                    className="w-full bg-neutral-50/70 border border-neutral-200/80 hover:border-neutral-300 focus:bg-white focus:border-neutral-950 rounded-xl pl-7 pr-3 py-2.5 text-xs font-bold text-neutral-900 outline-none transition-all font-mono text-left tabular-nums"
                                />
                            </div>
                            <span className="text-[10px] text-neutral-400 font-medium mt-1.5 block truncate">
                                Precio principal del artículo
                            </span>
                        </div>

                        {/* 2. MARGEN OPERATIVO (OPCIONAL) */}
                        <div id="tour-step-4-penalty" className={`rounded-xl ${currentTargetId === 'tour-step-4-penalty' ? `p-2 -m-2 ${getUniversalSpotlightClass('tour-step-4-penalty')}` : ''}`}>
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider truncate">
                                    2. Margen Operativo
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setActivePriceHelp(activePriceHelp === 'penalty' ? null : 'penalty')}
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors shrink-0 cursor-pointer border ${activePriceHelp === 'penalty'
                                        ? 'bg-neutral-950 text-white border-neutral-950'
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500 border-neutral-200/80'
                                        }`}
                                    title="Ayuda sobre Margen Operativo"
                                >
                                    ?
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                <NumberInput
                                    min="0"
                                    value={formData.penalty}
                                    onChangeValue={(val) => updateForm('penalty', val)}
                                    placeholder="0.00 (Opcional)"
                                    className="w-full bg-neutral-50/70 border border-neutral-200/80 hover:border-neutral-300 focus:bg-white focus:border-neutral-950 rounded-xl pl-7 pr-3 py-2.5 text-xs font-bold text-neutral-900 outline-none transition-all font-mono text-left tabular-nums"
                                />
                            </div>
                            <span className="text-[10px] text-neutral-400 font-medium mt-1.5 block truncate">
                                {math.markup > 0
                                    ? <>Precio de lista resultante: <b className="text-neutral-700 font-mono">${math.listPrice.toFixed(2)}</b></>
                                    : 'Opcional · Diferencial sobre el precio base'}
                            </span>
                        </div>

                        {/* 3. PRECIO ANTERIOR TACHADO (OFERTA) - Superficie neutra idéntica + Píldora de descuento interna */}
                        <div id="tour-step-3-compare-at" className="rounded-xl">
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider truncate">
                                    3. Precio Tachado
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setActivePriceHelp(activePriceHelp === 'compare' ? null : 'compare')}
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors shrink-0 cursor-pointer border ${activePriceHelp === 'compare'
                                        ? 'bg-neutral-950 text-white border-neutral-950'
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500 border-neutral-200/80'
                                        }`}
                                    title="Ayuda sobre Precio Tachado"
                                >
                                    ?
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                <NumberInput
                                    min="0"
                                    value={formData.compareAt}
                                    onChangeValue={(val) => updateForm('compareAt', val)}
                                    placeholder="0.00 (Opcional)"
                                    className={`w-full bg-neutral-50/70 border hover:border-neutral-300 focus:bg-white rounded-xl pl-7 pr-16 py-2.5 text-xs font-bold text-neutral-900 outline-none transition-all font-mono text-left tabular-nums ${math.isCompareAtInvalid
                                        ? 'border-amber-400 ring-2 ring-amber-400/15 focus:border-amber-500'
                                        : 'border-neutral-200/80 focus:border-neutral-950'
                                        }`}
                                />
                                {math.isCompareAtValid && !math.hasCampaignOverride && (
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/80 font-mono text-[9px] font-bold uppercase">
                                        -{math.promoDiscountPercent}%
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-neutral-400 font-medium mt-1.5 block truncate">
                                {math.listPrice > 0
                                    ? <>Opcional · Mayor a <b className="text-neutral-700 font-mono">${math.listPrice.toFixed(2)}</b> para oferta</>
                                    : 'Opcional · Para mostrar rebaja'}
                            </span>
                        </div>
                    </div>

                    {/* 💡 PANEL DE AYUDA RÁPIDA (LENGUAJE SENCILLO Y NEUTRAL) */}
                    <AnimatePresence initial={false}>
                        {activePriceHelp && (
                            <motion.div
                                key={activePriceHelp}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden will-change-[height,opacity]"
                            >
                                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-start justify-between gap-3">
                                    <div className="space-y-1 text-xs">
                                        {activePriceHelp === 'base' && (
                                            <>
                                                <p className="font-bold text-neutral-900">1. Precio de Venta</p>
                                                <p className="text-neutral-600 leading-relaxed">
                                                    Es el precio base de tu producto. Si no utilizas margen operativo adicional, este será el único precio del artículo para cualquier método de pago (convertido automáticamente a Bolívares a tasa BCV).
                                                </p>
                                            </>
                                        )}
                                        {activePriceHelp === 'penalty' && (
                                            <>
                                                <p className="font-bold text-neutral-900">2. Margen Operativo (Opcional)</p>
                                                <p className="text-neutral-600 leading-relaxed">
                                                    Úsalo solo si manejas un precio de lista general mayor a tu precio promocional en divisas.{' '}
                                                    {math.cashPrice > 0 && math.markup > 0 ? (
                                                        <>Con tus datos actuales, el precio de lista en vitrina es <b>${math.listPrice.toFixed(2)}</b> (${math.cashPrice.toFixed(2)} + ${math.markup.toFixed(2)}), ofreciendo un incentivo de ahorro para pagos directos en divisas de <b>${math.cashPrice.toFixed(2)}</b>.</>
                                                    ) : (
                                                        <>Si manejas un solo precio para todos los métodos de pago, déjalo vacío o en 0.</>
                                                    )}
                                                </p>
                                            </>
                                        )}
                                        {activePriceHelp === 'compare' && (
                                            <>
                                                <p className="font-bold text-neutral-900">3. Precio Tachado (Opcional)</p>
                                                <p className="text-neutral-600 leading-relaxed">
                                                    Úsalo cuando quieras mostrar una oferta visual (ej. <i>Antes $40, Ahora $30</i>). Solo debe ser mayor al precio de vitrina actual (<b>${math.listPrice.toFixed(2)}</b>). Si no tienes oferta activa, déjalo vacío.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActivePriceHelp(null)}
                                        className="p-1 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-200/60 transition-colors shrink-0 cursor-pointer"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 💎 CALCULADORA DESPLEGABLE DE COSTO Y GANANCIA (SE PLIEGA AL 100% AL PULSAR CERRAR) */}
                    <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden">
                        {/* Barra Superior Compacta (44px · 1 sola línea en Mobile y Desktop) */}
                        <button
                            type="button"
                            onClick={() => setIsCostPanelOpen(prev => !prev)}
                            className="flex items-center justify-between w-full px-3.5 py-3 text-left transition-colors cursor-pointer group/cost hover:bg-neutral-50/70"
                        >
                            <div className="flex items-center gap-2 min-w-0 pr-2 flex-wrap sm:flex-nowrap">
                                <span className="w-5 h-5 rounded-md bg-neutral-100 group-hover/cost:bg-neutral-200/80 text-neutral-700 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 transition-colors">
                                    {isCostPanelOpen ? '−' : '+'}
                                </span>
                                <span className="text-xs font-bold text-neutral-900 leading-none truncate">
                                    Costo y margen de ganancia
                                </span>

                                {!isCostPanelOpen ? (
                                    math.hasCost && math.cashPrice > 0 && math.netProfitCash !== null ? (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 leading-none ${math.netProfitCash < 0
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                {math.netProfitCash >= 0 ? `+$${math.netProfitCash.toFixed(2)}` : `-$${Math.abs(math.netProfitCash).toFixed(2)}`}
                                                {math.grossMarginCashPct !== null && math.grossMarginCashPct >= 0 ? ` (${math.grossMarginCashPct}%)` : ' · En pérdida'}
                                            </span>

                                            {math.netProfitCash >= 0 && (math.lossScenarios.length > 0 || math.variantsBelowCost.length > 0) && (
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0 leading-none">
                                                    ⚠️ {math.variantsBelowCost.length > 0 ? 'Variante bajo costo' : 'Alerta en descuento'}
                                                </span>
                                            )}
                                        </div>
                                    ) : !math.hasCost && math.variantsBelowCost.length > 0 ? (
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0 leading-none">
                                            ⚠️ {math.variantsBelowCost.length} {math.variantsBelowCost.length === 1 ? 'variante bajo costo' : 'variantes bajo costo'}
                                        </span>
                                    ) : math.hasCost && math.cashPrice === 0 ? (
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shrink-0 leading-none">
                                            Costo: ${math.unitCost?.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-neutral-400 font-medium truncate">
                                            (Opcional)
                                        </span>
                                    )
                                ) : (
                                    <span className="text-[10px] text-neutral-400 font-medium truncate">
                                        (Privado · Solo visible para ti)
                                    </span>
                                )}
                            </div>

                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors shrink-0 ${isCostPanelOpen
                                    ? 'bg-neutral-950 text-white'
                                    : 'bg-neutral-100 text-neutral-600 group-hover/cost:bg-neutral-200/70'
                                }`}>
                                {isCostPanelOpen ? 'Cerrar' : 'Calcular'}
                            </span>
                        </button>

                        {/* Cuerpo Desplegable */}
                        <AnimatePresence initial={false}>
                            {isCostPanelOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden will-change-[height,opacity]"
                                >
                                    <div className="p-4 border-t border-neutral-100 bg-neutral-50/40 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                        {/* Columna 1: Input de Costo */}
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block mb-1.5">
                                                Costo por unidad
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                <NumberInput
                                                    min="0"
                                                    value={formData.cost}
                                                    onChangeValue={(val) => updateForm('cost', val)}
                                                    placeholder="0.00"
                                                    className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-neutral-900 outline-none transition-all font-mono text-left tabular-nums"
                                                />
                                            </div>
                                            <span className="text-[10px] text-neutral-400 font-medium mt-1 block truncate">
                                                Lo que te cuesta adquirirlo o producirlo
                                            </span>
                                        </div>

                                        {/* Columna 2: Ganancia Libre */}
                                        <div className="sm:pl-5 sm:border-l border-neutral-200/70 flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                                Tu Ganancia Libre
                                            </span>
                                            {math.hasCost && math.cashPrice > 0 && math.netProfitCash !== null ? (
                                                <>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${math.netProfitCash < 0 ? 'bg-rose-500' : math.netProfitCash === 0 ? 'bg-neutral-400' : 'bg-emerald-500'
                                                            }`} />
                                                        <span className={`font-mono text-xl font-black tabular-nums tracking-tight leading-none ${math.netProfitCash < 0
                                                                ? 'text-rose-600'
                                                                : math.netProfitCash === 0
                                                                    ? 'text-neutral-700'
                                                                    : 'text-emerald-600'
                                                            }`}>
                                                            {math.netProfitCash >= 0
                                                                ? `+$${math.netProfitCash.toFixed(2)}`
                                                                : `-$${Math.abs(math.netProfitCash).toFixed(2)}`}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-neutral-400 font-medium mt-1.5 truncate">
                                                        Sobre tu precio de venta (${math.cashPrice.toFixed(2)})
                                                    </span>
                                                </>
                                            ) : math.hasCost && math.cashPrice === 0 ? (
                                                <>
                                                    <span className="text-xs font-bold text-amber-700 mt-1">
                                                        Falta el Precio de Venta
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400 font-medium mt-1 truncate">
                                                        Indica arriba a cuánto lo vendes
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-lg font-mono font-bold text-neutral-300 mt-0.5">—</span>
                                                    <span className="text-[10px] text-neutral-400 font-medium mt-0.5 truncate">
                                                        Ingresa tu costo a la izquierda
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Columna 3: Margen % */}
                                        <div className="sm:pl-5 sm:border-l border-neutral-200/70 flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                                Margen
                                            </span>
                                            {math.hasCost && math.cashPrice > 0 && math.grossMarginCashPct !== null ? (
                                                <>
                                                    <div className="flex items-baseline gap-2 mt-1">
                                                        <span className={`font-mono text-xl font-black tabular-nums tracking-tight leading-none ${math.grossMarginCashPct < 0
                                                                ? 'text-rose-600'
                                                                : math.grossMarginCashPct < 10
                                                                    ? 'text-amber-600'
                                                                    : 'text-neutral-900'
                                                            }`}>
                                                            {math.grossMarginCashPct > 0
                                                                ? `${math.grossMarginCashPct}%`
                                                                : math.grossMarginCashPct === 0
                                                                    ? '0%'
                                                                    : 'Sin margen'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-neutral-400 font-medium mt-1.5 truncate">
                                                        {math.isTaxableStore
                                                            ? (formData.is_tax_exempt ? 'Producto exento de IVA' : 'Calculado sobre precio sin IVA')
                                                            : 'Porcentaje libre para ti'}
                                                    </span>
                                                </>
                                            ) : math.hasCost && math.cashPrice === 0 && math.unitCost ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateForm('price', Math.ceil(math.unitCost! / 0.8))}
                                                        className="mt-1 self-start px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white text-[10px] font-mono font-bold transition-colors cursor-pointer active:scale-95"
                                                    >
                                                        Sugerir ${Math.ceil(math.unitCost / 0.8).toFixed(2)} (+20%)
                                                    </button>
                                                    <span className="text-[10px] text-neutral-400 font-medium mt-1 truncate">
                                                        Asignar precio sugerido
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-lg font-mono font-bold text-neutral-300 mt-0.5">—</span>
                                                    <span className="text-[10px] text-neutral-400 font-medium mt-0.5 truncate">
                                                        Se calcula automáticamente
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 🚨 ALERTAS DE PÉRDIDA (Funciona tanto por costo padre como por costo propio de variante) */}
                                    {(math.lossScenarios.length > 0 || math.variantsBelowCost.length > 0) && (
                                        <div className="px-4 py-3 bg-rose-50/80 border-t border-rose-200/70 space-y-2.5">
                                            {math.lossScenarios.map(sc => {
                                                const isGuideOpen = openWhatToDoId === sc.id
                                                return (
                                                    <div key={sc.id} className="space-y-1.5">
                                                        <div className="flex items-start gap-2 text-xs text-rose-900">
                                                            <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                                            <p className="leading-snug flex-1">
                                                                <b>{sc.title}:</b> {sc.summary}{' '}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setOpenWhatToDoId(isGuideOpen ? null : sc.id)}
                                                                    className="font-bold underline underline-offset-2 text-rose-700 hover:text-black transition-colors cursor-pointer whitespace-nowrap ml-1"
                                                                >
                                                                    {isGuideOpen ? 'Ocultar ayuda' : '¿Qué hacer?'}
                                                                </button>
                                                            </p>
                                                        </div>

                                                        <AnimatePresence initial={false}>
                                                            {isGuideOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                                    className="overflow-hidden will-change-[height,opacity]"
                                                                >
                                                                    <div className="ml-5 p-3 rounded-lg bg-white border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                                        <p className="text-[11px] text-neutral-700 leading-relaxed">
                                                                            💡 <b>Solución:</b> {sc.whatToDo}
                                                                        </p>
                                                                        {sc.suggestedBasePrice && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newBase = sc.suggestedBasePrice!
                                                                                    updateForm('price', newBase)
                                                                                    // Si tenía un Precio Tachado activo que quedaría por debajo del nuevo precio de vitrina, lo ajustamos automáticamente
                                                                                    const newList = newBase + math.markup
                                                                                    if (math.rawCompareAt > 0 && math.rawCompareAt <= newList) {
                                                                                        updateForm('compareAt', Math.ceil(newList * 1.15))
                                                                                    }
                                                                                    setOpenWhatToDoId(null)
                                                                                }}
                                                                                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                                            >
                                                                                Subir precio a ${sc.suggestedBasePrice.toFixed(2)}
                                                                            </button>
                                                                        )}
                                                                        {sc.suggestedWholesalePct !== null && sc.suggestedWholesalePct !== undefined && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFormData(prev => ({
                                                                                        ...prev,
                                                                                        wholesale_active: true,
                                                                                        wholesale_discount_pct: sc.suggestedWholesalePct!
                                                                                    }))
                                                                                    setIsDirty(true)
                                                                                    setOpenWhatToDoId(null)
                                                                                }}
                                                                                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                                            >
                                                                                Fijar mayorista en {sc.suggestedWholesalePct}%
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )
                                            })}

                                         {math.variantsBelowCost.length > 0 && (() => {
                                                const isVarGuideOpen = openWhatToDoId === 'variants_loss'
                                                const firstBadVar = math.variantsBelowCost[0]
                                                const firstBadPrice = Number(firstBadVar?.override_usd_price || math.cashPrice || 0)
                                                const firstBadCost = Number(firstBadVar?.override_cost_usd || math.unitCost || 0)
                                                return (
                                                    <div className="space-y-1.5">
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                                            <div className="flex items-start gap-2 text-xs text-rose-900">
                                                                <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                                                <p className="leading-snug flex-1">
                                                                    <b>Variante bajo costo:</b>{' '}
                                                                    {math.variantsBelowCost.length === 1
                                                                        ? <>La variante <b>&quot;{firstBadVar.color_name} ({firstBadVar.size})&quot;</b> se vende a <b className="font-mono">${firstBadPrice.toFixed(2)}</b> pero cuesta <b className="font-mono">${firstBadCost.toFixed(2)}</b>.</>
                                                                        : <>Tienes <b>{math.variantsBelowCost.length} variantes</b> con un precio menor a su costo.</>}{' '}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenWhatToDoId(isVarGuideOpen ? null : 'variants_loss')}
                                                                        className="font-bold underline underline-offset-2 text-rose-700 hover:text-black transition-colors cursor-pointer whitespace-nowrap ml-1"
                                                                    >
                                                                        {isVarGuideOpen ? 'Ocultar ayuda' : '¿Qué hacer?'}
                                                                    </button>
                                                                </p>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const el = document.getElementById('tour-step-2-matrix')
                                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                                    if (firstBadVar?.id) setExpandedVariantId(firstBadVar.id)
                                                                }}
                                                                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                            >
                                                                Ver variante ↓
                                                            </button>
                                                        </div>

                                                        <AnimatePresence initial={false}>
                                                            {isVarGuideOpen && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                                    className="overflow-hidden will-change-[height,opacity]"
                                                                >
                                                                    <div className="ml-5 p-3 rounded-lg bg-white border border-rose-200 text-[11px] text-neutral-700 leading-relaxed">
                                                                        💡 <b>Solución:</b> Toca &quot;Ver variante&quot; para ir directamente a esa talla/color y subir su &quot;1. Precio Propio&quot; o ajustar su &quot;4. Costo Propio&quot;.
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 🟠 AVISO PREVENTIVO SI EL MARGEN OPERATIVO SUPERA AL PRECIO DE VENTA (Evita que pongan la Tasa BCV o Bolívares por error) */}
                    <AnimatePresence initial={false}>
                        {math.cashPrice > 0 && math.markup > math.cashPrice && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden will-change-[height,opacity]"
                            >
                                <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-950 leading-snug">
                                            <b>¿El Margen Operativo (${math.markup.toFixed(2)}) es correcto?</b> Es mayor que el precio del producto (${math.cashPrice.toFixed(2)}) y sube el precio en vitrina a <b className="font-mono">${math.listPrice.toFixed(2)}</b>. Recuerda que este campo es en <b>dólares ($)</b>, no en Bolívares ni la tasa BCV.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateForm('penalty', '')}
                                        className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                    >
                                        Quitar margen
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 🏷️ DETECTOR DE CAMPAÑA ACTIVA VINCULADA */}
                    <AnimatePresence initial={false}>
                        {bestActiveCampaign && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden will-change-[height,opacity]"
                            >
                                <div className="p-4 bg-neutral-950 text-white border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <Percent size={15} />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xs font-bold text-white leading-tight">
                                                    Incluido en la campaña: &quot;{bestActiveCampaign.title}&quot;
                                                </p>
                                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold uppercase tracking-wider">
                                                    {bestActiveCampaign.promo_type === 'percentage'
                                                        ? `-${bestActiveCampaign.discount_percentage}% en Tienda`
                                                        : bestActiveCampaign.promo_type === 'bogo'
                                                            ? `${bestActiveCampaign.bogo_buy}x${bestActiveCampaign.bogo_pay}`
                                                            : 'Banner Visual'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-neutral-300 font-normal leading-relaxed">
                                                {math.hasCampaignOverride ? (
                                                    <>
                                                        Esta campaña aplica un <b className="text-white">-{math.campaignDiscountPct}%</b> automático sobre tus precios (quedando en <b className="text-emerald-400 font-mono">${math.finalStoreListPrice.toFixed(2)}</b> en vitrina).
                                                    </>
                                                ) : (
                                                    <>Este producto participa actualmente en la campaña &quot;{bestActiveCampaign.title}&quot;.</>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isUnlinkingPromo}
                                        onClick={() => handleUnlinkFromCampaign(bestActiveCampaign)}
                                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
                                    >
                                        {isUnlinkingPromo ? 'Excluyendo...' : 'Excluir de esta campaña'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 🟠 ALERTA ÁMBAR LIMPIA: Precio Tachado menor o igual al Precio en Vitrina + "¿Qué hacer?" */}
                    <AnimatePresence initial={false}>
                        {math.isCompareAtInvalid && !math.hasCampaignOverride && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden will-change-[height,opacity]"
                            >
                                <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2.5">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-950 leading-snug">
                                                <b>La oferta no se mostrará en tu tienda:</b> El precio tachado (<span className="font-mono font-bold">${math.rawCompareAt.toFixed(2)}</span>) debe ser mayor al precio de vitrina (<span className="font-mono font-bold">${math.listPrice.toFixed(2)}</span>).{' '}
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenWhatToDoId(openWhatToDoId === 'compare_invalid' ? null : 'compare_invalid')}
                                                    className="font-bold underline underline-offset-2 text-amber-800 hover:text-black transition-colors cursor-pointer whitespace-nowrap ml-1"
                                                >
                                                    {openWhatToDoId === 'compare_invalid' ? 'Ocultar ayuda' : '¿Qué hacer?'}
                                                </button>
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateForm('compareAt', math.suggestedCompareAt)
                                                setOpenWhatToDoId(null)
                                            }}
                                            className="px-3.5 py-1.5 bg-neutral-950 hover:bg-black text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                        >
                                            Ajustar a ${math.suggestedCompareAt.toFixed(2)}
                                        </button>
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {openWhatToDoId === 'compare_invalid' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                className="overflow-hidden will-change-[height,opacity]"
                                            >
                                                <div className="ml-6 p-3 rounded-lg bg-white border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                                                    💡 <b>¿Por qué pasa esto?</b> El precio público del producto es <b>${math.listPrice.toFixed(2)}</b>. Para mostrar una rebaja, el Precio Tachado tiene que ser mayor a <b>${math.listPrice.toFixed(2)}</b> (por ejemplo, <b>${math.suggestedCompareAt.toFixed(2)}</b>), o déjalo vacío si no está en oferta.
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 🟠 ALERTA ÁMBAR LIMPIA: Variantes con precio fijo propio al cambiar el precio base */}
                    <AnimatePresence initial={false}>
                        {isBasePriceModified && variantsWithCustomPrice.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden will-change-[height,opacity]"
                            >
                                <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-950 leading-snug">
                                                <b>Nota sobre tus variantes:</b>{' '}
                                                {variantsWithCustomPrice.length === 1
                                                    ? `La variante "${variantsWithCustomPrice[0].color_name}" tiene un precio fijo propio ($${Number(variantsWithCustomPrice[0].override_usd_price).toFixed(2)}) y no cambiará automáticamente.`
                                                    : `Tienes ${variantsWithCustomPrice.length} variantes con precio fijo propio que no cambiarán con este nuevo precio.`}{' '}
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenWhatToDoId(openWhatToDoId === 'variant_custom_price' ? null : 'variant_custom_price')}
                                                    className="font-bold underline underline-offset-2 text-amber-800 hover:text-black transition-colors cursor-pointer whitespace-nowrap ml-1"
                                                >
                                                    {openWhatToDoId === 'variant_custom_price' ? 'Ocultar ayuda' : '¿Qué hacer?'}
                                                </button>
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={scrollToVariantMatrix}
                                            className="px-3 py-1.5 bg-neutral-950 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-all active:scale-95 shrink-0 cursor-pointer"
                                        >
                                            Ver Variantes ↓
                                        </button>
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {openWhatToDoId === 'variant_custom_price' && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                className="overflow-hidden will-change-[height,opacity]"
                                            >
                                                <div className="ml-6 p-3 rounded-lg bg-white border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                                                    💡 <b>Solución:</b> Si quieres que todas las tallas/colores usen el nuevo precio de <b>${Number(formData.price || 0).toFixed(2)}</b>, toca &quot;Ver Variantes&quot; y presiona <i>&quot;Heredar&quot;</i> en su campo de Precio Propio.
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* EXENCIÓN FISCAL (SENIAT) - Solo visible si la tienda es Contribuyente Ordinario o Especial */}
                    {math.isTaxableStore && (
                        <div
                            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${formData.is_tax_exempt
                                ? 'bg-emerald-50 border-emerald-200/70 text-emerald-900'
                                : 'bg-neutral-50/50 border-neutral-200/60 hover:bg-neutral-100/50 text-neutral-800'
                                }`}
                            onClick={() => updateForm('is_tax_exempt', !formData.is_tax_exempt)}
                        >
                            <div className="pr-4 mb-3 sm:mb-0 space-y-0.5">
                                <p className="font-bold text-xs flex items-center gap-1.5">
                                    <Receipt size={14} className={formData.is_tax_exempt ? 'text-emerald-700' : 'text-neutral-600'} />
                                    <span>Producto Exento de IVA (0%)</span>
                                </p>
                                <p className={`text-xs ${formData.is_tax_exempt ? 'text-emerald-800 font-medium' : 'text-neutral-500 font-normal'}`}>
                                    Actívalo si este artículo no cobra IVA según la normativa del SENIAT.
                                </p>
                            </div>
                            <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 ${formData.is_tax_exempt ? 'bg-emerald-600 border-emerald-600 justify-end' : 'bg-neutral-200 border-neutral-300 justify-start'}`}>
                                <motion.div layout transition={{ type: "spring", stiffness: 600, damping: 30 }} className={`w-4 h-4 rounded-full ${formData.is_tax_exempt ? 'bg-white' : 'bg-neutral-400'}`} />
                            </div>
                        </div>
                    )}
                </div>

                {/* 💎 TARJETA NEGRA DE VISTA PREVIA: ADAPTATIVA (1 COLUMNA LIMPIA SI ES PRECIO ÚNICO, 2 COLUMNAS SI HAY DIFERENCIAL) */}
                <div id="tour-step-4-card" className={`p-2.5 -m-2.5 rounded-xl scroll-mt-28 md:scroll-mt-32 ${getUniversalSpotlightClass('tour-step-4-card')}`}>
                    <div className="bg-neutral-950 text-white rounded-2xl border border-neutral-800/90 shadow-lg overflow-hidden">
                        {/* Cabecera de Telemetría */}
                        <div className="px-5 py-3.5 bg-white/[0.03] border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-neutral-300 truncate">
                                    Vista previa en tu catálogo
                                </span>
                                {math.hasCampaignOverride && bestActiveCampaign && (
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Campaña -{math.campaignDiscountPct}%
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-mono font-bold text-neutral-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 tabular-nums shrink-0">
                                {rateLabel}: Bs. {activeRate.toFixed(2)}
                            </span>
                        </div>

                        {/* Cuerpo Dividido Inteligente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-800/80">
                            {/* Columna 1: Precio Público en Vitrina */}
                            <div className="p-5 md:p-6 flex flex-col justify-between space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                                        Precio en Vitrina
                                    </span>
                                    {math.promoDiscountPercent > 0 && (
                                        <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-mono text-[10px] font-black uppercase tracking-wider">
                                            -{math.promoDiscountPercent}% OFF
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2.5 flex-wrap">
                                        <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white tabular-nums leading-none">
                                            ${math.finalStoreListPrice.toFixed(2)}
                                        </span>
                                        {math.finalStoreCompareAt > math.finalStoreListPrice && (
                                            <span className="text-sm font-mono font-semibold text-neutral-500 line-through tabular-nums">
                                                ${math.finalStoreCompareAt.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                                        Bs. {math.refBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <p className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800/60 leading-snug">
                                    {math.hasCampaignOverride
                                        ? `Precio con -${math.campaignDiscountPct}% de campaña aplicado.`
                                        : math.markup > 0
                                            ? `Cálculo: $${math.cashPrice.toFixed(2)} (Base) + $${math.markup.toFixed(2)} (Margen) = $${math.listPrice.toFixed(2)}`
                                            : `Precio estándar convertido automáticamente a tasa oficial BCV.`}
                                </p>
                            </div>

                            {/* Columna 2: Incentivo Promocional (si aplica) */}
                            <div className="p-5 md:p-6 flex flex-col justify-between space-y-3 bg-white/[0.01]">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                                        {math.markup > 0 ? 'Etiqueta Promocional en Divisas' : 'Modalidad de Cobro'}
                                    </span>
                                    {math.effectiveFxSavings > 0 && (
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase tracking-wider">
                                            Ahorra ${math.effectiveFxSavings.toFixed(2)} (-{math.discountPercent}%)
                                        </span>
                                    )}
                                </div>

                                <div>
                                    {math.markup > 0 ? (
                                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                            <span className="text-sm md:text-base font-mono font-bold">
                                                En divisas: <strong className="text-white font-black">${math.finalStoreCashPrice.toFixed(2)}</strong>
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300">
                                            <span className="text-xs font-mono font-semibold">
                                                Precio único: <strong className="text-white font-bold">${math.finalStoreCashPrice.toFixed(2)}</strong> en cualquier método
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-[11px] text-neutral-400 leading-snug pt-2 border-t border-neutral-800/60">
                                    {math.markup > 0
                                        ? `Muestra al cliente un precio promocional de $${math.finalStoreCashPrice.toFixed(2)} para pagos directos en divisas.`
                                        : 'El cliente verá un único precio sin etiquetas adicionales.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* REGLA MAYORISTA INDIVIDUAL */}
                {storeSettings?.storeType !== 'restaurant' && (
                    <div id="tour-step-3-wholesale" className={`p-2.5 -m-2.5 rounded-xl mb-2 mt-2 ${getUniversalSpotlightClass('tour-step-3-wholesale')}`}>
                        <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                            <div className="flex items-center gap-2 text-neutral-900 pb-3 border-b border-neutral-200/50">
                                <Percent size={16} className="text-neutral-500" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Regla Mayorista Individual</h3>
                            </div>
                            <ProductWholesaleConfig
                                initialActive={formData.wholesale_active}
                                initialMinQty={formData.wholesale_min_qty}
                                initialDiscountPct={formData.wholesale_discount_pct}
                                basePrice={Number(formData.price) || 0}
                                unitCost={math.unitCost}
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
                )}
                {/* CARD 4: INVENTARIO Y VARIANTES */}
                <div className="bg-white p-3 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                    {/* 🚀 EVALUACIÓN FOODTECH VS RETAIL */}
                    {storeSettings?.storeType === 'restaurant' ? (
                        <div id="tour-food-modifiers" className="p-1 rounded-xl">
                            <FoodModifierManager
                                groups={foodModifiers}
                                tourStep={tourStep}
                                isMission2={isMission2 && isRestaurant}
                                onPresetAdded={(type) => {
                                    if (isMission2 && isRestaurant) {
                                        if (type === 'sizes' && tourStep === 1) {
                                            setTourStep(2);
                                        } else if (type === 'extras' && tourStep === 3) {
                                            setTourStep(4);
                                        }
                                    }
                                }}
                                onChange={(newGroups) => {
                                    setFoodModifiers(newGroups)
                                    setIsDirty(true)
                                }}
                            />
                        </div>
                    ) : (
                        // --- VISTA RETAIL (ROPA / GENERAL: STOCK Y TALLAS) ---
                        <>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-neutral-200/50 pb-3">
                                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Box size={16} className="text-neutral-500" />
                                    <span>4. Inventario y Variantes</span>
                                </h3>

                                <div id="tour-step-2-has-variants" className={`flex bg-neutral-100 border border-neutral-200/60 rounded-lg p-0.5 w-full sm:w-auto ${getUniversalSpotlightClass('tour-step-2-has-variants')}`}>
                                    <button onClick={(e) => { e.preventDefault(); setHasVariants(false); setIsDirty(true); }} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!hasVariants ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/40' : 'text-neutral-600 hover:text-neutral-950 border border-transparent'}`}>
                                        Producto Único
                                    </button>
                                    <button onClick={(e) => { e.preventDefault(); setHasVariants(true); setIsDirty(true); }} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${hasVariants ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/40' : 'text-neutral-600 hover:text-neutral-950 border border-transparent'}`}>
                                        Con Variantes
                                    </button>
                                </div>
                            </div>

                            {!hasVariants ? (
                                <div className="bg-neutral-50/50 rounded-xl p-5 border border-neutral-200/50 animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">Stock Disponible</label>
                                        <NumberInput min="0" value={simpleStock} onChangeValue={(val) => { setSimpleStock(val); setIsDirty(true) }} className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-lg px-3 py-2 text-sm font-bold text-neutral-900 outline-none transition-all shadow-xs font-mono text-center" />
                                        <p className="text-xs text-neutral-600 font-medium">Cantidad física en almacén para compras directas.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">SKU / Código Logístico</label>
                                            <button
                                                type="button"
                                                onClick={() => updateForm('sku', generateSmartSKU(formData.category, formData.name))}
                                                className="text-[10px] font-mono font-bold text-neutral-600 hover:text-neutral-950 underline cursor-pointer"
                                            >
                                                Autogenerar
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={(e) => updateForm('sku', e.target.value.toUpperCase())}
                                            placeholder="Ej: PLATO-001 (Opcional)"
                                            className="w-full bg-white border border-neutral-200/50 focus:border-neutral-400 rounded-lg px-3 py-2 text-xs font-mono font-bold tabular-nums uppercase tracking-widest text-neutral-900 outline-none transition-all shadow-xs placeholder:text-neutral-400"
                                        />
                                        <p className="text-xs text-neutral-600 font-medium">Si lo deja vacío, Preziso asignará un SKU inteligente al guardar.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 w-full space-y-6">

                                    {/* CREADOR RÁPIDO DE VARIANTES: ARQUITECTURA DE ALTA DENSIDAD */}
                                    <div className="bg-neutral-50/60 rounded-2xl p-[0.4rem] md:p-6 border border-neutral-200/70 space-y-5 w-full">
                                        <input type="file" multiple ref={variantImageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'variant')} />

                                        {/* 🚀 SELECTOR DE ARQUITECTURA DE VARIANTE (3 MODOS EXPLÍCITOS SIN COLISIÓN) */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-neutral-200/70 shadow-2xs">
                                            <span className="text-[11px] font-bold text-neutral-700 px-1">
                                                ¿Cómo varía este producto?
                                            </span>
                                            <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60 overflow-x-auto no-scrollbar">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVariantMode('sizes_only');
                                                        setUseColor(false);
                                                        updateVariantInput('colorName', '');
                                                        updateVariantInput('images', []);
                                                    }}
                                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${variantMode === 'sizes_only'
                                                        ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/50'
                                                        : 'text-neutral-500 hover:text-neutral-900'
                                                        }`}
                                                >
                                                    Solo Tallas
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVariantMode('color');
                                                        setUseColor(true);
                                                        if (variantInput.colorName === 'Talla') updateVariantInput('colorName', '');
                                                    }}
                                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${variantMode === 'color'
                                                        ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/50'
                                                        : 'text-neutral-500 hover:text-neutral-900'
                                                        }`}
                                                >
                                                    Color + Tallas
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVariantMode('model');
                                                        setUseColor(false);
                                                        if (variantInput.colorName === 'Talla') updateVariantInput('colorName', '');
                                                    }}
                                                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${variantMode === 'model'
                                                        ? 'bg-white text-neutral-950 shadow-xs border border-neutral-200/50'
                                                        : 'text-neutral-500 hover:text-neutral-900'
                                                        }`}
                                                >
                                                    Modelo / Estilo
                                                </button>
                                            </div>
                                        </div>

                                        {/* FILA 1: COLOR O MODELO + FOTOGRAFÍAS (SE MUESTRA EN MODO "COLOR" O "MODELO", SE OCULTA EN "SOLO TALLAS") */}
                                        {(variantMode !== 'sizes_only' || isMission2) && (
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 items-stretch w-full animate-in fade-in duration-200">
                                                {/* LADO IZQUIERDO: SELECTOR DE COLOR O INPUT DE MODELO */}
                                                <div id="tour-step-2-color" className={`lg:col-span-7 w-full min-w-0 ${getUniversalSpotlightClass('tour-step-2-color')}`}>
                                                    <EliteVariantColorPicker
                                                        useColor={variantMode === 'color'}
                                                        onToggleColor={(val: boolean) => {
                                                            setUseColor(val);
                                                            setVariantMode(val ? 'color' : 'model');
                                                            setIsDirty(true);
                                                        }}
                                                        colorName={variantInput.colorName}
                                                        colorHex={variantInput.colorHex}
                                                        onChange={(name: string, hex: string) => {
                                                            updateVariantInput('colorName', name);
                                                            updateVariantInput('colorHex', hex);
                                                        }}
                                                    />
                                                </div>

                                                {/* 🚀 LADO DERECHO: FOTOS CON ALTURA PARITARIA EXACTA (~96px) */}
                                                <div className="lg:col-span-5 bg-white p-3 rounded-2xl border border-neutral-200/70 shadow-xs flex flex-col justify-between w-full min-w-0">
                                                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100 min-h-[28px]">
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <ImageIcon size={13} className="text-neutral-800 shrink-0" />
                                                            <span className="text-[11px] font-bold text-neutral-900 leading-none">
                                                                {variantMode === 'color' ? 'Fotos del Color' : 'Fotos del Modelo'}
                                                            </span>
                                                        </div>
                                                        <span className="font-mono text-[10px] text-neutral-400 font-bold leading-none">
                                                            {variantInput.images.length}/3
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 h-8.5 w-full">
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {variantInput.images.map((imgUrl, slotIdx) => (
                                                                <div key={slotIdx} className="relative w-8.5 h-8.5 rounded-lg border border-neutral-200/80 bg-neutral-50 overflow-hidden shrink-0 group shadow-2xs">
                                                                    <Image src={getOptimizedUrl(imgUrl)} alt="" fill sizes="34px" className="object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeImageFromVariantInput(slotIdx)}
                                                                        className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                                                                        title="Eliminar"
                                                                    >
                                                                        <X size={11} strokeWidth={2.5} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {variantInput.images.length < 3 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => variantImageInputRef.current?.click()}
                                                                disabled={uploading}
                                                                className="flex-1 h-full rounded-xl border border-dashed border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50/50 bg-neutral-50/30 flex items-center justify-center gap-1.5 text-neutral-600 hover:text-neutral-950 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                                                title="Subir fotos"
                                                            >
                                                                {uploading ? (
                                                                    <Loader2 size={12} className="animate-spin text-neutral-400" />
                                                                ) : (
                                                                    <Plus size={13} strokeWidth={2.5} className="text-neutral-500" />
                                                                )}
                                                                <span className="truncate">
                                                                    {variantInput.images.length === 0 ? '+ Subir fotos (hasta 3)' : '+ Añadir foto'}
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            <div className="flex-1 h-full rounded-xl bg-neutral-50 border border-neutral-200/50 flex items-center justify-center text-[10px] font-mono text-neutral-400 font-medium">
                                                                Límite alcanzado
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* FILA 2: TALLAS Y STOCK (INTACTA) */}
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 items-start">
                                            {/* TALLAS Y MEDIDAS (7 COLS) */}
                                            <div id="tour-step-2-sizes" className={`lg:col-span-7 bg-white p-3.5 md:p-4 rounded-2xl border border-neutral-200/70 shadow-xs space-y-2.5 ${getUniversalSpotlightClass('tour-step-2-sizes')}`}>
                                                <div className="flex justify-between items-center text-xs font-bold text-neutral-900">
                                                    <label className="block">Tallas o Medidas</label>

                                                    {sizeTags.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setSizeTags([]); setIsDirty(true); }}
                                                            className="flex items-center gap-1 text-[9px] font-bold text-rose-600 hover:text-rose-800 uppercase tracking-wider transition-colors cursor-pointer"
                                                            title="Borrar todas las tallas"
                                                        >
                                                            <X size={10} strokeWidth={3} />
                                                            <span>Vaciar</span>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="w-full bg-neutral-50/70 border border-neutral-200/80 focus-within:border-neutral-900 focus-within:bg-white rounded-xl p-1.5 min-h-10 flex flex-wrap items-center gap-1.5 transition-colors">
                                                    {sizeTags.map(tag => (
                                                        <span key={tag} className="flex items-center gap-1 bg-neutral-900 text-white px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                                                            {tag}
                                                            <button type="button" onClick={() => removeSizeTag(tag)} className="hover:text-rose-400 cursor-pointer"><X size={10} /></button>
                                                        </span>
                                                    ))}
                                                    <div className="flex-1 min-w-[100px] flex items-center">
                                                        <input
                                                            placeholder={sizeTags.length === 0 ? "Escribe tallas..." : ""}
                                                            value={sizeInputValue}
                                                            onChange={handleSizeInputChange}
                                                            onKeyDown={handleSizeKeyDown}
                                                            onBlur={handleSizeBlur}
                                                            className="w-full bg-transparent outline-none text-xs font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-normal"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                    {[
                                                        { label: 'D: S - H: XL', sizes: ['S', 'M', 'L', 'XL'] },
                                                        { label: 'D: XS - H: 2XL', sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'] },
                                                        { label: 'Pantalón: 28 - 38', sizes: ['28', '30', '32', '34', '36', '38'] },
                                                        { label: 'D: 36 - H: 39', sizes: ['36', '37', '38', '39'] },
                                                        { label: 'D: 40 - H: 44', sizes: ['40', '41', '42', '43', '44'] },
                                                        { label: 'D: 35 - H: 45', sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
                                                        { label: 'Única', sizes: ['Única'] },
                                                    ].map(pack => (
                                                        <button
                                                            key={pack.label}
                                                            type="button"
                                                            onClick={() => handleAddSizePack(pack.sizes)}
                                                            className="px-2 py-0.5 text-[9px] font-mono font-bold bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-neutral-700 rounded-md transition-colors cursor-pointer active:scale-95"
                                                        >
                                                            + {pack.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* STOCK INICIAL (5 COLS) */}
                                            <div className="lg:col-span-5 bg-white p-3.5 md:p-4 rounded-2xl border border-neutral-200/70 shadow-xs space-y-1.5 flex flex-col justify-between h-full">
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-900 block leading-none">Stock por cada talla</label>
                                                    <p className="text-[10px] text-neutral-400 font-medium mt-1">Cantidad física inicial asignada.</p>
                                                </div>
                                                <NumberInput
                                                    min="0"
                                                    value={variantInput.defaultStock}
                                                    onChangeValue={(val) => updateVariantInput('defaultStock', val)}
                                                    className="w-full bg-neutral-50/70 border border-neutral-200/80 focus:border-neutral-900 focus:bg-white rounded-xl px-3 py-1.5 text-sm font-bold text-neutral-900 outline-none text-center h-10 shadow-2xs font-mono"
                                                />
                                            </div>
                                        </div>

                                        {/* 🚀 BOTÓN 1: PRECIOS Y COSTO POR LOTE DE TALLAS (PARIDAD 100% CON APARTADO 3) */}
                                        <div className="bg-white rounded-xl border border-neutral-200/70 shadow-2xs p-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowVariantPricing(!showVariantPricing)}
                                                className="flex items-center justify-between w-full text-left transition-colors cursor-pointer group/price"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-5 h-5 rounded-md bg-neutral-100 group-hover/price:bg-neutral-200/80 text-neutral-700 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 transition-colors">
                                                        {showVariantPricing ? '−' : '+'}
                                                    </span>
                                                    <div className="flex items-baseline gap-1.5 truncate">
                                                        <span className="text-xs font-bold text-neutral-900 leading-none">
                                                            Precios y costo por talla
                                                        </span>
                                                        <span className="text-[10px] text-neutral-400 font-medium truncate">
                                                            (Opcional · Hereda del producto base)
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors shrink-0 ${showVariantPricing
                                                        ? 'bg-neutral-900 text-white'
                                                        : 'bg-neutral-100 text-neutral-600 group-hover/price:bg-neutral-200/70'
                                                    }`}>
                                                    {showVariantPricing ? 'Cerrar' : 'Personalizar'}
                                                </span>
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {showVariantPricing && (() => {
                                                    const bPrice = variantInput.priceOverride !== '' ? Number(variantInput.priceOverride) : math.cashPrice
                                                    const bMarkup = variantInput.penaltyOverride !== '' ? Number(variantInput.penaltyOverride) : math.markup
                                                    const bList = Number((bPrice + bMarkup).toFixed(2))
                                                    const bHasCustomCompare = variantInput.compareAtOverride !== '' && Number(variantInput.compareAtOverride) > 0
                                                    const bCompare = bHasCustomCompare ? Number(variantInput.compareAtOverride) : math.rawCompareAt
                                                    const bCompareValid = bCompare > bList && bList > 0
                                                    const bCompareInvalid = bHasCustomCompare && bCompare <= bList
                                                    const bSuggestedCompare = Math.ceil(bList * 1.15)
                                                    const bPromoPct = bCompareValid ? Math.round(((bCompare - bList) / bCompare) * 100) : 0

                                                    const bHasCustomCost = variantInput.costOverride !== '' && Number(variantInput.costOverride) > 0
                                                    const bCost = bHasCustomCost ? Number(variantInput.costOverride) : math.unitCost
                                                    const bProfit = bCost !== null && bPrice > 0 ? Number((bPrice - bCost).toFixed(2)) : null
                                                    const bMarginPct = bCost !== null && bPrice > 0 ? Number((((bPrice - bCost) / bPrice) * 100).toFixed(1)) : null
                                                    const bSafePrice20 = bCost !== null ? Math.ceil(bCost / 0.8) : null

                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                                            className="overflow-hidden will-change-[height,opacity]"
                                                        >
                                                            <div className="pt-3 mt-2.5 border-t border-neutral-100 space-y-3">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1 block">1. Precio de Venta $</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                            <NumberInput min="0" placeholder={`Hereda $${math.cashPrice.toFixed(2)}`} value={variantInput.priceOverride} onChangeValue={(val) => updateVariantInput('priceOverride', val)} className="w-full bg-neutral-50/70 border border-neutral-200/80 focus:bg-white focus:border-neutral-950 rounded-xl pl-6 pr-2.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1 block">2. Margen Operativo $</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                            <NumberInput min="0" placeholder={`Hereda $${math.markup.toFixed(2)}`} value={variantInput.penaltyOverride} onChangeValue={(val) => updateVariantInput('penaltyOverride', val)} className="w-full bg-neutral-50/70 border border-neutral-200/80 focus:bg-white focus:border-neutral-950 rounded-xl pl-6 pr-2.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1 block">3. Precio Tachado $</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                            <NumberInput
                                                                                min="0"
                                                                                placeholder={math.rawCompareAt > 0 ? `Hereda $${math.rawCompareAt.toFixed(2)}` : '0.00 (Opcional)'}
                                                                                value={variantInput.compareAtOverride}
                                                                                onChangeValue={(val) => updateVariantInput('compareAtOverride', val)}
                                                                                className={`w-full bg-neutral-50/70 border focus:bg-white rounded-xl pl-6 pr-14 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums ${bCompareInvalid
                                                                                        ? 'border-amber-400 ring-2 ring-amber-400/15 focus:border-amber-500'
                                                                                        : 'border-neutral-200/80 focus:border-neutral-950'
                                                                                    }`}
                                                                            />
                                                                            {bCompareValid && (
                                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/80 font-mono text-[9px] font-bold">
                                                                                    -{bPromoPct}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1 block">4. Costo por Unidad $</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                            <NumberInput min="0" placeholder={math.unitCost !== null ? `Hereda $${math.unitCost.toFixed(2)}` : '0.00 (Opcional)'} value={variantInput.costOverride} onChangeValue={(val) => updateVariantInput('costOverride', val)} className="w-full bg-neutral-50/70 border border-neutral-200/80 focus:bg-white focus:border-neutral-950 rounded-xl pl-6 pr-2.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Resumen en Vivo del Lote a Generar */}
                                                                {(bPrice > 0 || bCost !== null) && (
                                                                    <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                                        <div className="flex items-center gap-3 flex-wrap">
                                                                            <span className="text-[11px] text-neutral-500">
                                                                                Vitrina: <b className="font-mono text-neutral-900">${bList.toFixed(2)}</b>
                                                                            </span>
                                                                            {bMarkup > 0 && (
                                                                                <span className="text-[11px] text-neutral-500">
                                                                                    · En divisas: <b className="font-mono text-emerald-700">${bPrice.toFixed(2)}</b>
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {bProfit !== null && bMarginPct !== null && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[11px] text-neutral-500">Tu ganancia:</span>
                                                                                <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-md border ${bProfit < 0
                                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                    }`}>
                                                                                    {bProfit >= 0 ? `+$${bProfit.toFixed(2)} (${bMarginPct}%)` : `-$${Math.abs(bProfit).toFixed(2)} · En pérdida`}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Alerta Roja si el Lote se está configurando a pérdida */}
                                                                {bProfit !== null && bProfit < 0 && bCost !== null && bSafePrice20 !== null && (
                                                                    <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-900">
                                                                        <div className="flex items-start gap-2">
                                                                            <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                                                            <p className="leading-snug">
                                                                                <b>Precio menor al costo en este lote:</b> Vendes a <b className="font-mono">${bPrice.toFixed(2)}</b> pero cuesta <b className="font-mono">${bCost.toFixed(2)}</b> (pierdes <b className="font-mono">${Math.abs(bProfit).toFixed(2)}</b> por unidad).
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateVariantInput('priceOverride', bSafePrice20)}
                                                                            className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                                        >
                                                                            Subir precio a ${bSafePrice20.toFixed(2)} (+20%)
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Alerta Ámbar si el Tachado del Lote es inválido */}
                                                                {bCompareInvalid && (
                                                                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-950">
                                                                        <div className="flex items-start gap-2">
                                                                            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                                            <p className="leading-snug">
                                                                                <b>La oferta no se verá en estas tallas:</b> El precio tachado (<b className="font-mono">${bCompare.toFixed(2)}</b>) debe superar al precio en vitrina (<b className="font-mono">${bList.toFixed(2)}</b>).
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateVariantInput('compareAtOverride', bSuggestedCompare)}
                                                                            className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                                        >
                                                                            Ajustar a ${bSuggestedCompare.toFixed(2)}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })()}
                                            </AnimatePresence>
                                        </div>

                                        {/* 🚀 BOTÓN 2: GENERADOR INTELIGENTE */}
                                        <button
                                            type="button"
                                            id="tour-step-2-generate"
                                            onClick={addVariantGroup}
                                            className={`w-full bg-neutral-950 text-white py-3 rounded-xl hover:bg-black active:scale-[0.99] transition-all font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${getUniversalSpotlightClass('tour-step-2-generate')}`}
                                        >
                                            <Plus size={14} strokeWidth={2.5} className="shrink-0" />
                                            <span>
                                                {sizeTags.length > 0 ? `Generar ${sizeTags.length} Variantes` : 'Generar Variantes'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* LISTADO DE VARIANTES CREADAS CON AUDITORÍA FINANCIERA INDIVIDUAL POR SKU */}
                                    <div
                                        id="tour-step-2-matrix"
                                        className={`space-y-3 scroll-mt-28 md:scroll-mt-32 p-3 rounded-xl transition-all ${currentTargetId === 'tour-step-2-matrix'
                                                ? 'relative z-[60] bg-white ring-4 ring-neutral-900/15 shadow-2xl pointer-events-auto'
                                                : ''
                                            }`}
                                    >
                                        <div className="flex justify-between items-center mb-3 mt-2 px-1">
                                            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Matriz de SKUs</h4>
                                            <span className="bg-neutral-100 border border-neutral-200/60 px-2.5 py-0.5 rounded text-[10px] font-bold text-neutral-800 font-mono">{variants.length} Creadas</span>
                                        </div>

                                        {variants.length === 0 ? (
                                            <div className="text-center py-10 border border-dashed border-neutral-300 rounded-lg bg-neutral-50/30 flex flex-col items-center justify-center space-y-2">
                                                <Box size={24} className="text-neutral-400" />
                                                <p className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Sin variaciones activas</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {variants.map((v, i) => {
                                                   // 💎 MATEMÁTICA INDIVIDUAL DE ESTA VARIANTE (Hereda del padre lo que sea null)
                                                    const hasCustomPrice = Number(v.override_usd_price || 0) > 0
                                                    const hasCustomPenalty = v.override_usd_penalty !== null && v.override_usd_penalty !== undefined && v.override_usd_penalty !== ''
                                                    const hasCustomCompare = Number(v.override_compare_at_usd || 0) > 0
                                                    const hasCustomCost = Number(v.override_cost_usd || 0) > 0

                                                    const vCashPrice = hasCustomPrice ? Number(v.override_usd_price) : math.cashPrice
                                                    const vMarkup = hasCustomPenalty ? Number(v.override_usd_penalty) : math.markup
                                                    const vListPrice = Number((vCashPrice + vMarkup).toFixed(2))
                                                    const vCompareAt = hasCustomCompare ? Number(v.override_compare_at_usd) : math.rawCompareAt

                                                    const vIsCompareValid = vCompareAt > vListPrice && vListPrice > 0
                                                    // Es inválido si tiene un tachado propio <= vListPrice, O si hereda un tachado del padre que quedó superado por el precio propio de esta variante
                                                    const vIsCompareInvalid = vCompareAt > 0 && vCompareAt <= vListPrice && (hasCustomCompare || hasCustomPrice || hasCustomPenalty)
                                                    const vSuggestedCompareAt = Math.ceil(vListPrice * 1.15)
                                                    const vPromoPct = vIsCompareValid ? Math.round(((vCompareAt - vListPrice) / vCompareAt) * 100) : 0

                                                    const vUnitCost = hasCustomCost ? Number(v.override_cost_usd) : math.unitCost
                                                    const vNetProfit = vUnitCost !== null && vCashPrice > 0 ? Number((vCashPrice - vUnitCost).toFixed(2)) : null
                                                    const vMarginPct = vUnitCost !== null && vCashPrice > 0 ? Number((((vCashPrice - vUnitCost) / vCashPrice) * 100).toFixed(1)) : null
                                                    const vSafePrice20 = vUnitCost !== null ? Math.ceil(vUnitCost / 0.8) : null

                                                    // Auditoría si un descuento activo (Campaña o Mayorista) perfora el costo específico de esta variante
                                                    const activeWholesalePct = formData.wholesale_active && Number(formData.wholesale_discount_pct) > 0
                                                        ? Number(formData.wholesale_discount_pct)
                                                        : (!formData.wholesale_active && storeSettings?.wholesaleConfig?.active && Number(storeSettings?.wholesaleConfig?.discount_percentage) > 0)
                                                            ? Number(storeSettings.wholesaleConfig.discount_percentage)
                                                            : 0
                                                    const maxDiscOnVarPct = Math.max(math.campaignDiscountPct, math.bogoEffectiveDiscountPct, activeWholesalePct)
                                                    const vDiscountedRev = Number((vCashPrice * (1 - maxDiscOnVarPct / 100)).toFixed(2))
                                                    const vHasDiscountLoss = vUnitCost !== null && vCashPrice >= vUnitCost && maxDiscOnVarPct > 0 && vDiscountedRev < vUnitCost
                                                    const vDiscountLossUsd = vHasDiscountLoss && vUnitCost !== null ? Number((vUnitCost - vDiscountedRev).toFixed(2)) : 0

                                                    const lossHelpKey = `var_loss_${v.id}`
                                                    const compareHelpKey = `var_cmp_${v.id}`

                                                    return (
                                                        <div
                                                            key={v.id || i}
                                                            className={`flex flex-col bg-white border rounded-xl transition-colors animate-in fade-in shadow-xs overflow-hidden ${
                                                                (vNetProfit !== null && vNetProfit < 0)
                                                                    ? 'border-rose-300 hover:border-rose-400'
                                                                    : vIsCompareInvalid
                                                                        ? 'border-amber-300 hover:border-amber-400'
                                                                        : 'border-neutral-200/60 hover:border-neutral-400'
                                                            }`}
                                                        >
                                                            {/* Cabecera SKU con Píldoras de Precio y Ganancia en Vivo */}
                                                            <div className="flex items-center justify-between p-3.5 cursor-pointer select-none" onClick={() => setExpandedVariantId(expandedVariantId === v.id ? null : v.id)}>
                                                                <div className="flex items-center gap-3.5 min-w-0">
                                                                    <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-200/60 overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
                                                                        {v.variant_image ? (
                                                                            <Image
                                                                                src={getOptimizedUrl(v.variant_image)}
                                                                                alt=""
                                                                                fill
                                                                                sizes="40px"
                                                                                className="object-cover"
                                                                            />
                                                                        ) : (!v.color_hex || v.color_hex === 'transparent' || v.color_hex === '#transparent') ? (
                                                                            <span className="text-[11px] font-mono font-bold text-neutral-700 uppercase">
                                                                                {v.size}
                                                                            </span>
                                                                        ) : (
                                                                            <div className="w-full h-full" style={{ backgroundColor: v.color_hex }} />
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            {renderVariantColor(v.color_hex)}
                                                                            <p className="font-bold text-xs text-neutral-900 truncate">
                                                                                {(!v.color_hex || v.color_hex === 'transparent' || v.color_hex === '#transparent') && v.color_name === 'Talla'
                                                                                    ? `Talla ${v.size}`
                                                                                    : v.color_name}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            {!((!v.color_hex || v.color_hex === 'transparent' || v.color_hex === '#transparent') && v.color_name === 'Talla') && (
                                                                                <span className="text-[10px] font-mono font-bold bg-neutral-100 border border-neutral-200/70 text-neutral-700 px-2 py-0.5 rounded leading-none">{v.size}</span>
                                                                            )}
                                                                            {v.sku && (
                                                                                <span className="text-[9px] font-mono font-bold tabular-nums uppercase tracking-widest bg-neutral-100 text-neutral-600 border border-neutral-200/60 px-1.5 py-0.5 rounded leading-none">
                                                                                    {v.sku}
                                                                                </span>
                                                                            )}

                                                                            {hasCustomPrice ? (
                                                                                <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 border border-amber-300 rounded flex items-center gap-1 leading-none">
                                                                                    <span>Precio Fijo: ${vCashPrice.toFixed(2)}</span>
                                                                                    <span className="text-[8px] opacity-70 font-sans font-normal">(Base: ${math.cashPrice.toFixed(2)})</span>
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[9px] font-mono text-neutral-400">
                                                                                    Hereda ${math.cashPrice.toFixed(2)}
                                                                                </span>
                                                                            )}

                                                                            {vNetProfit !== null && (
                                                                                <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border leading-none ${
                                                                                    vNetProfit < 0
                                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                }`}>
                                                                                    {vNetProfit >= 0 ? `+$${vNetProfit.toFixed(2)} (${vMarginPct}%)` : `-$${Math.abs(vNetProfit).toFixed(2)} · En pérdida`}
                                                                                </span>
                                                                            )}

                                                                            {vIsCompareInvalid && (
                                                                                <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 leading-none">
                                                                                    ⚠️ Tachado inválido
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <div className="text-right hidden sm:block">
                                                                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Cantidad</p>
                                                                        <p className="font-mono font-bold text-xs text-neutral-950 leading-none mt-0.5">{v.stock}</p>
                                                                    </div>
                                                                    <div className="w-px h-6 bg-neutral-200 hidden sm:block" />
                                                                    <div className={`px-2 py-1 rounded text-neutral-700 transition-colors flex items-center gap-1 ${expandedVariantId === v.id ? 'bg-neutral-100 font-bold text-neutral-950' : 'hover:bg-neutral-100 font-medium'}`}>
                                                                        <span className="text-[10px] font-bold hidden sm:inline">Editar</span>
                                                                        {expandedVariantId === v.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                    </div>
                                                                    <button onClick={(e) => { e.stopPropagation(); removeVariant(v.id) }} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"><Trash2 size={15} /></button>
                                                                </div>
                                                            </div>

                                                            {/* Desplegable de Edición Fina de la Variante */}
                                                            <AnimatePresence initial={false}>
                                                                {expandedVariantId === v.id && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                                                        className="border-t border-neutral-200/50 bg-neutral-50/50 overflow-hidden will-change-[height,opacity]"
                                                                    >
                                                                        <div className="p-4 space-y-4">
                                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                                {/* Foto Variante */}
                                                                                <div className="shrink-0 flex flex-col gap-1.5 group relative">
                                                                                    <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">Foto</label>
                                                                                    <input type="file" id={`file-${v.id}`} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files, 'variant', v.id)} />

                                                                                    {v.variant_image ? (
                                                                                        <div className="relative w-14 h-14 rounded-lg border border-neutral-200/60 overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-xs">
                                                                                            <Image
                                                                                                src={getOptimizedUrl(v.variant_image)}
                                                                                                alt=""
                                                                                                fill
                                                                                                sizes="56px"
                                                                                                className="object-cover"
                                                                                            />
                                                                                            <button
                                                                                                onClick={() => document.getElementById(`file-${v.id}`)?.click()}
                                                                                                className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                                                                                                title="Cambiar Foto"
                                                                                            >
                                                                                                {uploading ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={16} />}
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => document.getElementById(`file-${v.id}`)?.click()}
                                                                                            className="w-14 h-14 rounded-lg border border-dashed border-neutral-300 bg-white hover:border-neutral-500 flex items-center justify-center overflow-hidden transition-all text-neutral-600 hover:text-neutral-950 shadow-xs"
                                                                                            title="Añadir Foto"
                                                                                        >
                                                                                            {uploading ? <Loader2 className="animate-spin" size={14} /> : <ImagePlus size={16} />}
                                                                                        </button>
                                                                                    )}
                                                                                </div>

                                                                                {/* Atributos específicos del SKU */}
                                                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1 block">Talla / Identificador</label>
                                                                                        <input type="text" value={v.size} onChange={(e) => updateVariantOverride(v.id, 'size', e.target.value)} className="w-full bg-white border border-neutral-200/70 focus:border-neutral-950 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider mb-1 block">Stock</label>
                                                                                        <NumberInput min="0" value={v.stock} onChangeValue={(val) => updateVariantOverride(v.id, 'stock', val)} className="w-full bg-white border border-neutral-200/70 focus:border-neutral-950 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors font-mono text-left tabular-nums" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="flex justify-between items-center mb-1">
                                                                                            <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">SKU Variante</label>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => updateVariantOverride(v.id, 'sku', generateSmartSKU(formData.category, `${formData.name || 'PRD'} ${v.color_name} ${v.size}`))}
                                                                                                className="text-[9px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer"
                                                                                            >
                                                                                                Generar
                                                                                            </button>
                                                                                        </div>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={v.sku || ''}
                                                                                            onChange={(e) => updateVariantOverride(v.id, 'sku', e.target.value.toUpperCase())}
                                                                                            placeholder="AUTO"
                                                                                            className="w-full bg-white border border-neutral-200/70 focus:border-neutral-950 rounded-xl px-3 py-2 text-xs font-mono font-bold tabular-nums uppercase tracking-widest text-neutral-900 outline-none transition-colors placeholder:text-neutral-300"
                                                                                        />
                                                                                    </div>

                                                                                    {(v.color_name !== 'Talla' || (v.color_hex && v.color_hex !== 'transparent' && v.color_hex !== '#transparent')) && (
                                                                                        <div className="sm:col-span-3 bg-white p-3 rounded-xl border border-neutral-200/70 space-y-2">
                                                                                            <div className="flex items-center justify-between">
                                                                                                <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider font-mono">
                                                                                                    Ajustar Color del SKU
                                                                                                </span>
                                                                                                {variants.filter(item => item.color_name === v.color_name).length > 1 && (
                                                                                                    <span className="text-[9px] font-mono font-bold text-neutral-400">
                                                                                                        Grupo: {v.color_name} ({variants.filter(item => item.color_name === v.color_name).length} tallas)
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>

                                                                                            <EliteVariantColorPicker
                                                                                                useColor={v.color_hex !== 'transparent' && v.color_hex !== '#transparent'}
                                                                                                onToggleColor={(checked: boolean) => updateVariantOverride(v.id, 'color_hex', checked ? '#000000' : 'transparent')}
                                                                                                colorName={v.color_name}
                                                                                                colorHex={v.color_hex === 'transparent' || v.color_hex === '#transparent' ? '#000000' : v.color_hex}
                                                                                                onChange={(name: string, hex: string) => {
                                                                                                    handleVariantColorChangeWithGuard(v, name, hex);
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* 💎 PRECIOS Y COSTO PROPIO POR SKU (CABECERAS DE 1 SOLA LÍNEA h-4 PARA ALINEACIÓN HORIZONTAL PERFECTA) */}
                                                                            <div className="pt-3.5 border-t border-neutral-200/60 space-y-3">
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
                                                                                    {/* 1. Precio Propio */}
                                                                                    <div>
                                                                                        <div className="h-4 flex items-center justify-between gap-1 mb-1.5 whitespace-nowrap">
                                                                                            <label className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider truncate">
                                                                                                1. Precio Propio
                                                                                            </label>
                                                                                            {hasCustomPrice && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => updateVariantOverride(v.id, 'override_usd_price', null)}
                                                                                                    className="text-[9px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer shrink-0"
                                                                                                    title={`Volver a heredar $${math.cashPrice.toFixed(2)}`}
                                                                                                >
                                                                                                    Heredar (${math.cashPrice.toFixed(2)})
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                                            <NumberInput min="0" placeholder={`Hereda $${math.cashPrice.toFixed(2)}`} value={v.override_usd_price ?? ''} onChangeValue={(val) => updateVariantOverride(v.id, 'override_usd_price', val)} className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl pl-6 pr-2.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums" />
                                                                                        </div>
                                                                                    </div>
{/* 2. Margen Propio (Simétrico y sin truncamiento "...") */}
                                                                                    <div>
                                                                                        <div className="h-4 flex items-center justify-between gap-1 mb-1.5 whitespace-nowrap">
                                                                                            <label className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider">
                                                                                                2. Margen Propio
                                                                                            </label>
                                                                                            {hasCustomPenalty && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => updateVariantOverride(v.id, 'override_usd_penalty', null)}
                                                                                                    className="text-[9px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer shrink-0"
                                                                                                    title={`Volver a heredar $${math.markup.toFixed(2)}`}
                                                                                                >
                                                                                                    Heredar (${math.markup.toFixed(2)})
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                                            <NumberInput min="0" placeholder={`Hereda $${math.markup.toFixed(2)}`} value={v.override_usd_penalty ?? ''} onChangeValue={(val) => updateVariantOverride(v.id, 'override_usd_penalty', val)} className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl pl-6 pr-2.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums" />
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* 3. Tachado Propio */}
                                                                                    <div>
                                                                                        <div className="h-4 flex items-center justify-between gap-1 mb-1.5 whitespace-nowrap">
                                                                                            <label className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider truncate">
                                                                                                3. Tachado Propio
                                                                                            </label>
                                                                                            {hasCustomCompare && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => updateVariantOverride(v.id, 'override_compare_at_usd', null)}
                                                                                                    className="text-[9px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer shrink-0"
                                                                                                >
                                                                                                    {math.rawCompareAt > 0 ? `Heredar ($${math.rawCompareAt.toFixed(2)})` : 'Limpiar'}
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                                            <NumberInput
                                                                                                min="0"
                                                                                                placeholder={math.rawCompareAt > 0 ? `Hereda $${math.rawCompareAt.toFixed(2)}` : '0.00 (Opcional)'}
                                                                                                value={v.override_compare_at_usd ?? ''}
                                                                                                onChangeValue={(val) => updateVariantOverride(v.id, 'override_compare_at_usd', val)}
                                                                                                className={`w-full bg-white border rounded-xl pl-6 pr-14 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums ${
                                                                                                    vIsCompareInvalid
                                                                                                        ? 'border-amber-400 ring-2 ring-amber-400/15 focus:border-amber-500'
                                                                                                        : 'border-neutral-200/80 focus:border-neutral-950'
                                                                                                }`}
                                                                                            />
                                                                                            {vIsCompareValid && (
                                                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/80 font-mono text-[9px] font-bold">
                                                                                                    -{vPromoPct}%
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* 4. Costo Propio */}
                                                                                    <div>
                                                                                        <div className="h-4 flex items-center justify-between gap-1 mb-1.5 whitespace-nowrap">
                                                                                            <label className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider truncate">
                                                                                                4. Costo Propio
                                                                                            </label>
                                                                                            {hasCustomCost && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => updateVariantOverride(v.id, 'override_cost_usd', null)}
                                                                                                    className="text-[9px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer shrink-0"
                                                                                                >
                                                                                                    {math.unitCost !== null ? `Heredar ($${math.unitCost.toFixed(2)})` : 'Limpiar'}
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="relative">
                                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">$</span>
                                                                                            <NumberInput min="0" placeholder={math.unitCost !== null ? `Hereda $${math.unitCost.toFixed(2)}` : '0.00 (Opcional)'} value={v.override_cost_usd ?? ''} onChangeValue={(val) => updateVariantOverride(v.id, 'override_cost_usd', val)} className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl pl-6 pr-2.5 py-2 text-xs font-bold text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 font-mono text-left tabular-nums" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Barra Resumen de Precio y Ganancia de esta Variante */}
                                                                                <div className="px-3.5 py-2.5 rounded-xl bg-white border border-neutral-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                                        <span className="text-[11px] text-neutral-500">
                                                                                            Precio en vitrina: <b className="font-mono text-neutral-900">${vListPrice.toFixed(2)}</b>
                                                                                            <span className="text-[10px] font-mono text-neutral-400 ml-1">
                                                                                                (Bs. {(vListPrice * activeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                                                            </span>
                                                                                        </span>
                                                                                        {vMarkup > 0 && (
                                                                                            <span className="text-[11px] text-neutral-500">
                                                                                                · En divisas: <b className="font-mono text-emerald-700">${vCashPrice.toFixed(2)}</b>
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {vNetProfit !== null && vMarginPct !== null ? (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[11px] text-neutral-500">Tu ganancia libre:</span>
                                                                                            <span className={`font-mono font-black text-xs ${
                                                                                                vNetProfit < 0 ? 'text-rose-600' : 'text-emerald-600'
                                                                                            }`}>
                                                                                                {vNetProfit >= 0 ? `+$${vNetProfit.toFixed(2)}` : `-$${Math.abs(vNetProfit).toFixed(2)}`}
                                                                                            </span>
                                                                                            <span className="text-[11px] font-mono font-bold text-neutral-700">
                                                                                                ({vMarginPct > 0 ? `${vMarginPct}%` : 'Sin margen'})
                                                                                            </span>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-neutral-400">
                                                                                            Ingresa un costo para ver tu ganancia en esta talla
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* 🚨 ALERTA ROJA 1: Precio de la variante menor a su costo (Auto-ajusta también el tachado si quedara por debajo) */}
                                                                                {vNetProfit !== null && vNetProfit < 0 && vUnitCost !== null && vSafePrice20 !== null && (
                                                                                    <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200/80 space-y-2">
                                                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                                                                            <div className="flex items-start gap-2 text-xs text-rose-900">
                                                                                                <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                                                                                <p className="leading-snug">
                                                                                                    <b>Precio menor al costo en esta variante:</b> La vendes en <b className="font-mono">${vCashPrice.toFixed(2)}</b>, pero su costo es <b className="font-mono">${vUnitCost.toFixed(2)}</b>. Pierdes <b className="font-mono">${Math.abs(vNetProfit).toFixed(2)}</b> en cada venta.{' '}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => setOpenWhatToDoId(openWhatToDoId === lossHelpKey ? null : lossHelpKey)}
                                                                                                        className="font-bold underline underline-offset-2 text-rose-700 hover:text-black transition-colors cursor-pointer whitespace-nowrap ml-1"
                                                                                                    >
                                                                                                        {openWhatToDoId === lossHelpKey ? 'Ocultar ayuda' : '¿Qué hacer?'}
                                                                                                    </button>
                                                                                                </p>
                                                                                            </div>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const nextListPrice = vSafePrice20 + vMarkup
                                                                                                    const needsCompareBump = vCompareAt > 0 && vCompareAt <= nextListPrice
                                                                                                    setVariants(prev => prev.map(item => {
                                                                                                        if (item.id !== v.id) return item
                                                                                                        return {
                                                                                                            ...item,
                                                                                                            override_usd_price: vSafePrice20,
                                                                                                            ...(needsCompareBump ? { override_compare_at_usd: Math.ceil(nextListPrice * 1.15) } : {})
                                                                                                        }
                                                                                                    }))
                                                                                                    setIsDirty(true)
                                                                                                    setOpenWhatToDoId(null)
                                                                                                }}
                                                                                                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                                                            >
                                                                                                Subir precio a ${vSafePrice20.toFixed(2)}
                                                                                            </button>
                                                                                        </div>

                                                                                        <AnimatePresence initial={false}>
                                                                                            {openWhatToDoId === lossHelpKey && (
                                                                                                <motion.div
                                                                                                    initial={{ height: 0, opacity: 0 }}
                                                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                                                    exit={{ height: 0, opacity: 0 }}
                                                                                                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                                                                    className="overflow-hidden will-change-[height,opacity]"
                                                                                                >
                                                                                                    <div className="ml-5 p-2.5 rounded-lg bg-white border border-rose-200 text-[11px] text-neutral-700 leading-relaxed">
                                                                                                        💡 <b>Solución:</b> Para no perder dinero en esta variante, sube su &quot;1. Precio Propio&quot; por encima de <b>${vUnitCost.toFixed(2)}</b> (por ejemplo a <b>${vSafePrice20.toFixed(2)}</b> para ganar un 20% libre), o revisa si escribiste mal el &quot;4. Costo Propio&quot;.
                                                                                                    </div>
                                                                                                </motion.div>
                                                                                            )}
                                                                                        </AnimatePresence>
                                                                                    </div>
                                                                                )}

                                                                                {/* 🚨 ALERTA ROJA 2: Pérdida por descuento activo en esta variante */}
                                                                                {vHasDiscountLoss && vUnitCost !== null && (
                                                                                    <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200/80 flex items-start gap-2 text-xs text-rose-900">
                                                                                        <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                                                                        <p className="leading-snug">
                                                                                            <b>Pérdida por descuento en esta variante:</b> Al aplicar tu descuento activo (-{maxDiscOnVarPct}%), el ingreso de esta variante baja a <b className="font-mono">${vDiscountedRev.toFixed(2)}</b> y pierdes <b className="font-mono">${vDiscountLossUsd.toFixed(2)}</b> respecto a su costo (<b className="font-mono">${vUnitCost.toFixed(2)}</b>).
                                                                                        </p>
                                                                                    </div>
                                                                                )}

                                                                                {/* 🟠 ALERTA ÁMBAR 1: Margen Propio de la variante mayor al Precio de Venta */}
                                                                                {hasCustomPenalty && vCashPrice > 0 && vMarkup > vCashPrice && (
                                                                                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                                                                        <div className="flex items-start gap-2 text-xs text-amber-950">
                                                                                            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                                                            <p className="leading-snug">
                                                                                                <b>¿El Margen Propio (${vMarkup.toFixed(2)}) de esta variante es correcto?</b> Es mayor que su precio de venta (${vCashPrice.toFixed(2)}) y sube el precio en vitrina a <b className="font-mono">${vListPrice.toFixed(2)}</b>. Recuerda que este campo es en <b>dólares ($)</b>, no en Bolívares.
                                                                                            </p>
                                                                                        </div>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => updateVariantOverride(v.id, 'override_usd_penalty', null)}
                                                                                            className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                                                        >
                                                                                            {math.markup > 0 ? `Usar base ($${math.markup.toFixed(2)})` : 'Quitar margen'}
                                                                                        </button>
                                                                                    </div>
                                                                                )}

                                                                                {/* 🟠 ALERTA ÁMBAR 2: Tachado Propio o Heredado menor o igual al Precio en Vitrina de esta variante */}
                                                                                {vIsCompareInvalid && (
                                                                                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2">
                                                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                                                                            <div className="flex items-start gap-2 text-xs text-amber-950">
                                                                                                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                                                                <p className="leading-snug">
                                                                                                    <b>La oferta no se mostrará en esta variante:</b>{' '}
                                                                                                    {hasCustomCompare
                                                                                                        ? <>El tachado propio (<b className="font-mono">${vCompareAt.toFixed(2)}</b>) debe ser mayor al precio en vitrina de esta variante (<b className="font-mono">${vListPrice.toFixed(2)}</b>).</>
                                                                                                        : <>Esta variante cuesta <b className="font-mono">${vListPrice.toFixed(2)}</b> en vitrina, lo que supera al Precio Tachado heredado del producto (<b className="font-mono">${vCompareAt.toFixed(2)}</b>).</>}{' '}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => setOpenWhatToDoId(openWhatToDoId === compareHelpKey ? null : compareHelpKey)}
                                                                                                        className="font-bold underline underline-offset-2 text-amber-800 hover:text-black transition-colors cursor-pointer whitespace-nowrap ml-1"
                                                                                                    >
                                                                                                        {openWhatToDoId === compareHelpKey ? 'Ocultar ayuda' : '¿Qué hacer?'}
                                                                                                    </button>
                                                                                                </p>
                                                                                            </div>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    updateVariantOverride(v.id, 'override_compare_at_usd', vSuggestedCompareAt)
                                                                                                    setOpenWhatToDoId(null)
                                                                                                }}
                                                                                                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-black text-white text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer"
                                                                                            >
                                                                                                Ajustar a ${vSuggestedCompareAt.toFixed(2)}
                                                                                            </button>
                                                                                        </div>

                                                                                        <AnimatePresence initial={false}>
                                                                                            {openWhatToDoId === compareHelpKey && (
                                                                                                <motion.div
                                                                                                    initial={{ height: 0, opacity: 0 }}
                                                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                                                    exit={{ height: 0, opacity: 0 }}
                                                                                                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                                                                    className="overflow-hidden will-change-[height,opacity]"
                                                                                                >
                                                                                                    <div className="ml-5 p-2.5 rounded-lg bg-white border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                                                                                                        💡 <b>¿Por qué pasa esto?</b> Esta variante se muestra en vitrina a <b>${vListPrice.toFixed(2)}</b> (${vCashPrice.toFixed(2)} de venta + ${vMarkup.toFixed(2)} de margen operativo). Para mostrar una oferta en esta talla, su Tachado Propio debe superar los <b>${vListPrice.toFixed(2)}</b> (por ejemplo <b>${vSuggestedCompareAt.toFixed(2)}</b>).
                                                                                                    </div>
                                                                                                </motion.div>
                                                                                            )}
                                                                                        </AnimatePresence>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                {/* 🚀 ENLACE MÁGICO DE CAMPAÑA (DISEÑO TECH-EDITORIAL / PREZISO OBSIDIAN) */}
                {productId && Number(formData.price) === 0 && (hasVariants ? variants.some(v => v.stock > 0) : Number(simpleStock) > 0) && (
                    <div className="bg-white p-5 md:p-6 rounded-xl border border-neutral-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 border border-neutral-200/60">
                                    <Gift size={14} strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-wider font-mono">
                                        Enlace Mágico (Giveaway)
                                    </h3>
                                    <p className="text-[11px] text-neutral-400 font-normal">
                                        Auto-agrega este artículo a la bolsa del cliente al hacer clic
                                    </p>
                                </div>
                            </div>

                            <span className="self-start sm:self-auto px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                Promoción de $0.00 Activa
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {/* Input de solo lectura con la URL exacta */}
                            <div className="flex-1 bg-neutral-50/80 border border-neutral-200/80 rounded-lg px-3 py-2 text-xs font-mono text-neutral-600 truncate select-all">
                                {(() => {
                                    if (typeof window === 'undefined') return 'Cargando enlace...';
                                    const host = window.location.host.replace('www.', '');
                                    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
                                    return isLocal
                                        ? `${window.location.protocol}//${host}/${storeSlug || 'tienda'}?add=${productId}`
                                        : `https://${storeSlug || 'tienda'}.${host}/?add=${productId}`;
                                })()}
                            </div>

                            {/* Botón de Copiado en Negro Obsidiana */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const host = window.location.host.replace('www.', '');
                                    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
                                    const magicUrl = isLocal
                                        ? `${window.location.protocol}//${host}/${storeSlug || 'tienda'}?add=${productId}`
                                        : `https://${storeSlug || 'tienda'}.${host}/?add=${productId}`;

                                    navigator.clipboard.writeText(magicUrl);
                                    setCopiedMagicLink(true);
                                    setTimeout(() => setCopiedMagicLink(false), 2000);

                                    const Toast = Swal.mixin({
                                        toast: true,
                                        position: 'top-end',
                                        showConfirmButton: false,
                                        timer: 1500,
                                        customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
                                    });
                                    Toast.fire({ icon: 'success', title: 'Enlace Mágico Copiado' });
                                }}
                                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 active:scale-95 text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                            >
                                {copiedMagicLink ? (
                                    <>
                                        <Check size={13} className="text-emerald-400" />
                                        <span>Copiado</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={13} />
                                        <span>Copiar Enlace</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-[11px] text-neutral-400 font-normal leading-relaxed">
                            Comparte este enlace en historias de Instagram o WhatsApp. La campaña finalizará automáticamente cuando las existencias en inventario lleguen a 0.
                        </p>
                    </div>
                )}


            </div>


            {/* MOTOR DE ACADEMIA PREZISO */}
            <MissionTour
                isActive={isMission1 || isMission2 || isMission3 || isMission4}
                currentStep={tourStep}
                totalSteps={
                    isMission1 ? 4 :
                        isMission2 ? (isRestaurant ? 5 : 6) :
                            isMission3 ? 4 : 3
                }
                title={
                    isRestaurant ? (
                        isMission1 ? (
                            tourStep === 1 ? "1. Bautiza tu Plato" :
                                tourStep === 2 ? "2. La Foto Abre el Apetito" :
                                    tourStep === 3 ? "3. Precio Dual Automático" :
                                        "4. ¡Publica en tu Menú!"
                        ) : isMission2 ? (
                            tourStep === 1 ? "1. Inserta los Tamaños" :
                                tourStep === 2 ? "2. Precios Escalonados (+ $)" :
                                    tourStep === 3 ? "3. Agrega Toppings Extras" :
                                        tourStep === 4 ? "4. Reglas: Múltiples y Opcionales" :
                                            "5. ¡Guarda tu Pizza Creada!"
                        ) : isMission3 ? (
                            tourStep === 1 ? "1. El Plato en Oferta" :
                                tourStep === 2 ? "2. Tiempo de Preparación" :
                                    tourStep === 3 ? "3. El Plato Insignia" :
                                        "4. Guarda la Estrategia"
                        ) : (
                            tourStep === 1 ? "1. Margen de Conversión" :
                                tourStep === 2 ? "2. Incentivo en Efectivo/Divisas" :
                                    "3. ¡Misión 4 Completada!"
                        )
                    ) : (
                        // 👕 GUIÓN RETAIL CON 6 PASOS
                        isMission1 ? (
                            tourStep === 1 ? "1. Nombra tu Creación" :
                                tourStep === 2 ? "2. La Primera Impresión" :
                                    tourStep === 3 ? "3. La Magia de Preziso" :
                                        "4. ¡Lanza tu Producto!"
                        ) : isMission2 ? (
                            tourStep === 1 ? "1. Activar Variantes" :
                                tourStep === 2 ? "2. Define un Atributo" :
                                    tourStep === 3 ? "3. Añade las Tallas" :
                                        tourStep === 4 ? "4. ¡Crea la Magia!" :
                                            tourStep === 5 ? "5. Matriz de SKUs Generada" :
                                                "6. Guarda tu Catálogo"
                        ) : isMission3 ? (
                            tourStep === 1 ? "1. El Efecto Oferta" :
                                tourStep === 2 ? "2. Venta al Mayor" :
                                    tourStep === 3 ? "3. El Escaparate" :
                                        "4. Guarda la Estrategia"
                        ) : (
                            tourStep === 1 ? "1. El Margen de Protección" :
                                tourStep === 2 ? "2. El Descuento Mágico" :
                                    "3. ¡Misión 4 Completada!"
                        )
                    )
                }
                description={
                    isRestaurant ? (
                        isMission1 ? (
                            tourStep === 1 ? "Escribe un nombre provocativo para tu plato (Ej: Hamburguesa Doble Smash)." :
                                tourStep === 2 ? "Sube una imagen de alta calidad de tu plato terminado. Una buena foto incrementa el ticket promedio." :
                                    tourStep === 3 ? `Indica el valor en ${isEur ? 'Euros' : 'Dólares'}. Preziso calculará la conversión exacta en Bolívares a tasa oficial.` :
                                        "¡Excelente! Haz clic en Guardar para estrenar tu menú digital."
                        ) : isMission2 ? (
                            tourStep === 1 ? "En comida los tamaños son modificadores obligatorios. Haz clic en el botón '🍕 Tamaño / Porción' enfocado." :
                                tourStep === 2 ? "Observa cómo la Mediana es $0 (precio base) y la Grande suma +$3.50. Haz clic en Siguiente." :
                                    tourStep === 3 ? "Toda pizza necesita ingredientes extra. Haz clic en el botón '🧀 Extras / Toppings' enfocado." :
                                        tourStep === 4 ? "Los extras son 'Opcionales' y permiten elegir 'Varias opciones'. Haz clic en Siguiente." :
                                            "¡Tu receta quedó armada con porciones y extras! Haz clic en el botón 'Guardar Producto' en la cabecera."
                        ) : isMission3 ? (
                            tourStep === 1 ? "Ingresa un precio anterior más alto que el precio base para simular una oferta atractiva para el comensal." :
                                tourStep === 2 ? "Indica los minutos estimados de cocina (ej: ⏱️ 15-20 min) para reducir la ansiedad del comensal al ordenar." :
                                    tourStep === 3 ? "Activa la estrella para que este plato lidere el carrusel de recomendados de la casa." :
                                        "Guarda los cambios para aplicar esta configuración a tu cocina."
                        ) : (
                            tourStep === 1 ? "Agrega un margen extra al pago en moneda local para proteger tus compras de insumos." :
                                tourStep === 2 ? "Si el comensal te paga en divisas o efectivo, Preziso le descontará este margen de forma automática." :
                                    "¡Dominio total! Guarda el producto para graduarte en la Academia Preziso."
                        )
                    ) : (
                        isMission1 ? (
                            tourStep === 1 ? "Escribe un nombre corto y llamativo para tu primer producto. Ej: Franela Oversize." :
                                tourStep === 2 ? "Sube la mejor foto que tengas. Una buena imagen es el 80% de la venta." :
                                    tourStep === 3 ? `¿Cuánto cuesta en ${isEur ? 'Euros' : 'Dólares'}? Escríbelo y mira cómo calculamos los Bolívares.` :
                                        "¡Todo listo! Haz clic en Guardar para publicar tu primer producto y completar la misión."
                        ) : isMission2 ? (
                            tourStep === 1 ? "Vamos a simular que vendes unos Zapatos. Haz clic en 'Con Variantes' para abrir el organizador." :
                                tourStep === 2 ? "Aquí defines el color (Ej: Rojo). Fíjate en el interruptor '¿Lleva Color?': si fuera un software, lo apagarías." :
                                    tourStep === 3 ? "Añade las tallas del zapato (Ej: 40, 42) y presiona Enter, o usa los botones rápidos de abajo." :
                                        tourStep === 4 ? "Preziso cruzará el Color con las Tallas para crear tu inventario ordenado. ¡Haz clic en 'Generar Matriz de Variantes'!" :
                                            tourStep === 5 ? "¡Observa abajo cómo se creó la matriz! Cada combinación tiene su SKU y stock independiente. Haz clic en Siguiente." :
                                                "¡Inventario multivariable listo! Haz clic en 'Guardar Producto' en la cabecera para completar tu misión."
                        ) : isMission3 ? (
                            tourStep === 1 ? "Fíjate que tu precio base es de $45. Escribe un precio tachado más alto (ej: 60) para simular una oferta real." :
                                tourStep === 2 ? "Enciende esto si quieres dar un descuento automático a los clientes que te compren al por mayor." :
                                    tourStep === 3 ? "Enciende la estrellita para que este producto aparezca de primero en tu tienda como 'Destacado'." :
                                        "¡Estrategia lista! Haz clic en Guardar Producto para aplicar estos ganchos de venta."
                        ) : (
                            tourStep === 1 ? "Añade un margen extra (Ej: 10). Este monto se sumará al precio en Bolívares para protegerte de la inflación." :
                                tourStep === 2 ? "Mira la tarjeta negra. Si el cliente te paga en Divisas, Preziso le descontará ese margen como incentivo." :
                                    "¡Has dominado el secreto de las divisas! Guarda el producto para finalizar la Academia Preziso."
                        )
                    )
                }
                onNext={() => {
                    // Validaciones Misión 1
                    if (isMission1) {
                        if (tourStep === 1 && !formData.name) return Swal.fire({ title: 'Falta el nombre', text: 'Escribe un nombre para continuar', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 2 && !formData.image_url) return Swal.fire({ title: 'Falta la foto', text: 'Sube una foto para continuar', icon: 'info', confirmButtonColor: '#171717' })
                        if (tourStep === 3 && Number(formData.price) <= 0) return Swal.fire({ title: 'Falta el precio', text: 'Coloca un precio válido', icon: 'info', confirmButtonColor: '#171717' })
                    }

                    // Validaciones Misión 2
                    if (isMission2) {
                        if (!isRestaurant) {
                            if (tourStep === 1 && !hasVariants) return Swal.fire({ title: 'Acción requerida', text: 'Haz clic en el botón "Con Variantes" resaltado.', icon: 'info', confirmButtonColor: '#171717' })
                            if (tourStep === 2 && useColor && !variantInput.colorName) return Swal.fire({ title: 'Acción requerida', text: 'Escribe el nombre del color.', icon: 'info', confirmButtonColor: '#171717' })
                            if (tourStep === 3 && sizeTags.length === 0 && sizeInputValue.trim() === '') return Swal.fire({ title: 'Acción requerida', text: 'Añade al menos una talla (ej: M).', icon: 'info', confirmButtonColor: '#171717' })
                            // Si el usuario da a Siguiente en paso 4 sin haber generado, lo forzamos limpiamente
                            if (tourStep === 4 && variants.length === 0) {
                                addVariantGroup();
                                return;
                            }
                        } else {
                            if (tourStep === 1 && foodModifiers.length === 0) {
                                const sizesGroup = {
                                    id: `temp-group-sizes-${Date.now()}`,
                                    name: 'Tamaño de la Pizza / Porción',
                                    is_required: true,
                                    min_selections: 1,
                                    max_selections: 1,
                                    modifier_options: [
                                        { id: `temp-opt-s1`, name: 'Mediana (8 Porciones)', price_adjustment_usd: 0, is_available: true },
                                        { id: `temp-opt-s2`, name: 'Grande (10 Porciones)', price_adjustment_usd: 3.5, is_available: true },
                                        { id: `temp-opt-s3`, name: 'Familiar (12 Porciones)', price_adjustment_usd: 6.0, is_available: true },
                                    ]
                                };
                                setFoodModifiers([sizesGroup]);
                                setIsDirty(true);
                            }
                            if (tourStep === 3 && foodModifiers.length < 2) {
                                const extrasGroup = {
                                    id: `temp-group-extras-${Date.now()}`,
                                    name: 'Extras y Toppings Adicionales',
                                    is_required: false,
                                    min_selections: 0,
                                    max_selections: 5,
                                    modifier_options: [
                                        { id: `temp-opt-e1`, name: 'Extra Queso Mozzarella', price_adjustment_usd: 1.5, is_available: true },
                                        { id: `temp-opt-e2`, name: 'Tocineta Ahumada', price_adjustment_usd: 2.0, is_available: true },
                                        { id: `temp-opt-e3`, name: 'Borde Relleno de Queso', price_adjustment_usd: 2.5, is_available: true },
                                    ]
                                };
                                setFoodModifiers(prev => [...prev, extrasGroup]);
                                setIsDirty(true);
                            }
                        }
                    }

                    // 🚀 VALIDACIÓN SIN BLOQUEO EN MISIÓN 3 (FAIL-SAFE DE OFERTA)
                    if (isMission3) {
                        if (tourStep === 1) {
                            const currentPrice = Number(formData.price) || 45;
                            const currentCompareAt = Number(formData.compareAt) || 0;
                            // Si no colocó nada o colocó un monto menor/igual, auto-asignamos 60 sin bloquearlo
                            if (currentCompareAt <= currentPrice) {
                                updateForm('compareAt', 60);
                            }
                        }
                        if (!isRestaurant) {
                            if (tourStep === 2 && !formData.wholesale_active) return Swal.fire({ title: 'Acción requerida', text: 'Enciende el interruptor de Venta al Mayor.', icon: 'info', confirmButtonColor: '#171717' })
                        } else {
                            if (tourStep === 2 && !formData.shipping_badge_title) return Swal.fire({ title: 'Acción requerida', text: 'Elige o escribe un tiempo estimado de cocina.', icon: 'info', confirmButtonColor: '#171717' })
                        }
                        if (tourStep === 3 && !formData.is_featured) return Swal.fire({ title: 'Acción requerida', text: 'Enciende la estrella para destacar el plato/producto.', icon: 'info', confirmButtonColor: '#171717' })
                    }

                    // Validaciones Misión 4
                    if (isMission4) {
                        if (tourStep === 1 && Number(formData.penalty) <= 0) return Swal.fire({ title: 'Acción requerida', text: 'Añade un margen mayor a 0 (Ej: 3) para observar la fórmula de incentivo.', icon: 'info', confirmButtonColor: '#171717' })
                    }

                    const maxSteps = isMission1 ? 4 : isMission2 ? (isRestaurant ? 5 : 6) : isMission3 ? 4 : 3;
                    if (tourStep < maxSteps) {
                        setTourStep(tourStep + 1);
                    } else {
                        handleSave();
                    }
                }}
                onCancel={() => router.push('/admin')}
            />
            {/* ZONA DE PELIGRO CONTABLE */}
            {productId && (
                <div className="max-w-5xl mx-auto px-4 md:px-8 mb-10">
                    <div className="border border-rose-200/60 bg-rose-50/30 rounded-xl p-6 md:p-8 animate-in fade-in duration-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-rose-800 flex items-center gap-1.5"><AlertTriangle size={16} /> Zona de Peligro</h3>
                                <p className="text-xs text-rose-900/80 font-medium max-w-xl leading-relaxed">Remover permanentemente este producto de su catálogo público. Si el producto ya posee historial de órdenes facturadas, se archivará automáticamente como borrador.</p>
                            </div>
                            <button onClick={(e) => { e.preventDefault(); handleDeleteProduct(); }} disabled={saving} className="shrink-0 px-5 py-2.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-700 hover:text-white hover:border-rose-700 font-bold text-xs rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-xs">
                                <Trash2 size={14} />
                                <span>Eliminar Producto</span>
                            </button>
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

                        {/* Contenedor de la Imagen */}
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            className="relative bg-white w-full max-w-3xl rounded-xl border border-neutral-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[85vh] z-10"
                        >
                            {/* Cabecera del Lightbox */}
                            <div className="p-4 flex justify-between items-center border-b border-neutral-200/50 shrink-0 bg-neutral-50/50">
                                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">Vista Previa de Interfaz (Detalle)</span>
                                <button
                                    onClick={() => setIsPreviewZoomOpen(false)}
                                    className="p-1.5 text-neutral-500 hover:text-neutral-950 bg-white border border-neutral-200/50 hover:bg-neutral-50 rounded-full transition-colors shadow-xs"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Imagen en resolución completa */}
                            <div className="flex-1 p-6 md:p-8 overflow-y-auto flex items-center justify-center bg-white min-h-[300px]">
                                <div className="relative w-full h-full min-h-[250px] md:min-h-[450px] aspect-square">
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