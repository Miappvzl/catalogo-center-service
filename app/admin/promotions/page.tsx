'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { compressImage } from '@/utils/imageOptimizer'
import { getSupabase } from '@/lib/supabase-client'
import { Flame, Plus, Save, Trash2, Loader2, Check, ImageIcon, X, Search, PlusCircle, XCircle, Target, Tag, ArrowLeft, Package } from 'lucide-react'
import Swal from 'sweetalert2'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useRouter } from 'next/navigation'

// Constantes de diseño unificadas
const CARD_RADIUS = 'rounded-[var(--radius-card)]';
const BTN_RADIUS = 'rounded-[var(--radius-btn)]';
const CLEAN_INPUT = `w-full bg-gray-50 hover:bg-gray-100 focus:bg-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition-colors border border-transparent focus:border-black`;

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
    
    // Estados de UI y Filtros
    const [isEditing, setIsEditing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [visibleCount, setVisibleCount] = useState(12)

    // Estado del Objeto Principal (Clean Initial State)
    const [currentPromo, setCurrentPromo] = useState<any>({
        title: '', tagline: '', bg_color: '#000000', text_color: '#ffffff', linked_products: [],
        image_url: '', expires_at: null,
        promo_type: 'visual', discount_percentage: null, bogo_buy: null, bogo_pay: null
    })

    // Fetch Inicial (Elite Pattern: Auth + DB Maestro Filter)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return; }

            const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
            if (store) {
                setStoreId(store.id)
                // Usamos Promise.all para cargar promos y productos en paralelo (Rendimiento)
                const [promosRes, prodsRes] = await Promise.all([
                    supabase.from('promotions').select('*').eq('store_id', store.id).order('created_at', { ascending: false }),
                    supabase.from('products').select('id, name, image_url, usd_cash_price').eq('store_id', store.id).eq('status', 'active').order('name', { ascending: true })
                ]);

                if (promosRes.data) setPromotions(promosRes.data)
                if (prodsRes.data) setProducts(prodsRes.data)
            }
            setLoading(false)
        }
        fetchData()
    }, [supabase, router])

    // 🚀 OPTIMIZACIÓN DE RENDIMIENTO: MEMOIZACIÓN DEL FILTRO DE PRODUCTOS
    const filteredProducts = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }, [products, searchTerm]);

   // 🚀 LOGICA DE NEGOCIO (Bulk Actions)
    const selectAllProducts = useCallback(() => {
        setCurrentPromo((prev: any) => ({ ...prev, linked_products: filteredProducts.map(p => p.id) }));
    }, [filteredProducts]);

    const deselectAllProducts = useCallback(() => {
        setCurrentPromo((prev: any) => ({ ...prev, linked_products: [] }));
    }, []);

    // 🚀 MOTOR MATEMÁTICO: SANEAMIENTO Y GUARDADO (Cero Reloads)
    const handleSave = async () => {
        if (!currentPromo.title) return Swal.fire('Error', 'El título es obligatorio', 'warning')
        if (!storeId) return Swal.fire('Error', 'Sesión inválida', 'error')

        // Validaciones Estrictas (Business Logic)
        if (currentPromo.promo_type === 'percentage' && (currentPromo.discount_percentage < 1 || currentPromo.discount_percentage > 99)) {
            return Swal.fire('Error', 'Porcentaje inválido (1-99%)', 'warning')
        }
        if (currentPromo.promo_type === 'bogo' && (Number(currentPromo.bogo_buy) <= Number(currentPromo.bogo_pay))) {
            return Swal.fire('Error', 'Lleva debe ser mayor que Paga', 'warning')
        }

        setSaving(true)

        try {
            // Saneamiento de Payload (CTO Security Standard)
            let discount_percentage = 0;
            let bogo_buy = 0;
            let bogo_pay = 0;

            if (currentPromo.promo_type === 'percentage') {
                discount_percentage = Number(currentPromo.discount_percentage);
            } else if (currentPromo.promo_type === 'bogo') {
                bogo_buy = Number(currentPromo.bogo_buy);
                bogo_pay = Number(currentPromo.bogo_pay);
            }

            const payload = {
                store_id: storeId,
                title: currentPromo.title,
                tagline: currentPromo.tagline,
                bg_color: currentPromo.bg_color,
                text_color: currentPromo.text_color,
                linked_products: currentPromo.linked_products || [],
                is_active: true,
                image_url: currentPromo.image_url || null,
                expires_at: currentPromo.expires_at ? new Date(currentPromo.expires_at).toISOString() : null,
                promo_type: currentPromo.promo_type,
                discount_percentage, bogo_buy, bogo_pay
            }

            let response;
            if (currentPromo.id) {
                response = await supabase.from('promotions').update(payload).eq('id', currentPromo.id).select().single()
            } else {
                response = await supabase.from('promotions').insert(payload).select().single()
            }

            if (response.error) throw response.error;

            // 🚀 ACTUALIZACIÓN OPTIMISTA (Cero parpadeos, UX Elite)
            setPromotions(prev => {
                const index = prev.findIndex(p => p.id === response.data.id);
                if (index !== -1) {
                    const newPromos = [...prev]; newPromos[index] = response.data; return newPromos;
                } else {
                    return [response.data, ...prev];
                }
            });

            Swal.fire({ 
                title: 'Campaña Guardada', icon: 'success', toast: true, position: 'top-end', 
                showConfirmButton: false, timer: 1500, customClass: { popup: 'bg-black text-white rounded-xl text-xs' }
            })
            setIsEditing(false)
            
        } catch (error: any) {
            Swal.fire('Error', error.message || 'No se pudo guardar la campaña', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        const confirm = await Swal.fire({ 
            title: '¿Eliminar campaña?', text: 'Esta acción no se puede deshacer', icon: 'warning', 
            showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#000', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg text-xs', cancelButton: 'rounded-lg text-xs' } 
        })
        if (confirm.isConfirmed) {
            try {
                const { error } = await supabase.from('promotions').delete().eq('id', id)
                if (error) throw error;
                // Optimistic delete
                setPromotions(prev => prev.filter(p => p.id !== id))
            } catch (error: any) {
                Swal.fire('Error', 'No se pudo eliminar la campaña', 'error')
            }
        }
    }

    const toggleProduct = (productId: number) => {
        const currentList = currentPromo.linked_products || []
        setCurrentPromo({ 
            ...currentPromo, 
            linked_products: currentList.includes(productId)
                ? currentList.filter((id: number) => id !== productId)
                : [...currentList, productId]
        })
    }

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

    // --- 🚀 MODO EDICIÓN / CREACIÓN (Slide-over Standard) ---
    const isPromoActiveWithProducts = currentPromo?.linked_products && currentPromo.linked_products.length > 0;
    if (isEditing) {
        return (
            <>
                {/* Fixed Top Bar (Elite Standard) */}
<div className="fixed top-0 right-0 left-0 lg:left-64 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-40 px-4 md:px-8 py-4 flex justify-between items-center transition-all duration-300 gap-4">
    
    {/* 1. IZQUIERDA: flex-1 y min-w-0 habilitan el truncate del h2 */}
    <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-full transition-colors active:scale-95 shrink-0">
            <ArrowLeft size={18} />
        </button>
        <h2 className="text-xl md:text-2xl font-black text-gray-900 truncate tracking-tight pr-2">
            {currentPromo.id ? 'Editar Campaña' : 'Nueva Campaña'}
        </h2>
    </div>

    {/* 2. DERECHA: shrink-0 protege los botones */}
    <div className="flex gap-2 shrink-0 items-center">
        {/* Ocultamos "Cancelar" en móviles muy pequeños para mantener el Clean Look */}
        <button onClick={() => setIsEditing(false)} className="hidden sm:block px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-black rounded-full active:scale-95 transition-all">
            Cancelar
        </button>
        
        {/* Hacemos el texto del botón dinámico: "Guardar" en mobile, "Guardar Cambios" en desktop */}
        <button onClick={handleSave} disabled={saving} className={`bg-black text-white px-4 sm:px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed`}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
            <span className="hidden sm:inline">Guardar Cambios</span>
            <span className="sm:hidden">Guardar</span>
        </button>
    </div>
</div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 md:px-8 pt-28 md:pt-32 pb-24 overflow-visibleSelection">

                    {/* Vista Previa en Vivo (UI Cero Bordes, Pure Design) */}
                    <div className="mb-8 rounded-2xl overflow-hidden bg-white  border border-gray-50">
                        <div className="text-[10px] font-bold text-gray-400 bg-white  px-6 py-3 uppercase tracking-widest border-b-2 border-[#f8f9fa]">Vista Previa de la Campaña (Banner en Vitrina)</div>
                        <div className="w-full flex flex-col md:flex-row items-center gap-6 px-8 py-10" style={{ backgroundColor: currentPromo.bg_color }}>
                            {currentPromo.image_url && (
                                <img src={currentPromo.image_url} alt="Promo" className="w-28 h-28 md:w-36 md:h-36 object-contain shrink-0 mix-blend-multiply transition-transform" />
                            )}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
                                <h4 className="font-black text-2xl md:text-3xl tracking-tight leading-tight" style={{ color: currentPromo.text_color }}>{currentPromo.title || 'Título de la Campaña'}</h4>
                                <p className="text-xs md:text-sm opacity-90 mt-1.5" style={{ color: currentPromo.text_color }}>{currentPromo.tagline || 'Subtítulo o gancho persuasivo aquí'}</p>
                            </div>
                            <div className="px-5 py-3 rounded-full text-[10px] font-bold tracking-widest uppercase bg-black/5 hover:bg-black/10 transition-colors" style={{ color: currentPromo.text_color }}>
                                Ver Ofertas
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Imagen Destacada */}
                        <div className={`bg-white p-6 ${CARD_RADIUS} border border-gray-50`}>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pb-6 mb-6 border-b border-gray-50">1. Imagen Destacada (Opcional, formato PNG mix-blend)</h3>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6 items-center">
                                <div onClick={() => !uploading && fileInputRef.current?.click()} className={`relative aspect-square bg-gray-50 rounded-2xl ${uploading ? 'animate-pulse cursor-wait' : 'hover:bg-gray-100 cursor-pointer'} flex flex-col items-center justify-center overflow-hidden relative group transition-colors border border-gray-100`}>
                                    {currentPromo.image_url ? (
                                        <img src={currentPromo.image_url} className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt="Preview" />
                                    ) : (
                                        <div className="text-center p-4 text-gray-400 group-hover:text-gray-900 transition-colors flex flex-col items-center">
                                            {uploading ? <Loader2 className="animate-spin mb-2" size={24} /> : <ImageIcon size={32} className="mb-2" />}
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{uploading ? 'Subiendo...' : 'Seleccionar'}</span>
                                        </div>
                                    )}
                                    {uploading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center text-black text-xs font-bold uppercase z-10">Subiendo</div>}
                                </div>
                                <div className="space-y-3 text-xs md:text-sm text-gray-600 leading-relaxed">
                                    <p className="font-bold text-gray-900 flex items-center gap-1.5"><Tag size={16} className="text-emerald-600" /> IA Image Optimizer Activo.</p>
                                    <p>Nuestra IA comprimirá y optimizará automáticamente la imagen para mantener la <b className="text-gray-900">velocidad extrema de la vitrina</b>.</p>
                                    <p className="text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">Recomendado: 800x800px. Formato PNG transparente para que fusione con el color de fondo.</p>
                                    {currentPromo.image_url && (
                                        <button onClick={() => setCurrentPromo({ ...currentPromo, image_url: '' })} className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 pt-2 active:scale-95 transition-transform">
                                            <XCircle size={14} /> Eliminar Imagen Actual
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Diseño Visual */}
                        <div className={`bg-white p-6 ${CARD_RADIUS} space-y-5  border border-gray-50`}>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pb-3">2. Identidad Visual</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Título Principal</label>
                                    <input value={currentPromo.title} onChange={e => setCurrentPromo({ ...currentPromo, title: e.target.value })} placeholder="Ej: Black Friday" className={CLEAN_INPUT} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Subtítulo</label>
                                    <input value={currentPromo.tagline} onChange={e => setCurrentPromo({ ...currentPromo, tagline: e.target.value })} placeholder="Ej: Hasta 50% de descuento en ropa" className={CLEAN_INPUT} />
                                </div>
                                
                                {/* SELECTORES ESTILIZADOS */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Color de Fondo</label>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-2 py-1.5 border border-gray-100 transition-colors hover:border-black/20 group">
                                        <input type="color" value={currentPromo.bg_color} onChange={e => setCurrentPromo({ ...currentPromo, bg_color: e.target.value })} className="w-11 h-11 rounded-lg cursor-pointer bg-transparent appearance-none border-none outline-none ring-1 ring-black/10 group-hover:ring-black" />
                                        <span className="font-mono text-sm font-bold text-gray-600 tracking-wider group-hover:text-black uppercase">{currentPromo.bg_color}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Color del Texto</label>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-2 py-1.5 border border-gray-100 transition-colors hover:border-black/20 group">
                                        <input type="color" value={currentPromo.text_color} onChange={e => setCurrentPromo({ ...currentPromo, text_color: e.target.value })} className="w-11 h-11 rounded-lg cursor-pointer bg-transparent appearance-none border-none outline-none ring-1 ring-black/10 group-hover:ring-black" />
                                        <span className="font-mono text-sm font-bold text-gray-600 tracking-wider group-hover:text-black uppercase">{currentPromo.text_color}</span>
                                    </div>
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Fecha de Vencimiento (Urgencia)</label>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 group transition-colors hover:border-black/20 focus-within:border-black focus-within:bg-gray-100">
                                        <input type="datetime-local" value={currentPromo.expires_at ? new Date(currentPromo.expires_at).toISOString().substring(0, 16) : ''} onChange={e => setCurrentPromo({ ...currentPromo, expires_at: e.target.value || null })} className="bg-transparent text-sm font-bold text-gray-900 outline-none w-full appearance-none group-hover:text-black" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Motor de Oferta */}
                        <div className={`bg-white p-6 ${CARD_RADIUS} space-y-4 border border-gray-50`}>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pb-3 flex items-center gap-1.5"><Flame size={14} className="text-red-500" />3. Motor de Oferta (Estrategia Matemática)</h3>
                            <div className="flex flex-col sm:flex-row w-full md:w-fit mb-4 bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                                {[ {type: 'visual', label: 'Solo Visual'}, {type: 'percentage', label: 'Descuento %'}, {type: 'bogo', label: 'Lleva N, Paga M'} ].map(opt => (
                                    <button key={opt.type} onClick={() => setCurrentPromo({ ...currentPromo, promo_type: opt.type })} className={`flex-1 sm:flex-none px-6 py-3 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${currentPromo.promo_type === opt.type ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-500 hover:text-black'}`}>
                                        {currentPromo.promo_type === opt.type && <Target size={14} className="text-emerald-500" />}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <AnimatePresence mode="wait">
                                {currentPromo.promo_type === 'percentage' && (
                                    <motion.div key="percentage" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="bg-gray-50 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-6 border border-gray-100">
                                        <div className="w-full md:w-1/2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Porcentaje a descontar</label>
                                            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border focus-within:border-black border-gray-100 shadow-inner">
                                                <span className="text-gray-400 font-bold text-base">%</span>
                                                <input type="number" min="1" max="99" value={currentPromo.discount_percentage || ''} onChange={e => setCurrentPromo({ ...currentPromo, discount_percentage: e.target.value })} placeholder="Ej: 30" className="bg-transparent border-none outline-none font-black text-3xl md:text-4xl text-gray-900 w-full tracking-tight tabular-nums" />
                                            </div>
                                        </div>
                                        <p className="text-xs md:text-sm text-gray-600 font-medium md:flex-1 text-center md:text-left leading-relaxed">Se restará este porcentaje <b className="text-gray-900">automáticamente</b> al Precio Base de todos los productos vinculados en la vitrina, checkout y mensajes de WhatsApp.</p>
                                    </motion.div>
                                )}
                                {currentPromo.promo_type === 'bogo' && (
                                    <motion.div key="bogo" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="bg-gray-50 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 border border-gray-100">
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">El cliente LLEVA (Q. Total)</label>
                                            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border focus-within:border-black border-gray-100 shadow-inner">
                                                <input type="number" min="2" value={currentPromo.bogo_buy || ''} onChange={e => setCurrentPromo({ ...currentPromo, bogo_buy: e.target.value })} placeholder="4" className="bg-transparent border-none outline-none font-black text-3xl md:text-4xl text-gray-900 w-full tracking-tight tabular-nums text-center" />
                                            </div>
                                        </div>
                                        <div className="w-full">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Pero PAGA solo</label>
                                            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 rounded-xl border focus-within:border-emerald-600 border-emerald-100 shadow-inner">
                                                <input type="number" min="1" value={currentPromo.bogo_pay || ''} onChange={e => setCurrentPromo({ ...currentPromo, bogo_pay: e.target.value })} placeholder="2" className="bg-transparent border-none outline-none font-black text-3xl md:text-4xl text-emerald-600 w-full tracking-tight tabular-nums text-center" />
                                            </div>
                                        </div>
                                        <p className="col-span-1 md:col-span-2 text-xs md:text-sm text-gray-600 font-medium leading-relaxed bg-white/50 p-4 rounded-xl border border-gray-100">El carrito calculará el descuento sobre los artículos de menor valor. Ej: 4x2 descontará los 2 productos más baratos.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 4. Productos Vinculados */}
                        <div className={`bg-white p-6 ${CARD_RADIUS}  border border-gray-50`}>
                            <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Package size={14} className="text-gray-400" /> 4. Productos Vinculados ({filteredProducts.length} filtrados)</h3>
                                <div className="flex items-center gap-3">
                                    {isPromoActiveWithProducts && <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{currentPromo.linked_products.length} Items</span>}
                                    <div className="flex gap-1.5">
                                        <button onClick={selectAllProducts} title="Seleccionar Todos Filtrados" className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"><PlusCircle size={18} /></button>
                                        <button onClick={deselectAllProducts} title="Deseleccionar Todos" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><XCircle size={18} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="mb-6 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="text" placeholder="Buscar producto por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${CLEAN_INPUT} pl-11`} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto no-scrollbar pt-1 pr-1" onScroll={(e) => { const { scrollTop, clientHeight, scrollHeight } = e.currentTarget; if (scrollHeight - scrollTop <= clientHeight * 1.5) setVisibleCount(prev => prev + 12); }}>
                                {filteredProducts.slice(0, visibleCount).map(p => {
                                    const isSelected = currentPromo.linked_products?.includes(p.id);
                                    return (
                                        <div key={p.id} onClick={() => toggleProduct(p.id)} className={`flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-all border ${isSelected ? 'bg-gray-100 border-gray-200' : 'bg-white hover:bg-gray-50 border-gray-100/50'}`}>
                                            <div className="w-12 h-12 bg-white rounded-lg shrink-0 overflow-hidden border border-gray-100/60 p-1 flex items-center justify-center">
                                                {p.image_url ? <img src={p.image_url} className="w-full h-full object-contain mix-blend-multiply" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50"><ImageIcon size={18} strokeWidth={1}/></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-gray-900 truncate tracking-tight">{p.name}</p>
                                                <p className="font-mono text-[10px] text-gray-500 mt-0.5 tabular-nums">${Number(p.usd_cash_price).toFixed(2)} Base</p>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 border border-emerald-100 text-emerald-100'}`}>
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {filteredProducts.length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-xs font-medium border border-gray-100 border-dashed rounded-2xl bg-gray-50/50">No hay productos que coincidan con &quot;{searchTerm}&quot;</div>
                            )}
                            {filteredProducts.length > visibleCount && (
                                <div className="text-center pt-4 mt-2 border-t border-gray-50">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sigue bajando para cargar más ({filteredProducts.length - visibleCount} restantes)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </>
        )
    }

    // --- 🚀 MODO LISTA (Clean Grid UI) ---
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-2"><Flame size={28} className="text-red-600"/> Campañas</h1>
                    <p className="text-sm text-gray-500 mt-1">Crea banners visuales, activa motores de oferta y dispara tus ventas.</p>
                </div>
                <button onClick={() => { setCurrentPromo({ title: '', tagline: '', bg_color: '#000000', text_color: '#ffffff', linked_products: [], promo_type: 'visual', discount_percentage: null, bogo_buy: null, bogo_pay: null, expires_at: null }); setIsEditing(true); }} className={`bg-black text-white px-5 py-3 ${BTN_RADIUS} font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform shrink-0`}>
                    <Plus size={18} /> Nueva Campaña
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {promotions.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-white rounded-3xl shadow-subtle border border-gray-50">
                        <Tag size={48} className="mx-auto text-gray-200 mb-6" />
                        <p className="font-black text-gray-900 tracking-tight text-xl mb-1">Crea tu primera promoción</p>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">Activa descuentos o crea ofertas BOGO para productos específicos y lánzalas en tu vitrina.</p>
                       <button onClick={() => { setCurrentPromo({ title: '', tagline: '', bg_color: '#000000', text_color: '#ffffff', linked_products: [], promo_type: 'visual', discount_percentage: null, bogo_buy: null, bogo_pay: null, expires_at: null }); setIsEditing(true); }} className="px-5 py-3 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:border-emerald-200 transition-colors flex items-center gap-1.5 mx-auto active:scale-95"><PlusCircle size={14}/> Crear Campaña</button>
                    </div>
                ) : (
                    promotions.map(promo => (
                        <div key={promo.id} className={`bg-white ${CARD_RADIUS} overflow-hidden flex flex-col group hover:scale-[0.98] hover:shadow-subtle border border-gray-50 transition-all duration-300`}>
                            <div className="w-full flex items-center gap-5 px-8 py-8" style={{ backgroundColor: promo.bg_color }}>
                                {promo.image_url && (
                                    <img src={promo.image_url} alt={promo.title} className="w-16 h-16 md:w-20 md:h-20 object-contain shrink-0 mix-blend-multiply group-hover:scale-105 transition-transform" />
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <h4 className="font-black text-xl md:text-2xl tracking-tight truncate leading-tight" style={{ color: promo.text_color }}>{promo.title}</h4>
                                    <p className="text-xs md:text-sm mt-1 opacity-90 truncate" style={{ color: promo.text_color }}>{promo.tagline}</p>
                                </div>
                            </div>
                            <div className="p-5 flex items-center justify-between bg-white mt-auto border-t border-gray-50">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-900 bg-gray-50 px-3 py-1.5 rounded-full tracking-tight tabular-nums flex items-center gap-1.5"><Package size={14} className="text-gray-400"/> {promo.linked_products?.length || 0} Productos</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setCurrentPromo(promo); setIsEditing(true); }} className="px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-50 rounded-full hover:bg-gray-100 hover:text-black transition-colors active:scale-95">Editar</button>
                                    <button onClick={() => handleDelete(promo.id)} className="p-2.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full hover:bg-red-50 transition-colors active:scale-95"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    )
}