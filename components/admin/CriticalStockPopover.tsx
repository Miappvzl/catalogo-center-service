"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { X, Copy, ShoppingBag, ChefHat, Check, Loader2, ExternalLink, AlertOctagon } from "lucide-react";
import { NumberInput } from "../NumberInput";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface VariantWithProduct {
    id: string;
    size: string | null;
    color_name: string | null;
    stock: number;
    variant_image: string | null;
    products: any; // Tipado flexible para soportar tanto Objeto como Array de Supabase
}

interface PopoverProps {
    storeId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CriticalStockPopover({ storeId, isOpen, onClose }: PopoverProps) {
    const [variants, setVariants] = useState<VariantWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [queryError, setQueryError] = useState<string | null>(null); // Diagnóstico visual de errores
    const [mode, setMode] = useState<"compra" | "produccion">("compra");
    const [targetStock, setTargetStock] = useState<number>(12);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const raf = requestAnimationFrame(() => setAnimate(true));
            return () => cancelAnimationFrame(raf);
        } else {
            setAnimate(false);
        }
    }, [isOpen]);

    useEffect(() => {
        async function fetchCriticalStock() {
            try {
                setLoading(true);
                setQueryError(null);

                // Consulta blindada sin espacios y libre de ambigüedades en ordenamiento
                const { data, error } = await supabase
                    .from("product_variants")
                    .select("id,size,color_name,stock,variant_image,products!inner(id,name,image_url,store_id)")
                    .eq("products.store_id", storeId)
                    .lte("stock", 3);

                if (error) {
                    setQueryError(error.message);
                    return;
                }

                const fetchedVariants = (data as unknown as VariantWithProduct[]) || [];
                setVariants(fetchedVariants);
                setSelectedIds(new Set(fetchedVariants.map((v) => v.id)));
            } catch (err: any) {
                console.error("Error cargando stock crítico:", err);
                setQueryError(err.message || "Error desconocido de red.");
            } finally {
                setLoading(false);
            }
        }

        if (isOpen) {
            fetchCriticalStock();
        }
    }, [isOpen, storeId]);

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const toggleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedIds.size === variants.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(variants.map((v) => v.id)));
        }
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const selectedVariants = variants.filter((v) => selectedIds.has(v.id));
        if (selectedVariants.length === 0) return;

        let outputText = "";
        const dateStr = new Date().toLocaleDateString("es-VE", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

        if (mode === "compra") {
            outputText = `📦 *SOLICITUD DE REPOSICIÓN (COMPRA)*\n`;
            outputText += `📅 Fecha: ${dateStr}\n`;
            outputText += `===================================\n\n`;
            selectedVariants.forEach((v, index) => {
                const productData = Array.isArray(v.products) ? v.products[0] : v.products;
                const name = productData?.name || "Producto";
                const variantInfo = [v.size, v.color_name].filter(Boolean).join(" / ");
                const attr = variantInfo ? ` [${variantInfo}]` : "";
                outputText += `${index + 1}. *${name}*${attr}\n`;
                outputText += `   • Stock actual: ${v.stock} un.\n`;
                outputText += `   • *Pedir Mínimo:* ${Math.max(0, targetStock - v.stock)} un. (Meta: ${targetStock})\n\n`;
            });
        } else {
            outputText = `🍳 *HOJA DE TRABAJO (PRODUCCIÓN INTERNA)*\n`;
            outputText += `📅 Fecha: ${dateStr}\n`;
            outputText += `===================================\n\n`;
            selectedVariants.forEach((v) => {
                const productData = Array.isArray(v.products) ? v.products[0] : v.products;
                const name = productData?.name || "Producto";
                const variantInfo = [v.size, v.color_name].filter(Boolean).join(" / ");
                const attr = variantInfo ? ` [${variantInfo}]` : "";
                outputText += `[ ] *${name}*${attr}\n`;
                outputText += `    • Preparar Mínimo: *${Math.max(0, targetStock - v.stock)} un.* (Actual: ${v.stock} -> Meta: ${targetStock})\n\n`;
            });
        }

        outputText += `_Generado vía Preziso._`;
        navigator.clipboard.writeText(outputText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <>
            <div 
                className="fixed inset-0 z-40 bg-black/[0.015] cursor-default"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            {/* Popover Flotante Híbrido Mobile/Desktop */}
            <div
                onClick={(e) => e.stopPropagation()} // Evita cerrar la tarjeta al tocar dentro del modal
                className={`
                    fixed bottom-4 inset-x-4 max-h-[85vh] 
                    md:absolute md:bottom-auto md:top-12 md:right-12 md:inset-x-auto md:w-[460px] md:max-h-[640px]
                    bg-white border border-neutral-100 rounded-xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.1)]
                    flex flex-col z-50 overflow-hidden
                    transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                    md:origin-top-right
                    ${animate 
                        ? "opacity-100 translate-y-0 scale-100" 
                        : "opacity-0 translate-y-6 scale-95 pointer-events-none"
                    }
                `}
            >
                {/* Cabecera */}
                <div className="p-6 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900">Reposición Inteligente</h2>
                        <p className="text-[10px] font-semibold text-neutral-400 mt-0.5 uppercase tracking-wide">Panel de Ajuste Rápido</p>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="w-7 h-7 rounded-full bg-neutral-50 hover:bg-neutral-100 active:scale-90 transition-all flex items-center justify-center text-gray-500"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* 1. Estado de Carga */}
                {loading && (
                    <div className="flex-grow flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
                        <Loader2 className="animate-spin text-black" size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
                    </div>
                )}

                {/* 2. Consola de Diagnóstico Visual (Si hay error de Supabase/RLS) */}
                {!loading && queryError && (
                    <div className="p-6 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100">
                            <AlertOctagon size={18} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-red-600">Error de Base de Datos</p>
                        <p className="text-[10px] font-mono bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 max-w-[360px] break-all leading-relaxed">
                            {queryError}
                        </p>
                    </div>
                )}

                {/* 3. Estado Vacío Exitoso */}
                {!loading && !queryError && variants.length === 0 && (
                    <div className="p-8 py-16 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
                        <div className="w-10 h-10 bg-neutral-50 rounded-full flex items-center justify-center border border-neutral-100">
                            <Check size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-900">Todo en Orden</p>
                        <p className="text-[10px] text-gray-400 max-w-xs leading-normal">No hay alertas de stock en la zona crítica actual.</p>
                    </div>
                )}

                {/* 4. Renderizado Exitoso del Flujo Operativo */}
                {!loading && !queryError && variants.length > 0 && (
                    <>
                        {/* selectores dinámicos */}
                        <div className="px-6 pb-4 space-y-4">
                            <div className="grid grid-cols-2 p-1 bg-neutral-50 rounded-xl border border-neutral-100/50">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMode("compra"); }}
                                    className={`py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                                        mode === "compra" 
                                            ? "bg-white text-gray-900 shadow-sm" 
                                            : "text-gray-400 hover:text-gray-900"
                                    }`}
                                >
                                    <ShoppingBag size={13} />
                                    Comprar Externo
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMode("produccion"); }}
                                    className={`py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                                        mode === "produccion" 
                                            ? "bg-white text-gray-900 shadow-sm" 
                                            : "text-gray-400 hover:text-gray-900"
                                    }`}
                                >
                                    <ChefHat size={13} />
                                    Preparar Propio
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-1 px-1 ">
                                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest ml-2">Llevar stock a:</span>
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    {[10, 24, 50].map((num) => (
                                        <button
                                            key={num}
                                            onClick={() => setTargetStock(num)}
                                            className={`px-2.5 py-1 rounded-[0.25rem] text-[10px] font-black transition-all duration-300 ${
                                                targetStock === num 
                                                    ? "bg-black text-white" 
                                                    : "text-neutral-400 hover:text-gray-900"
                                            }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <NumberInput
                                        type="number"
                                        value={targetStock}
                                        onChangeValue={(val) => setTargetStock(Math.max(0, Number(val)))}
                                        className="w-10 bg-white border border-neutral-100 text-[10px] font-bold text-center py-1 rounded-[0.25rem] focus:ring-1 focus:ring-black focus:outline-hidden"
                                    />
                                </div>
                            </div>
                        </div>

                      {/* Listado de Productos */}
                        <div 
                            className="flex-1 overflow-y-auto px-6 no-scrollbar max-h-[280px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-100 translate-y-0"
                        >
                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100/60">
                                <span className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">
                                    Seleccionados ({selectedIds.size})
                                </span>
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-[9px] font-black uppercase tracking-widest text-gray-900 hover:underline"
                                >
                                    {selectedIds.size === variants.length ? "Ninguno" : "Todos"}
                                </button>
                            </div>

                            <div className="divide-y divide-neutral-100">
                                {variants.map((v) => {
                                    const isSelected = selectedIds.has(v.id);
                                    const needed = Math.max(0, targetStock - v.stock);
                                    
                                    // Mapeo defensivo Array/Object de Supabase para evitar crash de datos
                                    const productData = Array.isArray(v.products) ? v.products[0] : v.products;
                                    const productName = productData?.name || "Producto sin nombre";
                                    const variantInfo = [v.size, v.color_name].filter(Boolean).join(" / ");
                                    const imageUrl = v.variant_image || productData?.image_url;

                                    return (
                                        <div
                                            key={v.id}
                                            onClick={(e) => toggleSelect(v.id, e)}
                                            className="flex items-center justify-between py-4 cursor-pointer select-none transition-colors group/item"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0 ${
                                                    isSelected ? "bg-black border-black text-white" : "border-neutral-300"
                                                }`}>
                                                    {isSelected && <Check size={10} strokeWidth={3.5} />}
                                                </div>

                                                <div className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {imageUrl ? (
                                                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[9px] font-black text-gray-400">PZ</span>
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 truncate pr-2 leading-tight">
                                                        {productName}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {variantInfo && (
                                                            <span className="text-[9px] font-bold text-gray-400 truncate max-w-[120px]">
                                                                {variantInfo}
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] font-black text-red-600 bg-red-50 px-1 py-0.2 rounded-sm animate-pulse">
                                                            Stock: {v.stock}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-[9px]  uppercase tracking-widest font-semibold text-neutral-400 block">Faltan</span>
                                                <span className="text-xs font-black text-gray-900 tabular-nums">+{needed}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white border-t border-neutral-100/60">
                            <button
                                onClick={handleCopy}
                                disabled={selectedIds.size === 0}
                                className={`w-full py-3.5 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] ${
                                    selectedIds.size === 0
                                        ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                        : copied
                                            ? "bg-emerald-500 text-white"
                                            : "bg-black text-white hover:bg-neutral-900 shadow-sm"
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <Check size={12} strokeWidth={3} />
                                        Lista Copiada
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        {mode === "compra" ? "Copiar Lista de Compra" : "Copiar Hoja de Trabajo"}
                                    </>
                                )}
                            </button>
                            <div className="mt-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <a 
                                    href="/admin/inventory"
                                    className="text-[9px] font-semibold text-neutral-400 hover:text-gray-900 uppercase tracking-widest inline-flex items-center gap-1 transition-colors"
                                >
                                    Ficha de Inventario Completa <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}