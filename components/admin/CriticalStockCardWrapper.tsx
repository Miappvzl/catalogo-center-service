"use client";

import { useState } from "react";
import { AlertTriangle, Box, ArrowRight } from "lucide-react";
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
    const hasCritical = lowStockCount > 0;

    return (
        <div className="relative w-full h-full">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (hasCritical) {
                        setIsOpen(true);
                    }
                }}
                className={`w-full h-full text-left bg-white p-5 md:p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between group transition-all duration-300 min-h-[140px] ${
                    hasCritical ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
                }`}
            >
                {/* Cabecera */}
                <div className="w-full flex justify-between items-start">
                    <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
                            hasCritical
                                ? "bg-rose-50 text-rose-600 border border-none"
                                : "bg-[#F6F6F6] text-neutral-800"
                        }`}
                    >
                        {hasCritical ? (
                            <AlertTriangle size={15} strokeWidth={2.2} />
                        ) : (
                            <Box size={15} strokeWidth={2.2} />
                        )}
                    </div>

                    {hasCritical ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-none px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            <span className="text-[9px] font-mono font-bold text-rose-700 uppercase tracking-wider">
                                Atención
                            </span>
                        </div>
                    ) : (
                        <span className="text-[9px] font-mono font-semibold text-neutral-400 uppercase tracking-wider bg-[#F6F6F6] px-2 py-0.5 rounded">
                            Normal
                        </span>
                    )}
                </div>

                {/* Número y Estado */}
                <div className="mt-3">
                    <p className={`text-3xl md:text-4xl font-mono font-bold tracking-tight leading-none tabular-nums ${
                        hasCritical ? "text-neutral-900" : "text-neutral-900"
                    }`}>
                        {hasCritical ? lowStockCount : totalProducts}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            {hasCritical ? "Stock Crítico" : "Productos Activos"}
                        </p>
                        {hasCritical && (
                            <span className="text-[9px] font-mono font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 transition-colors">
                                Gestionar <ArrowRight size={10} />
                            </span>
                        )}
                    </div>
                </div>
            </button>

            {/* POPOVER CONTEXTUAL */}
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