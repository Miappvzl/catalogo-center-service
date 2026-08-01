'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, ListOrdered, GripVertical, Share2, Info, Search, Plus } from 'lucide-react'
import { Reorder, useDragControls, AnimatePresence, motion } from 'framer-motion' // 👈 AÑADE "AnimatePresence, motion"
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'
import { revalidateStoreCache } from '@/app/admin/actions'

const SortableCategoryItem = ({ 
    cat, 
    idx, 
    onShare,
    onDrag,
    onDragStart,
    onDragEnd,
    isDragDisabled // 👈 NUEVA PROPIEDAD
}: { 
    cat: string, 
    idx: number, 
    onShare: (c: string) => void,
    onDrag: (x: number) => void,
    onDragStart: () => void,
    onDragEnd: () => void,
    isDragDisabled: boolean // 👈 Añadido
}) => {
    const controls = useDragControls()

    return (
        <Reorder.Item 
            value={cat} 
            dragListener={false} 
            dragControls={controls}
            layoutScroll
            dragElastic={0.1}
            dragMomentum={false}
            onDragStart={onDragStart}
            onDrag={(event, info) => onDrag(info.point.x)}
            onDragEnd={onDragEnd}
            whileDrag={{ 
                scale: 1.05, 
                boxShadow: "0px 10px 25px rgba(0,0,0,0.12)",
                borderColor: "#000000",
                zIndex: 50,
                cursor: "grabbing"
            }}
            className="flex items-center gap-2 bg-white pr-2 pl-2 py-1.5 rounded-full border border-neutral-200/80 shadow-sm transition-colors relative w-fit shrink-0 select-none"
        >
            {/* 1. Indicador Numérico de Posición */}
            <div className="w-6 h-6 rounded-full bg-neutral-950 text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="text-[10px] font-black">{idx + 1}</span>
            </div>
            
            {/* 2. Nombre de la Categoría */}
            <span className="font-bold text-xs text-neutral-800 whitespace-nowrap pl-1 pr-1 pointer-events-none select-none">
                {cat}
            </span>

            {/* Divisor Visual */}
            <div className="w-px h-4 bg-neutral-200 shrink-0 mx-0.5"></div>
            
            {/* 3. Acciones */}
            <div className="flex items-center gap-1 shrink-0">
                {/* Botón de Compartir Pasillo */}
                <button 
                    onClick={() => onShare(cat)}
                    className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors active:scale-95"
                    title="Copiar enlace directo de esta categoría"
                >
                    <Share2 size={13} strokeWidth={2.5}/>
                </button>

                {/* Gatillo de Arrastre con bloqueo dinámico si hay búsqueda activa */}
                <div 
                    onPointerDown={(e) => !isDragDisabled && controls.start(e)}
                    style={{ touchAction: 'none' }}
                    className={`p-1.5 rounded-full transition-colors ${
                        isDragDisabled 
                            ? 'text-neutral-200 cursor-not-allowed opacity-40' 
                            : 'text-neutral-400 hover:text-neutral-900 cursor-grab active:cursor-grabbing'
                    }`}
                    title={isDragDisabled ? "Limpia el buscador para ordenar" : "Arrastrar"}
                >
                    <GripVertical size={14} />
                </div>
            </div>
        </Reorder.Item>
    )
}
export default function CategorySorter({ storeId, initialOrder = [] }: { storeId: string, initialOrder?: string[] }) {
    const [categories, setCategories] = useState<string[]>([])
    const [storeSlug, setStoreSlug] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isInfoOpen, setIsInfoOpen] = useState(false)

    // 🚀 NUEVO: Detector de Dispositivo
    const [isMobile, setIsMobile] = useState(false)

      // 🚀 NUEVO: Almacena la categoría que tiene el menú numérico abierto actualmente
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null) 

    const supabase = getSupabase()
    
    const groupRef = useRef<HTMLUListElement>(null)
    const scrollInterval = useRef<NodeJS.Timeout | null>(null)
    const scrollSpeed = useRef<number>(0)
    const maxScrollLimit = useRef<number>(0)

    // Sincronizamos la detección de móvil en el cliente de forma segura contra hidratación
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const checkMobile = () => setIsMobile(window.innerWidth < 768);
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        }
    }, []);

    // 🚀 NUEVA FUNCIÓN: Reordenamiento Numérico de Posición para Móvil
    const handleMobilePositionChange = (currentIndex: number, newPositionStr: string) => {
        const newPos = parseInt(newPositionStr, 10);
        if (isNaN(newPos) || newPos < 1 || newPos > categories.length) return;
        
        const targetIndex = newPos - 1;
        if (currentIndex === targetIndex) return;

        const newList = [...categories];
        const [movedItem] = newList.splice(currentIndex, 1);
        newList.splice(targetIndex, 0, movedItem);
        
        setCategories(newList);
        setIsDirty(true);
    };

    // ... (Conserva tu useEffect loadCategories y las demás funciones igual) ...
 // Modifica tu useEffect de carga inicial removiendo el localStorage de la fase anterior:
    useEffect(() => {
        const loadCategories = async () => {
            const { data: storeData } = await supabase.from('stores').select('slug').eq('id', storeId).single()
            if (storeData) setStoreSlug(storeData.slug)

            const { data: products } = await supabase.from('products').select('category').eq('store_id', storeId)
            if (products) {
                const rawCategories = products.map((p: any) => {
                    const trimmed = (p.category || '').trim().toLowerCase()
                    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
                }).filter(Boolean) as string[]

                const uniqueCats: string[] = Array.from(new Set(rawCategories))
                
                const sorted: string[] = [...uniqueCats].sort((a: string, b: string) => {
                    const idxA = initialOrder.indexOf(a)
                    const idxB = initialOrder.indexOf(b)
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB
                    if (idxA !== -1) return -1
                    if (idxB !== -1) return 1
                    return a.localeCompare(b)
                })
                
                setCategories(sorted)
            }
            setLoading(false)
        }
        loadCategories()
    }, [storeId, supabase, initialOrder])

    useEffect(() => {
        return () => {
            if (scrollInterval.current) clearInterval(scrollInterval.current)
        }
    }, [])
       
    const handleReorder = (newOrder: string[]) => {
        setCategories(newOrder)
        setIsDirty(true)
    }

    // 🚀 NUEVA FUNCIÓN: Al iniciar el arrastre, congelamos el límite real de scroll de la caja
    const handleDragStart = () => {
        const el = groupRef.current
        if (el) {
            // Congelamos el límite estático real del contenedor
            maxScrollLimit.current = el.scrollWidth - el.clientWidth
        }
    }

    // MOTOR DE FISICAS DE SCROLL DESACOPLADO
    const handleDragActive = (pointerX: number) => {
        const container = groupRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()
        const threshold = 70 // Rango de proximidad en píxeles al borde

        const leftBoundary = rect.left + threshold
        const rightBoundary = rect.right - threshold

        let targetSpeed = 0

        if (pointerX > rightBoundary) {
            targetSpeed = Math.min(18, (pointerX - rightBoundary) / 1.5)
        } else if (pointerX < leftBoundary) {
            targetSpeed = -Math.min(18, (leftBoundary - pointerX) / 1.5)
        }

        scrollSpeed.current = targetSpeed

        // Si hay velocidad y el bucle de scroll NO está corriendo, lo iniciamos una sola vez
        if (targetSpeed !== 0 && !scrollInterval.current) {
            scrollInterval.current = setInterval(() => {
                const el = groupRef.current
                if (el) {
                    const currentScroll = el.scrollLeft
                    const targetScroll = currentScroll + scrollSpeed.current
                    
                    // 1. Límite de Pared Virtual Izquierda (Detiene el scroll si llega a 0)
                    if (scrollSpeed.current < 0 && currentScroll <= 0) {
                        scrollSpeed.current = 0
                        if (scrollInterval.current) {
                            clearInterval(scrollInterval.current)
                            scrollInterval.current = null
                        }
                        return
                    }

                    // 2. Límite de Pared Virtual Derecha (Comparamos contra el límite estático congelado al inicio)
                    if (scrollSpeed.current > 0 && currentScroll >= maxScrollLimit.current - 5) {
                        scrollSpeed.current = 0
                        if (scrollInterval.current) {
                            clearInterval(scrollInterval.current)
                            scrollInterval.current = null
                        }
                        return
                    }

                    el.scrollLeft = targetScroll
                }
            }, 16) // Ticks fijos a ~60 FPS
        } else if (targetSpeed === 0 && scrollInterval.current) {
            clearInterval(scrollInterval.current)
            scrollInterval.current = null
        }
    }

     // 🚀 NUEVO: Filtrado en tiempo real para el buscador
    const filteredCategories = categories.filter(cat => 
        cat.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDragEnd = () => {
        scrollSpeed.current = 0
        if (scrollInterval.current) {
            clearInterval(scrollInterval.current)
            scrollInterval.current = null
        }
    }

    const sharePasillo = (categoryName: string) => {
        const isLocalhost = typeof window !== 'undefined' && 
            (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
        
        const baseUrl = isLocalhost 
            ? `http://localhost:3000/${storeSlug}` 
            : `https://${storeSlug}.preziso.shop`;

        const url = `${baseUrl}?pasillo=${encodeURIComponent(categoryName.toLowerCase())}`;
        const text = `Te preparé este pasillo virtual exclusivo con todas nuestras opciones de *${categoryName}*. Puedes explorarlo y hacer tu pedido directamente aquí si lo deseas:\n\n${url} ✨`;
        
        navigator.clipboard.writeText(text);
        
        const Toast = Swal.mixin({ 
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, 
            customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold' } 
        });
        Toast.fire({ icon: 'success', title: 'Pasillo Copiado', text: 'Listo para pegar en WhatsApp' });
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase.from('stores').update({ categories_order: categories }).eq('id', storeId)
        
        if (!error) await revalidateStoreCache() 
        
        setSaving(false)
        
        if (error) {
            Swal.fire({ title: 'Error', text: 'No se pudo guardar la alineación.', icon: 'error', confirmButtonColor: '#171717', customClass: { popup: 'rounded-xl font-sans text-xs' }})
        } else {
            setIsDirty(false)
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } })
            Toast.fire({ icon: 'success', title: 'Orden guardado con éxito' })
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-neutral-300" size={20} /></div>
    if (categories.length <= 1) return null 

    return (
        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] w-full space-y-6">
            
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-neutral-900">
                        <ListOrdered size={18} className="text-neutral-500" />
                        <h3 className="text-base font-bold tracking-tight">Estructura del Catálogo</h3>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm leading-relaxed">
                        Organiza visualmente cómo se despliegan tus categorías.
                    </p>
                </div>
                
                {isDirty && (
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="bg-neutral-950 hover:bg-black text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs flex gap-1.5 items-center justify-center transition-all shrink-0 active:scale-[0.98] animate-in fade-in"
                    >
                        {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} 
                        <span>Guardar Cambios</span>
                    </button>
                )}
            </div>

       

           {/* 🚀 ACORDEÓN DE AYUDA Y CONSEJOS (ADAPTATIVO MÓVIL/DESKTOP) */}
            <div className="space-y-1 animate-in fade-in">
                <button
                    type="button"
                    onClick={() => setIsInfoOpen(!isInfoOpen)}
                    className="w-full flex items-center justify-between py-2.5 px-4 bg-neutral-50/60 hover:bg-neutral-100/50 border border-neutral-200/50 rounded-xl text-neutral-800 hover:text-neutral-950 transition-all text-left group"
                >
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-neutral-500 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Ayuda & Consejos de Uso</span>
                    </div>
                    <motion.div
                        animate={{ rotate: isInfoOpen ? 45 : 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="text-neutral-400 group-hover:text-neutral-900 shrink-0"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                    </motion.div>
                </button>

                <motion.div
                    initial={false}
                    animate={{ height: isInfoOpen ? "auto" : 0, opacity: isInfoOpen ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    className="overflow-hidden"
                >
                    <div className="p-4 text-[11px] text-neutral-600 leading-relaxed space-y-2.5 border-x border-b border-neutral-200/40 rounded-b-xl bg-neutral-50/30">
                        {isMobile ? (
                            // 📱 INSTRUCCIONES CLARAS PARA MÓVIL (Rueda de Selección)
                            <>
                                <p>
                                    <strong className="text-neutral-900 font-bold">Cómo organizar:</strong> Toca el número a la izquierda de la categoría (ej: <span className="font-bold font-mono">#4</span>) y elige su nueva posición en la lista. Se reordenará automáticamente [1].
                                </p>
                                <p>
                                    <strong className="text-neutral-900 font-bold">Cómo afecta a la tienda:</strong> El orden de <strong>arriba hacia abajo (1, 2, 3...)</strong> determinará la prioridad de tus pestañas de <strong>izquierda a derecha</strong> en tu catálogo público.
                                </p>
                            </>
                        ) : (
                            // 💻 INSTRUCCIONES CLARAS PARA ESCRITORIO (Drag & Drop Horizontal)
                            <>
                                <p>
                                    <strong className="text-neutral-900 font-bold">Cómo organizar:</strong> Desplázate horizontalmente por la lista. Mantén presionado el ícono de los puntos (<GripVertical size={11} className="inline text-neutral-500"/>) para arrastrar la pastilla a la izquierda o derecha.
                                </p>
                                <p>
                                    <strong className="text-neutral-900 font-bold">Cómo afecta a la tienda:</strong> El orden de <strong>izquierda a derecha (1, 2, 3...)</strong> determinará exactamente cómo aparecerán las pestañas en tu catálogo público.
                                </p>
                            </>
                        )}
                        
                        {/* Explicación común para el botón de compartir */}
                        <p className="pt-1.5 border-t border-neutral-200/40">
                            <strong className="text-neutral-900 font-bold">Compartir pasillo (<Share2 size={11} className="inline text-emerald-500"/>):</strong> Copia un link directo de esta categoría. Es ideal para tus historias de Instagram o chats de WhatsApp.
                        </p>
                    </div>
                </motion.div>
            </div>
              {/* 🚀 BUSCADOR DE CATEGORÍAS CON SUGERENCIAS DE ATRAJO RÁPIDO */}
            <div className="space-y-2">
                <div className="relative group w-full shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors" size={15} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar entre tus categorías..."
                        className="w-full bg-neutral-50 focus:bg-white border border-transparent focus:border-neutral-900 rounded-lg pl-11 pr-4 py-2.5 text-xs font-medium text-neutral-800 placeholder:text-neutral-400 outline-none transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-950 text-xs font-bold"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                {/* 🚀 pastillas de sugerencias dinámicas (Toma las primeras 6 de la lista actual) */}
                {categories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 select-none animate-in fade-in duration-300">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mr-1">
                            Sugerencias:
                        </span>
                        {categories.slice(0, 6).map((sug) => {
                            const isSelected = searchQuery === sug;
                            return (
                                <button
                                    key={sug}
                                    type="button"
                                    onClick={() => setSearchQuery(isSelected ? '' : sug)} // 👈 Alternancia inteligente (Toggles on/off)
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
                                        isSelected
                                            ? 'bg-neutral-950 border-neutral-950 text-white font-black'
                                            : 'bg-neutral-50 border-neutral-200/60 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                                    }`}
                                >
                                    {sug}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
          {/* 🚀 CONTENEDOR ADAPTATIVO (MÓVIL POR SELECTOR / DESKTOP POR ARRASTRE) */}
            <div className="bg-neutral-50/50 p-4 md:p-6 rounded-xl border border-neutral-100  relative">
                {filteredCategories.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-2">No se encontraron categorías con esa búsqueda.</p>
                ) : isMobile ? (
                    
                    // 🚀 VISTA MÓVIL: Lista Vertical con Rueda de Selección de Posición
                    <div className="space-y-2.5 animate-in fade-in">
                       {filteredCategories.map((cat) => {
                    const originalIdx = categories.indexOf(cat);
                    const isDropdownOpen = activeDropdown === cat; // Evalúa si este menú está abierto
                    
                    return (
                        <div 
                            key={cat}
                            className="flex items-center justify-between bg-white p-3 rounded-lg border border-neutral-200/50 "
                        >
                            <div className="flex items-center gap-3">
                                
                                {/* 🚀 SELECTOR PERSONALIZADO "SIMPLEMENTE BLANCO" (CERO DIÁLOGOS NATIVOS) */}
                                <div className="relative shrink-0">
                                    {/* Botón Gatillo */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveDropdown(isDropdownOpen ? null : cat);
                                        }}
                                        className="w-12 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-800 font-mono active:scale-95 transition-all cursor-pointer  hover:border-neutral-900"
                                    >
                                        <span>#{originalIdx + 1}</span>
                                    </button>

                                    {/* Menú Flotante Desplegable */}
                                    <AnimatePresence>
                                        {isDropdownOpen && (
                                            <>
                                                {/* Capa invisible para cerrar al tocar afuera de la pastilla */}
                                                <div 
                                                    className="fixed inset-0 z-30 cursor-default" 
                                                    onClick={() => setActiveDropdown(null)} 
                                                />
                                                
                                                <motion.div
                                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                    className="absolute left-0 mt-1 w-14 bg-white border border-neutral-100 shadow-[0_10px_25px_rgba(0,0,0,0.08)] rounded-lg overflow-hidden max-h-60 overflow-y-auto no-scrollbar z-40"
                                                >
                                                    {categories.map((_, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => {
                                                                handleMobilePositionChange(originalIdx, (i + 1).toString());
                                                                setActiveDropdown(null);
                                                            }}
                                                            className={`w-full py-2 text-center font-mono font-bold text-xs transition-colors cursor-pointer ${
                                                                originalIdx === i 
                                                                    ? 'bg-neutral-950 text-white' 
                                                                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 bg-white'
                                                            }`}
                                                        >
                                                            #{i + 1}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <span className="font-semibold text-xs text-neutral-800">{cat}</span>
                            </div>
                            
                            {/* Botón de Compartir Pasillo */}
                            <button 
                                onClick={() => sharePasillo(cat)}
                                className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/50 text-emerald-600 hover:bg-emerald-100 transition-all shadow-xs active:scale-[0.97]"
                            >
                                <Share2 size={13} strokeWidth={2.5}/>
                            </button>
                        </div>
                    );
                })}
                    </div>
                ) : (
                    
                    // 🚀 VISTA DESKTOP: Arrastre Horizontal de Alta Gama (Eje X)
                    <Reorder.Group 
                        ref={groupRef}
                        axis="x" 
                        values={categories} 
                        onReorder={handleReorder} 
                        className="flex items-center gap-3 overflow-x-auto pb-5 pt-2 custom-horizontal-scrollbar animate-in fade-in"
                    >
                        {filteredCategories.map((cat) => {
                            const originalIdx = categories.indexOf(cat);
                            return (
                                <SortableCategoryItem 
                                    key={cat} 
                                    cat={cat} 
                                    idx={originalIdx} 
                                    onShare={sharePasillo} 
                                    onDrag={handleDragActive}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    isDragDisabled={searchQuery !== ''}
                                />
                            );
                        })}
                    </Reorder.Group>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-horizontal-scrollbar::-webkit-scrollbar {
                    height: 5px;
                    display: block !important;
                }
                .custom-horizontal-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 9999px;
                }
                .custom-horizontal-scrollbar::-webkit-scrollbar-thumb {
                    background: #d4d4d4;
                    border-radius: 9999px;
                    transition: background 0.3s;
                }
                .custom-horizontal-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #171717;
                }
            `}} />

        </section>
    )

}