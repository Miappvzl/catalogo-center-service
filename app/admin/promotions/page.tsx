'use client'


import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { compressImage } from '@/utils/imageOptimizer'
import { getSupabase } from '@/lib/supabase-client'
import {
    Plus,
    Save,
    Trash2,
    Loader2,
    Check,
    ImageIcon,
    X,
    Search,
    ArrowLeft,
    Package,
    Clock,
    SlidersHorizontal,
    Calendar,
    Sparkles,
    CheckCircle2,
    Eye
} from 'lucide-react'
import Swal from 'sweetalert2'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { revalidateStoreCache } from '@/app/admin/actions'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { NumberInput } from '@/components/NumberInput'
import PromotionBanner from '@/components/PromotionBanner'

// Constantes Estrictas Preziso (Flat Design, Cero Sombras)
const CLEAN_INPUT = `w-full bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-medium text-neutral-950 placeholder:text-neutral-400 outline-none transition-colors border border-neutral-200/80 focus:border-neutral-950`;

// Paletas curadas de alto contraste para comerciantes B2B
const COLOR_PRESETS = [
    { 
        label: 'Obsidiana', 
        colors: { bg: '#09090b', title: '#ffffff', tagline: '#a1a1aa', btnBg: '#ffffff', btnText: '#09090b', badgeBg: '#ffffff', badgeText: '#09090b' }
    },
    { 
        label: 'Grafito', 
        colors: { bg: '#18181b', title: '#ffffff', tagline: '#d4d4d8', btnBg: '#ffffff', btnText: '#18181b', badgeBg: '#ffffff', badgeText: '#18181b' }
    },
    { 
        label: 'Titanio', 
        colors: { bg: '#f4f4f5', title: '#09090b', tagline: '#52525b', btnBg: '#09090b', btnText: '#ffffff', badgeBg: '#09090b', badgeText: '#ffffff' }
    },
    { 
        label: 'Blanco Puro', 
        colors: { bg: '#ffffff', title: '#09090b', tagline: '#71717a', btnBg: '#09090b', btnText: '#ffffff', badgeBg: '#f4f4f5', badgeText: '#09090b' }
    },
    { 
        label: 'Esmeralda', 
        colors: { bg: '#064e3b', title: '#ffffff', tagline: '#a7f3d0', btnBg: '#ffffff', btnText: '#064e3b', badgeBg: '#10b981', badgeText: '#ffffff' }
    },
    { 
        label: 'Terracota', 
        colors: { bg: '#7c2d12', title: '#ffffff', tagline: '#fed7aa', btnBg: '#ffffff', btnText: '#7c2d12', badgeBg: '#ea580c', badgeText: '#ffffff' }
    },
    { 
        label: 'Azul Marino', 
        colors: { bg: '#1e3a8a', title: '#ffffff', tagline: '#bfdbfe', btnBg: '#ffffff', btnText: '#1e3a8a', badgeBg: '#3b82f6', badgeText: '#ffffff' }
    },
];
// Helper para convertir fecha UTC de BD a formato local sin desfasar zonas horarias
const formatForDateTimeInput = (isoDateStr?: string | null): string => {
    if (!isoDateStr) return '';
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DEFAULT_PROMO = {
    title: '',
    tagline: '',
    bg_color: '#09090b',
    text_color: '#ffffff',
    linked_products: [] as (string | number)[],
    image_url: '',
    expires_at: null as string | null,
    promo_type: 'visual' as 'visual' | 'percentage' | 'bogo',
    discount_percentage: null as number | null,
    bogo_buy: null as number | null,
    bogo_pay: null as number | null,
    is_active: true
};

export default function PromotionsPage() {
    const supabase = getSupabase()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Estados de Carga y Datos
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [promotions, setPromotions] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [storeId, setStoreId] = useState<string | null>(null)
    
    const [storeConfig, setStoreConfig] = useState<any>(null)

    // Estados de UI y Filtros
    const [isEditing, setIsEditing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [visibleCount, setVisibleCount] = useState(12)


     // Estado del Objeto Principal con Tipado Limpio
    const [currentPromo, setCurrentPromo] = useState<typeof DEFAULT_PROMO>(DEFAULT_PROMO)
    
    // Estado granular de colores para todos los componentes
    const [customColors, setCustomColors] = useState({
        bg: '#09090b',
        title: '#ffffff',
        tagline: '#a1a1aa',
        btnBg: '#ffffff',
        btnText: '#09090b',
        badgeBg: '#ffffff',
        badgeText: '#09090b'
    })

    // Sincroniza los colores al entrar en modo edición
    const openPromoEditor = (promo: any) => {
        let colors = {
            bg: promo.bg_color || '#09090b',
            title: promo.text_color || '#ffffff',
            tagline: promo.text_color || '#a1a1aa',
            btnBg: '#ffffff',
            btnText: '#09090b',
            badgeBg: '#ffffff',
            badgeText: '#09090b'
        }

        if (promo.text_color && typeof promo.text_color === 'string' && promo.text_color.startsWith('{')) {
            try {
                const parsed = JSON.parse(promo.text_color)
                colors = { ...colors, ...parsed, bg: promo.bg_color || colors.bg }
            } catch {}
        }

        setCustomColors(colors)
        setCurrentPromo(promo)
        setIsEditing(true)
    }
    // 🚀 CARGA INICIAL ROBUSTA (BLINDADA CONTRA PANTALLAS CONGELADAS)
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { 
                    router.push('/login')
                    return
                }

                const { data: store } = await supabase
                    .from('stores')
                    .select('id, theme_config')
                    .eq('user_id', user.id)
                    .single()

                if (store) {
                    setStoreId(store.id)
                    setStoreConfig(store.theme_config)

                    // Carga paralela de alto rendimiento (campañas + catálogo activo)
                    const [promosRes, prodsRes] = await Promise.all([
                        supabase
                            .from('promotions')
                            .select('*')
                            .eq('store_id', store.id)
                            .order('created_at', { ascending: false }),
                        supabase
                            .from('products')
                            .select('id, name, image_url, usd_cash_price')
                            .eq('store_id', store.id)
                            .eq('status', 'active')
                            .order('name', { ascending: true })
                    ])

                    if (promosRes.data) setPromotions(promosRes.data)
                    if (prodsRes.data) setProducts(prodsRes.data)
                }
            } catch (error) {
                console.error('Error cargando campañas:', error)
            } finally {
                // El bloque finally garantiza que la pantalla SIEMPRE se desbloquee
                setLoading(false)
            }
        }
        fetchData()
    }, [supabase, router])


    // 🚀 MEMOIZACIÓN SEGURA DEL FILTRO DE PRODUCTOS
    const filteredProducts = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return products.filter((p: any) => (p.name || '').toLowerCase().includes(lowerSearch));
    }, [products, searchTerm]);

    // 🚀 LOGICA DE NEGOCIO (Bulk Actions)
    const selectAllProducts = useCallback(() => {
        setCurrentPromo(prev => ({ ...prev, linked_products: filteredProducts.map((p: any) => p.id) }));
    }, [filteredProducts]);

    const deselectAllProducts = useCallback(() => {
        setCurrentPromo(prev => ({ ...prev, linked_products: [] }));
    }, []);

    // 🚀 ACTIVACIÓN / DESACTIVACIÓN RÁPIDA DESDE LA LISTA
    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setPromotions(prev => prev.map(p => p.id === id ? { ...p, is_active: newStatus } : p));
        await supabase.from('promotions').update({ is_active: newStatus }).eq('id', id);
        await revalidateStoreCache();
    };

    // 🚀 MOTOR MATEMÁTICO: SANEAMIENTO Y GUARDADO (Cero Reloads)
    const handleSave = async () => {
        if (!currentPromo.title.trim()) return Swal.fire('Error', 'El título de la campaña es obligatorio', 'warning');
        if (!currentPromo.tagline?.trim()) {
            return Swal.fire({
                title: 'Subtítulo Requerido',
                text: 'El subtítulo o descripción es obligatorio para garantizar la simetría y misma altura entre banners.',
                icon: 'warning',
                confirmButtonColor: '#09090b',
                customClass: { popup: 'rounded-2xl border border-neutral-200/80 font-sans text-xs' }
            });
        }
        if (!storeId) return Swal.fire('Error', 'Sesión inválida', 'error');

        // Validaciones Estrictas de Negocio
        if (currentPromo.promo_type === 'percentage') {
            if (!currentPromo.discount_percentage || currentPromo.discount_percentage < 1 || currentPromo.discount_percentage > 99) {
                return Swal.fire('Error', 'Porcentaje de descuento inválido (1-99%)', 'warning');
            }
            if (!currentPromo.linked_products || currentPromo.linked_products.length === 0) {
                return Swal.fire('Atención', 'Debes vincular al menos un producto para aplicar el descuento porcentual', 'warning');
            }
        }

        if (currentPromo.promo_type === 'bogo') {
            const buy = Number(currentPromo.bogo_buy);
            const pay = Number(currentPromo.bogo_pay);
            if (!buy || !pay || buy <= pay) {
                return Swal.fire('Error', 'En promociones BOGO, la cantidad que el cliente "Lleva" debe ser mayor a la que "Paga" (ej: Lleva 3, Paga 2)', 'warning');
            }
            if (!currentPromo.linked_products || currentPromo.linked_products.length === 0) {
                return Swal.fire('Atención', 'Debes vincular los productos donde aplicará la promoción BOGO', 'warning');
            }
        }

        setSaving(true);

        try {
          const payload = {
                store_id: storeId,
                title: currentPromo.title.trim(),
                tagline: currentPromo.tagline?.trim() || '',
                bg_color: customColors.bg,
                text_color: JSON.stringify(customColors),
                linked_products: currentPromo.linked_products || [],
                is_active: currentPromo.is_active ?? true,
                image_url: currentPromo.image_url || null,
                expires_at: currentPromo.expires_at ? new Date(currentPromo.expires_at).toISOString() : null,
                promo_type: currentPromo.promo_type,
                discount_percentage: currentPromo.promo_type === 'percentage' ? Number(currentPromo.discount_percentage) : 0,
                bogo_buy: currentPromo.promo_type === 'bogo' ? Number(currentPromo.bogo_buy) : 0,
                bogo_pay: currentPromo.promo_type === 'bogo' ? Number(currentPromo.bogo_pay) : 0
            };

            let response;
            if ((currentPromo as any).id) {
                response = await supabase.from('promotions').update(payload).eq('id', (currentPromo as any).id).select().single();
            } else {
                response = await supabase.from('promotions').insert(payload).select().single();
            }

            if (response.error) throw response.error;

            await revalidateStoreCache();

            setPromotions(prev => {
                const index = prev.findIndex(p => p.id === response.data.id);
                if (index !== -1) {
                    const newPromos = [...prev];
                    newPromos[index] = response.data;
                    return newPromos;
                } else {
                    return [response.data, ...prev];
                }
            });

            Swal.fire({
                title: 'Campaña Guardada',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold' }
            });
            setIsEditing(false);

        } catch (error: any) {
            Swal.fire('Error', error.message || 'No se pudo guardar la campaña', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar campaña?',
            text: 'Esta acción no se puede deshacer y retirará las ofertas de tu vitrina.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#09090b',
            cancelButtonColor: '#f4f4f5',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-2xl border border-neutral-200/80 font-sans text-xs',
                confirmButton: 'rounded-xl text-xs font-semibold px-4 py-2',
                cancelButton: 'rounded-xl text-xs font-semibold px-4 py-2 text-neutral-700'
            }
        });
        if (confirm.isConfirmed) {
            try {
                const { error } = await supabase.from('promotions').delete().eq('id', id);
                if (error) throw error;
                setPromotions(prev => prev.filter(p => p.id !== id));
            } catch (error: any) {
                Swal.fire('Error', 'No se pudo eliminar la campaña', 'error');
            }
        }
    };

    const toggleProduct = (productId: string | number) => {
        const currentList = currentPromo.linked_products || [];
        setCurrentPromo(prev => ({
            ...prev,
            linked_products: currentList.includes(productId)
                ? currentList.filter((id: string | number) => id !== productId)
                : [...currentList, productId]
        }));
    };

    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !storeId) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo imágenes permitidas', 'error');

        try {
            setUploading(true);
            const compressedFile = await compressImage(file, 800, 0.7);
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `promo-${Date.now()}.${fileExt}`;
            const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName);
            setCurrentPromo({ ...currentPromo, image_url: publicUrl });
        } catch (error: any) {
            Swal.fire('Error al subir imagen', error.message, 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- RENDERIZADO: ESTADOS DE CARGA ---
    if (loading) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] text-gray-400 gap-4"><Loader2 className="animate-spin" size={32} /><span className="text-xs font-bold uppercase tracking-widest">Cargando Campañas...</span></div>

    const stepVariants: Variants = {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto', transition: { ease: [0.32, 0.72, 0, 1] } },
        exit: { opacity: 0, height: 0, transition: { duration: 0.2 } }
    }


    // Helper de estado de campaña
    const getPromoStatus = (promo: any) => {
        if (!promo.is_active) return { label: 'Inactiva', badgeClass: 'bg-neutral-100 text-neutral-500 border-neutral-200/60' };
        if (promo.expires_at) {
            const exp = new Date(promo.expires_at);
            if (exp.getTime() < Date.now()) {
                return { label: 'Vencida', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/60' };
            }
        }
        return { label: 'Vigente', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' };
    };

    if (isEditing) {
        return (
            <div className="min-h-screen bg-[#FAFAFC] pb-32">
                
                {/* 1. CABECERA FLUIDA (SIN DESFASES DE SIDEBAR) */}
                <div className="sticky top-0 z-30 bg-[#FAFAFC]/90 backdrop-blur-md border-b border-neutral-200/60 py-3.5 px-4 sm:px-6 lg:px-8 transition-all">
                    <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <button 
                                onClick={() => setIsEditing(false)} 
                                className="p-2 -ml-2 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100/70 rounded-xl transition-colors active:scale-95 shrink-0"
                                title="Volver al listado"
                            >
                                <ArrowLeft size={16} strokeWidth={1.5} />
                            </button>
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold text-neutral-950 truncate tracking-tight">
                                    {(currentPromo as any).id ? 'Editar Campaña' : 'Nueva Campaña Comercial'}
                                </h2>
                                <p className="text-[11px] text-neutral-500 font-normal hidden sm:block">Configura los parámetros visuales, motor de oferta y productos vinculados.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                            <button 
                                onClick={() => setIsEditing(false)} 
                                className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100/70 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={saving} 
                                className="bg-neutral-950 hover:bg-black text-white px-4.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={1.5} />}
                                <span>Guardar Campaña</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. LAYOUT SPLIT VIEW ERGONÓMICO */}
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* COLUMNA IZQUIERDA: FORMULARIO MODULAR ESTRUCTURADO (7 COLS) */}
                        <div className="lg:col-span-7 xl:col-span-7 space-y-6">

                            {/* SECCIÓN 1: CONTENIDO Y VIGENCIA */}
                            <section className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/60 space-y-5">
                                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                                    <Sparkles size={16} strokeWidth={1.5} className="text-neutral-500" />
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-950">1. Contenido y Mensaje</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Título del Banner</label>
                                        <input 
                                            value={currentPromo.title} 
                                            onChange={e => setCurrentPromo(prev => ({ ...prev, title: e.target.value }))} 
                                            placeholder="Ej: Ofertas de Temporada / Black Friday" 
                                            className={CLEAN_INPUT} 
                                        />
                                    </div>
                                      <div className="sm:col-span-2">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                                                Gancho o Subtítulo <span className="text-rose-500">*</span>
                                            </label>
                                            <span className="text-[10px] text-neutral-400 font-normal lowercase">Obligatorio (mantiene la simetría)</span>
                                        </div>
                                        <input 
                                            value={currentPromo.tagline} 
                                            onChange={e => setCurrentPromo(prev => ({ ...prev, tagline: e.target.value }))} 
                                            placeholder="Ej: Hasta 40% de descuento en artículos seleccionados" 
                                            className={CLEAN_INPUT} 
                                        />
                                    </div>


                                    {/* Fecha con cálculo local blindado */}
                                    <div className="sm:col-span-2">
                                        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                            <Calendar size={12} strokeWidth={1.5} className="text-neutral-400" />
                                            <span>Fecha de Expiración (Opcional)</span>
                                        </label>
                                        <input 
                                            type="datetime-local" 
                                            value={formatForDateTimeInput(currentPromo.expires_at)} 
                                            onChange={e => setCurrentPromo(prev => ({ ...prev, expires_at: e.target.value || null }))} 
                                            className={CLEAN_INPUT} 
                                        />
                                    </div>
                                </div>

                                {/* Carga de Imagen Destacada */}
                                <div className="pt-3 border-t border-neutral-100">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2.5 block flex items-center gap-1">
                                        <ImageIcon size={12} strokeWidth={1.5} className="text-neutral-400" />
                                        <span>Ilustración o Imagen PNG (Transparente recomendada)</span>
                                    </label>

                                    <div className="flex items-center gap-4">
                                        <div 
                                            onClick={() => !uploading && fileInputRef.current?.click()} 
                                            className="w-20 h-20 rounded-xl bg-neutral-50 border border-neutral-200/80 hover:border-neutral-950 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden shrink-0 group"
                                        >
                                            {currentPromo.image_url ? (
                                                <Image 
                                                    src={getOptimizedUrl(currentPromo.image_url)} 
                                                    alt="Preview" 
                                                    fill 
                                                    className="object-contain p-1.5 mix-blend-multiply" 
                                                />
                                            ) : (
                                                <div className="text-center text-neutral-400 group-hover:text-neutral-950 transition-colors">
                                                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={20} strokeWidth={1.5} />}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <button 
                                                type="button" 
                                                onClick={() => fileInputRef.current?.click()} 
                                                disabled={uploading} 
                                                className="px-3.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg text-xs font-semibold text-neutral-950 transition-colors"
                                            >
                                                {uploading ? 'Optimizando...' : (currentPromo.image_url ? 'Cambiar Imagen' : 'Subir Imagen')}
                                            </button>
                                            {currentPromo.image_url && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setCurrentPromo(prev => ({ ...prev, image_url: '' }))} 
                                                    className="block text-[11px] text-rose-600 hover:text-rose-700 font-medium transition-colors"
                                                >
                                                    Remover imagen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                           {/* SECCIÓN 2: ESTUDIO DE COLOR INTEGRAL */}
                            <section className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/60 space-y-5">
                                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal size={16} strokeWidth={1.5} className="text-neutral-500" />
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-950">2. Personalización de Colores</h3>
                                    </div>
                                    <span className="text-[10px] font-mono text-neutral-400">Todos los componentes</span>
                                </div>

                                {/* Paletas Preconfiguradas Rápidas */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">Paletas Armónicas de 1 Clic</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_PRESETS.map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => setCustomColors(preset.colors)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all active:scale-95 ${
                                                    customColors.bg === preset.colors.bg 
                                                        ? 'border-neutral-950 ring-1 ring-neutral-950 bg-neutral-50' 
                                                        : 'border-neutral-200/80 hover:border-neutral-300 bg-white'
                                                }`}
                                            >
                                                <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: preset.colors.bg }} />
                                                <span className="text-neutral-800">{preset.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selectores Detallados por Componente */}
                                <div className="space-y-4 pt-2">
                                    {/* Grupo A: Estructura y Textos */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 block">// Estructura y Textos</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1">
                                                <label className="text-[10px] font-semibold text-neutral-500 block">Fondo del Banner</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={customColors.bg} onChange={e => setCustomColors(prev => ({ ...prev, bg: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                    <span className="font-mono text-xs font-semibold text-neutral-800 uppercase">{customColors.bg}</span>
                                                </div>
                                            </div>

                                            <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1">
                                                <label className="text-[10px] font-semibold text-neutral-500 block">Título Principal</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={customColors.title} onChange={e => setCustomColors(prev => ({ ...prev, title: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                    <span className="font-mono text-xs font-semibold text-neutral-800 uppercase">{customColors.title}</span>
                                                </div>
                                            </div>

                                            <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1">
                                                <label className="text-[10px] font-semibold text-neutral-500 block">Subtítulo / Gancho</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={customColors.tagline} onChange={e => setCustomColors(prev => ({ ...prev, tagline: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                    <span className="font-mono text-xs font-semibold text-neutral-800 uppercase">{customColors.tagline}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grupo B: Botón de Acción (CTA) */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 block">// Botón de Acción (CTA)</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1">
                                                <label className="text-[10px] font-semibold text-neutral-500 block">Fondo del Botón</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={customColors.btnBg} onChange={e => setCustomColors(prev => ({ ...prev, btnBg: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                    <span className="font-mono text-xs font-semibold text-neutral-800 uppercase">{customColors.btnBg}</span>
                                                </div>
                                            </div>

                                            <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1">
                                                <label className="text-[10px] font-semibold text-neutral-500 block">Texto del Botón</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={customColors.btnText} onChange={e => setCustomColors(prev => ({ ...prev, btnText: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                    <span className="font-mono text-xs font-semibold text-neutral-800 uppercase">{customColors.btnText}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grupo C: Badge de Descuento */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 block">// Badge de Descuento / Oferta</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1">
                                                <label className="text-[10px] font-semibold text-neutral-500 block">Fondo del Badge</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={customColors.badgeBg} onChange={e => setCustomColors(prev => ({ ...prev, badgeBg: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                    <span className="font-mono text-xs font-semibold text-neutral-800 uppercase">{customColors.badgeBg}</span>
                                                </div>
                                            </div>

                                            <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1">
                                                <label className="text-[10px] font-semibold text-neutral-500 block">Texto del Badge</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={customColors.badgeText} onChange={e => setCustomColors(prev => ({ ...prev, badgeText: e.target.value }))} className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                                                    <span className="font-mono text-xs font-semibold text-neutral-800 uppercase">{customColors.badgeText}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* SECCIÓN 3: MOTOR DE OFERTA */}
                            <section className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/60 space-y-4">
                                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                                    <Clock size={16} strokeWidth={1.5} className="text-neutral-500" />
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-950">3. Mecánica de Descuento</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-50 border border-neutral-200/70 rounded-xl">
                                    {[
                                        { type: 'visual', label: 'Solo Visual' },
                                        { type: 'percentage', label: 'Descuento %' },
                                        { type: 'bogo', label: 'Lleva N, Paga M' }
                                    ].map(opt => (
                                        <button 
                                            key={opt.type} 
                                            type="button" 
                                            onClick={() => setCurrentPromo(prev => ({ ...prev, promo_type: opt.type as any }))} 
                                            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                                currentPromo.promo_type === opt.type 
                                                    ? 'bg-neutral-950 text-white' 
                                                    : 'text-neutral-500 hover:text-neutral-950'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                <AnimatePresence mode="wait">
                                    {currentPromo.promo_type === 'percentage' && (
                                        <motion.div 
                                            key="percentage" 
                                            initial={{ opacity: 0, y: 4 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            exit={{ opacity: 0, y: 4 }} 
                                            className="p-4 bg-neutral-50/50 rounded-xl border border-neutral-200/60 space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-xs font-semibold text-neutral-900">Porcentaje a descontar del precio base</span>
                                                <div className="relative w-24 shrink-0">
                                                    <NumberInput  
                                                        min="1" 
                                                        max="99" 
                                                        value={currentPromo.discount_percentage || ''} 
                                                        onChangeValue={(val) => setCurrentPromo(prev => ({ ...prev, discount_percentage: val }))} 
                                                        placeholder="30" 
                                                        className="w-full bg-white border border-neutral-200/80 rounded-lg py-1.5 pl-3 pr-7 text-xs font-semibold text-neutral-950 text-center outline-none focus:border-neutral-950" 
                                                    />
                                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none">%</span>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-neutral-500 font-normal leading-relaxed">
                                                Este porcentaje se restará automáticamente del precio de los productos seleccionados en el catálogo y checkout.
                                            </p>
                                        </motion.div>
                                    )}

                                    {currentPromo.promo_type === 'bogo' && (
                                        <motion.div 
                                            key="bogo" 
                                            initial={{ opacity: 0, y: 4 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            exit={{ opacity: 0, y: 4 }} 
                                            className="p-4 bg-neutral-50/50 rounded-xl border border-neutral-200/60 space-y-4"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">El cliente LLEVA</label>
                                                    <NumberInput  
                                                        min="2" 
                                                        value={currentPromo.bogo_buy || ''} 
                                                        onChangeValue={(val) => setCurrentPromo(prev => ({ ...prev, bogo_buy: val }))} 
                                                        placeholder="3" 
                                                        className="w-full bg-white border border-neutral-200/80 rounded-lg py-1.5 px-3 text-xs font-semibold text-neutral-950 text-center outline-none focus:border-neutral-950" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Pero PAGA solo</label>
                                                    <NumberInput  
                                                        min="1" 
                                                        value={currentPromo.bogo_pay || ''} 
                                                        onChangeValue={(val) => setCurrentPromo(prev => ({ ...prev, bogo_pay: val }))} 
                                                        placeholder="2" 
                                                        className="w-full bg-white border border-neutral-200/80 rounded-lg py-1.5 px-3 text-xs font-semibold text-neutral-950 text-center outline-none focus:border-neutral-950" 
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-neutral-500 font-normal leading-relaxed">
                                                El sistema descontará automáticamente en el carrito los artículos de menor valor de la promoción.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>

                            {/* SECCIÓN 4: CATÁLOGO VINCULADO */}
                            <section className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/60 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                                    <div className="flex items-center gap-2">
                                        <Package size={16} strokeWidth={1.5} className="text-neutral-500" />
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-950">
                                            4. Productos en Promoción ({currentPromo.linked_products?.length || 0} elegidos)
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button" 
                                            onClick={selectAllProducts} 
                                            className="text-[11px] font-semibold text-neutral-700 hover:text-neutral-950 px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 rounded-lg transition-colors"
                                        >
                                            Seleccionar todos
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={deselectAllProducts} 
                                            className="text-[11px] font-semibold text-neutral-400 hover:text-rose-600 px-2 py-1 transition-colors"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <Search size={14} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar por nombre de producto..." 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                        className={CLEAN_INPUT} 
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                                    {filteredProducts.slice(0, visibleCount).map(p => {
                                        const isSelected = currentPromo.linked_products?.includes(p.id);
                                        return (
                                            <div 
                                                key={p.id} 
                                                onClick={() => toggleProduct(p.id)} 
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer active:scale-[0.99] transition-all border ${
                                                    isSelected 
                                                        ? 'bg-neutral-50 border-neutral-950 text-neutral-950' 
                                                        : 'bg-white border-neutral-200/60 hover:border-neutral-300 text-neutral-700'
                                                }`}
                                            >
                                                <div className="w-10 h-10 bg-neutral-50 rounded-lg shrink-0 overflow-hidden border border-neutral-200/50 p-1 flex items-center justify-center relative">
                                                    {p.image_url ? (
                                                        <Image src={getOptimizedUrl(p.image_url)} alt={p.name} width={40} height={40} className="w-full h-full object-contain mix-blend-multiply" />
                                                    ) : (
                                                        <Package size={16} strokeWidth={1.5} className="text-neutral-300" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-xs truncate tracking-tight">{p.name}</p>
                                                    <p className="font-mono text-[11px] text-neutral-400 mt-0.5">${Number(p.usd_cash_price).toFixed(2)}</p>
                                                </div>

                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 border ${
                                                    isSelected ? 'bg-neutral-950 border-neutral-950 text-white' : 'border-neutral-300 bg-white'
                                                }`}>
                                                    {isSelected && <Check size={12} strokeWidth={2.5} />}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>

                        </div>

                        {/* COLUMNA DERECHA: VISTA PREVIA EN VIVO STICKY (5 COLS EN DESKTOP) */}
                        <div className="hidden lg:block lg:col-span-5 xl:col-span-5 sticky top-24 self-start space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                                    <div className="flex items-center gap-2">
                                        <Eye size={15} strokeWidth={1.5} className="text-neutral-500" />
                                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-950">Vista Previa en Tienda</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/60">
                                        Tiempo Real
                                    </span>
                                </div>
   <PromotionBanner
                                    promo={{
                                        ...currentPromo,
                                        bg_color: customColors.bg,
                                        text_color: JSON.stringify(customColors),
                                    }}
                                    themeConfig={storeConfig}
                                    isPreview={true}
                                />

                                {/* Resumen del Impacto Comercial */}
                                <div className="p-3.5 bg-neutral-50/60 rounded-xl border border-neutral-200/60 space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-neutral-500">
                                        <span>Modalidad:</span>
                                        <span className="font-semibold text-neutral-900 capitalize">
                                            {currentPromo.promo_type === 'percentage' 
                                                ? `${currentPromo.discount_percentage || 0}% de descuento` 
                                                : (currentPromo.promo_type === 'bogo' ? `Lleva ${currentPromo.bogo_buy || 0}, Paga ${currentPromo.bogo_pay || 0}` : 'Solo Visual')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-neutral-500">
                                        <span>Alcance:</span>
                                        <span className="font-semibold text-neutral-900 font-mono">
                                            {currentPromo.linked_products?.length || 0} producto(s)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        )
    }

    // --- MODO LISTA GENERAL ---
    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-32">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
                
                {/* CABECERA EDITORIAL */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div>
                        <h1 className="text-lg font-semibold text-neutral-950 tracking-tight">Campañas y Promociones</h1>
                        <p className="text-xs text-neutral-500 font-normal mt-0.5">Diseña banners de alto impacto y automatiza descuentos en tu catálogo público.</p>
                    </div>

                      <button 
                        onClick={() => openPromoEditor(DEFAULT_PROMO)} 
                        className="bg-neutral-950 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98] self-start sm:self-auto shrink-0"
                    >
                        <Plus size={14} strokeWidth={1.5} />
                        <span>Nueva Campaña</span>
                    </button>
                </div>

                {/* GRILLA DE PROMOCIONES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promotions.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-neutral-200/60 p-6 space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-center mx-auto text-neutral-400">
                                <Package size={18} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-sm font-semibold text-neutral-950">Aún no tienes campañas creadas</h3>
                            <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                                Activa ofertas visuales, descuentos porcentuales o promociones por volumen para impulsar las conversiones en tu tienda.
                            </p>
                            <button 
                                onClick={() => openPromoEditor(DEFAULT_PROMO)} 
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-950 text-white hover:bg-black transition-all inline-flex items-center gap-1.5"
                            >
                                <Plus size={13} strokeWidth={1.5} />
                                <span>Crear Primera Campaña</span>
                            </button>
                        </div>
                    ) : (
                        promotions.map(promo => {
                            const status = getPromoStatus(promo);

                            return (
                                <div 
                                    key={promo.id} 
                                    className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden flex flex-col justify-between transition-colors hover:border-neutral-300"
                                >
                                    {/* Cabecera del Banner con Color Real */}
                                    <div 
                                        className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 transition-colors" 
                                        style={{ backgroundColor: promo.bg_color }}
                                    >
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status.badgeClass}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <h4 className="font-semibold text-base sm:text-lg tracking-tight truncate leading-tight" style={{ color: promo.text_color }}>
                                                {promo.title}
                                            </h4>
                                            <p className="text-xs opacity-80 truncate" style={{ color: promo.text_color }}>
                                                {promo.tagline || 'Sin subtítulo'}
                                            </p>
                                        </div>

                                        {promo.image_url && (
                                            <div className="w-16 h-16 relative shrink-0">
                                                <Image 
                                                    src={getOptimizedUrl(promo.image_url)} 
                                                    alt={promo.title} 
                                                    fill 
                                                    className="object-contain mix-blend-multiply" 
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Pie de Acciones */}
                                    <div className="p-3.5 px-5 flex items-center justify-between border-t border-neutral-100 bg-white">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-mono text-neutral-500 font-medium">
                                                {promo.linked_products?.length || 0} producto(s)
                                            </span>
                                            <span className="text-neutral-300">•</span>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(promo.id, promo.is_active)}
                                                className={`text-[11px] font-semibold transition-colors ${
                                                    promo.is_active ? 'text-emerald-700 hover:text-emerald-800' : 'text-neutral-400 hover:text-neutral-700'
                                                }`}
                                            >
                                                {promo.is_active ? 'Pausar' : 'Reactivar'}
                                            </button>
                                        </div>

                                       <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => openPromoEditor(promo)} 
                                                className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(promo.id)} 
                                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Eliminar campaña"
                                            >
                                                <Trash2 size={14} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    );
}