'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle, Instagram, Download, Copy, Check, Clock, Sparkles } from 'lucide-react'

interface CampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: string;
    storeSlug: string;
    themeColor: string;
}

export default function CampaignShareModal({ isOpen, onClose, category, storeSlug, themeColor }: CampaignModalProps) {
    const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram'>('whatsapp')
    const [copied, setCopied] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Generador de Enlaces Dinámicos
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
    const baseUrl = isLocalhost ? `http://localhost:3000/${storeSlug}` : `https://${storeSlug}.preziso.shop`;
    
    // Link Normal (WhatsApp)
    const normalLink = `${baseUrl}?pasillo=${encodeURIComponent(category.toLowerCase())}`;
    const normalText = `¡Hola! 👋 Preparé este pasillo virtual exclusivo con todas nuestras opciones de *${category}*. Míralos y haz tu pedido directamente aquí:\n\n${normalLink} ✨`;

    // Link Flash (Instagram) con UTMs
    const expTimestamp = Date.now() + (24 * 60 * 60 * 1000);
    const flashLink = `${baseUrl}?pasillo=${encodeURIComponent(category.toLowerCase())}&exp=${expTimestamp}&utm_source=instagram&utm_medium=story`;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // GENERADOR DE ASSETS VISUALES (CANVAS HTML5)
    useEffect(() => {
        if (activeTab !== 'instagram' || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 1080;
        canvas.height = 1920;

        ctx.fillStyle = themeColor || '#000000';
        ctx.fillRect(0, 0, 1080, 1920);

        const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
        gradient.addColorStop(0, 'rgba(0,0,0,0.15)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1920);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 45px sans-serif';
        ctx.letterSpacing = "5px";
        ctx.fillText('⏳ ACCESO VIP 24H', 540, 600);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 140px sans-serif';
        ctx.letterSpacing = "-2px";
        const displayName = category.length > 15 ? category.substring(0, 15) + '...' : category;
        ctx.fillText(displayName.toUpperCase(), 540, 800);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '500 45px sans-serif';
        ctx.letterSpacing = "0px";
        ctx.fillText('Colección exclusiva liberada', 540, 950);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(240, 1400, 600, 130, 65);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 45px sans-serif';
        ctx.fillText('TOCA AQUÍ PARA ENTRAR', 540, 1465);

    }, [activeTab, category, themeColor]);

    const downloadAsset = () => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = `Campaña_${category.replace(/\s+/g, '_')}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs" 
                    />
                    
                    {/* Modal Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98, y: 10 }} 
                        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }} 
                        exit={{ opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.2 } }}
                        className="relative bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] border border-neutral-200/50 flex flex-col max-h-[90vh] z-10"
                    >
                        {/* HEADER CLEANLOOK */}
                        <div className="px-6 py-5 md:px-8 border-b border-neutral-200/50 flex justify-between items-center bg-neutral-50/50 shrink-0">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Sparkles size={14} className="text-emerald-500" />
                                    <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Lanzar Campaña</h2>
                                </div>
                                <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                                    Colección: <strong className="text-neutral-900 font-bold">{category}</strong>
                                </p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-1.5 bg-white hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors border border-neutral-200/50 shadow-xs active:scale-[0.98]"
                            >
                                <X size={14} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* CONTROL SEGMENTADO */}
                        <div className="px-6 md:px-8 pt-6 pb-2 bg-white">
                            <div className="flex p-1 bg-neutral-100/50 rounded-lg border border-neutral-200/50 relative">
                                <div 
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-xs border border-neutral-200/50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${activeTab === 'whatsapp' ? 'translate-x-0' : 'translate-x-full'}`}
                                />
                                
                                <button 
                                    onClick={() => setActiveTab('whatsapp')} 
                                    className={`relative z-10 flex-1 py-2 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors duration-300 ${activeTab === 'whatsapp' ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                                >
                                    <MessageCircle size={14} strokeWidth={2} /> WhatsApp (1 a 1)
                                </button>
                                <button 
                                    onClick={() => setActiveTab('instagram')} 
                                    className={`relative z-10 flex-1 py-2 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors duration-300 ${activeTab === 'instagram' ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                                >
                                    <Instagram size={14} strokeWidth={2} /> Historias (Masiva)
                                </button>
                            </div>
                        </div>

                        {/* CONTENIDO DINÁMICO */}
                        <div className="p-6 md:p-8 bg-white flex-1 overflow-y-auto no-scrollbar">
                            <AnimatePresence mode="wait">
                                {activeTab === 'whatsapp' ? (
                                    <motion.div 
                                        key="wa"
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                                        className="space-y-5"
                                    >
                                        <div className="bg-blue-50 border border-blue-100/40 p-3.5 rounded-lg flex gap-3 items-start">
                                            <MessageCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                                                <strong className="font-bold text-blue-900">Ideal para atención al cliente.</strong> Copie este mensaje cuando le pregunten por esta categoría. Los enviará a un pasillo limpio sin distracciones.
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <div className="bg-neutral-50/50 p-4.5 rounded-xl rounded-tl-sm border border-neutral-200/50 shadow-sm font-mono text-xs text-neutral-600 whitespace-pre-wrap leading-relaxed">
                                                {normalText}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleCopy(normalText)} 
                                            className="w-full bg-neutral-950 hover:bg-black text-white py-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs"
                                        >
                                            {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>} 
                                            {copied ? 'Mensaje copiado' : 'Copiar Mensaje'}
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="ig"
                                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                                        className="flex flex-col md:flex-row gap-8"
                                    >
                                        <div className="flex-1 space-y-5 flex flex-col justify-center">
                                            <div className="bg-emerald-50 border border-emerald-100/40 p-3.5 rounded-lg flex gap-3 items-start">
                                                <Clock size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                                                    <strong className="font-bold text-emerald-900">Genere Urgencia (FOMO).</strong> Este link incluye un reloj de 24 horas, ordena el stock crítico primero y rastrea las visitas desde Instagram.
                                                </p>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                                                    Enlace para su Sticker de Instagram
                                                </label>
                                                <div className="flex bg-neutral-50/50 border border-neutral-200/50 rounded-lg p-1 shadow-sm transition-colors focus-within:border-neutral-400 focus-within:bg-white">
                                                    <input 
                                                        readOnly 
                                                        value={flashLink} 
                                                        className="flex-1 bg-transparent px-3 py-1.5 text-[10px] font-mono text-neutral-600 outline-none truncate" 
                                                    />
                                                    <button 
                                                        onClick={() => handleCopy(flashLink)} 
                                                        className="px-3 bg-white hover:bg-neutral-100 border border-neutral-200/50 text-neutral-600 rounded-md transition-colors flex items-center justify-center active:scale-95 shadow-xs"
                                                        title="Copiar Enlace"
                                                    >
                                                        {copied ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                                                    </button>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={downloadAsset} 
                                                className="w-full bg-neutral-950 hover:bg-black text-white py-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs mt-2"
                                            >
                                                <Download size={14}/> Descargar Imagen
                                            </button>
                                        </div>
                                        
                                        {/* MOCKUP DE TELÉFONO PARA EL CANVAS */}
                                        <div className="w-40 shrink-0 mx-auto md:mx-0 flex flex-col items-center">
                                            <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">Vista Previa</span>
                                            <div className="w-full aspect-[9/16] bg-neutral-950 rounded-3xl p-1.5 shadow-lg border border-neutral-800 relative">
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-neutral-950 rounded-b-lg z-20"></div>
                                                <canvas 
                                                    ref={canvasRef} 
                                                    className="w-full h-full rounded-[1.25rem] object-cover bg-neutral-900" 
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}