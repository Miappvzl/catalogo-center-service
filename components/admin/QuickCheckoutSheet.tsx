'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// --- REEMPLAZAR IMPORTS (Líneas 4 a 30) ---
import {
    X,
    DollarSign,
    ShoppingBag,
    Search,
    Plus,
    Minus,
    Clock,
    Split,
    ChevronRight,
    ArrowRight,
    Check,
    Share2,
    Copy,
    ExternalLink,
    ShieldCheck,
    Truck,
    Trash2, // 🚀 Eliminación rápida
    Tag,
    Percent,
} from 'lucide-react';
import { useQuickCheckout, QuickCheckoutItem } from '@/app/store/useQuickCheckout';
import { createQuickPaymentLink } from '@/app/actions/quick-checkout-actions';
import { getSupabase } from '@/lib/supabase-client';
import { calculateCartEngine } from '@/utils/cartLogic';
import { QuickVariantPickerModal, ConfiguredVariantOutput } from '@/components/admin/QuickVariantPickerModal';

interface CatalogProduct {
    id: number;
    name: string;
    usd_cash_price: number;
    usd_penalty?: number;
    image_url: string | null;
    stock: number;
    category: string;
    wholesale_active?: boolean;
    wholesale_min_qty?: number;
    wholesale_discount_pct?: number;
    is_tax_exempt?: boolean;
    requires_shipping?: boolean;
    product_variants?: any[];
    product_modifier_groups?: any[];
}


interface QuickCheckoutSheetProps {
    storeId?: string;
}

