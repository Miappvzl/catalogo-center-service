'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Save, Loader2, Palette, MonitorSmartphone, RotateCcw, LayoutTemplate, Type, MousePointerClick, ExternalLink, Info } from 'lucide-react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-client'
import Swal from 'sweetalert2'

// 🚀 MASTER SYSTEM: 7 Variables Base de Arquitectura
const DEFAULT_CONFIG = {
    template_id: 'classic',
    colors: {
        primary: '#000000',
        primary_text: '#ffffff',
        background: '#ffffff',
        text_main: '#111111',
        surface: '#ffffff',
        surface_text: '#6b7280',
        border: '#d5d6d7b3',
        incentive: '#059669' // 🚀 NUEVO: Color de conversión
    }
}

// 🎨 MICRO-COMPONENTE (Ahora fuera de la función principal para no perder el foco)
const ColorInputRow = ({ label, valueKey, value, description, onChange }: { label: string, valueKey: string, value: string, description?: string, onChange: (k: string, v: string) => void }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors bg-white">
        <div className="flex flex-col">
            <p className="font-bold text-sm text-gray-900">{label}</p>
            {description ? (
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight pr-4">{description}</p>
            ) : (
                <p className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase">{value}</p>
            )}
        </div>
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 shadow-sm shrink-0 cursor-pointer group">
            <div className="absolute inset-0 ring-inset ring-1 ring-black/10 rounded-full pointer-events-none z-10"></div>
            <input type="color" value={value} onChange={(e) => onChange(valueKey, e.target.value)} className="absolute -inset-2 w-14 h-14 cursor-pointer scale-150 group-hover:scale-110 transition-transform" />
        </div>
    </div>
)

