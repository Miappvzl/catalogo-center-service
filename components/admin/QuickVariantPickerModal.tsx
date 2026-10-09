'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight } from 'lucide-react';

export interface SelectedFoodModifier {
    optionId: string;
    name: string;
    priceAdjustment: number;
}

export interface ConfiguredVariantOutput {
    variantId?: string;
    variantLabel?: string;
    unitPrice: number;
    foodModifiers?: SelectedFoodModifier[];
    maxStock?: number; // 🚀 Traspaso del stock de la variante
}

interface QuickVariantPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
    onConfirm: (configured: ConfiguredVariantOutput) => void;
}

export function QuickVariantPickerModal({
    isOpen,
    onClose,
    product,
    onConfirm,
}: QuickVariantPickerModalProps) {
    // Estados para Retail (Variantes)
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    // Estados para Restaurante (Modificadores)
    const [selectedModifiers, setSelectedModifiers] = useState<Record<string, SelectedFoodModifier[]>>({});

    // Resetear estados al abrir con un nuevo producto
    useEffect(() => {
        if (product) {
            const variants = product.product_variants || [];
            if (variants.length > 0) {
                // Seleccionar por defecto la primera variante con stock
                const firstAvailable = variants.find((v: any) => (v.stock || 0) > 0) || variants[0];
                setSelectedVariantId(firstAvailable?.id || null);
            } else {
                setSelectedVariantId(null);
            }

            setSelectedModifiers({});
        }
    }, [product, isOpen]);

    // Identificar el tipo de producto
    const hasVariants = Boolean(product?.product_variants && product.product_variants.length > 0);
    const modifierGroups = useMemo(() => {
        if (!product?.product_modifier_groups) return [];
        return product.product_modifier_groups
            .map((pmg: any) => pmg.modifier_groups)
            .filter(Boolean);
    }, [product]);
    const hasModifiers = modifierGroups.length > 0;

    // Cálculo del precio unitario de lista (Sin descuento de divisa prematuro)
    const calculatedUnitPrice = useMemo(() => {
        if (!product) return 0;

        let base = Number(product.usd_cash_price || 0) + Number(product.usd_penalty || 0);

        // Ajuste por variante seleccionada
        if (hasVariants && selectedVariantId) {
            const variant = product.product_variants.find((v: any) => v.id === selectedVariantId);
            if (variant) {
                const variantPrice = variant.override_usd_price !== null && variant.override_usd_price !== undefined
                    ? Number(variant.override_usd_price)
                    : Number(product.usd_cash_price || 0);
                const variantPenalty = variant.override_usd_penalty !== null && variant.override_usd_penalty !== undefined
                    ? Number(variant.override_usd_penalty)
                    : Number(product.usd_penalty || 0);
                base = variantPrice + variantPenalty;
            }
        }

        // Ajuste por modificadores de comida seleccionados
        if (hasModifiers) {
            const totalExtras = Object.values(selectedModifiers)
                .flat()
                .reduce((sum, mod) => sum + Number(mod.priceAdjustment || 0), 0);
            base += totalExtras;
        }

        return Number(base.toFixed(2));
    }, [product, hasVariants, selectedVariantId, hasModifiers, selectedModifiers]);

    // Formateador de moneda sobrio
    const formatUSD = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(val);
    };

    // Manejador de selección de modificador gastronómico
    const handleToggleModifierOption = (group: any, option: any) => {
        const groupId = group.id;
        const isSingle = group.selection_type === 'single';
        const current = selectedModifiers[groupId] || [];

        const exists = current.some((item) => item.optionId === option.id);

        if (isSingle) {
            // Reemplazo en selección única
            setSelectedModifiers((prev) => ({
                ...prev,
                [groupId]: [{ optionId: option.id, name: option.name, priceAdjustment: Number(option.price_adjustment_usd || 0) }],
            }));
        } else {
            // Toggle en selección múltiple
            if (exists) {
                setSelectedModifiers((prev) => ({
                    ...prev,
                    [groupId]: current.filter((item) => item.optionId !== option.id),
                }));
            } else {
                const max = group.max_selections || 99;
                if (current.length >= max) return; // Límite alcanzado

                setSelectedModifiers((prev) => ({
                    ...prev,
                    [groupId]: [
                        ...current,
                        { optionId: option.id, name: option.name, priceAdjustment: Number(option.price_adjustment_usd || 0) },
                    ],
                }));
            }
        }
    };

    // Confirmar y entregar el producto configurado al Bottom Sheet principal
    const handleConfirm = () => {
    if (!product) return;

    let variantLabel: string | undefined = undefined;
    let resolvedStock = Number(product.stock || 9999);

    if (hasVariants && selectedVariantId) {
      const variant = product.product_variants.find((v: any) => v.id === selectedVariantId);
      if (variant) {
        const parts = [variant.size, variant.color_name].filter(Boolean);
        variantLabel = parts.join(' / ');
        resolvedStock = Number(variant.stock || 0);
      }
    }

    const flatModifiers = Object.values(selectedModifiers).flat();

    onConfirm({
      variantId: selectedVariantId || undefined,
      variantLabel,
      unitPrice: calculatedUnitPrice,
      foodModifiers: flatModifiers.length > 0 ? flatModifiers : undefined,
      maxStock: resolvedStock,
    });

    onClose();
  };

    if (!isOpen || !product) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
                {/* Fondo Translúcido */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs"
                />

                {/* Modal de Selección */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full max-w-sm bg-white rounded-xl border border-neutral-200/90 shadow-xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
                >
                    {/* Cabecera */}
                    <div className="flex items-center justify-between p-4 border-b border-neutral-150 bg-white shrink-0">
                        <div className="min-w-0 pr-2">
                            <h3 className="text-sm font-medium text-neutral-950 truncate leading-tight">
                                {product.name}
                            </h3>
                            <p className="text-[11px] font-normal text-neutral-400 mt-0.5">
                                {hasVariants ? 'Elige la variante deseada' : 'Selecciona las opciones del plato'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors shrink-0"
                        >
                            <X className="w-4 h-4 stroke-[1.5]" />
                        </button>
                    </div>

                    {/* Cuerpo de Selección con Scroll */}
                    <div className="p-4 overflow-y-auto space-y-4 flex-1">
                        {/* RENDERIZADOR: Modo Retail (Variantes de Talla / Color) */}
                        {hasVariants && (
                            <div className="space-y-2">
                                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                                    Variantes disponibles
                                </label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {product.product_variants.map((v: any) => {
                                        const isSelected = selectedVariantId === v.id;
                                        const stock = Number(v.stock || 0);
                                        const isOutOfStock = stock <= 0;
                                        const label = [v.size, v.color_name].filter(Boolean).join(' - ') || 'Variante';

                                        return (
                                            <button
                                                key={v.id}
                                                type="button"
                                                disabled={isOutOfStock}
                                                onClick={() => setSelectedVariantId(v.id)}
                                                className={`flex items-center justify-between p-3 rounded-xl border text-xs text-left transition-all ${isSelected
                                                        ? 'bg-neutral-950 text-white font-medium border-neutral-950 shadow-xs'
                                                        : isOutOfStock
                                                            ? 'bg-neutral-50 text-neutral-300 border-neutral-200/50 cursor-not-allowed'
                                                            : 'bg-white text-neutral-700 hover:text-neutral-950 font-normal border-neutral-200 hover:border-neutral-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2] shrink-0" />}
                                                    <span className="truncate">{label}</span>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-mono shrink-0 ml-2 ${isSelected ? 'text-neutral-300' : isOutOfStock ? 'text-neutral-300' : 'text-neutral-400'
                                                        }`}
                                                >
                                                    {isOutOfStock ? 'Agotado' : `${stock} disp.`}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* RENDERIZADOR: Modo Restaurante (Grupos de Modificadores) */}
                        {hasModifiers && (
                            <div className="space-y-4">
                                {modifierGroups.map((group: any) => {
                                    const currentSelections = selectedModifiers[group.id] || [];

                                    return (
                                        <div key={group.id} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-medium text-neutral-900">
                                                    {group.name}
                                                </label>
                                                <span className="text-[10px] text-neutral-400 font-normal">
                                                    {group.selection_type === 'single' ? 'Elige 1' : `Máx. ${group.max_selections || 'sin límite'}`}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-1">
                                                {(group.modifier_options || []).map((opt: any) => {
                                                    const isSelected = currentSelections.some((item) => item.optionId === opt.id);
                                                    const priceAdjustment = Number(opt.price_adjustment_usd || 0);

                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => handleToggleModifierOption(group, opt)}
                                                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs text-left transition-all ${isSelected
                                                                    ? 'bg-neutral-950 text-white font-medium border-neutral-950'
                                                                    : 'bg-white text-neutral-700 hover:text-neutral-950 font-normal border-neutral-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div
                                                                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${isSelected
                                                                            ? 'border-white bg-white text-neutral-950'
                                                                            : 'border-neutral-300 bg-transparent'
                                                                        }`}
                                                                >
                                                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                                                </div>
                                                                <span className="truncate">{opt.name}</span>
                                                            </div>

                                                            {priceAdjustment > 0 && (
                                                                <span
                                                                    className={`text-[11px] font-semibold shrink-0 ml-2 ${isSelected ? 'text-neutral-200' : 'text-neutral-600'
                                                                        }`}
                                                                >
                                                                    +{formatUSD(priceAdjustment)}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pie del Modal con Total Unitario y Botón de Acción */}
                    <div className="p-4 border-t border-neutral-150 bg-neutral-50 flex items-center justify-between gap-3 shrink-0">
                        <div>
                            <span className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                                Precio Unitario
                            </span>
                            <span className="text-sm font-semibold text-neutral-950">
                                {formatUSD(calculatedUnitPrice)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex items-center gap-2 py-2 px-4 bg-neutral-950 hover:bg-neutral-850 active:scale-98 text-white rounded-xl text-xs font-medium transition-all shadow-xs"
                        >
                            <span>Agregar al Cobro</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default QuickVariantPickerModal;