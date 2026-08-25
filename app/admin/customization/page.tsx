// app/admin/customization/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Loader2, Palette, MonitorSmartphone, RotateCcw, Type, ExternalLink, Check, Sliders, Store, Search as SearchIcon, Image as ImageIcon, Upload, CheckCircle2, AlertCircle, Sparkles, Lock, Eye, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion' 
import { toast } from 'sonner' // 🚀 SILENT DELIGHT: Notificaciones Awwwards
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { DEFAULT_THEME_CONFIG, normalizeThemeConfig, AVAILABLE_FONTS } from '@/utils/themeAdapter'
import { ThemeConfig } from '@/types/theme'
import { TEMPLATES_REGISTRY, TemplateDefinition } from '@/lib/templates-registry'
import { compressImage } from '@/utils/imageOptimizer'
import { revalidateStoreCache } from '@/app/admin/actions'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
const ColorInputRow = ({ label, valueKey, value, description, onChange }: { label: string, valueKey: string, value: string, description?: string, onChange: (k: string, value: string) => void }) => (
    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200/60 hover:border-neutral-300 transition-colors bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] group/row">
        <div className="flex flex-col pr-4">
            <p className="font-bold text-xs text-neutral-900">{label}</p>
            {description ? (
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed font-medium">{description}</p>
            ) : (
                <p className="text-[10px] font-mono text-neutral-400 mt-0.5 uppercase font-semibold">{value}</p>
            )}
        </div>
        <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.2)] shrink-0 cursor-pointer transition-shadow"
        >
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: value }} />
            <input type="color" value={value} onChange={(e) => onChange(valueKey, e.target.value)} className="absolute -inset-4 w-16 h-16 cursor-pointer opacity-0" />
        </motion.div>
    </div>
)
const BorderColorRow = ({ label, value, description, onChange }: { label: string; value: string; description?: string; onChange: (value: string) => void; }) => {
    const baseHex = value.startsWith('#') ? value.slice(0, 7) : '#e5e7eb';
    const rawAlpha = value.length === 9 ? value.slice(7, 9) : 'ff';
    const opacityPct = Math.min(100, Math.max(0, Math.round((parseInt(rawAlpha, 16) / 255) * 100) || 100));

    const handleBaseColorChange = (newHex: string) => {
        const alphaHex = Math.round((opacityPct / 100) * 255).toString(16).padStart(2, '0');
        onChange(`${newHex}${alphaHex}`);
    };

    const handleOpacityChange = (newPct: number) => {
        const alphaHex = Math.round((newPct / 100) * 255).toString(16).padStart(2, '0');
        onChange(`${baseHex}${alphaHex}`);
    };

    return (
        <div className="p-3.5 rounded-xl border border-neutral-200/50 hover:border-neutral-300 transition-colors bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex flex-col pr-4">
                    <p className="font-semibold text-xs text-neutral-900">{label}</p>
                    {description ? (
                        <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed font-medium">{description}</p>
                    ) : (
                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5 uppercase font-semibold">
                            {baseHex} · {opacityPct}% opacidad
                        </p>
                    )}
                </div>

               <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(0,0,0,0.2)] shrink-0 cursor-pointer"
                    style={{
                        backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                    }}
                >
                    <div className="absolute inset-0" style={{ backgroundColor: value }} />
                    <input
                        type="color"
                        value={baseHex}
                        onChange={(e) => handleBaseColorChange(e.target.value)}
                        className="absolute -inset-2 w-12 h-12 cursor-pointer scale-150 opacity-0"
                    />
                </motion.div>
            </div>

            <div className="pt-2.5 border-t border-neutral-100 flex items-center gap-3">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 shrink-0">
                    Transparencia
                </span>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={opacityPct}
                    onChange={(e) => handleOpacityChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                />
                <span className="text-[10px] font-mono font-bold text-neutral-900 w-8 text-right shrink-0">
                    {opacityPct}%
                </span>
            </div>
        </div>
    );
};