export default function CustomizationPage() {
    const supabase = getSupabase()
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storeData, setStoreData] = useState<any>(null)

    const [config, setConfig] = useState<any>(DEFAULT_CONFIG)
    const [originalConfig, setOriginalConfig] = useState<any>(DEFAULT_CONFIG)
    const [activeTab, setActiveTab] = useState('colors')

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: store } = await supabase.from('stores').select('id, name, slug, theme_config').eq('user_id', user.id).single()
                if (store) {
                    setStoreData(store)

                    // 🛡️ DEEP MERGE (Retrocompatibilidad): Mezcla configuración vieja con nuevas variables
                    const dbConfig = store.theme_config || {}
                    const loadedConfig = {
                        ...DEFAULT_CONFIG,
                        ...dbConfig,
                        colors: {
                            ...DEFAULT_CONFIG.colors,
                            ...(dbConfig.colors || {})
                        }
                    }

                    setConfig(loadedConfig)
                    setOriginalConfig(loadedConfig)
                }
            }
            setLoading(false)
        }
        initData()
    }, [supabase])

    // 🚀 EL TÚNEL DE DATOS: Inyectar colores al Iframe en Tiempo Real
    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow && !loading) {
            try {
                iframeRef.current.contentWindow.postMessage({
                    type: 'UPDATE_THEME',
                    config: config
                }, '*'); 
            } catch (error) {
                // Silenciamos el error de CORS si el iframe colapsó por falta de internet/DNS
                console.warn("El iframe aún no está listo o falló su carga en red.");
            }
        }
    }, [config, loading]);

    const handleColorChange = (key: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, colors: { ...prev.colors, [key]: value } }))
    }

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig)
    const handleDiscard = () => setConfig(originalConfig)

    // 🚀 NUEVO: Función para restablecer al tema por defecto con confirmación
    const handleResetToDefault = () => {
        Swal.fire({
            title: '¿Restablecer diseño?',
            text: 'Esto devolverá todos los colores a su estado original (blanco y negro). No se publicará hasta que presiones "Publicar".',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#000',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, restablecer',
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-[var(--radius-card)]' }
        }).then((result) => {
            if (result.isConfirmed) {
                // Al setear el default, el Iframe se actualiza en tiempo real automáticamente
                setConfig(DEFAULT_CONFIG)
            }
        })
    }

    const handleSave = async () => {
        if (!storeData?.id) return
        setSaving(true)
        try {
            const { error } = await supabase.from('stores').update({ theme_config: config }).eq('id', storeData.id)
            if (error) throw error
            setOriginalConfig(config)
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'rounded-xl text-xs font-bold bg-black text-white' } })
            Toast.fire({ icon: 'success', title: 'Diseño Publicado' })
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el diseño.', confirmButtonColor: '#000', customClass: { popup: 'rounded-[var(--radius-card)]' } })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
// 🚀 BLINDAJE DE URL Y ENTORNO
    const getBaseDomain = () => {
        if (typeof window === 'undefined') return 'preziso.shop';
        if (window.location.hostname.includes('localhost')) return window.location.host;
        // Obligamos a que en producción siempre sea el dominio raíz
        return 'preziso.shop'; 
    }
    
    const previewUrl = storeData ? `${window.location.protocol}//${storeData.slug}.${getBaseDomain()}?mode=preview` : '';



    return (
        <div className="min-h-screen bg-[#F6F6F6] flex flex-col font-sans overflow-hidden">
            {/* HEADER DE CONTROL */}
            <header className="bg-white px-5 md:px-8 py-4 flex justify-between items-center border-b border-gray-100 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors group">
                        <ArrowLeft size={18} className="text-gray-500 group-hover:text-black" />
                    </Link>
                    <div>
                        <h1 className="font-black text-xl tracking-tight text-gray-900 leading-none">Diseño de Tienda</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Personaliza tu marca</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <button onClick={handleDiscard} disabled={saving} className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                            <RotateCcw size={14} /> Descartar
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 shadow-lg shadow-black/10"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Publicar
                    </button>
                </div>
            </header>

            {/* SPLIT SCREEN ARCHITECTURE */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-[calc(100vh-73px)]">

                {/* PANEL IZQUIERDO: CONTROLES */}
                <div className="w-full lg:w-[400px] xl:w-[450px] bg-[#F8F9FA] border-r border-gray-100 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                    <div className="flex p-2 border-b border-gray-100 shrink-0 bg-white">
                        {[
                            { id: 'colors', icon: Palette, label: 'Colores' },
                            { id: 'typography', icon: Type, label: 'Fuentes' },
                            { id: 'layout', icon: LayoutTemplate, label: 'Bloques' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === tab.id ? 'bg-gray-50 text-black shadow-sm border border-gray-100' : 'text-gray-400 hover:bg-gray-50/50 hover:text-gray-600 border border-transparent'}`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 md:p-6 no-scrollbar">
                        {activeTab === 'colors' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-2 pb-10">

                                <div className='border-b pb-8 border-b-gray-200 gap-2  m-0 flex-col justify-between flex'>
                                    <div className='w-3px h-auto m-4 mb-0 ml-2'><span className='text-sm font-black tracking-widest leading-none text-gray-900 border-transparent rounded-2xl w-auto h-auto'>BLOQUE 1</span></div>
                                    <ColorInputRow label="Color Principal" valueKey="primary" value={config.colors.primary} description="Botones de compra y acentos." onChange={handleColorChange} />
                                    <ColorInputRow label="Texto sobre Principal" valueKey="primary_text" value={config.colors.primary_text} description="Para contrastar con el botón principal." onChange={handleColorChange} />
                                </div>

                                <div className='border-b pb-8 border-b-gray-200 gap-2  m-0 flex-col justify-between flex'>
                                    <div className='w-3px h-auto m-4 mb-0 ml-2'><span className='text-sm font-black tracking-widest leading-none text-gray-900 border-transparent rounded-2xl w-auto h-auto'>BLOQUE 2</span></div>
                                    <ColorInputRow label="Fondo de Tienda" valueKey="background" value={config.colors.background} description="El color de fondo de toda la página." onChange={handleColorChange} />
                                    <ColorInputRow label="Texto Principal" valueKey="text_main" value={config.colors.text_main} description="Títulos, precios y nombres de productos." onChange={handleColorChange} />
                                </div>

                                <div className='border-b pb-8 border-b-gray-200 gap-2  m-0 flex-col justify-between flex'>
                                    <div className='w-3px h-auto m-4 mb-0 ml-2'><span className='text-sm font-black tracking-widest leading-none text-gray-900 border-transparent rounded-2xl w-auto h-auto'>BLOQUE 3</span></div>
                                    <ColorInputRow label="Color de Cajas" valueKey="surface" value={config.colors.surface} description="Fondo de tarjetas, modales y menú." onChange={handleColorChange} />
                                    <ColorInputRow label="Textos Secundarios" valueKey="surface_text" value={config.colors.surface_text} description="Descripciones y subtítulos." onChange={handleColorChange} />
                                    <ColorInputRow label="Líneas Divisorias" valueKey="border" value={config.colors.border} description="Bordes de tarjetas e inputs." onChange={handleColorChange} />
                                </div>

                                {/* BLOQUE 4: CONVERSIÓN Y AHORRO */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3 mt-8">
                                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none">Conversión</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <ColorInputRow
                                            label="Incentivos y Ahorro"
                                            valueKey="incentive"
                                            value={config.colors.incentive}
                                            description="Color de los textos de ahorro en divisas y checkmarks de éxito."
                                            onChange={handleColorChange}
                                        />
                                    </div>
                                </div>

                                {/* 🚀 NUEVO: BOTÓN DE RESTABLECER POR DEFECTO */}
                                <div className="pt-8 mt-4 border-t border-gray-200 flex justify-center">
                                    <button
                                        onClick={handleResetToDefault}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                                    >
                                        <RotateCcw size={16} />
                                        Restablecer colores por defecto
                                    </button>
                                </div>

                            </div>
                        )}

                        {activeTab !== 'colors' && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                <MousePointerClick size={32} className="mb-4 text-gray-400" />
                                <p className="font-bold text-sm">Próximamente</p>
                                <p className="text-xs text-gray-500 mt-1">Estamos desarrollando este módulo.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PANEL DERECHO: LIVE PREVIEW (EL IFRAME REAL) */}
                <div className="flex-1 bg-[#EAEAEA] p-4 md:p-8 relative flex flex-col items-center justify-center">
                    <div className="absolute top-4 right-8 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 z-10 hidden lg:flex">
                        <MonitorSmartphone size={14} className="text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Previsualización Real (Móvil)</span>
                    </div>

                    <div className="w-full max-w-[400px] h-[800px] max-h-full rounded-[40px] overflow-hidden no-scrollbar shadow-2xl border-[8px] border-white relative bg-[#F6F6F6] ring-1 ring-black/5 no-scrollbar [scrollbar-gutter:auto] [&::-webkit-scrollbar]:hidden">
                        {previewUrl ? (
                            <iframe
                                ref={iframeRef}
                                src={previewUrl}
                                className="w-full h-full border-none bg-transparent"
                                title="Previsualización de Tienda"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <Loader2 size={32} className="animate-spin mb-4" />
                                <p className="text-sm font-bold">Cargando motor gráfico...</p>
                            </div>
                        )}
                    </div>

                    {storeData && (
                        <a href={`//${storeData.slug}.${window.location.host.replace('www.', '')}`} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black transition-colors">
                            Ver tienda en vivo <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}