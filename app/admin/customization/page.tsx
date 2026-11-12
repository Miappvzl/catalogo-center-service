// app/admin/customization/page.tsx
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Save, Loader2, Palette, MonitorSmartphone, RotateCcw, Type, ExternalLink, Check, Sliders, Store, Search as SearchIcon, Image as ImageIcon, Upload, CheckCircle2, AlertCircle, Sparkles, Lock, Eye, SlidersHorizontal, BadgeCheck, Truck, ShieldCheck, Award, Headset, Clock, RefreshCcw, CreditCard, ThumbsUp, Zap, Package, Star, ChevronDown, LayoutGrid } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner' // 🚀 SILENT DELIGHT: Notificaciones Awwwards
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { DEFAULT_THEME_CONFIG, normalizeThemeConfig, AVAILABLE_FONTS } from '@/utils/themeAdapter'
import { HeroCtaConfig, ThemeConfig } from '@/types/theme'
import { TEMPLATES_REGISTRY, TemplateDefinition } from '@/lib/templates-registry'
import { compressImage, resizeImageToExactDimensions } from '@/utils/imageOptimizer'
import { revalidateStoreCache } from '@/app/admin/actions'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import EliteColorPicker from '@/components/admin/EliteColorPicker'
import AiBannerStudioModal from '@/components/admin/AiBannerStudio'
// 🚀 AÑADIR ESTE COMPONENTE (Solución al error TS2304)
const AnimatedSwitch = ({ active, activeColor = 'bg-neutral-900' }: { active: boolean, activeColor?: string }) => (
    <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 cursor-pointer ${active ? `${activeColor} border-transparent justify-end` : 'bg-neutral-100 border-neutral-200 justify-start'}`}>
        <motion.div
            layout
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="w-4.5 h-4.5 rounded-full bg-white shadow-xs"
        />
    </div>
)





// 🚀 CATÁLOGO DE ICONOS VECTORIALES PROFESIONALES (A nivel de módulo)
const TRUST_BADGE_ICONS = [
    { id: 'Truck', label: 'Envío', icon: Truck },
    { id: 'ShieldCheck', label: 'Seguridad', icon: ShieldCheck },
    { id: 'Award', label: 'Garantía', icon: Award },
    { id: 'Headset', label: 'Soporte', icon: Headset },
    { id: 'Zap', label: 'Inmediato', icon: Zap },
    { id: 'Package', label: 'Empaque', icon: Package },
    { id: 'RefreshCcw', label: 'Devolución', icon: RefreshCcw },
    { id: 'CreditCard', label: 'Pagos', icon: CreditCard },
    { id: 'Lock', label: 'Cifrado', icon: Lock },
    { id: 'Clock', label: 'Horario', icon: Clock },
    { id: 'ThumbsUp', label: 'Confianza', icon: ThumbsUp },
    { id: 'Star', label: 'Calidad', icon: Star },
] as const;

// 🚀 ARQUITECTURA DE NAVEGACIÓN BASE (A nivel de módulo: Cero TDZ)
const ALL_STUDIO_TABS = [
    { id: 'marketplace', icon: Store, label: 'Arquetipos' },
    { id: 'multimedia', icon: ImageIcon, label: 'Multimedia' },
    { id: 'colors', icon: Palette, label: 'Colores' },
    { id: 'shapes', icon: Sliders, label: 'Geometría' },
    { id: 'search', icon: SearchIcon, label: 'Buscador' },
    { id: 'typography', icon: Type, label: 'Tipografía' },
    { id: 'badges', icon: BadgeCheck, label: 'Insignias' },
] as const;

export default function CustomizationPage() {
    const supabase = getSupabase()
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storeData, setStoreData] = useState<any>(null)

    const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)
    const [originalConfig, setOriginalConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)
    const [activeTab, setActiveTab] = useState<'marketplace' | 'colors' | 'shapes' | 'search' | 'typography' | 'multimedia' | 'badges'>('marketplace')
    const [viewport, setViewport] = useState<'mobile' | 'desktop'>('mobile')
    const [selectedNicheFilter, setSelectedNicheFilter] = useState<string>('all')
    const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor')
    const [openIconPickerIdx, setOpenIconPickerIdx] = useState<number | null>(null)

    // 🚀 NUEVO ESTADO: Candado protector de marca activado por defecto
    const [preserveBrand, setPreserveBrand] = useState(true)

    // 🚀 FILTRO INTELIGENTE DE PESTAÑAS (Solo muestra lo que la plantilla soporta)
    const activeTabs = useMemo(() => {
        return ALL_STUDIO_TABS.filter(tab => {
            if (tab.id === 'badges') {
                return config.template_id === 'modular_tech';
            }
            return true;
        });
    }, [config.template_id]);

    // Escape seguro: Si la pestaña activa desaparece por cambio de plantilla, vuelve a arquetipos
    useEffect(() => {
        if (activeTab === 'badges' && config.template_id !== 'modular_tech') {
            setActiveTab('marketplace');
        }
    }, [config.template_id, activeTab]);

    // 🚀 IDs de plantillas completamente auditadas y listas para producción (100% Desbloqueadas)
    const ACTIVE_TEMPLATE_IDS = ['classic', 'universal', 'minimal_luxury', 'hardware_dense', 'streetwear_bold', 'bistro_fast', 'modular_tech']

    // Estados para subidas del Studio y Generador IA
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingHeroD, setUploadingHeroDesktop] = useState(false)
    const [uploadingHeroM, setUploadingHeroMobile] = useState(false)
    const [isAiBannerStudioOpen, setIsAiBannerStudioOpen] = useState(false)

    const logoInputRef = useRef<HTMLInputElement>(null)
    const heroDInputRef = useRef<HTMLInputElement>(null)
    const heroMInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: store } = await supabase.from('stores').select('id, name, slug, theme_config, logo_url, hero_url, store_type').eq('user_id', user.id).single()
                if (store) {
                    setStoreData(store)
                    const loadedConfig = normalizeThemeConfig(store.theme_config)

                    // 🚀 SINCRONIZACIÓN DE SEGURIDAD: Inyectar datos legacy y preservar hero_cta
                    if (!loadedConfig.layout.logo_url && store.logo_url) {
                        loadedConfig.layout.logo_url = store.logo_url;
                    }
                    if (!loadedConfig.layout.hero_desktop_url && store.hero_url) {
                        loadedConfig.layout.hero_desktop_url = store.hero_url;
                    }
                    if (store.theme_config?.layout?.hero_cta) {
                        loadedConfig.layout.hero_cta = store.theme_config.layout.hero_cta;
                    }

                    setConfig(loadedConfig)
                    setOriginalConfig(loadedConfig)
                }
            }
            setLoading(false)
        }
        initData()
    }, [supabase])

    // 🚀 PUBLICADOR ATÓMICO: Soporta actualizar solo botones CTA, solo 1 banner o ambos banners
    const handlePublishAiBanners = async ({
        desktopFile,
        mobileFile,
        updatedCtaConfig
    }: {
        desktopFile?: File | null
        mobileFile?: File | null
        updatedCtaConfig: HeroCtaConfig
    }) => {
        if (!storeData?.id) return
        if (desktopFile) setUploadingHeroDesktop(true)
        if (mobileFile) setUploadingHeroMobile(true)

        try {
            const ts = Date.now()
            let nextDesktopUrl = config.layout.hero_desktop_url || storeData?.hero_url || ''
            let nextMobileUrl = config.layout.hero_mobile_url || ''

            if (desktopFile) {
                const desktopFileName = `hero-d-${storeData.id}-${ts}.jpg`
                const { error: upDErr } = await supabase.storage.from('variants').upload(desktopFileName, desktopFile)
                if (upDErr) throw upDErr
                const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(desktopFileName)
                nextDesktopUrl = publicUrl
                await supabase.from('stores').update({ hero_url: publicUrl }).eq('id', storeData.id)
                setStoreData((prev: any) => ({ ...prev, hero_url: publicUrl }))
            }

            if (mobileFile) {
                const mobileFileName = `hero-m-${storeData.id}-${ts}.jpg`
                const { error: upMErr } = await supabase.storage.from('variants').upload(mobileFileName, mobileFile)
                if (upMErr) throw upMErr
                const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(mobileFileName)
                nextMobileUrl = publicUrl
            }

            setConfig((prev: ThemeConfig) => ({
                ...prev,
                layout: {
                    ...prev.layout,
                    hero_desktop_url: nextDesktopUrl,
                    hero_mobile_url: nextMobileUrl,
                    hero_cta: updatedCtaConfig
                }
            }))

            toast.success('Portada y botones de acción actualizados en la vista previa')
        } catch (err) {
            Swal.fire('Error', 'No se pudieron aplicar los cambios de portada', 'error')
        } finally {
            setUploadingHeroDesktop(false)
            setUploadingHeroMobile(false)
        }
    }

    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow && !loading) {
            try {
                iframeRef.current.contentWindow.postMessage({
                    type: 'UPDATE_THEME',
                    config: config
                }, '*');
            } catch (error) {
                console.warn("Iframe en sincronización.");
            }
        }
    }, [config, loading]);

    // 🚀 1. VALIDADOR DE DIMENSIONES FÍSICAS DE IMAGEN
    const validateImageDimensions = (file: File, expectedW: number, expectedH: number): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new window.Image()
            img.onload = () => {
                URL.revokeObjectURL(img.src)
                resolve(img.width === expectedW && img.height === expectedH)
            }
            img.onerror = () => resolve(false)
            img.src = URL.createObjectURL(file)
        })
    }

    // 🚀 2. ESCÁNER DE TRANSPARENCIA POR HARDWARE (Escaneo atómico en 50x50px)
    const checkPngTransparency = (file: File): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(false);

                canvas.width = 50;
                canvas.height = 50;
                ctx.drawImage(img, 0, 0, 50, 50);

                try {
                    const imgData = ctx.getImageData(0, 0, 50, 50);
                    const data = imgData.data;
                    // Escaneamos el canal alfa (cada 4 posiciones: i=3, 7, 11...)
                    for (let i = 3; i < data.length; i += 4) {
                        if (data[i] < 235) { // 235 representa un 92% de opacidad (umbral seguro)
                            resolve(true);
                            return;
                        }
                    }
                    resolve(false);
                } catch (e) {
                    resolve(false);
                }
            };
            img.onerror = () => resolve(false);
            img.src = URL.createObjectURL(file);
        });
    };

    // 🚀 3. COMPRESOR INTELIGENTE PRESERVADOR DE CANAL ALFA (Max 400px de ancho)
    const optimizeLogo = (file: File, isPng: boolean): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas falló'));

                const maxDim = 400; // Suficiente densidad para un logo nítido
                let w = img.width;
                let h = img.height;

                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);

                if (isPng) {
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Fallo compresión PNG'));
                    }, 'image/png');
                } else {
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Fallo compresión JPEG'));
                    }, 'image/jpeg', 0.8);
                }
            };
            img.onerror = () => reject(new Error('Fallo lectura'));
            img.src = URL.createObjectURL(file);
        });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo imágenes', 'error')

        const isPngSelected = config.layout.logo_type === 'png_transparent';

        // 1. Guardrail de Formato & Transparencia Estricta
        if (isPngSelected) {
            if (file.type !== 'image/png') {
                if (logoInputRef.current) logoInputRef.current.value = '';
                return Swal.fire({
                    title: 'Formato incorrecto',
                    html: `Ha seleccionado <b>Logo PNG Transparente</b>. Debe subir una imagen con extensión original <b>.png</b>.<br><br>Su archivo actual es de tipo: <b class="text-rose-600">${file.type.split('/').pop()}</b>.`,
                    icon: 'warning',
                    confirmButtonColor: '#171717'
                });
            }

            setUploadingLogo(true);
            const hasTransparency = await checkPngTransparency(file);
            if (!hasTransparency) {
                setUploadingLogo(false);
                if (logoInputRef.current) logoInputRef.current.value = '';
                return Swal.fire({
                    title: 'Logotipo sin transparencia',
                    html: `Su archivo PNG <b>no contiene pixeles transparentes</b> (tiene fondo sólido).<br><br>Para usar la alineación limpia de barra, debe exportar su logo sin fondo. De lo contrario, use el formato <b>Estándar</b>.`,
                    icon: 'warning',
                    confirmButtonColor: '#171717'
                });
            }
        } else {
            // Si el modo es estándar pero el usuario subió un logo transparente excelente, le sugerimos usar el modo PNG
            if (file.type === 'image/png') {
                const hasTransparency = await checkPngTransparency(file);
                if (hasTransparency) {
                    if (logoInputRef.current) logoInputRef.current.value = '';
                    return Swal.fire({
                        title: 'Logo transparente detectado',
                        html: `Detectamos que su logotipo tiene fondo transparente. ¿Desea cambiar la opción a <b>Logo PNG Transparente</b> para una estética de primer nivel?`,
                        icon: 'info',
                        showCancelButton: true,
                        confirmButtonColor: '#171717',
                        confirmButtonText: 'Usar PNG Transparente',
                        cancelButtonText: 'Mantener Estándar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            handleLayoutChange('logo_type', 'png_transparent');
                        }
                    });
                }
            }
        }

        setUploadingLogo(true)
        try {
            // 2. Compresión preservando el canal de transparencia
            const optimizedBlob = await optimizeLogo(file, isPngSelected);
            const fileExt = isPngSelected ? 'png' : 'jpg';
            const fileName = `logo-${storeData.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, optimizedBlob)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

            await supabase.from('stores').update({ logo_url: publicUrl }).eq('id', storeData.id)
            setStoreData((prev: any) => ({ ...prev, logo_url: publicUrl }))

            setConfig((prev: ThemeConfig) => ({
                ...prev,
                layout: { ...prev.layout, logo_url: publicUrl }
            }))
            toast.success('Logo oficial actualizado');
        } catch (error) {
            Swal.fire('Error', 'Fallo de red al comprimir logotipo', 'error')
        } finally {
            setUploadingLogo(false)
            if (logoInputRef.current) logoInputRef.current.value = ''
        }
    }
    const handleHeroDesktopUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo se permiten archivos de imagen', 'error')

        setUploadingHeroDesktop(true)
        try {
            // 🚀 AUTO-REDIMENSIONAMIENTO DIRECTO EN NAVEGADOR A 1920x600 PX EXACTOS
            const exactDesktopFile = await resizeImageToExactDimensions(file, 1920, 600, {
                mode: 'cover',
                quality: 0.88,
                fileName: 'hero-desktop'
            })
            const fileName = `hero-d-${storeData.id}-${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, exactDesktopFile)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

            await supabase.from('stores').update({ hero_url: publicUrl }).eq('id', storeData.id)
            setStoreData((prev: any) => ({ ...prev, hero_url: publicUrl }))

            setConfig(prev => ({
                ...prev,
                layout: { ...prev.layout, hero_desktop_url: publicUrl }
            }))
            toast.success('Banner adaptado automáticamente a 1920x600 px')
        } catch (error) {
            Swal.fire('Error', 'Fallo de red al procesar el banner', 'error')
        } finally {
            setUploadingHeroDesktop(false)
            if (heroDInputRef.current) heroDInputRef.current.value = ''
        }
    }

    const handleHeroMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo se permiten archivos de imagen', 'error')

        const isRestaurantStore = currentStoreType === 'restaurant'
        const expectedW = 1080
        const expectedH = isRestaurantStore ? 720 : 1350

        setUploadingHeroMobile(true)
        try {
            // 🚀 AUTO-REDIMENSIONAMIENTO DIRECTO EN NAVEGADOR A 1080x1350 (o 1080x720) PX EXACTOS
            const exactMobileFile = await resizeImageToExactDimensions(file, expectedW, expectedH, {
                mode: 'cover',
                quality: 0.88,
                fileName: 'hero-mobile'
            })
            const fileName = `hero-m-${storeData.id}-${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, exactMobileFile)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

            setConfig(prev => ({
                ...prev,
                layout: { ...prev.layout, hero_mobile_url: publicUrl }
            }))
            toast.success(`Portada móvil adaptada automáticamente a ${expectedW}x${expectedH} px`)
        } catch (error) {
            Swal.fire('Error', 'Fallo de red al procesar la portada', 'error')
        } finally {
            setUploadingHeroMobile(false)
            if (heroMInputRef.current) heroMInputRef.current.value = ''
        }
    }
