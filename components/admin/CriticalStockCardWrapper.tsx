"use client";

import { useState } from "react";
import { AlertTriangle, Box } from "lucide-react";
import CriticalStockPopover from "./CriticalStockPopover";

interface WrapperProps {
    lowStockCount: number;
    totalProducts: number;
    storeId: string;
}

export default function CriticalStockCardWrapper({
    lowStockCount,
    totalProducts,
    storeId,
}: WrapperProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        // Contenedor Div como raíz: Mantiene la estructura del Bento Grid y sirve de anclaje relativo para el Popover
        <div className="relative w-full h-full">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (lowStockCount > 0) {
                        setIsOpen(true);
                    }
                }}
                className={`w-full h-full text-left bg-white p-6 rounded-[var(--radius-card)] flex flex-col justify-between group transition-all duration-500 ease-out active:scale-[0.98] active:bg-[#fafafa] hover:shadow-[0_4px_20px_-10px_rgba(0,0,0,0.04)] min-h-[160px] ${
                    lowStockCount > 0 ? "cursor-pointer" : "cursor-default"
                }`}
            >
                <div className="w-full flex justify-between items-start relative z-10">
                    <div
                        className={`w-11 h-11 rounded-[var(--radius-btn)] flex items-center justify-center shrink-0 transition-all duration-500 ease-out ${
                            lowStockCount > 0
                                ? "bg-red-50/50 text-red-800 group-hover:bg-[#450a0a] group-hover:text-white"
                                : "bg-[#f6f6f6] text-gray-900 group-hover:bg-black group-hover:text-white"
                        }`}
                    >
                        {lowStockCount > 0 ? (
                            <AlertTriangle
                                size={18}
                                strokeWidth={2.2}
                                className="group-hover:scale-110 transition-transform duration-500 ease-out"
                            />
                        ) : (
                            <Box
                                size={18}
                                strokeWidth={2.2}
                                className="group-hover:scale-110 transition-transform duration-500 ease-out"
                            />
                        )}
                    </div>

                    {lowStockCount > 0 && (
                        <div className="flex items-center gap-1.5 bg-[#fef2f2] px-2.5 py-1 rounded-[var(--radius-badge)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.5)] animate-pulse"></span>
                            <span className="text-[9px] font-semibold text-red-800 uppercase tracking-widest mt-[1px]">
                                Atención
                            </span>
                        </div>
                    )}
                </div>

                <div className="relative z-10 mt-2">
                    <p className="text-4xl font-black tracking-tighter text-gray-900 leading-none tabular-nums group-hover:translate-x-0.5 transition-transform duration-500 ease-out">
                        {lowStockCount > 0 ? lowStockCount : totalProducts}
                    </p>

                    <div className="flex items-center justify-between mt-2.5">
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors duration-500 ease-out">
                            {lowStockCount > 0 ? "Stock Crítico" : "Productos Activos"}
                        </p>
                        {lowStockCount > 0 && (
                            <span className="text-[9px] font-semibold text-neutral-400 group-hover:text-black transition-colors duration-500">
                                Gestionar →
                            </span>
                        )}
                    </div>
                </div>
            </button>

            {/* POP_OVER HERMANO (SIBLING): Evita la anidación ilegal de etiquetas <button> en el HTML */}
            {isOpen && (
                <CriticalStockPopover
                    storeId={storeId}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}