export default function CustomizationPage() {
    const supabase = getSupabase()
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storeData, setStoreData] = useState<any>(null)

    const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)
    const [originalConfig, setOriginalConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG)
    const [activeTab, setActiveTab] = useState<'marketplace' | 'colors' | 'shapes' | 'search' | 'typography' | 'multimedia'>('marketplace')
  const [viewport, setViewport] = useState<'mobile' | 'desktop'>('mobile')
    const [selectedNicheFilter, setSelectedNicheFilter] = useState<string>('all')
   const [mobileViewMode, setMobileViewMode] = useState<'editor' | 'preview'>('editor')

    // 🚀 IDs de plantillas completamente auditadas y listas para producción
    const ACTIVE_TEMPLATE_IDS = ['classic', 'universal', 'minimal_luxury', 'hardware_dense']

    // 🚀 ARQUITECTURA DE NAVEGACIÓN (Reutilizable)
    const STUDIO_TABS = [
        { id: 'marketplace', icon: Store, label: 'Arquetipos' },
        { id: 'multimedia', icon: ImageIcon, label: 'Multimedia' },
        { id: 'colors', icon: Palette, label: 'Colores' },
        { id: 'shapes', icon: Sliders, label: 'Geometría' },
        { id: 'search', icon: SearchIcon, label: 'Buscador' },
        { id: 'typography', icon: Type, label: 'Tipografía' },
    ] as const;


    // Estados para subidas del Studio
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingHeroD, setUploadingHeroDesktop] = useState(false)
    const [uploadingHeroM, setUploadingHeroMobile] = useState(false)

    const logoInputRef = useRef<HTMLInputElement>(null)
    const heroDInputRef = useRef<HTMLInputElement>(null)
    const heroMInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: store } = await supabase.from('stores').select('id, name, slug, theme_config, logo_url, hero_url').eq('user_id', user.id).single()
                if (store) {
                    setStoreData(store)
                    const loadedConfig = normalizeThemeConfig(store.theme_config)
                    setConfig(loadedConfig)
                    setOriginalConfig(loadedConfig)
                }
            }
            setLoading(false)
        }
        initData()
    }, [supabase])

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

        // Validación física estricta
        const isValid = await validateImageDimensions(file, 1920, 600)
        if (!isValid) {
            if (heroDInputRef.current) heroDInputRef.current.value = ''
            return Swal.fire({
                title: 'Dimensiones incorrectas',
                html: `El banner de escritorio debe medir exactamente <b>1920x600 px</b> para mantener el estándar de diseño.`,
                icon: 'warning',
                confirmButtonColor: '#171717'
            })
        }

        setUploadingHeroDesktop(true)
        try {
            const compressed = await compressImage(file, 1920, 0.8)
            const fileName = `hero-d-${storeData.id}-${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, compressed)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

            // Sincronizamos legacy y layout dual en cascada
            await supabase.from('stores').update({ hero_url: publicUrl }).eq('id', storeData.id)
            setStoreData((prev: any) => ({ ...prev, hero_url: publicUrl }))

            setConfig(prev => ({
                ...prev,
                layout: { ...prev.layout, hero_desktop_url: publicUrl }
            }))
        } catch (error) {
            Swal.fire('Error', 'Fallo de red al procesar el banner', 'error')
        } finally {
            setUploadingHeroDesktop(false)
        }
    }

    const handleHeroMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]

        // Validación vertical estricta 4:5
        const isValid = await validateImageDimensions(file, 1080, 1350)
        if (!isValid) {
            if (heroMInputRef.current) heroMInputRef.current.value = ''
            return Swal.fire({
                title: 'Dimensiones incorrectas',
                html: `La portada móvil debe medir exactamente <b>1080x1350 px</b> (Proporción vertical 4:5).`,
                icon: 'warning',
                confirmButtonColor: '#171717'
            })
        }

        setUploadingHeroMobile(true)
        try {
            const compressed = await compressImage(file, 1080, 0.8)
            const fileName = `hero-m-${storeData.id}-${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, compressed)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

            setConfig(prev => ({
                ...prev,
                layout: { ...prev.layout, hero_mobile_url: publicUrl }
            }))
        } catch (error) {
            Swal.fire('Error', 'Fallo de red al procesar la portada', 'error')
        } finally {
            setUploadingHeroMobile(false)
        }
    }

    const handleApplyTemplate = (template: TemplateDefinition) => {
        const newConfig = normalizeThemeConfig(template.default_config);
        setConfig(newConfig);

      toast.success(`Plantilla "${template.name}" aplicada`);
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
            text: 'Esto devolverá todas las opciones a los valores de fábrica.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#171717',
            cancelButtonColor: '#f5f5f5',
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-xl font-sans text-xs',
                cancelButton: 'text-neutral-700'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                setConfig(DEFAULT_THEME_CONFIG)
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
            await revalidateStoreCache()
         toast.success('Diseño publicado con éxito en la tienda en vivo');
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el diseño.', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' } })
        } finally {
            setSaving(false)
        }
    }
    const filteredTemplates = TEMPLATES_REGISTRY.filter(t => {
        if (selectedNicheFilter === 'all') return true;
        return t.niche === selectedNicheFilter;
    });

    if (loading) return <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center"><Loader2 className="animate-spin text-neutral-300" size={24} /></div>

    const getBaseDomain = () => {
        if (typeof window === 'undefined') return 'preziso.shop';
        if (window.location.hostname.includes('localhost')) return window.location.host;
        return 'preziso.shop';
    }

    const previewUrl = storeData ? `${window.location.protocol}//${storeData.slug}.${getBaseDomain()}?mode=preview` : '';

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
                        {STUDIO_TABS.map(tab => (
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
                    {STUDIO_TABS.map(tab => (
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
                    {mobileViewMode === 'editor' ? <><Eye size={14}/> Vista</> : <><SlidersHorizontal size={14}/> Editor</>}
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
                                {STUDIO_TABS.find(t => t.id === activeTab)?.label}
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

                        {/* TAB 1: MARKETPLACE */}
                        {activeTab === 'marketplace' && (
                            <div className="space-y-4 animate-in fade-in pb-10">
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Arquetipos Comerciales</h3>
                                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Aplica un diseño preconfigurado con un clic.</p>
                                </div>
<div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full max-w-full min-w-0 shrink-0">
                                    {[
                                        { id: 'all', label: 'Todas' },
                                        { id: 'hardware', label: 'Ferretería' },
                                        { id: 'streetwear', label: 'Streetwear' },
                                        { id: 'food', label: 'Comida' },
                                        { id: 'luxury', label: 'Lujo' },
                                    ].map(chip => (
                                        <button
                                            key={chip.id}
                                            type="button"
                                            onClick={() => setSelectedNicheFilter(chip.id)}
                                            className={`shrink-0 px-3 py-1.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors border ${selectedNicheFilter === chip.id ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs' : 'bg-white border-neutral-200/50 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'}`}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>

                              <div className="space-y-3">
                                    {filteredTemplates.map(template => {
                                        const isCurrent = config.template_id === template.id;
                                        const isReady = ACTIVE_TEMPLATE_IDS.includes(template.id) && template.niche !== 'streetwear' && template.niche !== 'food';

                                        return (
                                            <div
                                                key={template.id}
                                                className={`relative p-4 rounded-xl border transition-all flex flex-col gap-2.5 overflow-hidden ${
                                                    isCurrent
                                                        ? 'bg-white border-neutral-900 ring-1 ring-neutral-900/10'
                                                        : isReady
                                                            ? 'bg-white border-neutral-200/50 hover:border-neutral-300'
                                                            : 'bg-neutral-50/70 border-dashed border-neutral-300/80'
                                                }`}
                                            >
                                                {/* BADGE SUPERIOR PARA PLANTILLAS EN PREPARACIÓN */}
                                                {!isReady && (
                                                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[9px] font-mono font-bold tracking-wider uppercase shadow-2xs">
                                                            <Sparkles size={10} className="text-amber-400" /> Próximo Lanzamiento
                                                        </span>
                                                        <span className="text-[9px] font-mono text-neutral-400 uppercase font-semibold">
                                                            En Auditoría UX
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between gap-3 w-full">
                                                    <div className={`min-w-0 flex-1 ${!isReady ? 'opacity-85' : ''}`}>
                                                        <h4 className="font-bold text-xs text-neutral-900 truncate">
                                                            {template.name}
                                                        </h4>
                                                        <span className="text-[9px] font-mono text-neutral-400 uppercase font-semibold block truncate">
                                                            {template.niche_label}
                                                        </span>
                                                    </div>

                                                    {isReady ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyTemplate(template)}
                                                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${isCurrent ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs' : 'bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50 active:scale-95'}`}
                                                        >
                                                            {isCurrent ? 'Activa' : 'Aplicar'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                Swal.fire({
                                                                    title: 'Arquetipo en Desarrollo',
                                                                    html: `El diseño <b>${template.name}</b> está en proceso de calibración y auditoría UX. Se activará automáticamente en el próximo despliegue.`,
                                                                    icon: 'info',
                                                                    confirmButtonColor: '#171717',
                                                                    confirmButtonText: 'Entendido',
                                                                    customClass: { popup: 'rounded-2xl text-xs font-sans' }
                                                                });
                                                            }}
                                                            className="shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-neutral-200/80 text-neutral-700 border border-neutral-300 hover:bg-neutral-300 transition-colors flex items-center gap-1 active:scale-95"
                                                        >
                                                            <Lock size={10} /> En cola
                                                        </button>
                                                    )}
                                                </div>

                                                <p className={`text-[11px] leading-relaxed font-medium ${isReady ? 'text-neutral-500' : 'text-neutral-500/90'}`}>
                                                    {template.description}
                                                </p>
                                            </div>
                                        )
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
                                        <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Gestione los banners publicitarios de su comercio.</p>
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
                                                <span className="font-mono text-neutral-400">1080x1350 px (4:5)</span>
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
                                        <ColorInputRow label="Color Principal" valueKey="primary" value={config.colors.primary} description="Botones de compra y elementos destacados." onChange={handleColorChange} />
                                        <ColorInputRow label="Texto en Botones" valueKey="primary_text" value={config.colors.primary_text} description="Texto sobre el botón de acción." onChange={handleColorChange} />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">Lienzo & Superficies</span>
                                    <div className="space-y-2">
                                        <ColorInputRow label="Fondo General" valueKey="background" value={config.colors.background} description="Color de fondo de toda la tienda." onChange={handleColorChange} />
                                        <ColorInputRow label="Fondo de Tarjetas" valueKey="surface" value={config.colors.surface} description="Superficie de productos y menús." onChange={handleColorChange} />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">Textos & Bordes</span>
                                    <div className="space-y-2">
                                        <ColorInputRow label="Texto Principal" valueKey="text_main" value={config.colors.text_main} description="Títulos y precios." onChange={handleColorChange} />
                                        <ColorInputRow label="Texto Secundario" valueKey="surface_text" value={config.colors.surface_text} description="Descripciones y categorías." onChange={handleColorChange} />
                                        <BorderColorRow label="Líneas y Bordes" value={config.colors.border} description="Color y nivel de transparencia de las líneas divisorias y contornos." onChange={(val) => handleColorChange('border', val)} />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 block mb-2">Conversión</span>
                                    <div className="space-y-2">
                                        <ColorInputRow label="Ahorro en Divisas" valueKey="incentive" value={config.colors.incentive} description="Badges de ahorro en divisas y checkmarks." onChange={handleColorChange} />
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 block mb-2">Etiquetas & Interacciones</span>
                                    <div className="space-y-2">
                                        <ColorInputRow label="Fondo de Descuento" valueKey="badge_discount_bg" value={config.colors.badge_discount_bg} description="Fondo de la etiqueta de % de rebaja." onChange={handleColorChange} />
                                        <ColorInputRow label="Texto de Descuento" valueKey="badge_discount_text" value={config.colors.badge_discount_text} description="Color del número de descuento." onChange={handleColorChange} />
                                        <ColorInputRow label="Fondo de Agotado" valueKey="badge_soldout_bg" value={config.colors.badge_soldout_bg} description="Fondo de la etiqueta sin stock." onChange={handleColorChange} />
                                        <ColorInputRow label="Texto de Agotado" valueKey="badge_soldout_text" value={config.colors.badge_soldout_text} description="Color del texto sin stock." onChange={handleColorChange} />
                                        <ColorInputRow label="Icono Favorito" valueKey="action_favorite" value={config.colors.action_favorite} description="Color del corazón al ser activado." onChange={handleColorChange} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* TAB 4: PASO 1 & 2 (LÍNEAS, BOTONES Y SOMBRAS CON GUARDRAILS) */}
                        {activeTab === 'shapes' && (
                            <div className="space-y-6 animate-in fade-in pb-10">

                                {/* 1. FORMA DE BOTONES */}
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

                                 <div className={`grid gap-4 ${config.template_id === 'minimal_luxury' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                        {[
                                            { id: 'sharp', label: 'Cuadrado', radius: '0px' },
                                            { id: 'rounded', label: 'Suave', radius: '10px' },
                                            ...(config.template_id !== 'hardware_dense' && config.template_id !== 'minimal_luxury' ? [{ id: 'pill', label: 'Píldora', radius: '999px' }] : [])
                                        ].map(item => {
                                            const isActive = config.shapes.button_shape === item.id;
                                            return (
                                                <motion.button
                                                    key={item.id}
                                                    whileHover={{ scale: 1.03 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => handleShapeChange('button_shape', item.id)}
                                                    className={`relative h-14 flex items-center justify-center border transition-all overflow-hidden ${isActive ? 'border-neutral-900 bg-neutral-900 shadow-md' : 'border-neutral-200/60 bg-white hover:border-neutral-300 shadow-sm'}`}
                                                    style={{ borderRadius: item.radius }}
                                                >
                                                    <span className={`relative z-10 text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-700'}`}>{item.label}</span>
                                                </motion.button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 2. GROSOR DE LÍNEAS */}
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">
                                        2. Grosor de Líneas y Bordes
                                    </label>
                                 <div className={`grid gap-1.5 ${config.template_id === 'hardware_dense' ? 'grid-cols-2' : config.template_id === 'minimal_luxury' ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                                        {[
                                            ...(config.template_id !== 'hardware_dense' ? [{ id: 'none', label: 'Sin Borde' }, { id: 'hairline', label: '0.5px' }] : []),
                                            { id: 'thin', label: '1px Fino' },
                                            ...(config.template_id !== 'minimal_luxury' ? [{ id: 'bold', label: '2px Bold' }] : []),
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleShapeChange('line_weight', item.id)}
                                                className={`py-2.5 px-1 text-center rounded-lg border text-[11px] font-semibold transition-all ${config.shapes.line_weight === item.id ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs' : 'border-neutral-200/50 bg-white hover:border-neutral-300 text-neutral-700'}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. SOMBRAS CON GUARDRAIL */}
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-2">
                                        3. Sombras de Cajas e Inputs
                                    </label>

                                    {config.template_id === 'classic' ? (
                                        <div className="p-3.5 rounded-xl border border-neutral-200/50 bg-neutral-50 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-neutral-800">Estética Flat (Sin Sombras)</span>
                                                <span className="text-[10px] text-neutral-400 font-medium mt-0.5">El tema Universal utiliza arquitectura plana de alta velocidad.</span>
                                            </div>
                                            <span className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-mono font-bold uppercase text-neutral-500">Bloqueado</span>
                                        </div>
                                    ) : (
                                  <div className="grid grid-cols-2 gap-5 pt-2">
                                            {[
                                                { id: 'none', label: 'Plano', shadow: 'none' },
                                                ...(config.template_id === 'hardware_dense'
                                                    ? [{ id: 'hard_brutalist', label: 'Sólida', shadow: '4px 4px 0px 0px rgba(0,0,0,0.9)' }]
                                                    : config.template_id === 'minimal_luxury'
                                                        ? [{ id: 'soft', label: 'Sutil', shadow: '0 8px 24px -4px rgba(0,0,0,0.08)' }]
                                                        : [
                                                            { id: 'soft', label: 'Sutil', shadow: '0 8px 24px -4px rgba(0,0,0,0.08)' },
                                                            { id: 'medium', label: 'Elevada', shadow: '0 16px 40px -8px rgba(0,0,0,0.15)' },
                                                            { id: 'hard_brutalist', label: 'Sólida', shadow: '4px 4px 0px 0px rgba(0,0,0,0.9)' },
                                                        ]
                                                )
                                            ].map(item => {
                                                const isActive = config.shapes.ui_shadows === item.id;
                                                return (
                                                    <motion.button
                                                        key={item.id}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleShapeChange('ui_shadows', item.id)}
                                                        className={`h-20 flex items-center justify-center rounded-2xl border transition-all bg-white ${isActive ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200/60'}`}
                                                        style={{ boxShadow: item.shadow }}
                                                    >
                                                        <span className={`text-xs font-bold ${isActive ? 'text-neutral-900' : 'text-neutral-600'}`}>{item.label}</span>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: PASO 3 (FORMA DEL BUSCADOR CON GUARDRAILS) */}
                        {activeTab === 'search' && (
                            <div className="space-y-4 animate-in fade-in pb-10">
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                                        Forma de la Barra de Búsqueda
                                    </label>
                                    <p className="text-[11px] text-neutral-500 font-medium mb-3">Define la geometría del buscador en el catálogo.</p>
                                </div>

                               {config.template_id === 'minimal_luxury' ? (
                                    <div className="p-3.5 rounded-xl border border-neutral-200/50 bg-neutral-50 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-neutral-800">Línea Inferior (Boutique)</span>
                                            <span className="text-[10px] text-neutral-400 font-medium mt-0.5">El tema Minimal Luxury utiliza un buscador editorial fijo.</span>
                                        </div>
                                        <span className="px-2 py-1 bg-white border border-neutral-200 rounded text-[9px] font-mono font-bold uppercase text-neutral-500">Bloqueado</span>
                                    </div>
                                ) : (
                                    <div className={`grid gap-2 ${config.template_id === 'hardware_dense' ? 'grid-cols-2' : 'grid-cols-2'}`}>
                                        {[
                                            { id: 'sharp', label: 'Cuadrada (0px)', desc: 'Industrial / Técnico' },
                                            { id: 'rounded', label: 'Redondeada (8px)', desc: 'Moderna' },
                                            ...(config.template_id !== 'hardware_dense'
                                                ? [
                                                    { id: 'pill', label: 'Píldora Completa', desc: 'Comercial' },
                                                    { id: 'minimal_underlined', label: 'Línea Inferior', desc: 'Boutique' }
                                                ]
                                                : []
                                            ),
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleShapeChange('search_bar_shape', item.id)}
                                                className={`p-3.5 text-left rounded-xl border transition-all ${config.shapes.search_bar_shape === item.id ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs' : 'border-neutral-200/50 bg-white hover:border-neutral-300 text-neutral-700'}`}
                                            >
                                                <p className="text-xs font-bold">{item.label}</p>
                                                <p className={`text-[9px] mt-0.5 font-medium ${config.shapes.search_bar_shape === item.id ? 'text-neutral-400' : 'text-neutral-400'}`}>{item.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 5: PASO 4 (TIPOGRAFÍA GRANULAR) */}
                        {activeTab === 'typography' && (
                            <div className="space-y-5 animate-in fade-in pb-10">
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                                        Tipografía para Títulos (H1, Nombres de Producto)
                                    </label>
                                    <select
                                        value={config.typography.heading_font}
                                        onChange={(e) => handleTypographyChange('heading_font', e.target.value)}
                                        className="w-full p-3 rounded-xl border border-neutral-200/50 bg-white text-xs font-bold text-neutral-900 outline-none focus:border-neutral-900"
                                    >
                                        {AVAILABLE_FONTS.headings.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                                        Tipografía para Textos y Descripciones
                                    </label>
                                    <select
                                        value={config.typography.body_font}
                                        onChange={(e) => handleTypographyChange('body_font', e.target.value)}
                                        className="w-full p-3 rounded-xl border border-neutral-200/50 bg-white text-xs font-bold text-neutral-900 outline-none focus:border-neutral-900"
                                    >
                                        {AVAILABLE_FONTS.body.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                                        Tipografía para Precios y Números
                                    </label>
                                    <select
                                        value={config.typography.price_font}
                                        onChange={(e) => handleTypographyChange('price_font', e.target.value)}
                                        className="w-full p-3 rounded-xl border border-neutral-200/50 bg-white text-xs font-bold text-neutral-900 outline-none focus:border-neutral-900 font-mono"
                                    >
                                        {AVAILABLE_FONTS.prices.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
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
                <div className={`flex-1 relative flex-col items-center justify-center overflow-hidden p-4 lg:p-12 ${mobileViewMode === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
                    
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

                    {/* Device Mockup Engine */}
                    <motion.div 
                        layout
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`relative bg-white overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col transition-all duration-500 ${
                            viewport === 'mobile' 
                                ? 'w-full max-w-[375px] h-[812px] rounded-[3.5rem] border-[6px] border-neutral-950 ring-1 ring-neutral-800/50' 
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
        </div>
    )
}