const handleApplyTemplate = (template: TemplateDefinition) => {
        // 🚀 HERENCIA INTELIGENTE: Si el usuario desea preservar su marca, clonamos colores y tipografías.
        const newConfig = normalizeThemeConfig({
            ...template.default_config,
            colors: preserveBrand ? config.colors : template.default_config.colors,
            typography: preserveBrand ? config.typography : template.default_config.typography,
            layout: {
                ...template.default_config.layout,
                // Preservación incondicional de multimedia, encuadre, CTA y textos propios
                logo_url: config.layout?.logo_url || storeData?.logo_url || '',
                logo_type: config.layout?.logo_type || 'png_transparent',
                hero_desktop_url: config.layout?.hero_desktop_url || storeData?.hero_url || '',
                hero_mobile_url: config.layout?.hero_mobile_url || '',
                hero_subtitle: config.layout?.hero_subtitle || template.default_config.layout?.hero_subtitle,
                greeting_text: config.layout?.greeting_text || template.default_config.layout?.greeting_text,
                slogan_text: config.layout?.slogan_text || template.default_config.layout?.slogan_text,
                hero_button_text: config.layout?.hero_button_text || template.default_config.layout?.hero_button_text,
                card_media: config.layout?.card_media || template.default_config.layout?.card_media,
                hero_cta: config.layout?.hero_cta,
            }
        });
        if (config.layout?.hero_cta) {
            newConfig.layout.hero_cta = config.layout.hero_cta;
        }
        setConfig(newConfig);

        toast.success(`Arquetipo estructural ${template.name} aplicado`, {
            position: 'top-center',
            duration: 1500
        });
    }
    const handleColorChange = (key: string, value: string) => {
        setConfig((prev: ThemeConfig) => ({
            ...prev,
            colors: { ...prev.colors, [key]: value }
        }))
    }

    const handleShapeChange = (key: keyof ThemeConfig['shapes'], value: any) => {
        setConfig((prev: ThemeConfig) => ({
            ...prev,
            shapes: { ...prev.shapes, [key]: value }
        }))
    }

    const handleLayoutChange = (key: keyof ThemeConfig['layout'], value: any) => {
        setConfig((prev: ThemeConfig) => ({
            ...prev,
            layout: { ...prev.layout, [key]: value }
        }))
    }

    const handleTypographyChange = (key: keyof ThemeConfig['typography'], value: string) => {
        setConfig((prev: ThemeConfig) => ({
            ...prev,
            typography: { ...prev.typography, [key]: value }
        }))
    }

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig)
    const handleDiscard = () => setConfig(originalConfig)

    const handleResetToDefault = () => {
        Swal.fire({
            title: '¿Restablecer diseño?',
            text: 'Esto devolverá todas las opciones de estilo a los valores de fábrica de su plantilla.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#171717',
            cancelButtonColor: '#f5f5f5',
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-xl font-sans text-xs',
                cancelButton: 'text-neutral-700 font-semibold',
                confirmButton: 'font-semibold'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // 🚀 DETECCIÓN INTELIGENTE DE PLANTILLA: Restablece según sea Restaurante o Retail
                const targetTemplateId = currentStoreType === 'restaurant' ? 'gourmet_flow' : (config.template_id || 'classic');
                const templateDef = TEMPLATES_REGISTRY.find(t => t.id === targetTemplateId) || TEMPLATES_REGISTRY[0];

                const resetConfig = normalizeThemeConfig({
                    ...templateDef.default_config,
                    layout: {
                        ...templateDef.default_config.layout,
                        logo_url: config.layout?.logo_url || storeData?.logo_url || '',
                        logo_type: config.layout?.logo_type || 'png_transparent',
                        hero_desktop_url: config.layout?.hero_desktop_url || storeData?.hero_url || '',
                        hero_mobile_url: config.layout?.hero_mobile_url || '',
                    }
                });

                setConfig(resetConfig);
                toast.success('Valores de fábrica de la plantilla aplicados');
            }
        })
    }

    const handleSave = async () => {
        if (!storeData?.id) return

        // 🚀 GUARDRAIL DE PRODUCCIÓN: Confirmación explícita
        const result = await Swal.fire({
            title: '¿Publicar diseño en vivo?',
            text: 'Los clientes que visiten su tienda verán estos cambios de inmediato.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#171717',
            cancelButtonColor: '#f5f5f5',
            confirmButtonText: 'Sí, publicar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-xl font-sans text-xs',
                cancelButton: 'text-neutral-700 font-semibold',
                confirmButton: 'font-semibold'
            }
        });

        if (!result.isConfirmed) return;
        setSaving(true)
        try {
            const { error } = await supabase.from('stores').update({ theme_config: config }).eq('id', storeData.id)
            if (error) throw error
            setOriginalConfig(config)

            // 🚀 PURGAMOS LA RUTA REAL DEL TENANT
            await revalidateStoreCache(storeData.slug)

            toast.success('Diseño publicado con éxito en la tienda en vivo');
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el diseño.', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        } finally {
            setSaving(false)
        }
    }
    // SEGREGACION ESTRICTA POR TIPO DE TIENDA
    const currentStoreType = storeData?.store_type || 'retail';

    // 1. Filtrar plantillas según el dominio del comercio
    const availableTemplates = useMemo(() => {
        return TEMPLATES_REGISTRY.filter(t => {
            const templateStoreType = t.store_type || 'retail';
            return templateStoreType === 'all' || templateStoreType === currentStoreType;
        });
    }, [currentStoreType]);

    // 2. Filtro secundario por chip seleccionado
    const filteredTemplates = useMemo(() => {
        return availableTemplates.filter(t => {
            if (selectedNicheFilter === 'all') return true;
            return t.niche === selectedNicheFilter;
        });
    }, [availableTemplates, selectedNicheFilter]);

    // 3. Pastillas de filtro contextuales
    const nicheFilterChips = useMemo(() => {
        if (currentStoreType === 'restaurant') {
            return [
                { id: 'all', label: 'Todas las Plantillas FoodTech' }
            ];
        }
        return [
            { id: 'all', label: 'Todas' },
            { id: 'hardware', label: 'Ferretería' },
            { id: 'streetwear', label: 'Streetwear' },
            { id: 'beauty', label: 'Belleza' }, // 🚀 ANTES DECÍA 'food' / 'Bodegón'
            { id: 'luxury', label: 'Lujo' },
            { id: 'tech', label: 'Tecnología' },
        ];
    }, [currentStoreType]);

    if (loading) return <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center"><Loader2 className="animate-spin text-neutral-300" size={24} /></div>


    const getBaseDomain = () => {
        if (typeof window === 'undefined') return 'preziso.shop';
        if (window.location.hostname.includes('localhost')) return window.location.host;
        return 'preziso.shop';
    }

    // 🚀 CACHE BUSTER SIMPLIFICADO: Cero Hooks, cero errores de React. 
    // Solo recargará el teléfono cuando cambie la variable 'currentStoreType'.
    const previewUrl = storeData
        ? `${window.location.protocol}//${storeData.slug}.${getBaseDomain()}?mode=preview&t=${currentStoreType}`
        : '';

    // 🛑 EARLY RETURN: Siempre abajo, sin afectar a nadie
    if (loading) return <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center"><Loader2 className="animate-spin text-neutral-300" size={24} /></div>

    return (
        <div className="min-h-screen w-full max-w-[100vw] bg-[#f4f4f5] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] flex font-sans overflow-hidden antialiased selection:bg-neutral-900 selection:text-white">
            {/* 🖥️ VERTICAL RAIL (Figma Style - Desktop Only) */}
            <nav className="hidden lg:flex flex-col items-center py-6 w-[72px] bg-white/80 backdrop-blur-2xl border-r border-neutral-200/60 shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] justify-between">
                <div className="flex flex-col items-center gap-6 w-full">
                    <Link href="/admin" className="p-3 bg-white border border-neutral-200/60 hover:bg-neutral-50 rounded-xl transition-all  active:scale-95 group">
                        <ArrowLeft size={18} className="text-neutral-600 group-hover:text-neutral-900" />
                    </Link>
                    <div className="w-8 h-px bg-neutral-200/60" />
                    <div className="flex flex-col items-center gap-3 w-full px-2">
                        {activeTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`relative p-3 rounded-md transition-all group w-full flex justify-center ${activeTab === tab.id ? 'bg-neutral-200/70 text-black/70 ' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
                            >
                                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                                {/* Tooltip Flotante */}
                                <span className="absolute left-full ml-4 px-2.5 py-1.5 bg-neutral-200 text-black/70 text-[10px] font-bold uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap  z-50">
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Controles de Guardado en el Rail */}
                <div className="flex flex-col items-center gap-4 w-full px-2">
                    {hasChanges && (
                        <button onClick={handleDiscard} className="p-3 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Descartar Cambios">
                            <RotateCcw size={18} />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="p-3 bg-black/90 text-white rounded-md  disabled:opacity-40 disabled:shadow-none transition-all active:scale-95"
                        title="Publicar Diseño"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    </button>
                </div>
            </nav>

            {/* 📱 FLOATING BOTTOM BAR (Dynamic Island - Mobile Only) */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50 flex items-center justify-between bg-white/90 backdrop-blur-xl border border-neutral-200/60 p-2 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 px-1">
                    {activeTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id as any); setMobileViewMode('editor'); }}
                            className={`p-2.5 rounded-xl shrink-0 transition-all ${activeTab === tab.id && mobileViewMode === 'editor' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100'}`}
                        >
                            <tab.icon size={18} strokeWidth={activeTab === tab.id && mobileViewMode === 'editor' ? 2.5 : 2} />
                        </button>
                    ))}
                </div>
                <div className="w-px h-8 bg-neutral-200/60 mx-2 shrink-0" />
                <button
                    onClick={() => setMobileViewMode(prev => prev === 'editor' ? 'preview' : 'editor')}
                    className="px-3 py-2.5 bg-neutral-100 text-neutral-900 rounded-xl shrink-0 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                    {mobileViewMode === 'editor' ? <><Eye size={14} /> Vista</> : <><SlidersHorizontal size={14} /> Editor</>}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="p-2.5 bg-black/70 text-white rounded-md shrink-0 ml-2  disabled:opacity-40 disabled:shadow-none active:scale-95 transition-all"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
            </div>

            {/* 🎛️ THE CREATOR STUDIO (Main Content Area) */}
            <div className="flex-1 flex flex-col lg:flex-row h-[100dvh] overflow-hidden relative">

                {/* PANEL FLOTANTE (EDITOR) */}
                <motion.div
                    layout
                    className={`w-full lg:w-[400px] xl:w-[440px] h-full lg:h-[calc(100vh-48px)] lg:my-6 lg:ml-6 bg-white/95 backdrop-blur-2xl lg:rounded-[2rem] lg:border border-neutral-200/60 lg:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex-col z-20 overflow-hidden ${mobileViewMode === 'editor' ? 'flex' : 'hidden lg:flex'}`}
                >
                    {/* Header Interno del Panel Flotante */}
                    <div className="px-6 py-5 border-b border-neutral-100 bg-white/50 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-widest">
                                {ALL_STUDIO_TABS.find((t) => t.id === activeTab)?.label}
                            </h2>
                            <p className="text-[10px] font-medium text-neutral-500 mt-0.5">Personaliza tu experiencia</p>
                        </div>
                        <div className="lg:hidden">
                            <Link href="/admin" className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center justify-center">
                                <ArrowLeft size={16} className="text-neutral-600" />
                            </Link>
                        </div>
                    </div>

                    {/* Contenido scrolleable */}
                    <div className="flex-1 overflow-y-auto px-5 py-6 pb-32 lg:pb-6 no-scrollbar">
                        {activeTab === 'marketplace' && (
                            <div className="space-y-5 animate-in fade-in pb-10">
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Arquetipos Comerciales</h3>
                                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Aplica un diseño preconfigurado con un clic.</p>
                                </div>

                                {/* 🚀 UI ULTRA-LEGBILE: CANDADO DE IDENTIDAD (Pura jerarquía Stripe/Linear) */}
                                <div
                                    onClick={() => setPreserveBrand(!preserveBrand)}
                                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between select-none ${preserveBrand
                                        ? 'bg-zinc-50/80 border-zinc-900/80 shadow-2xs'
                                        : 'bg-white border-zinc-200/80 hover:border-zinc-300 shadow-2xs'
                                        }`}
                                >
                                    <div className="flex items-start gap-3.5 pr-4">
                                        {/* Icono con badge dinámico integrado */}
                                        <div
                                            className={`p-2.5 rounded-xl shrink-0 transition-colors mt-0.5 ${preserveBrand
                                                ? 'bg-zinc-900 text-white'
                                                : 'bg-zinc-100 text-zinc-400'
                                                }`}
                                        >
                                            <ShieldCheck size={18} strokeWidth={2} />
                                        </div>

                                        {/* Textos ordenados con lectura fluida */}
                                        <div className="flex flex-col gap-0.5">
                                            <h4 className="text-xs font-bold text-zinc-900 tracking-tight leading-snug">
                                                Preservar mis colores y fuentes
                                            </h4>
                                            <p className="text-[11px] font-normal leading-normal text-zinc-500 max-w-[340px]">
                                                Al cambiar de arquetipo, adoptaremos su estructura pero{' '}
                                                <strong className="font-semibold text-zinc-800">
                                                    mantendremos tu paleta de colores intacta
                                                </strong>.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Control de cambio (Único punto focal de acción a la derecha) */}
                                    <div className="shrink-0 pl-2">
                                        <AnimatedSwitch
                                            active={preserveBrand}
                                            activeColor="bg-zinc-900"
                                        />
                                    </div>
                                </div>

                                {/* Filtros por Nicho Contextuales */}
                                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full max-w-full min-w-0 shrink-0 pt-2">
                                    {nicheFilterChips.map(chip => (
                                        <button
                                            key={chip.id}
                                            type="button"
                                            onClick={() => setSelectedNicheFilter(chip.id)}
                                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border active:scale-95 ${selectedNicheFilter === chip.id
                                                ? 'bg-neutral-950 border-neutral-950 text-white shadow-xs'
                                                : 'bg-white border-neutral-200/60 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
                                                }`}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Listado de Tarjetas Reestructuradas */}
                                <div className="space-y-3">
                                    {filteredTemplates.map(template => {
                                        const isCurrent = config.template_id === template.id;

                                        return (
                                            <div
                                                key={template.id}
                                                className={`relative p-4.5 rounded-2xl border transition-all flex flex-col gap-2.5 overflow-hidden ${isCurrent
                                                    ? 'bg-white border-neutral-950 ring-1 ring-neutral-950/10 shadow-xs'
                                                    : 'bg-white border-neutral-200/60 hover:border-neutral-300 shadow-2xs'
                                                    }`}
                                            >
                                                {/* FILA PRINCIPAL: BADGE ARRIBA EN MÓVIL / AL LADO EN DESKTOP */}
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex flex-col lg:flex-row lg:items-center items-start gap-1 lg:gap-2 min-w-0">
                                                        {/* Badge: Primero arriba en móvil (order-1), a la derecha en desktop (lg:order-2) */}
                                                        {template.badge && (
                                                            <span className="order-1 lg:order-2 px-2 py-0.5 bg-neutral-100  text-[8px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-md shrink-0">
                                                                {template.badge}
                                                            </span>
                                                        )}

                                                        {/* Título: Segundo en móvil (order-2), primero en desktop (lg:order-1) */}
                                                        <h4 className="order-2 lg:order-1 font-bold text-sm text-neutral-950 tracking-tight truncate w-full lg:w-auto">
                                                            {template.name}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {/* BOTÓN OJITO (PREVIEW TÁCTIL) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!isCurrent) handleApplyTemplate(template);
                                                                setMobileViewMode('preview');
                                                            }}
                                                            className="lg:hidden p-2 rounded-[4.3px] bg-neutral-100/90 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-950 active:scale-90 transition-all "
                                                            title="Ver en mockup de tienda"
                                                            aria-label="Ver mockup"
                                                        >
                                                            <Eye size={14} strokeWidth={2.2} />
                                                        </button>

                                                        {/* 🚀 BOTÓN APLICAR ELEGANTE (CERO DISRUPCIÓN, CERO VERDE MENTA) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyTemplate(template)}
                                                            disabled={isCurrent}
                                                            className={`px-3.5 py-1.5 rounded-[4.3px] text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${isCurrent
                                                                ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs cursor-default'
                                                                : 'bg-white hover:bg-neutral-100/80 text-neutral-700 hover:text-neutral-950 border-neutral-200/80 active:scale-95 shadow-2xs'
                                                                }`}
                                                        >
                                                            {isCurrent ? (
                                                                <>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-200 shrink-0" />
                                                                    <span>Activa</span>
                                                                </>
                                                            ) : (
                                                                'Aplicar'
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* DESCRIPCIÓN DIRECTA Y AGNOSTICA */}
                                                <p className="text-xs leading-relaxed font-normal text-neutral-500">
                                                    {template.description}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: MULTIMEDIA & LOGOTIPO (DISEÑO PROGRESIVO DE ALTO NIVEL) */}
                        {activeTab === 'multimedia' && (
                            <div className="space-y-6 animate-in fade-in pb-10">

                                {/* SECCIÓN LOGO */}
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Logotipo Comercial</h3>
                                        <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Defina primero el formato y luego cargue su archivo de marca.</p>
                                    </div>

                                    {/* PASO 1: Selector de Formato con ventajas explicativas */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                            Paso 1: Elija el formato de su logotipo
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div
                                                onClick={() => { handleLayoutChange('logo_type', 'png_transparent'); }}
                                                className={`cursor-pointer p-4 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all shadow-xs ${config.layout.logo_type === 'png_transparent' ? 'border-neutral-900 bg-white ring-1 ring-neutral-900 text-neutral-900' : 'bg-white border-neutral-200/50 hover:border-neutral-300 text-neutral-700'}`}
                                            >
                                                <div className="flex justify-between items-start w-full gap-2 mb-1.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider">PNG Transparente</span>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${config.layout.logo_type === 'png_transparent' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'}`}>
                                                        {config.layout.logo_type === 'png_transparent' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] leading-relaxed opacity-90 font-medium">Flota directamente sobre el cristal de la cabecera sin recuadros blancos. Es la opción preferida de las marcas premium.</p>
                                            </div>

                                            <div
                                                onClick={() => { handleLayoutChange('logo_type', 'standard'); }}
                                                className={`cursor-pointer p-4 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all shadow-xs ${config.layout.logo_type === 'standard' ? 'border-neutral-900 bg-white ring-1 ring-neutral-900 text-neutral-900' : 'bg-white border-neutral-200/50 hover:border-neutral-300 text-neutral-700'}`}
                                            >
                                                <div className="flex justify-between items-start w-full gap-2 mb-1.5">
                                                    <span className="text-xs font-bold uppercase tracking-wider">Estándar con Fondo</span>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${config.layout.logo_type === 'standard' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200'}`}>
                                                        {config.layout.logo_type === 'standard' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] leading-relaxed opacity-90 font-medium">Se adapta a cualquier imagen cuadrada (ideal si su logo es JPG o foto). Crea una píldora blanca protectora.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PASO 2: Carga de Archivo (Condicionada con su uploader) */}
                                    <div className="space-y-2 animate-in fade-in duration-300">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                            Paso 2: Suba su archivo de marca
                                        </label>

                                        <div className="flex items-center gap-4 p-4 bg-white border border-neutral-200/60 rounded-xl shadow-xs">
                                            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                            <div
                                                onClick={() => logoInputRef.current?.click()}
                                                className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-neutral-400 transition-colors shadow-xs"
                                            >
                                                {uploadingLogo ? (
                                                    <Loader2 className="animate-spin text-neutral-400" size={16} />
                                                ) : storeData?.logo_url ? (
                                                    <Image src={getOptimizedUrl(storeData.logo_url)} alt="Logo" fill sizes="60px" className="object-contain p-1" />
                                                ) : (
                                                    <Upload size={16} className="text-neutral-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-neutral-800">
                                                    {config.layout.logo_type === 'png_transparent' ? 'Isotipo en PNG sin fondo' : 'Logotipo (JPG/PNG)'}
                                                </p>
                                                <p className="text-[10px] text-neutral-400 font-mono mt-0.5 uppercase font-semibold">
                                                    {config.layout.logo_type === 'png_transparent' ? 'Filtro: .png transparente • Máx 2MB' : 'Acepta: .jpg / .png • Máx 2MB'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Helper contextual de contraste */}
                                        {config.layout.logo_type === 'png_transparent' && (
                                            <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                                                <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                                                    💡 <strong>Sugerencia de Contraste:</strong> Asegúrese de que su archivo PNG r=tenga un color que contraste  perfectamente con el color de Fondo de Tienda seleccionado actualmente para que sea legible.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             {/* SECCIÓN HERO BANNERS (DUAL RESPONSIVE PARA TODOS LOS TEMAS) */}
                                <div className="space-y-4 pt-4 border-t border-neutral-100">
                                    <div>
                                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Heros y Portadas</h3>
                                        <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                                            Suba cualquier imagen y se adaptará sola a las medidas exactas, o configure botones de acción sobre la portada.
                                        </p>
                                    </div>

                                    {/* PANEL MINIMALISTA PLANO (CERO SOMBRAS, BOTONES PASTILLA SIN FONDO) */}
                                    <div className="p-4 rounded-xl bg-white border border-neutral-200/80 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-0.5">
                                                <h4 className="text-xs font-semibold text-neutral-900">
                                                    Botones de Llamada a la Acción (CTA) & Encuadre
                                                </h4>
                                                <p className="text-[11px] text-neutral-500 leading-relaxed">
                                                    Personaliza botones interactivos (&quot;Comprar Ahora&quot;), descripción con fuentes múltiples y ajuste de encuadre.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => setIsAiBannerStudioOpen(true)}
                                                className="px-4 py-2 rounded-full border border-neutral-900 bg-transparent hover:bg-neutral-900 text-neutral-900 hover:text-white text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                                            >
                                                Configurar Botones CTA y Encuadre
                                            </button>

                                            {config.layout.hero_cta && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleLayoutChange('hero_cta', {
                                                            ...config.layout.hero_cta,
                                                            enabled: !config.layout.hero_cta?.enabled
                                                        })
                                                    }
                                                    className={`px-3.5 py-2 rounded-full text-[10px] font-mono font-medium uppercase border transition-colors cursor-pointer ${
                                                        config.layout.hero_cta.enabled
                                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                                            : 'border-neutral-200 bg-transparent text-neutral-500 hover:border-neutral-400'
                                                    }`}
                                                >
                                                    CTA: {config.layout.hero_cta.enabled ? 'Visible' : 'Oculto'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Escritorio */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between">
                                                <span>1. Banner Escritorio</span>
                                                <span className="font-mono text-neutral-400">1920x600 px</span>
                                            </label>
                                            <input type="file" ref={heroDInputRef} className="hidden" accept="image/*" onChange={handleHeroDesktopUpload} />

                                            {(config.layout.hero_desktop_url || storeData?.hero_url) ? (
                                                <div className="relative w-full h-24 rounded-xl border border-neutral-200 bg-white overflow-hidden group cursor-pointer" onClick={() => heroDInputRef.current?.click()}>
                                                    <Image src={getOptimizedUrl(config.layout.hero_desktop_url || storeData.hero_url)} alt="Desktop" fill className="object-cover" />
                                                    <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Cambiar</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div onClick={() => heroDInputRef.current?.click()} className="w-full py-6 bg-white border border-dashed border-neutral-200 hover:border-neutral-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors">
                                                    {uploadingHeroD ? <Loader2 size={16} className="animate-spin text-neutral-400" /> : <Upload size={16} className="text-neutral-400 mb-1" />}
                                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Cargar Banner (1920x600)</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Móvil */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between">
                                                <span>2. Portada Móvil</span>
                                                <span className="font-mono text-neutral-400">
                                                    {currentStoreType === 'restaurant' ? '1080x720 px (3:2)' : '1080x1350 px (4:5)'}
                                                </span>
                                            </label>
                                            <input type="file" ref={heroMInputRef} className="hidden" accept="image/*" onChange={handleHeroMobileUpload} />

                                            {config.layout.hero_mobile_url ? (
                                                <div className="relative w-32 aspect-[4/5] rounded-xl border border-neutral-200 bg-white overflow-hidden group cursor-pointer" onClick={() => heroMInputRef.current?.click()}>
                                                    <Image src={getOptimizedUrl(config.layout.hero_mobile_url)} alt="Mobile" fill className="object-cover" />
                                                    <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Cambiar</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div onClick={() => heroMInputRef.current?.click()} className="w-full py-6 bg-white border border-dashed border-neutral-200 hover:border-neutral-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors">
                                                    {uploadingHeroM ? <Loader2 size={16} className="animate-spin text-neutral-400" /> : <Upload size={16} className="text-neutral-400 mb-1" />}
                                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Cargar Portada Vertical</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 🚀 EDITOR DE FRASE EDITORIAL (Solo para Minimal Luxury) */}
                                    {config.template_id === 'minimal_luxury' && (
                                        <div className="space-y-2 pt-4 border-t border-neutral-200/60 animate-in fade-in duration-200">
                                            <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between">
                                                <span>3. Frase Editorial (Sub-Ticker)</span>
                                                <span className="font-mono text-neutral-400">
                                                    {config.layout.hero_subtitle?.length || 0}/100
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={100}
                                                value={config.layout.hero_subtitle || ''}
                                                onChange={(e) => handleLayoutChange('hero_subtitle', e.target.value)}
                                                placeholder="— Diseños atemporales y fragancias exclusivas creadas para perdurar —"
                                                className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                            />
                                        </div>
                                    )}
                                </div>

                              {/* 🚀 IMAGE ENGINE CUSTOMIZER (Encuadre Élite con Muestras Visuales) */}
                                <div className="space-y-5 pt-5 border-t border-neutral-200/60 animate-in fade-in duration-300">
                                    <div>
                                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5"><LayoutGrid size={14} className="text-neutral-500" /> Encuadre de Productos</h3>
                                        <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Adapte la geometría de las tarjetas según el tipo de fotografía de su catálogo.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Selector Visual de Relación de Aspecto */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                                                Proporción de la Imagen
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'aspect-square', label: '1:1 Cuadrado', desc: 'Comida / General', boxClass: 'w-6 h-6' },
                                                    { id: 'aspect-[4/5]', label: '4:5 Vertical', desc: 'Moda / Catálogo', boxClass: 'w-5 h-6.5' },
                                                    { id: 'aspect-[4/3]', label: '4:3 Horizontal', desc: 'Tech / Detalle', boxClass: 'w-7 h-5' },
                                                ].map(item => {
                                                    const isSel = config.layout.card_media?.ratio === item.id;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => handleLayoutChange('card_media', { ...config.layout.card_media, ratio: item.id })}
                                                            className={`p-3 rounded-xl border transition-colors flex flex-col items-center justify-between gap-2 cursor-pointer ${
                                                                isSel
                                                                    ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900 text-neutral-900'
                                                                    : 'border-neutral-200/80 bg-white hover:border-neutral-400 text-neutral-700'
                                                            }`}
                                                        >
                                                            <div className="h-8 flex items-center justify-center">
                                                                <div
                                                                    className={`${item.boxClass} rounded-[4px] border transition-colors ${
                                                                        isSel
                                                                            ? 'border-neutral-900 bg-neutral-900/15'
                                                                            : 'border-neutral-400 bg-neutral-100'
                                                                    }`}
                                                                />
                                                            </div>
                                                            <div className="text-center">
                                                                <span className="text-[11px] font-semibold block leading-none">{item.label}</span>
                                                                <span className="text-[9px] text-neutral-400 font-medium block mt-1 leading-none">{item.desc}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Selector Visual de Llenado (Cover vs Contain) */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                                                Ajuste de la Fotografía
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Muestra Cover */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleLayoutChange('card_media', { ...config.layout.card_media, fit: 'cover' })}
                                                    className={`cursor-pointer p-3 rounded-xl border text-left flex flex-col gap-2.5 transition-colors ${
                                                        config.layout.card_media?.fit === 'cover'
                                                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900 text-neutral-900'
                                                            : 'bg-white border-neutral-200/80 hover:border-neutral-400 text-neutral-700'
                                                    }`}
                                                >
                                                    <div className="w-full h-11 rounded-lg border border-neutral-300 overflow-hidden bg-neutral-200 flex items-center justify-center relative">
                                                        <div className="w-full h-full bg-[linear-gradient(135deg,#27272a_0%,#52525b_100%)] flex items-center justify-center">
                                                            <span className="text-[9px] font-mono uppercase tracking-wider text-white/90">
                                                                100% Lleno
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[11px] font-semibold block">Inmersivo (Cover)</span>
                                                        <span className="text-[9px] text-neutral-500 leading-snug block mt-0.5">
                                                            La foto cubre toda la tarjeta sin márgenes.
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Muestra Contain */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleLayoutChange('card_media', { ...config.layout.card_media, fit: 'contain' })}
                                                    className={`cursor-pointer p-3 rounded-xl border text-left flex flex-col gap-2.5 transition-colors ${
                                                        config.layout.card_media?.fit === 'contain'
                                                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900 text-neutral-900'
                                                            : 'bg-white border-neutral-200/80 hover:border-neutral-400 text-neutral-700'
                                                    }`}
                                                >
                                                    <div className="w-full h-11 rounded-lg border border-neutral-300 bg-neutral-100 p-1.5 flex items-center justify-center">
                                                        <div className="w-12 h-full rounded-[4px] bg-white border border-neutral-300 flex items-center justify-center">
                                                            <span className="text-[8px] font-mono uppercase text-neutral-600">
                                                                Foto
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[11px] font-semibold block">Encapsulado (Contain)</span>
                                                        <span className="text-[9px] text-neutral-500 leading-snug block mt-0.5">
                                                            Respeta bordes con margen interno limpio.
                                                        </span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Selector de Color de Fondo Dinámico (Solo visible si es Contain) */}
                                        <AnimatePresence>
                                            {config.layout.card_media?.fit === 'contain' && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-2">
                                                    <EliteColorPicker
                                                        label="Color de Fondo del Empaque"
                                                        value={config.layout.card_media?.bg_color || 'transparent'}
                                                        description="Color del espacio sobrante para fusionar la foto con la tarjeta."
                                                        enableAlpha={true}
                                                        onChange={(val) => handleLayoutChange('card_media', { ...config.layout.card_media, bg_color: val })}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* EDITOR DE TEXTOS GASTRONÓMICOS */}
                                {currentStoreType === 'restaurant' && (
                                    <div className="space-y-4 pt-4 border-t border-neutral-200/60 animate-in fade-in duration-200">
                                        <div>
                                            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Textos de la Interfaz</h3>
                                            <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Personaliza los mensajes de la cabecera y el botón del hero.</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between mb-1">
                                                    <span>Saludo Superior (Sobre el logo)</span>
                                                    <span className="font-mono">{config.layout.greeting_text?.length || 0}/30</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={30}
                                                    value={config.layout.greeting_text || ''}
                                                    onChange={(e) => handleLayoutChange('greeting_text', e.target.value)}
                                                    placeholder="Ej: Bienvenido a, Hola Foodie"
                                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2 text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between mb-1">
                                                    <span>Eslogan / Subtítulo Institucional</span>
                                                    <span className="font-mono">{config.layout.slogan_text?.length || 0}/60</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={60}
                                                    value={config.layout.slogan_text || ''}
                                                    onChange={(e) => handleLayoutChange('slogan_text', e.target.value)}
                                                    placeholder="Ej: Delicioso. Todos los días."
                                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2 text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex justify-between mb-1">
                                                    <span>Texto del Botón en Hero</span>
                                                    <span className="font-mono">{config.layout.hero_button_text?.length || 0}/25</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={25}
                                                    value={config.layout.hero_button_text || ''}
                                                    onChange={(e) => handleLayoutChange('hero_button_text', e.target.value)}
                                                    placeholder="Ej: Ordenar Ahora, Ver Menú"
                                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2 text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* 🚀 EL BOTÓN DE GUARDADO DE SEGURIDAD & RECARGA DE PREVIEW */}
                                <div className="pt-6 border-t border-neutral-200/50 flex flex-col gap-3">
                                    <button
                                        onClick={async () => {
                                            setSaving(true);
                                            try {
                                                // 1. Guardamos la configuración en la Base de Datos
                                                const { error } = await supabase.from('stores').update({ theme_config: config }).eq('id', storeData.id);
                                                if (error) throw error;
                                                setOriginalConfig(config);

                                                // 2. Limpiamos la caché del servidor en Next.js
                                                await revalidateStoreCache();

                                                // 3. 🚀 FORCE RELOAD DEL IFRAME (Garantía absoluta de renderizado)
                                                if (iframeRef.current) {
                                                    iframeRef.current.src = iframeRef.current.src;
                                                }

                                                toast.success('Identidad y Multimedia publicada');
                                            } catch (e) {
                                                Swal.fire('Error', 'Fallo de conexión al guardar cambios', 'error');
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                        disabled={saving}
                                        className="w-full bg-neutral-950 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        <span>Guardar Identidad & Recargar Tienda</span>
                                    </button>
                                </div>
                            </div>

                        )}


                        {/* TAB 3: COLORES */}
                        {activeTab === 'colors' && (
                            <div className="space-y-5 animate-in fade-in pb-10">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2.5">Marca & Botones</span>
                                    <div className="space-y-2">
                                        <EliteColorPicker
                                            label="Color Principal"
                                            value={config.colors.primary}
                                            description="Botones de compra y elementos destacados."
                                            onChange={(val) => handleColorChange('primary', val)}
                                        />
                                        <EliteColorPicker
                                            label="Texto en Botones"
                                            value={config.colors.primary_text}
                                            description="Texto sobre el botón de acción."
                                            onChange={(val) => handleColorChange('primary_text', val)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">Lienzo & Superficies</span>
                                    <div className="space-y-2">
                                        <EliteColorPicker
                                            label="Fondo General"
                                            value={config.colors.background}
                                            description="Color de fondo de toda la tienda."
                                            onChange={(val) => handleColorChange('background', val)}
                                        />
                                        <EliteColorPicker
                                            label="Fondo de Tarjetas"
                                            value={config.colors.surface}
                                            description="Superficie de productos y menús."
                                            onChange={(val) => handleColorChange('surface', val)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">Textos & Bordes</span>
                                    <div className="space-y-2">
                                        <EliteColorPicker
                                            label="Texto Principal"
                                            value={config.colors.text_main}
                                            description="Títulos y precios."
                                            onChange={(val) => handleColorChange('text_main', val)}
                                        />
                                        <EliteColorPicker
                                            label="Texto Secundario"
                                            value={config.colors.surface_text}
                                            description="Descripciones y categorías."
                                            onChange={(val) => handleColorChange('surface_text', val)}
                                        />
                                        {/* 🚀 BORDES CON TRANSPARENCIA INTEGRADA (enableAlpha={true}) */}
                                        <EliteColorPicker
                                            label="Líneas y Bordes"
                                            value={config.colors.border}
                                            description="Color y nivel de transparencia de las líneas divisorias y contornos."
                                            enableAlpha={true}
                                            onChange={(val) => handleColorChange('border', val)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 block mb-2">Conversión</span>
                                    <div className="space-y-2">
                                        <EliteColorPicker
                                            label="Ahorro en Divisas"
                                            value={config.colors.incentive}
                                            description="Badges de ahorro en divisas y checkmarks."
                                            onChange={(val) => handleColorChange('incentive', val)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 block mb-2">Etiquetas & Interacciones</span>
                                    <div className="space-y-2">
                                        <EliteColorPicker
                                            label="Fondo de Descuento"
                                            value={config.colors.badge_discount_bg}
                                            description="Fondo de la etiqueta de % de rebaja."
                                            onChange={(val) => handleColorChange('badge_discount_bg', val)}
                                        />
                                        <EliteColorPicker
                                            label="Texto de Descuento"
                                            value={config.colors.badge_discount_text}
                                            description="Color del número de descuento."
                                            onChange={(val) => handleColorChange('badge_discount_text', val)}
                                        />
                                        <EliteColorPicker
                                            label="Fondo de Agotado"
                                            value={config.colors.badge_soldout_bg}
                                            description="Fondo de la etiqueta sin stock."
                                            onChange={(val) => handleColorChange('badge_soldout_bg', val)}
                                        />
                                        <EliteColorPicker
                                            label="Texto de Agotado"
                                            value={config.colors.badge_soldout_text}
                                            description="Color del texto sin stock."
                                            onChange={(val) => handleColorChange('badge_soldout_text', val)}
                                        />
                                        <EliteColorPicker
                                            label="Icono Favorito"
                                            value={config.colors.action_favorite}
                                            description="Color del corazón al ser activado."
                                            onChange={(val) => handleColorChange('action_favorite', val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                      {/* TAB 4: GEOMETRÍA (MUESTRAS VISUALES EN VIVO DE BOTONES, BORDES, SOMBRAS Y MODAL) */}
                        {activeTab === 'shapes' && (
                            <div className="space-y-6 animate-in fade-in pb-10">

                                {/* 1. FORMA DE LOS BOTONES (Muestra visual del botón en cada tarjeta) */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                            1. Forma de los Botones
                                        </label>
                                        {config.template_id === 'hardware_dense' && (
                                            <span className="text-[9px] font-mono text-amber-600 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-bold">
                                                Modo Técnico
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            ...(!['bistro_fast', 'classic', 'modular_tech'].includes(config.template_id) ? [{ id: 'sharp', label: 'Recto (0px)', radius: '0px' }] : []),
                                            { id: 'rounded', label: 'Suave (10px)', radius: '10px' },
                                            ...(!['hardware_dense', 'minimal_luxury', 'streetwear_bold'].includes(config.template_id) ? [{ id: 'pill', label: 'Pastilla (999px)', radius: '9999px' }] : [])
                                        ].map(item => {
                                            const isActive = config.shapes.button_shape === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleShapeChange('button_shape', item.id)}
                                                    className={`p-3 rounded-xl border flex flex-col items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                                                        isActive
                                                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                                            : 'border-neutral-200/80 bg-white hover:border-neutral-400'
                                                    }`}
                                                >
                                                    <div className="w-full py-2 px-3 rounded-lg bg-neutral-100/80 flex items-center justify-center">
                                                        <span
                                                            style={{ borderRadius: item.radius }}
                                                            className={`px-4 py-1.5 text-[10px] font-semibold border transition-colors ${
                                                                isActive
                                                                    ? 'bg-neutral-900 text-white border-neutral-900'
                                                                    : 'bg-white text-neutral-800 border-neutral-400'
                                                            }`}
                                                        >
                                                            Comprar
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-neutral-800">
                                                        {item.label}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 2. GROSOR DE LÍNEAS Y BORDES (Muestra física del grosor real en cada tarjeta) */}
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">
                                        2. Grosor de Líneas y Bordes
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            ...(!['hardware_dense', 'streetwear_bold'].includes(config.template_id)
                                                ? [
                                                    { id: 'none', label: 'Sin Borde', widthPx: 0 },
                                                    { id: 'hairline', label: '0.5px Sutil', widthPx: 1 }
                                                ]
                                                : []),
                                            { id: 'thin', label: '1px Fino', widthPx: 1.5 },
                                            ...(!['minimal_luxury', 'bistro_fast', 'modular_tech'].includes(config.template_id)
                                                ? [{ id: 'bold', label: '2px Fuerte', widthPx: 2.5 }]
                                                : []),
                                        ].map(item => {
                                            const isActive = config.shapes.line_weight === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleShapeChange('line_weight', item.id)}
                                                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-between gap-2 h-20 transition-colors cursor-pointer ${
                                                        isActive
                                                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                                            : 'border-neutral-200/80 bg-white hover:border-neutral-400'
                                                    }`}
                                                >
                                                    <div className="w-full my-auto flex items-center justify-center px-1">
                                                        {item.id === 'none' ? (
                                                            <div className="w-full h-6 rounded-md bg-neutral-100 border border-dashed border-neutral-300 flex items-center justify-center">
                                                                <span className="text-[8px] font-mono text-neutral-400 uppercase">0px</span>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                style={{ borderWidth: `${item.widthPx}px` }}
                                                                className={`w-full h-6 rounded-md bg-white ${
                                                                    item.id === 'hairline'
                                                                        ? 'border-neutral-300'
                                                                        : 'border-neutral-900'
                                                                }`}
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-neutral-800 whitespace-nowrap">
                                                        {item.label}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 3. SOMBRAS DE CAJAS E INPUTS (Escenario interno con proyección real) */}
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">
                                        3. Sombras de Tarjetas e Inputs
                                    </label>

                                    {config.template_id === 'classic' ? (
                                        <div className="p-3.5 rounded-xl border border-neutral-200/60 bg-neutral-50 flex items-center justify-between">
                                            <div className="flex flex-col pr-3">
                                                <span className="text-xs font-bold text-neutral-800">Estética Flat (Sin Sombras)</span>
                                                <span className="text-[10px] text-neutral-500 font-medium mt-0.5">El tema Universal prioriza la velocidad de conversión pura sin sombras.</span>
                                            </div>
                                            <span className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-mono font-bold uppercase text-neutral-500 shrink-0">Fijo</span>
                                        </div>
                                    ) : config.template_id === 'minimal_luxury' ? (
                                        <div className="p-3.5 rounded-xl border border-neutral-200/60 bg-neutral-50 flex items-center justify-between">
                                            <div className="flex flex-col pr-3">
                                                <span className="text-xs font-bold text-neutral-800">Invisible UI (Sin Sombras)</span>
                                                <span className="text-[10px] text-neutral-500 font-medium mt-0.5">El lujo editorial basa su jerarquía en espacios en blanco y líneas puras.</span>
                                            </div>
                                            <span className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-mono font-bold uppercase text-neutral-500 shrink-0">Fijo</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                                            {[
                                                { id: 'none', label: 'Plano (Sin Sombra)', shadow: 'none' },
                                                ...(config.template_id === 'hardware_dense' || config.template_id === 'streetwear_bold'
                                                    ? [{ id: 'hard_brutalist', label: 'Sólida (Brutal)', shadow: '4px 4px 0px 0px rgba(0,0,0,0.9)' }]
                                                    : config.template_id === 'gourmet_flow'
                                                        ? [{ id: 'crisp_app', label: 'App Nativa (Crisp)', shadow: '0px 6px 12px -2px rgba(0,0,0,0.14)' }]
                                                        : [{ id: 'soft', label: 'Sutil (Elevada)', shadow: '0 8px 20px -4px rgba(0,0,0,0.12)' }]
                                                )
                                            ].map(item => {
                                                const isActive = config.shapes.ui_shadows === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => handleShapeChange('ui_shadows', item.id)}
                                                        className={`p-3 rounded-xl border flex flex-col items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                                                            isActive
                                                                ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                                                : 'border-neutral-200/80 bg-white hover:border-neutral-400'
                                                        }`}
                                                    >
                                                        <div className="w-full py-3 px-4 rounded-lg bg-neutral-100/90 flex items-center justify-center">
                                                            <div
                                                                style={{ boxShadow: item.shadow }}
                                                                className="w-full py-1.5 rounded-md bg-white border border-neutral-300 text-[10px] font-medium text-neutral-800 text-center"
                                                            >
                                                                Tarjeta
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-neutral-800">
                                                            {item.label}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* 4. DENSIDAD DE INFORMACIÓN (Con mini-diagrama visual de Acordeón vs Desplegado) */}
                                <div className="pt-2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">
                                        4. Presentación de Detalles (Modal de Producto)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { id: 'accordion', label: 'Acordeón', desc: 'Secciones plegables' },
                                            { id: 'expanded', label: 'Desplegado', desc: 'Todo visible al abrir' }
                                        ].map(item => {
                                            const isActive = config.shapes.info_layout === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => handleShapeChange('info_layout', item.id)}
                                                    className={`p-3 rounded-xl border flex flex-col items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                                                        isActive
                                                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                                            : 'border-neutral-200/80 bg-white hover:border-neutral-400'
                                                    }`}
                                                >
                                                    <div className="w-full p-2 rounded-lg bg-neutral-100/80 flex flex-col gap-1">
                                                        {item.id === 'accordion' ? (
                                                            <>
                                                                <div className="w-full px-2 py-1 rounded bg-white border border-neutral-200 flex items-center justify-between">
                                                                    <span className="w-10 h-1.5 rounded-full bg-neutral-400" />
                                                                    <ChevronDown size={10} className="text-neutral-500" />
                                                                </div>
                                                                <div className="w-full px-2 py-1 rounded bg-white border border-neutral-200 flex items-center justify-between">
                                                                    <span className="w-8 h-1.5 rounded-full bg-neutral-400" />
                                                                    <ChevronDown size={10} className="text-neutral-500" />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full p-2 rounded bg-white border border-neutral-200 flex flex-col gap-1.5">
                                                                <span className="w-12 h-1.5 rounded-full bg-neutral-700" />
                                                                <span className="w-full h-1 rounded-full bg-neutral-300" />
                                                                <span className="w-4/5 h-1 rounded-full bg-neutral-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[11px] font-semibold text-neutral-900 block leading-none">{item.label}</span>
                                                        <span className="text-[9px] text-neutral-500 font-medium block mt-1">{item.desc}</span>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: BUSCADOR Y NAVEGACIÓN (CON MINI BARRAS DE BÚSQUEDA REALES) */}
                        {activeTab === 'search' && (
                            <div className="space-y-6 animate-in fade-in pb-10">

                                {/* Estilo de Directorio de Categorías */}
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                                        Directorio de Categorías
                                    </label>
                                    <p className="text-[11px] text-neutral-500 font-medium mb-3">Presentación de las familias de productos en la tienda.</p>

                                    {config.template_id === 'modular_tech' ? (
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {[
                                                { id: 'thumbnails', label: 'Tarjetas con Foto', desc: 'Cuadrícula visual' },
                                                { id: 'pills', label: 'Píldoras de Texto', desc: 'Barra compacta' },
                                            ].map(item => {
                                                const isActive = config.layout.category_style === item.id || (!config.layout.category_style && item.id === 'thumbnails');
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => handleLayoutChange('category_style', item.id)}
                                                        className={`p-3 rounded-xl border flex flex-col items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                                                            isActive
                                                                ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                                                : 'border-neutral-200/80 bg-white hover:border-neutral-400'
                                                        }`}
                                                    >
                                                        <div className="w-full py-2 px-2 rounded-lg bg-neutral-100/80 flex items-center justify-center gap-1.5">
                                                            {item.id === 'thumbnails' ? (
                                                                <>
                                                                    <span className="w-5 h-5 rounded bg-white border border-neutral-300" />
                                                                    <span className="w-5 h-5 rounded bg-white border border-neutral-300" />
                                                                    <span className="w-5 h-5 rounded bg-white border border-neutral-300" />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[8px] font-medium">Todo</span>
                                                                    <span className="px-2 py-0.5 rounded-full bg-white border border-neutral-300 text-neutral-600 text-[8px]">Ropa</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="text-center">
                                                            <span className="text-[11px] font-semibold text-neutral-900 block leading-none">{item.label}</span>
                                                            <span className="text-[9px] font-medium text-neutral-500 mt-1 block">{item.desc}</span>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-3.5 rounded-xl border border-neutral-200/60 bg-neutral-50 flex items-center justify-between">
                                            <div className="flex flex-col pr-3">
                                                <span className="text-xs font-bold text-neutral-800">Píldoras Horizontales Fluidas</span>
                                                <span className="text-[10px] text-neutral-500 font-medium mt-0.5">Este arquetipo utiliza navegación horizontal continua para agilizar el scroll.</span>
                                            </div>
                                            <span className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-mono font-bold uppercase text-neutral-500 shrink-0">Estándar</span>
                                        </div>
                                    )}
                                </div>

                                {/* Forma de Barra de Búsqueda con Mini-Buscadores Reales */}
                                <div className="pt-4 border-t border-neutral-100">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2.5">
                                        Forma de la Barra de Búsqueda
                                    </label>

                                    {config.template_id === 'minimal_luxury' ? (
                                        <div className="p-3.5 rounded-2xl border border-neutral-200/60 bg-neutral-50 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-neutral-800">Línea Inferior (Boutique)</span>
                                                <span className="text-[10px] text-neutral-400 font-medium mt-0.5">El tema Minimal Luxury utiliza un buscador editorial fijo.</span>
                                            </div>
                                            <span className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-mono font-bold uppercase text-neutral-500">Bloqueado</span>
                                        </div>
                                    ) : config.template_id === 'aero_glass' ? (
                                        <div className="p-3.5 rounded-2xl border border-neutral-200/60 bg-neutral-50 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-neutral-800">Píldora Flotante (Tech)</span>
                                                <span className="text-[10px] text-neutral-400 font-medium mt-0.5">El tema Aero Tech utiliza un buscador integrado en el Command Center.</span>
                                            </div>
                                            <span className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-mono font-bold uppercase text-neutral-500">Bloqueado</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {[
                                                ...(!['bistro_fast'].includes(config.template_id) ? [{ id: 'sharp', label: 'Cuadrada (0px)', desc: 'Industrial / Recta' }] : []),
                                                { id: 'rounded', label: 'Suave (8px)', desc: 'Moderna' },
                                                ...(!['hardware_dense', 'streetwear_bold'].includes(config.template_id)
                                                    ? [
                                                        { id: 'pill', label: 'Píldora', desc: 'Redondeada' },
                                                        { id: 'minimal_underlined', label: 'Línea Inferior', desc: 'Editorial' }
                                                    ]
                                                    : []
                                                ),
                                            ].map(item => {
                                                const isSel = config.shapes.search_bar_shape === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => handleShapeChange('search_bar_shape', item.id)}
                                                        className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between gap-2.5 cursor-pointer ${
                                                            isSel
                                                                ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                                                                : 'border-neutral-200/80 bg-white hover:border-neutral-400'
                                                        }`}
                                                    >
                                                        {/* Muestra visual de la barra de búsqueda */}
                                                        <div className="w-full py-2 px-2 rounded-lg bg-neutral-100/80 flex items-center justify-center">
                                                            <div
                                                                className={`w-full px-2.5 py-1.5 flex items-center gap-1.5 text-[9px] ${
                                                                    item.id === 'minimal_underlined'
                                                                        ? 'bg-transparent border-b-2 border-neutral-800 rounded-none'
                                                                        : item.id === 'pill'
                                                                        ? 'bg-white border border-neutral-400 rounded-full'
                                                                        : item.id === 'rounded'
                                                                        ? 'bg-white border border-neutral-400 rounded-md'
                                                                        : 'bg-white border border-neutral-400 rounded-none'
                                                                }`}
                                                            >
                                                                <SearchIcon size={10} className="text-neutral-500 shrink-0" />
                                                                <span className="text-neutral-400 truncate">Buscar...</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-semibold text-neutral-900 leading-none">{item.label}</p>
                                                            <p className="text-[9px] mt-1 font-medium text-neutral-500 leading-none">{item.desc}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 6: TIPOGRAFÍA GRANULAR (CON MUESTRAS DE LAS FUENTES EN VIVO, SIN SELECTS CIEGOS) */}
                        {activeTab === 'typography' && (
                            <div className="space-y-6 animate-in fade-in pb-10">
                                {/* 1. TÍTULOS */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                                        1. Tipografía para Títulos y Nombres de Producto
                                    </label>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {AVAILABLE_FONTS.headings.map(f => {
                                            const isSel = config.typography.heading_font === f.value;
                                            return (
                                                <button
                                                    key={f.value}
                                                    type="button"
                                                    onClick={() => handleTypographyChange('heading_font', f.value)}
                                                    className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                                        isSel
                                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                                            : 'border-neutral-200/80 bg-white hover:border-neutral-400 text-neutral-900'
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <span
                                                            style={{ fontFamily: f.value }}
                                                            className="text-xs font-semibold block truncate"
                                                        >
                                                            {f.label}
                                                        </span>
                                                    </div>
                                                    <span
                                                        style={{ fontFamily: f.value }}
                                                        className={`text-sm font-bold shrink-0 ${
                                                            isSel ? 'text-neutral-200' : 'text-neutral-500'
                                                        }`}
                                                    >
                                                        Aa Título
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. CUERPO Y DESCRIPCIONES */}
                                <div className="space-y-2 pt-3 border-t border-neutral-100">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                                        2. Tipografía para Textos y Descripciones
                                    </label>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {AVAILABLE_FONTS.body.map(f => {
                                            const isSel = config.typography.body_font === f.value;
                                            return (
                                                <button
                                                    key={f.value}
                                                    type="button"
                                                    onClick={() => handleTypographyChange('body_font', f.value)}
                                                    className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                                        isSel
                                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                                            : 'border-neutral-200/80 bg-white hover:border-neutral-400 text-neutral-900'
                                                    }`}
                                                >
                                                    <span
                                                        style={{ fontFamily: f.value }}
                                                        className="text-xs font-medium truncate"
                                                    >
                                                        {f.label}
                                                    </span>
                                                    <span
                                                        style={{ fontFamily: f.value }}
                                                        className={`text-xs shrink-0 ${
                                                            isSel ? 'text-neutral-300' : 'text-neutral-500'
                                                        }`}
                                                    >
                                                        Lectura fluida
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 3. PRECIOS Y NÚMEROS */}
                                <div className="space-y-2 pt-3 border-t border-neutral-100">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                                        3. Tipografía para Precios y Números
                                    </label>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {AVAILABLE_FONTS.prices.map(f => {
                                            const isSel = config.typography.price_font === f.value;
                                            return (
                                                <button
                                                    key={f.value}
                                                    type="button"
                                                    onClick={() => handleTypographyChange('price_font', f.value)}
                                                    className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                                        isSel
                                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                                            : 'border-neutral-200/80 bg-white hover:border-neutral-400 text-neutral-900'
                                                    }`}
                                                >
                                                    <span
                                                        style={{ fontFamily: f.value }}
                                                        className="text-xs font-medium truncate"
                                                    >
                                                        {f.label}
                                                    </span>
                                                    <span
                                                        style={{ fontFamily: f.value }}
                                                        className={`text-xs font-bold tabular-nums shrink-0 ${
                                                            isSel ? 'text-emerald-300' : 'text-neutral-700'
                                                        }`}
                                                    >
                                                        $1.250,00
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 6: INSIGNIAS (TRUST BADGES CON ICON PICKER VECTORIAL) */}
                        {activeTab === 'badges' && (
                            <div className="space-y-6 animate-in fade-in pb-10">
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Insignias de Confianza</h3>
                                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Define los pilares de tu servicio. Estas insignias se muestran debajo del banner principal en plantillas tecnológicas.</p>
                                </div>

                                {/* Backdrop para cerrar el popover al hacer clic afuera */}
                                {openIconPickerIdx !== null && (
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setOpenIconPickerIdx(null)}
                                    />
                                )}

                                <div className="space-y-4">
                                    {(config.layout.trust_badges || DEFAULT_THEME_CONFIG.layout.trust_badges || []).map((badge, idx) => {
                                        const ActiveIconObj = TRUST_BADGE_ICONS.find(item => item.id === badge.icon) || TRUST_BADGE_ICONS[0];
                                        const ActiveIconComponent = ActiveIconObj.icon;
                                        const isOpen = openIconPickerIdx === idx;

                                        return (
                                            <div
                                                key={badge.id}
                                                className={`p-4 bg-white border border-neutral-200/60 rounded-2xl shadow-sm flex flex-col gap-3 relative transition-all ${isOpen ? 'z-50 ring-2 ring-neutral-900/10' : 'z-0'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">

                                                    {/* Gatillo del Selector de Iconos */}
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenIconPickerIdx(openIconPickerIdx === idx ? null : idx)}
                                                            className="w-12 h-12 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl flex items-center justify-center text-neutral-800 transition-all active:scale-95 shadow-2xs group relative shrink-0"
                                                            title="Cambiar icono vectorial"
                                                        >
                                                            <ActiveIconComponent size={20} strokeWidth={2} className="text-neutral-700 group-hover:text-neutral-900 transition-colors" />
                                                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-neutral-900 text-white rounded-full flex items-center justify-center shadow-xs">
                                                                <ChevronDown size={9} strokeWidth={3} />
                                                            </span>
                                                        </button>

                                                        {/* Cuadrícula Popover Flotante de Iconos React (Lucide) */}
                                                        <AnimatePresence>
                                                            {openIconPickerIdx === idx && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                                    className="absolute left-0 top-14 z-50 p-2.5 bg-white border border-neutral-200 rounded-2xl shadow-xl grid grid-cols-4 gap-1.5 w-52"
                                                                >
                                                                    {TRUST_BADGE_ICONS.map(item => {
                                                                        const IconCmp = item.icon;
                                                                        const isSelected = badge.icon === item.id;
                                                                        return (
                                                                            <button
                                                                                key={item.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newBadges = [...(config.layout.trust_badges || DEFAULT_THEME_CONFIG.layout.trust_badges || [])];
                                                                                    newBadges[idx] = { ...newBadges[idx], icon: item.id };
                                                                                    handleLayoutChange('trust_badges', newBadges);
                                                                                    setOpenIconPickerIdx(null);
                                                                                }}
                                                                                className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all ${isSelected
                                                                                    ? 'bg-neutral-900 text-white shadow-xs scale-95'
                                                                                    : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 active:scale-90'
                                                                                    }`}
                                                                                title={item.label}
                                                                            >
                                                                                <IconCmp size={18} strokeWidth={2} />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    <div className="flex-1 flex flex-col gap-2">
                                                        <input
                                                            type="text"
                                                            value={badge.title}
                                                            onChange={(e) => {
                                                                const newBadges = [...(config.layout.trust_badges || DEFAULT_THEME_CONFIG.layout.trust_badges || [])];
                                                                newBadges[idx] = { ...newBadges[idx], title: e.target.value };
                                                                handleLayoutChange('trust_badges', newBadges);
                                                            }}
                                                            placeholder="Título (Ej: Envío Gratis)"
                                                            className="w-full bg-transparent border-b border-neutral-200 py-1 text-xs font-bold text-neutral-900 focus:border-neutral-900 outline-none transition-colors"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={badge.description}
                                                            onChange={(e) => {
                                                                const newBadges = [...(config.layout.trust_badges || DEFAULT_THEME_CONFIG.layout.trust_badges || [])];
                                                                newBadges[idx] = { ...newBadges[idx], description: e.target.value };
                                                                handleLayoutChange('trust_badges', newBadges);
                                                            }}
                                                            placeholder="Descripción corta"
                                                            className="w-full bg-transparent border-b border-neutral-200 py-1 text-[10px] text-neutral-500 focus:border-neutral-900 outline-none transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* RESET */}
                        <div className="pt-6 border-t border-neutral-100 flex justify-center">
                            <button
                                onClick={handleResetToDefault}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-rose-500 hover:bg-rose-50 transition-colors active:scale-95"
                            >
                                <RotateCcw size={14} /> Restablecer valores de fábrica
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* 📱 EL ESCENARIO (PREVIEW AREA CON DEVICE MOCKUPS) */}
                {/* 🚀 AISLAMIENTO MÓVIL: Contenedor con altura fija para evitar scroll doble */}
                <div className={`flex-1 relative flex-col items-center justify-center overflow-hidden p-0 lg:p-12 w-full h-[calc(100dvh-70px)] lg:h-full ${mobileViewMode === 'preview' ? 'flex' : 'hidden lg:flex'}`}>

                    {/* Viewport Toggle (Desktop Only) */}
                    <div className="absolute top-8 right-8 bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-200/60 flex items-center gap-1 z-30 hidden lg:flex">
                        <button
                            onClick={() => setViewport('mobile')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewport === 'mobile' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100'}`}
                        >
                            <MonitorSmartphone size={14} /> Móvil
                        </button>
                        <button
                            onClick={() => setViewport('desktop')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewport === 'desktop' ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100'}`}
                        >
                            <MonitorSmartphone size={14} className="rotate-90" /> PC
                        </button>
                    </div>

                    {/* Device Mockup Engine con Escalado Dinámico */}
                    <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`relative bg-white overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col transition-all duration-500 origin-center ${viewport === 'mobile'
                            ? 'w-full max-w-[375px] h-[812px] rounded-[2.3rem] border-[6px] border-neutral-950 ring-1 ring-neutral-800/50 scale-[0.80] sm:scale-[0.85] lg:scale-100'
                            : 'w-full max-w-[1024px] h-[720px] rounded-2xl border border-neutral-200/60'
                            }`}
                    >


                        {/* macOS Header (Desktop Style) */}
                        {viewport === 'desktop' && (
                            <div className="h-12 bg-neutral-50 border-b border-neutral-200/60 flex items-center px-4 gap-2 shrink-0">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-rose-400 border border-rose-500/20"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/20"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-500/20"></div>
                                </div>
                                <div className="mx-auto flex-1 max-w-md bg-white border border-neutral-200/60 rounded-md h-7 flex items-center justify-center text-[10px] font-mono text-neutral-400 shadow-sm">
                                    {storeData?.slug}.preziso.shop
                                </div>
                            </div>
                        )}

                        {/* 🚀 Iframe (La Tienda) */}
                        <div className="flex-1 w-full relative bg-[#FAFAFC]">
                            {previewUrl ? (
                                <iframe
                                    ref={iframeRef}
                                    src={previewUrl}
                                    className="w-full h-full border-none"
                                    title="Preview"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                                    <Loader2 size={24} className="animate-spin mb-3" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Conectando motor...</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* External Link */}
                    {storeData && (
                        <a href={`//${storeData.slug}.${getBaseDomain()}`} target="_blank" rel="noopener noreferrer" className="absolute bottom-8 right-8 hidden lg:flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md border border-neutral-200/60 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 hover:shadow-md transition-all z-30">
                            Ver en vivo <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            </div>
          {storeData && (
                <AiBannerStudioModal
                    isOpen={isAiBannerStudioOpen}
                    onClose={() => setIsAiBannerStudioOpen(false)}
                    storeId={storeData.id}
                    storeName={storeData.name}
                    storeType={currentStoreType}
                    primaryColor={config.colors.primary}
                    currentDesktopUrl={config.layout.hero_desktop_url || storeData?.hero_url}
                    currentMobileUrl={config.layout.hero_mobile_url}
                    currentCtaConfig={config.layout.hero_cta}
                    onPublishBanners={handlePublishAiBanners}
                />
            )}
        </div>
    )
}