export function QuickCheckoutSheet({ storeId }: QuickCheckoutSheetProps) {
    const {
        isOpen,
        step,
        mode,
        amountInput,
        customTitle,
        selectedItems,
        allowSplitPayments,
        minSplitAmount,
        expiresInMinutes,
        generatedLink,
        isLoading,
        error,
        closeQuickCheckout,
        setMode,
        setStep,
        setAmountInput,
        setCustomTitle,
        addItem,
        removeItem,
        updateQuantity,
        setAllowSplitPayments,
        setMinSplitAmount,
        setExpiresInMinutes,
        setGeneratedLink,
        setIsLoading,
        setError,
        getTotalUsd,
        reset,
    } = useQuickCheckout();

    // Estados locales para el Catálogo
    const supabase = getSupabase();
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Estados para reglas de negocio (Mayorista y Promociones)
    const [promotions, setPromotions] = useState<any[]>([]);
    const [wholesaleConfig, setWholesaleConfig] = useState<any>({ active: false, min_items: 6, discount_percentage: 0 });
    const [requiresShippingCustom, setRequiresShippingCustom] = useState<boolean>(true);

    // Estados para el Modal de Variantes y Modificadores
    const [activeProductForPicker, setActiveProductForPicker] = useState<any | null>(null);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Abrir selector o agregar directamente si no tiene variantes
    const handleProductAddClick = (prod: any) => {
        const hasVariants = prod.product_variants && prod.product_variants.length > 0;
        const hasModifiers = prod.product_modifier_groups && prod.product_modifier_groups.length > 0;

        if (hasVariants || hasModifiers) {
            setActiveProductForPicker(prod);
            setIsPickerOpen(true);
        } else {
            const currentStock = Number(prod.stock || 0);
            // Bloqueo si el producto simple no tiene stock
            if (currentStock <= 0) return;

            const listPrice = Number(prod.usd_cash_price || 0) + Number(prod.usd_penalty || 0);
            addItem({
                productId: prod.id,
                name: prod.name,
                price: listPrice,
                imageUrl: prod.image_url || undefined,
                quantity: 1,
                maxStock: currentStock,
            });
        }
    };

    const handleVariantConfirmed = (configured: ConfiguredVariantOutput) => {
        if (!activeProductForPicker) return;

        addItem({
            productId: activeProductForPicker.id,
            variantId: configured.variantId,
            variantLabel: configured.variantLabel,
            name: activeProductForPicker.name,
            price: configured.unitPrice,
            imageUrl: activeProductForPicker.image_url || undefined,
            quantity: 1,
            maxStock: configured.maxStock,
        });
    };


    // Cargar productos del catálogo cuando se activa el modo catálogo
    useEffect(() => {
        if (isOpen && mode === 'catalog') {
            const fetchCatalog = async () => {
                setIsLoadingProducts(true);
                try {
                    let targetStoreId = storeId;
                    if (!targetStoreId) {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data: userStore } = await supabase
                                .from('stores')
                                .select('id')
                                .eq('user_id', user.id)
                                .single();
                            targetStoreId = userStore?.id;
                        }
                    }

                    if (!targetStoreId) {
                        setIsLoadingProducts(false);
                        return;
                    }

                    // Consulta paralela: Productos, Promociones activas y Configuración Mayorista
                    const [productsRes, promosRes, storeRes] = await Promise.all([
                        supabase
                            .from('products')
                            .select(`
                id, name, usd_cash_price, usd_penalty, image_url, stock, category, 
                wholesale_active, wholesale_min_qty, wholesale_discount_pct, 
                is_tax_exempt, requires_shipping,
                product_variants(*),
                product_modifier_groups(
                  display_order,
                  modifier_groups(
                    *,
                    modifier_options(*)
                  )
                )
              `)
                            .eq('store_id', targetStoreId)
                            .eq('status', 'active')
                            .order('name', { ascending: true }),
                        supabase
                            .from('promotions')
                            .select('*')
                            .eq('store_id', targetStoreId)
                            .eq('is_active', true),
                        supabase
                            .from('stores')
                            .select('wholesale_config, store_type')
                            .eq('id', targetStoreId)
                            .single()
                    ]);

                    if (productsRes.data) setProducts(productsRes.data);
                    if (promosRes.data) setPromotions(promosRes.data);
                    if (storeRes.data?.wholesale_config) {
                        setWholesaleConfig(storeRes.data.wholesale_config);
                    }
                    if (storeRes.data?.store_type === 'services') {
                        setRequiresShippingCustom(false);
                    }
                } catch {
                    // Fallback silencioso
                } finally {
                    setIsLoadingProducts(false);
                }
            };

            fetchCatalog();
        }
    }, [isOpen, mode, storeId]);

    // Filtrado de productos por búsqueda
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
        );
    }, [products, searchQuery]);

    // Mapeo de items para compatibilidad total con cartLogic.ts
    const mappedCartItems = useMemo(() => {
        return selectedItems.map((item) => {
            const originalProduct = products.find((p) => p.id === item.productId);
            const variant = originalProduct?.product_variants?.find((v: any) => v.id === item.variantId);

            const cashPrice = variant?.override_usd_price !== null && variant?.override_usd_price !== undefined
                ? Number(variant.override_usd_price)
                : Number(originalProduct?.usd_cash_price || item.price);

            const penalty = variant?.override_usd_penalty !== null && variant?.override_usd_penalty !== undefined
                ? Number(variant.override_usd_penalty)
                : Number(originalProduct?.usd_penalty || 0);

            return {
                id: `item-${item.productId}-${item.variantId || 'base'}`,
                productId: item.productId,
                variantId: item.variantId || null,
                name: item.name,
                basePrice: cashPrice,
                penalty: penalty,
                quantity: item.quantity,
                productWholesaleActive: Boolean((originalProduct as any)?.wholesale_active),
                productWholesaleMinQty: Number((originalProduct as any)?.wholesale_min_qty || 6),
                productWholesaleDiscountPct: Number((originalProduct as any)?.wholesale_discount_pct || 0),
                isTaxExempt: Boolean((originalProduct as any)?.is_tax_exempt),
                requiresShipping: (originalProduct as any)?.requires_shipping ?? true,
            };
        });
    }, [selectedItems, products]);

    // Ejecución del motor contable oficial
    const catalogEngineResult = useMemo(() => {
        if (selectedItems.length === 0) return null;
        return calculateCartEngine(mappedCartItems, promotions, false, wholesaleConfig);
    }, [mappedCartItems, promotions, wholesaleConfig, selectedItems.length]);

    // Total exacto: Se rige estrictamente por el Precio de Lista oficial
    // El beneficio en divisa se calcula después en el checkout del comprador
    const totalCalculated = useMemo(() => {
        if (mode === 'custom_amount') {
            const parsed = parseFloat(amountInput);
            return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
        }
        if (!catalogEngineResult) return 0;

        // FÓRMULA OFICIAL: Total de Lista menos promociones y descuentos al mayor
        const listTotal = catalogEngineResult.finalBsModeUSD - catalogEngineResult.wholesaleDiscountList;
        return Number(Math.max(0, listTotal).toFixed(2));
    }, [mode, amountInput, catalogEngineResult]);


    // Formateador de moneda sobrio
    const formatUSD = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(val);
    };

    // Renderizador: Selector de Modos (Pestañas Sobrias)
    const renderModeSelector = () => (
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 mb-5">
            <button
                type="button"
                onClick={() => setMode('custom_amount')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs transition-all duration-150 ${mode === 'custom_amount'
                    ? 'bg-white text-neutral-950 font-medium shadow-xs border border-neutral-200/60'
                    : 'text-neutral-600 hover:text-neutral-900 font-normal'
                    }`}
            >
                <DollarSign className="w-3.5 h-3.5 stroke-[1.5]" />
                Monto Libre
            </button>

            <button
                type="button"
                onClick={() => setMode('catalog')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs transition-all duration-150 ${mode === 'catalog'
                    ? 'bg-white text-neutral-950 font-medium shadow-xs border border-neutral-200/60'
                    : 'text-neutral-600 hover:text-neutral-900 font-normal'
                    }`}
            >
                <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />
                Catálogo
            </button>
        </div>
    );

    // Renderizador: Motor 1 - Monto Libre
    const renderCustomAmountComposer = () => (
        <div className="space-y-4">
            {/* Visualizador de Monto Gigante y Limpio */}
            <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200/90 text-center">
                <label className="block text-[11px] font-medium tracking-wider text-neutral-400 uppercase mb-1">
                    Importe a cobrar
                </label>
                <div className="flex items-center justify-center gap-1">
                    <span className="text-3xl font-normal text-neutral-400">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        className="w-48 text-center text-4xl font-semibold text-neutral-950 bg-transparent focus:outline-hidden tracking-tight placeholder:text-neutral-300"
                        autoFocus
                    />


                </div>

            </div>
            <div className="pt-2 border-t border-neutral-200/60">
                <label className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-xl cursor-pointer hover:border-neutral-300 transition-colors">
                    <div className="flex items-center gap-2.5">
                        <Truck className="w-4 h-4 text-neutral-600 stroke-[1.5]" />
                        <div>
                            <p className="text-xs font-medium text-neutral-800">
                                ¿Requiere entrega o envío físico?
                            </p>
                            <p className="text-[11px] text-neutral-400 font-normal">
                                Solicita dirección, agencia o delivery al comprador
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={requiresShippingCustom}
                        onChange={(e) => setRequiresShippingCustom(e.target.checked)}
                        className="w-4 h-4 rounded-md border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                    />
                </label>
            </div>

            {/* Nota descriptiva del cobro */}
            <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Concepto o detalle del cobro
                </label>
                <input
                    type="text"
                    placeholder="Ej. Saldo pendiente, combo acordado, delivery"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-neutral-950 transition-colors"
                />
            </div>
        </div>
    );

    const renderCatalogComposer = () => {
        const totalItemsCount = selectedItems.reduce((acc, i) => acc + i.quantity, 0);

        // 🚀 AISLAMIENTO ESTRICTO: Solo cuentan los productos que NO tienen regla individual
        const globalEligibleCount = selectedItems.reduce((acc, item) => {
            const originalProduct = products.find((p) => p.id === item.productId);
            const hasIndividualWholesale = Boolean((originalProduct as any)?.wholesale_active);
            return !hasIndividualWholesale ? acc + item.quantity : acc;
        }, 0);

        const isGlobalWholesaleMet = wholesaleConfig.active && globalEligibleCount >= wholesaleConfig.min_items;

        return (
            <div className="space-y-4">
                {/* Banner Informativo de Progreso Mayorista (Conteo Aislado) */}
                {wholesaleConfig.active && (
                    <div
                        className={`p-3 rounded-xl border text-xs transition-colors ${isGlobalWholesaleMet
                                ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800 font-medium'
                                : 'bg-neutral-50 border-neutral-200/80 text-neutral-600'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Percent className="w-3.5 h-3.5 stroke-[1.5]" />
                                {isGlobalWholesaleMet
                                    ? `Descuento global activado (-${wholesaleConfig.discount_percentage}%)`
                                    : `Meta mayorista: ${wholesaleConfig.min_items} unidades`}
                            </span>
                            <span className="font-semibold tabular-nums">
                                {globalEligibleCount} / {wholesaleConfig.min_items}
                            </span>
                        </div>
                        {!isGlobalWholesaleMet && (
                            <p className="text-[11px] text-neutral-400 mt-1">
                                Agrega {wholesaleConfig.min_items - globalEligibleCount} unidad(es) más para desbloquear -{wholesaleConfig.discount_percentage}% en el pedido.
                            </p>
                        )}
                    </div>
                )}

                {/* Buscador de Productos */}
                <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.5]" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o categoría..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:bg-white focus:border-neutral-950 transition-colors"
                    />
                </div>

                {/* Lista de Catálogo */}
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {isLoadingProducts ? (
                        <div className="py-8 text-center text-xs text-neutral-400 font-normal">
                            Cargando catálogo...
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="py-8 text-center text-xs text-neutral-400 font-normal">
                            No se encontraron productos.
                        </div>
                    ) : (
                        filteredProducts.map((prod: any) => {
                            const listPrice = Number(prod.usd_cash_price || 0) + Number(prod.usd_penalty || 0);
                            const hasOptions =
                                (prod.product_variants && prod.product_variants.length > 0) ||
                                (prod.product_modifier_groups && prod.product_modifier_groups.length > 0);

                            const totalStock = Number(prod.stock || 0);
                            const isOutOfStock = !hasOptions && totalStock <= 0;

                            return (
                                <div
                                    key={prod.id}
                                    className="flex items-center justify-between p-2.5 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {prod.image_url ? (
                                            <img
                                                src={prod.image_url}
                                                alt={prod.name}
                                                className="w-10 h-10 object-cover rounded-lg border border-neutral-150 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400 flex-shrink-0">
                                                <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-neutral-900 truncate">
                                                {prod.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-semibold text-neutral-800">
                                                    {formatUSD(listPrice)}
                                                </span>
                                                <span className={`text-[10px] font-mono ${isOutOfStock ? 'text-red-500 font-medium' : 'text-neutral-400 font-normal'}`}>
                                                    {hasOptions ? 'Opciones disp.' : isOutOfStock ? 'Agotado' : `${totalStock} en stock`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isOutOfStock}
                                        onClick={() => handleProductAddClick(prod)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${isOutOfStock
                                            ? 'bg-neutral-100 text-neutral-300 border border-neutral-200/50 cursor-not-allowed'
                                            : 'text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80'
                                            }`}
                                    >
                                        {hasOptions ? 'Configurar' : isOutOfStock ? 'Agotado' : 'Agregar'}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Artículos Seleccionados con Badges y Descarte Directo */}
                {selectedItems.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-200/80">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 block">
                            Artículos en la orden ({totalItemsCount})
                        </span>

                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                            {selectedItems.map((item) => {
                                const processed = catalogEngineResult?.processedItems.find(
                                    (p: any) => p.productId === item.productId && p.variantId === item.variantId
                                );

                                return (
                                    <div
                                        key={`${item.productId}-${item.variantId || 'base'}`}
                                        className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="text-xs font-medium text-neutral-900 truncate leading-tight">
                                                {item.name}
                                            </p>
                                            {item.variantLabel && (
                                                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                                    {item.variantLabel}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-semibold text-neutral-900">
                                                    {formatUSD(item.price * item.quantity)}
                                                </span>
                                                {processed?.badge && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-neutral-950 text-white shadow-2xs">
                                                        <Tag className="w-2.5 h-2.5 stroke-[2]" />
                                                        {processed.badge.text}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Stepper Numérico con Candado de Stock */}
                                            <div className="flex items-center border border-neutral-200 rounded-lg bg-white p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                                    className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors"
                                                >
                                                    <Minus className="w-3 h-3 stroke-[1.5]" />
                                                </button>
                                                <span className="w-6 text-center text-xs font-semibold text-neutral-900 tabular-nums">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={item.quantity >= (item.maxStock ?? 9999)}
                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                                    className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-900 disabled:text-neutral-200 disabled:hover:text-neutral-200 transition-colors"
                                                    title={item.quantity >= (item.maxStock ?? 9999) ? 'Límite de inventario alcanzado' : 'Añadir unidad'}
                                                >
                                                    <Plus className="w-3 h-3 stroke-[1.5]" />
                                                </button>
                                            </div>

                                            {/* Botón de Papelera Rápida */}
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.productId, item.variantId)}
                                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar artículo"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desglose Contable Transparente */}
                        {catalogEngineResult && (
                            <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-1.5 text-xs">
                                <div className="flex justify-between items-center text-neutral-500 font-normal">
                                    <span>Subtotal base</span>
                                    <span className="font-semibold text-neutral-800">
                                        {formatUSD(catalogEngineResult.totalListNominal)}
                                    </span>
                                </div>

                                {catalogEngineResult.listPromoDiscounts > 0 && (
                                    <div className="flex justify-between items-center text-emerald-700 font-medium">
                                        <span>Descuento de campañas</span>
                                        <span>-{formatUSD(catalogEngineResult.listPromoDiscounts)}</span>
                                    </div>
                                )}

                                {catalogEngineResult.wholesaleDiscountList > 0 && (
                                    <div className="flex justify-between items-center text-emerald-700 font-medium">
                                        <span>Descuento mayorista</span>
                                        <span>-{formatUSD(catalogEngineResult.wholesaleDiscountList)}</span>
                                    </div>
                                )}

                                <div className="pt-1.5 border-t border-neutral-150 flex justify-between items-center text-neutral-950 font-semibold">
                                    <span>Total oficial</span>
                                    <span className="text-sm">{formatUSD(totalCalculated)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Renderizador: Opciones Avanzadas (Abonos y Expiración / FOMO)
    const renderAdvancedSettings = () => (
        <div className="pt-2 border-t border-neutral-200/80">
            <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full flex items-center justify-between py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 stroke-[1.5]" />
                    Configuración avanzada (Expiración y Abonos)
                </span>
                <ChevronRight
                    className={`w-3.5 h-3.5 stroke-[1.5] transition-transform duration-200 ${showAdvancedSettings ? 'rotate-90' : ''
                        }`}
                />
            </button>

            <AnimatePresence>
                {showAdvancedSettings && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-4 pt-2 pb-1"
                    >
                        {/* Control de Expiración */}
                        <div>
                            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                Tiempo de validez del enlace
                            </label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { label: '15 min', val: 15 },
                                    { label: '1 hora', val: 60 },
                                    { label: '24 horas', val: 1440 },
                                    { label: 'Sin límite', val: null },
                                ].map((opt) => (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => setExpiresInMinutes(opt.val)}
                                        className={`py-1.5 px-2 text-xs rounded-lg border text-center transition-all ${expiresInMinutes === opt.val
                                            ? 'bg-neutral-950 text-white font-medium border-neutral-950 shadow-xs'
                                            : 'bg-white text-neutral-600 hover:text-neutral-900 font-normal border-neutral-200'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Control de Abonos / Pagos Divididos */}
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Split className="w-3.5 h-3.5 text-neutral-600 stroke-[1.5]" />
                                    <span className="text-xs font-medium text-neutral-800">
                                        Permitir abono parcial
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={allowSplitPayments}
                                    onChange={(e) => setAllowSplitPayments(e.target.checked)}
                                    className="w-4 h-4 rounded-md border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer"
                                />
                            </div>

                            {allowSplitPayments && (
                                <div className="pt-2 border-t border-neutral-200/60">
                                    <label className="block text-xs font-normal text-neutral-600 mb-1">
                                        Monto mínimo para reservar ($)
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Ej. 10.00"
                                        value={minSplitAmount}
                                        onChange={(e) => setMinSplitAmount(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-hidden focus:border-neutral-950 transition-colors"
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    // Manejador de Creación del Enlace
    const handleGenerateLink = () => {
        if (totalCalculated <= 0) {
            setError('El total a cobrar debe ser superior a cero.');
            return;
        }

        setError(null);
        setIsLoading(true);

        startTransition(async () => {
            // Si es catálogo, creamos el snapshot con los precios unitarios ya rebajados
            const itemsSnapshot = mode === 'catalog' && catalogEngineResult
                ? catalogEngineResult.processedItems.map((pItem: any) => {
                    const originalProduct = products.find((p) => p.id === pItem.productId);
                    const variant = originalProduct?.product_variants?.find((v: any) => v.id === pItem.variantId);

                    const cashPrice = variant?.override_usd_price !== null && variant?.override_usd_price !== undefined
                        ? Number(variant.override_usd_price)
                        : Number(originalProduct?.usd_cash_price || pItem.basePrice);

                    const penalty = variant?.override_usd_penalty !== null && variant?.override_usd_penalty !== undefined
                        ? Number(variant.override_usd_penalty)
                        : Number(originalProduct?.usd_penalty || 0);

                    return {
                        productId: pItem.productId,
                        variantId: pItem.variantId || null,
                        variantLabel: pItem.variantLabel || null,
                        name: pItem.name,
                        basePrice: cashPrice, // Precio base en divisa
                        penalty: penalty,     // Margen de lista / descuento en divisa
                        price: cashPrice + penalty, // Precio de lista nominal
                        quantity: pItem.quantity,
                        requiresShipping: pItem.requiresShipping ?? true,
                        isTaxExempt: pItem.isTaxExempt ?? false,
                        productWholesaleActive: pItem.productWholesaleActive ?? false,
                        productWholesaleMinQty: pItem.productWholesaleMinQty ?? 6,
                        productWholesaleDiscountPct: pItem.productWholesaleDiscountPct ?? 0,
                    };
                })
                : [{
                    productId: 0,
                    name: customTitle || 'Cobro directo',
                    basePrice: totalCalculated,
                    penalty: 0,
                    price: totalCalculated,
                    quantity: 1,
                    requiresShipping: requiresShippingCustom,
                }];

            const response = await createQuickPaymentLink({
                mode,
                amountUsd: totalCalculated,
                title: customTitle,
                items: itemsSnapshot as any,
                allowSplitPayments,
                minSplitAmountUsd: allowSplitPayments ? parseFloat(minSplitAmount) || 0 : 0,
                expiresInMinutes,
            });

            setIsLoading(false);

            if (response.success && response.data) {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const absoluteUrl = response.data.fullUrl.startsWith('http')
                    ? response.data.fullUrl
                    : `${origin}${response.data.fullUrl.startsWith('/') ? '' : '/'}${response.data.fullUrl}`;

                setGeneratedLink({
                    ...response.data,
                    fullUrl: absoluteUrl,
                });
                setStep('preview_card');
            } else {
                setError(response.error || 'Ocurrió un error al generar el enlace.');
            }
        });
    };

    // Copiado al Portapapeles
    const handleCopyLink = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink.fullUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // Compartir por WhatsApp (Mensaje sobrio y directo)
  const handleShareWhatsApp = () => {
    if (!generatedLink) return;

    let itemsDetailText = '';

    if (mode === 'catalog' && catalogEngineResult) {
      itemsDetailText = catalogEngineResult.processedItems
        .map((pItem: any) => {
          const variantText = pItem.variantLabel ? ` (${pItem.variantLabel})` : '';
          const badgeText = pItem.badge?.text ? ` [${pItem.badge.text}]` : '';
          return `• ${pItem.quantity}x ${pItem.name}${variantText} - ${formatUSD(pItem.finalListPrice * pItem.quantity)}${badgeText}`;
        })
        .join('\n');
    } else {
      itemsDetailText = `• Concepto: ${customTitle || 'Cobro directo'}`;
    }

    const wholesaleDiscountText = catalogEngineResult && catalogEngineResult.wholesaleDiscountList > 0
      ? `Descuento Mayorista: -${formatUSD(catalogEngineResult.wholesaleDiscountList)}\n`
      : '';

    const promoDiscountText = catalogEngineResult && catalogEngineResult.listPromoDiscounts > 0
      ? `Descuento de Campaña: -${formatUSD(catalogEngineResult.listPromoDiscounts)}\n`
      : '';

    const subtotalNominalText = catalogEngineResult && (catalogEngineResult.wholesaleDiscountList > 0 || catalogEngineResult.listPromoDiscounts > 0)
      ? `Subtotal base: ${formatUSD(catalogEngineResult.totalListNominal)}\n`
      : '';

    const message = `*ORDEN DE COBRO RÁPIDO*\n` +
      `============================\n\n` +
      `*DETALLE DE ARTÍCULOS:*\n` +
      `${itemsDetailText}\n\n` +
      `*RESUMEN FINANCIERO:*\n` +
      `${subtotalNominalText}` +
      `${promoDiscountText}` +
      `${wholesaleDiscountText}` +
      `*TOTAL OFICIAL:* ${formatUSD(generatedLink.totalUsd)} USD\n` +
      `_(Descuento adicional disponible si pagas en divisas / efectivo)_\n\n` +
      `*ENLACE DIRECTO PARA COMPLETAR TU PAGO:*\n` +
      `${generatedLink.fullUrl}`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

    // Renderizador: Vista 2 - La Tarjeta Digital Compartible
    const renderPreviewCard = () => {
        if (!generatedLink) return null;

        return (
            <div className="space-y-5">
                {/* La Tarjeta Obsidian Black */}
                <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800 text-white shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-neutral-400 stroke-[1.5]" />
                            <span className="text-[11px] font-medium tracking-wider text-neutral-400 uppercase">
                                Enlace de Cobro Seguro
                            </span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                            {generatedLink.mode === 'catalog' ? 'Catálogo' : 'Monto Directo'}
                        </span>
                    </div>

                    <div>
                        <p className="text-xs font-normal text-neutral-400">Total a liquidar</p>
                        <p className="text-3xl font-semibold tracking-tight text-white mt-0.5">
                            {formatUSD(generatedLink.totalUsd)}
                        </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-850 flex items-center justify-between text-xs text-neutral-400">
                        <span className="truncate max-w-[200px]">
                            {generatedLink.title}
                        </span>
                        {generatedLink.expiresAt ? (
                            <span className="font-normal text-neutral-500">Expira en 24h</span>
                        ) : (
                            <span className="font-normal text-neutral-500">Sin caducidad</span>
                        )}
                    </div>
                </div>

                {/* Acciones Rápidas de Compartición */}
                <div className="space-y-2.5">
                    <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-950 hover:bg-neutral-900 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
                    >
                        <Share2 className="w-4 h-4 stroke-[1.5]" />
                        Enviar por WhatsApp
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-medium rounded-xl transition-colors"
                        >
                            {copiedLink ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[1.5]" />
                                    <span className="text-emerald-700">Enlace Copiado</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5 stroke-[1.5]" />
                                    Copiar Enlace
                                </>
                            )}
                        </button>

                        <a
                            href={generatedLink.fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-xl transition-colors"
                            title="Abrir vista de comprador"
                        >
                            <ExternalLink className="w-4 h-4 stroke-[1.5]" />
                        </a>
                    </div>
                </div>

                {/* Botón para resetear y armar un nuevo cobro */}
                <div className="pt-2 text-center">
                    <button
                        type="button"
                        onClick={reset}
                        className="text-xs font-normal text-neutral-500 hover:text-neutral-800 transition-colors"
                    >
                        Crear un nuevo cobro
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div
                        key="quick-checkout-modal-root"
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    >
                        {/* Fondo translúcido */}
                        <motion.div
                            key="quick-checkout-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeQuickCheckout}
                            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs transition-opacity"
                        />

                        {/* Contenedor Modal / Bottom Sheet */}
                        <motion.div
                            key="quick-checkout-drawer"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl border border-neutral-200/90 shadow-2xl z-10 overflow-hidden max-h-[92vh] flex flex-col"
                        >
                            {/* Cabecera Sobria */}
                            <div className="flex items-center justify-between p-4 border-b border-neutral-200/80 bg-white">
                                <div>
                                    <h2 className="text-sm font-medium text-neutral-950">
                                        {step === 'composer' ? 'Cobro Rápido' : 'Tarjeta de Cobro'}
                                    </h2>
                                    <p className="text-[11px] font-normal text-neutral-500 mt-0.5">
                                        {step === 'composer'
                                            ? 'Genera un enlace directo para WhatsApp'
                                            : 'Listo para compartir con tu cliente'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeQuickCheckout}
                                    className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 stroke-[1.5]" />
                                </button>
                            </div>

                            {/* Cuerpo Desplazable */}
                            <div className="p-4 overflow-y-auto space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl text-xs text-red-700 font-normal">
                                        {error}
                                    </div>
                                )}

                                {step === 'composer' ? (
                                    <>
                                        {renderModeSelector()}
                                        {mode === 'custom_amount'
                                            ? renderCustomAmountComposer()
                                            : renderCatalogComposer()}
                                        {renderAdvancedSettings()}
                                    </>
                                ) : (
                                    renderPreviewCard()
                                )}
                            </div>

                            {/* Pie de Acción (Solo en modo Composer) */}
                            {step === 'composer' && (
                                <div className="p-4 border-t border-neutral-200/80 bg-white flex items-center justify-between gap-3">
                                    <div>
                                        <span className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                                            Total
                                        </span>
                                        <span className="text-base font-semibold text-neutral-950">
                                            {formatUSD(totalCalculated)}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleGenerateLink}
                                        disabled={isLoading || isPending || totalCalculated <= 0}
                                        className="flex items-center gap-2 py-2.5 px-5 bg-neutral-950 hover:bg-neutral-900 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-medium rounded-xl transition-all shadow-xs"
                                    >
                                        {isLoading || isPending ? (
                                            <span>Generando...</span>
                                        ) : (
                                            <>
                                                <span>Generar Enlace</span>
                                                <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Variantes aislado de forma independiente */}
            <QuickVariantPickerModal
                isOpen={isPickerOpen}
                onClose={() => {
                    setIsPickerOpen(false);
                    setActiveProductForPicker(null);
                }}
                product={activeProductForPicker}
                onConfirm={handleVariantConfirmed}
            />
        </>
    );
}

export default QuickCheckoutSheet;