'use client'

import { useState, useEffect, useRef } from 'react'
import { compressImage } from '@/utils/imageOptimizer'
import { getSupabase } from '@/lib/supabase-client'
import { Flame, Plus, Save, Trash2, Loader2, Check, ImageIcon, X, Search } from 'lucide-react'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'framer-motion' // 🚀 ARREGLADO: Importación crítica del motor de animaciones

export default function PromotionsPage() {
    const supabase = getSupabase()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [promotions, setPromotions] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [visibleCount, setVisibleCount] = useState(10)
    const [storeId, setStoreId] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const [currentPromo, setCurrentPromo] = useState<any>({
        title: '', tagline: '', bg_color: '#000000', text_color: '#ffffff', linked_products: [],
        image_url: '', expires_at: '',
        promo_type: 'visual', discount_percentage: 0, bogo_buy: 0, bogo_pay: 0
    })

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
            if (store) {
                setStoreId(store.id)
                const { data: promos } = await supabase.from('promotions').select('*').eq('store_id', store.id).order('created_at', { ascending: false })
                const { data: prods } = await supabase.from('products').select('id, name, image_url, usd_cash_price').eq('store_id', store.id).eq('status', 'active')

                if (promos) setPromotions(promos)
                if (prods) setProducts(prods)
            }
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    const handleSave = async () => {
        if (!currentPromo.title) return Swal.fire('Error', 'El título es obligatorio', 'warning')
        setSaving(true)

        try {
            const payload = {
                store_id: storeId,
                title: currentPromo.title,
                tagline: currentPromo.tagline,
                bg_color: currentPromo.bg_color,
                text_color: currentPromo.text_color,
                linked_products: currentPromo.linked_products,
                is_active: true,
                image_url: currentPromo.image_url || null,
                expires_at: currentPromo.expires_at ? new Date(currentPromo.expires_at).toISOString() : null,
                promo_type: currentPromo.promo_type,
                discount_percentage: Number(currentPromo.discount_percentage) || 0,
                bogo_buy: Number(currentPromo.bogo_buy) || 0,
                bogo_pay: Number(currentPromo.bogo_pay) || 0
            }

            let dbError;
            if (currentPromo.id) {
                const { error } = await supabase.from('promotions').update(payload).eq('id', currentPromo.id)
                dbError = error;
            } else {
                const { error } = await supabase.from('promotions').insert(payload)
                dbError = error;
            }

            if (dbError) throw dbError;

            Swal.fire({ title: 'Campaña Guardada', icon: 'success', confirmButtonColor: '#000', customClass: { popup: 'rounded-2xl' } })
            setIsEditing(false)
            window.location.reload()
        } catch (error: any) {
            console.error("Detalle del error:", error);
            Swal.fire('Error al guardar', error.message || 'Ocurrió un error en la base de datos', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        const confirm = await Swal.fire({ title: '¿Eliminar campaña?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#000', confirmButtonText: 'Sí, eliminar', customClass: { popup: 'rounded-2xl' } })
        if (confirm.isConfirmed) {
            await supabase.from('promotions').delete().eq('id', id)
            setPromotions(promotions.filter(p => p.id !== id))
        }
    }

    const toggleProduct = (productId: number) => {
        const currentList = currentPromo.linked_products || []
        if (currentList.includes(productId)) {
            setCurrentPromo({ ...currentPromo, linked_products: currentList.filter((id: number) => id !== productId) })
        } else {
            setCurrentPromo({ ...currentPromo, linked_products: [...currentList, productId] })
        }
    }

    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !storeId) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo imágenes permitidas', 'error');

        try {
            setUploading(true);
            const compressedFile = await compressImage(file, 800, 0.7);
            const fileName = `promo-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
            const { error } = await supabase.storage.from('variants').upload(fileName, compressedFile);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName);
            setCurrentPromo({ ...currentPromo, image_url: publicUrl });
        } catch (error: any) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-gray-400" size={32} /></div>

   if (isEditing) {
        return (
            <>
                {/* Barra de Navegación Fija (Elite Standard)
                    - Fuera del motion.div para evitar conflictos con el 'transform' de CSS.
                    - Usa w-full sin provocar el bug del scrollbar horizontal.
                */}
               {/* Barra de Navegación (Elite Standard) 
    - left-0: Ocupa todo el ancho desde 0px hasta 1023px.
    - lg:left-64: A partir de 1024px, hace espacio para el menú lateral.
*/}
<div className="fixed top-0 right-0 left-0 lg:left-64 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 px-4 md:px-8 py-4 flex justify-between items-center transition-all duration-300">
    
    {/* Lado izquierdo */}
    <h2 className="text-2xl font-black text-gray-900 truncate pr-4">
        {currentPromo.id ? 'Editar Campaña' : 'Nueva Campaña'}
    </h2>

    {/* Lado derecho */}
    <div className="flex gap-2 shrink-0">
        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-white hover:text-black rounded-lg transition-colors">
            Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className="bg-black text-white px-6 py-2.5 rounded-(--radius-btn) font-bold text-sm flex items-center gap-2 active:scale-95 transition-all disabled:opacity-70">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar
        </button>
    </div>

</div>

                {/* Contenedor Animado
                    - Añadido pt-28 en móvil y md:pt-32 en escritorio para que el 
                      contenido inicie justo debajo de la barra fija.
                */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto px-0 pt-28 pb-20 md:p-8 md:pt-32 overflow-visible">

                    {/* Vista Previa en Vivo (UI Cero Bordes) */}
                    <div className="mb-8 rounded-2xl m-4 overflow-hidden bg-white">
                        <div className="text-xs font-bold text-gray-400 bg-gray-100 px-5 py-3 uppercase tracking-widest">Vista Previa del Banner</div>
                        <div className="w-full flex flex-col md:flex-row items-center gap-4 md:gap-6 px-6 py-8" style={{ backgroundColor: currentPromo.bg_color }}>
                            {currentPromo.image_url && (
                                <img src={currentPromo.image_url} alt="Promo" className="w-24 h-24 md:w-32 md:h-32 object-contain shrink-0 mix-blend-multiply" />
                            )}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
                                <h4 className="font-black text-xl md:text-2xl tracking-tight leading-tight" style={{ color: currentPromo.text_color }}>{currentPromo.title || 'Título de la Campaña'}</h4>
                                <p className="text-xs md:text-sm opacity-90 mt-1" style={{ color: currentPromo.text_color }}>{currentPromo.tagline || 'Subtítulo persuasivo aquí'}</p>
                            </div>
                            <div className="px-5 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-white/10" style={{ color: currentPromo.text_color }}>
                                Ver Ofertas
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* 1. Imagen Destacada */}
                        <div className="bg-white p-6 m-4  rounded-(--radius-card)">
                            <h3 className="font-black text-gray-900 pb-4 mb-4">1. Imagen Destacada (Opcional)</h3>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
                            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6 items-center">
                                <div onClick={() => fileInputRef.current?.click()} className={`aspect-square bg-gray-50 rounded-2xl ${uploading ? 'animate-pulse' : 'hover:bg-gray-100'} flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-colors`}>
                                    {currentPromo.image_url ? (
                                        <img src={currentPromo.image_url} className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform" alt="Preview" />
                                    ) : (
                                        <div className="text-center p-4 text-gray-400 group-hover:text-black transition-colors flex flex-col items-center">
                                            {uploading ? <Loader2 className="animate-spin mb-2" size={24} /> : <ImageIcon size={32} className="mb-2" />}
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{uploading ? 'Subiendo...' : 'Seleccionar'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p className="font-bold text-gray-900">Sube una imagen optimizada.</p>
                                    <p>Preferiblemente formato PNG o JPG con fondo transparente (mix-blend) o del mismo color que el fondo que elijas.</p>
                                    <p className="text-xs bg-gray-50 p-3 rounded-xl">Recomendado: 800x800px. <span className="font-bold text-red-600">Nuestra IA la comprimirá</span> para mantener la velocidad extrema.</p>
                                    {currentPromo.image_url && (
                                        <button onClick={() => setCurrentPromo({ ...currentPromo, image_url: '' })} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 pt-2 active:scale-95 transition-transform">
                                            <X size={14} /> Eliminar Imagen
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Diseño Visual */}
                        <div className="bg-white p-6 m-4 rounded-(--radius-card) space-y-4">
                            <h3 className="font-black text-gray-900 pb-2">2. Diseño Visual</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Título Principal</label>
                                    <input value={currentPromo.title} onChange={e => setCurrentPromo({ ...currentPromo, title: e.target.value })} placeholder="Ej: Black Friday" className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Subtítulo</label>
                                    <input value={currentPromo.tagline} onChange={e => setCurrentPromo({ ...currentPromo, tagline: e.target.value })} placeholder="Ej: Hasta 50% de descuento" className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Color de Fondo</label>
                                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl">
                                        <input type="color" value={currentPromo.bg_color} onChange={e => setCurrentPromo({ ...currentPromo, bg_color: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
                                        <span className="font-mono text-sm font-bold text-gray-600">{currentPromo.bg_color}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Color del Texto</label>
                                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl">
                                        <input type="color" value={currentPromo.text_color} onChange={e => setCurrentPromo({ ...currentPromo, text_color: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
                                        <span className="font-mono text-sm font-bold text-gray-600">{currentPromo.text_color}</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Termina en (Urgencia)</label>
                                    <input type="datetime-local" value={currentPromo.expires_at || ''} onChange={e => setCurrentPromo({ ...currentPromo, expires_at: e.target.value })} className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition-colors" />
                                </div>
                            </div>
                        </div>

                        {/* 3. Motor de Oferta */}
                        <div className="bg-white p-6 m-4 rounded-(--radius-card) space-y-4 ">
                            <h3 className="font-black text-gray-900 pb-2">3. Motor de Oferta</h3>
                            <div className="flex flex-col sm:flex-row w-full md:w-fit mb-4 bg-gray-100 p-1 rounded-(--radius-btn) border border-gray-200  shrink-0 shadow-inner">
                                <button onClick={() => setCurrentPromo({ ...currentPromo, promo_type: 'visual' })} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${currentPromo.promo_type === 'visual' ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-500 hover:text-black'}`}>Solo Visual</button>
                                <button onClick={() => setCurrentPromo({ ...currentPromo, promo_type: 'percentage' })} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${currentPromo.promo_type === 'percentage' ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-500 hover:text-black'}`}>Descuento %</button>
                                <button onClick={() => setCurrentPromo({ ...currentPromo, promo_type: 'bogo' })} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${currentPromo.promo_type === 'bogo' ? 'bg-white text-black shadow-subtle border border-transparent' : 'text-gray-500 hover:text-black'}`}>Lleva N, Paga M</button>
                            </div>
                            <AnimatePresence mode="wait">
                                {currentPromo.promo_type === 'percentage' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-gray-50 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                                        <div className="w-full md:w-1/2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Porcentaje a descontar</label>
                                            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl">
                                                <span className="text-gray-400 font-bold">%</span>
                                                <input type="number" min="1" max="99" value={currentPromo.discount_percentage || ''} onChange={e => setCurrentPromo({ ...currentPromo, discount_percentage: e.target.value })} placeholder="Ej: 20" className="bg-transparent border-none outline-none font-black text-gray-900 w-full" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium md:flex-1 text-center md:text-left">Se restará este % del precio base de todos los productos vinculados.</p>
                                    </motion.div>
                                )}
                                {currentPromo.promo_type === 'bogo' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-gray-50 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">El cliente LLEVA</label>
                                            <input type="number" min="2" value={currentPromo.bogo_buy || ''} onChange={e => setCurrentPromo({ ...currentPromo, bogo_buy: e.target.value })} placeholder="Ej: 4" className="w-full bg-white rounded-xl px-4 py-3.5 text-sm font-black text-gray-900 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Pero PAGA solo</label>
                                            <input type="number" min="1" value={currentPromo.bogo_pay || ''} onChange={e => setCurrentPromo({ ...currentPromo, bogo_pay: e.target.value })} placeholder="Ej: 2" className="w-full bg-white rounded-xl px-4 py-3.5 text-sm font-black text-gray-900 outline-none" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 4. Productos Vinculados */}
                        <div className="bg-white p-6 m-4 rounded-(--radius-card)">
                            <div className="flex justify-between items-center pb-4 mb-4">
                                <h3 className="font-black text-gray-900">4. Productos Vinculados</h3>
                                <span className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold">{currentPromo.linked_products?.length || 0} Seleccionados</span>
                            </div>
                            <div className="mb-6 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="text" placeholder="Buscar producto por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-gray-100 transition-colors" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto no-scrollbar" onScroll={(e) => { const { scrollTop, clientHeight, scrollHeight } = e.currentTarget; if (scrollHeight - scrollTop <= clientHeight * 1.5) setVisibleCount(prev => prev + 10); }}>
                                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, visibleCount).map(p => (
                                    <div key={p.id} onClick={() => toggleProduct(p.id)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer active:scale-[0.98] transition-all ${currentPromo.linked_products?.includes(p.id) ? 'bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                        <div className="w-12 h-12 bg-white rounded-xl shrink-0 overflow-hidden">
                                            {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover mix-blend-multiply" /> : <div className="w-full h-full bg-gray-100" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 truncate">{p.name}</p>
                                            <p className="font-mono text-[10px] text-gray-500">${p.usd_cash_price}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full text-gray-50 flex items-center justify-center transition-colors shrink-0 ${currentPromo.linked_products?.includes(p.id) ? 'bg-[#00cd61] text-white' : 'bg-[#00cd604e]'}`}>
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length > visibleCount && (
                                <div className="text-center pt-4 mt-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sigue bajando para cargar más</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </>
        )
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-4 md:p-8 pb-24">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Campañas</h1>
                    <p className="text-sm text-gray-500 mt-1">Crea banners, activa motores de oferta y dispara tus ventas.</p>
                </div>
                <button onClick={() => { setCurrentPromo({ title: '', tagline: '', bg_color: '#000000', text_color: '#ffffff', linked_products: [], promo_type: 'visual', discount_percentage: 0, bogo_buy: 0, bogo_pay: 0 }); setIsEditing(true); }} className="bg-black text-white px-5 py-3 rounded-(--radius-btn) font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform">
                    <Plus size={18} /> Nueva Campaña
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {promotions.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-white rounded-3xl">
                        <Flame size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">No hay campañas activas</p>
                    </div>
                ) : (
                    promotions.map(promo => (
                        <div key={promo.id} className="bg-white rounded-3xl overflow-hidden flex flex-col group hover:scale-[0.98] transition-transform duration-300">
                            <div className="w-full flex items-center gap-5 px-8 py-8" style={{ backgroundColor: promo.bg_color }}>
                                {promo.image_url && (
                                    <img src={promo.image_url} alt={promo.title} className="w-16 h-16 object-contain shrink-0 mix-blend-multiply" />
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <h4 className="font-black text-xl tracking-tight truncate" style={{ color: promo.text_color }}>{promo.title}</h4>
                                    <p className="text-xs mt-1 opacity-90 truncate" style={{ color: promo.text_color }}>{promo.tagline}</p>
                                </div>
                            </div>
                            <div className="p-5 flex items-center justify-between bg-white">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg">{promo.linked_products?.length || 0} Productos</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setCurrentPromo(promo); setIsEditing(true); }} className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 hover:text-black transition-colors active:scale-95">Editar</button>
                                    <button onClick={() => handleDelete(promo.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg hover:bg-red-50 transition-colors active:scale-95"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    )
}