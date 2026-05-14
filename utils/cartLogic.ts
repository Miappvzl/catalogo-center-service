export function calculateCartEngine(
    items: any[], 
    promotions: any[], 
    applyTax: boolean = false,
    globalWholesale: { active: boolean, min_items: number, discount_percentage: number } = { active: false, min_items: 6, discount_percentage: 0 }
) {
    let totalListNominal = 0; let totalCashNominal = 0; 
    let listPromoDiscounts = 0; let cashPromoDiscounts = 0;
    let taxableSubtotalList = 0; let taxableSubtotalCash = 0;
    let wholesaleDiscountList = 0; let wholesaleDiscountCash = 0;

    const parentProductTally: Record<string, number> = {};
    const promoCounts: Record<string, number> = {};
    let totalItemsInCart = 0; // 🚀 NUEVO: Conteo total para la regla global

   // 1. TALLY PASS (O(N))
    items.forEach(item => {
        // Sumatoria para la regla individual de este producto
        parentProductTally[item.productId] = (parentProductTally[item.productId] || 0) + item.quantity;
        
        // 🚀 AISLAMIENTO ESTRICTO: Si el producto tiene su propia regla mayorista, 
        // su volumen se aísla y NO suma al pozo global de la tienda.
        if (!item.productWholesaleActive) {
            totalItemsInCart += item.quantity;
        }
        
        // Tally BOGO (Tu lógica existente)
        promotions?.forEach(p => {
            if (p.promo_type === 'bogo' && (p.linked_products || []).some((id: any) => String(id) === String(item.productId))) {
                promoCounts[p.id] = (promoCounts[p.id] || 0) + item.quantity;
            }
        });
    });

    // 🚀 Evaluamos si el carrito entero cumple la meta global
    const isGlobalWholesaleMet = globalWholesale.active && totalItemsInCart >= globalWholesale.min_items;

  // 2. REDUCTION PASS (O(N)): Calculamos finanzas
    const processedItems = items.map(item => {
        const listPrice = Number(item.basePrice || 0) + Number(item.penalty || 0);
        const cashPrice = Number(item.basePrice || 0);
        
        totalListNominal += listPrice * item.quantity; 
        totalCashNominal += cashPrice * item.quantity;
        
        let itemListDiscount = 0; let itemCashDiscount = 0;
        let badge = null; // 🚀 ÚNICA declaración de la etiqueta

        // --- ⚔️ EVALUACIÓN A: PROMOCIONES ---
        const applicablePromos = promotions?.filter((p: any) => p.is_active && (p.linked_products || []).some((id: any) => String(id) === String(item.productId))) || [];
        let bestPromo = null;
        let promoEffectivePct = 0;

        if (applicablePromos.length > 0) {
            applicablePromos.forEach(p => {
                let eff = p.promo_type === 'percentage' ? Number(p.discount_percentage) : (p.promo_type === 'bogo' && (promoCounts[p.id] || 0) >= p.bogo_buy ? ((p.bogo_buy - p.bogo_pay) / p.bogo_buy) * 100 : 0);
                if (eff > promoEffectivePct) { promoEffectivePct = eff; bestPromo = p; }
            });
        }

        // --- ⚔️ EVALUACIÓN B: MAYORISTA (Granular vs Global) ---
        let wholesaleEffectivePct = 0;
        let wholesaleType = '';
        let missingQty = 0; 
        let targetPct = 0;

        if (item.productWholesaleActive) {
            const parentTotalQty = parentProductTally[item.productId];
            const minQty = item.productWholesaleMinQty || 6;
            if (parentTotalQty >= minQty) {
                wholesaleEffectivePct = item.productWholesaleDiscountPct || 0;
                wholesaleType = 'individual';
            } else {
                wholesaleType = 'individual_pending';
                missingQty = minQty - parentTotalQty;
                targetPct = item.productWholesaleDiscountPct || 0;
            }
        } else if (isGlobalWholesaleMet) {
            wholesaleEffectivePct = globalWholesale.discount_percentage;
            wholesaleType = 'global';
        } else if (globalWholesale?.active) {
            // 🚀 BONUS: FOMO también para los productos de la Regla Global
            wholesaleType = 'global_pending';
            missingQty = globalWholesale.min_items - totalItemsInCart;
            targetPct = globalWholesale.discount_percentage;
        }

        // --- 🏆 RESOLUCIÓN DE COLISIONES Y SMART BADGES ---
        let finalAppliedPct = 0;
        let winner = '';
       
        if (promoEffectivePct >= wholesaleEffectivePct && promoEffectivePct > 0) {
            finalAppliedPct = promoEffectivePct;
            winner = 'promo';
            
            // 1. Asignamos la etiqueta de campaña por defecto
            if (bestPromo && (bestPromo as any).promo_type === 'percentage') {
                badge = { text: `${(bestPromo as any).title} (-${promoEffectivePct}%)`, type: 'applied' };
            }
            
            // 🚀 2. FIX DE UX (Upsell): Si la promo actual existe, pero la meta mayorista 
            // promete un % AÚN MAYOR, sobreescribimos la etiqueta para generar FOMO.
            if (wholesaleType === 'individual_pending' && targetPct > promoEffectivePct) {
                badge = { text: `Faltan ${missingQty} para -${targetPct}%`, type: 'pending' };
            } else if (wholesaleType === 'global_pending' && targetPct > promoEffectivePct && missingQty > 0) {
                badge = { text: `Faltan ${missingQty} para -${targetPct}% (Tienda)`, type: 'pending' };
            }

        } else if (wholesaleEffectivePct > 0) {
            finalAppliedPct = wholesaleEffectivePct;
            winner = 'wholesale';
            badge = { 
                text: wholesaleType === 'individual' ? `¡Al Mayor (-${wholesaleEffectivePct}%)!` : `¡Al Mayor Global (-${wholesaleEffectivePct}%)!`, 
                type: 'applied' 
            };
        } else if (wholesaleType === 'individual_pending') {
            badge = { text: `Faltan ${missingQty} para -${targetPct}%`, type: 'pending' };
        } else if (wholesaleType === 'global_pending' && missingQty > 0) {
            badge = { text: `Faltan ${missingQty} para -${targetPct}% (Tienda)`, type: 'pending' };
        }
        // --- 🧮 APLICACIÓN MATEMÁTICA Y RUTEO CONTABLE ---
        if (finalAppliedPct > 0) {
            const discountFactor = finalAppliedPct / 100;
            itemListDiscount = (listPrice * item.quantity) * discountFactor;
            itemCashDiscount = (cashPrice * item.quantity) * discountFactor;

            if (winner === 'promo') {
                listPromoDiscounts += itemListDiscount; 
                cashPromoDiscounts += itemCashDiscount;
            } else if (winner === 'wholesale') {
                wholesaleDiscountList += itemListDiscount;
                wholesaleDiscountCash += itemCashDiscount;
            }
        }

        const finalListPrice = listPrice - (itemListDiscount / item.quantity);
        const finalCashPrice = cashPrice - (itemCashDiscount / item.quantity);

        const effectiveIsExempt = applyTax ? item.isTaxExempt : false;
        if (!effectiveIsExempt) {
            taxableSubtotalList += (finalListPrice * item.quantity);
            taxableSubtotalCash += (finalCashPrice * item.quantity);
        }

        return { ...item, listPrice, cashPrice, finalListPrice, finalCashPrice, badge }
    });

    return { 
        processedItems, totalListNominal, totalCashNominal, listPromoDiscounts, cashPromoDiscounts,
        wholesaleDiscountList, wholesaleDiscountCash, 
        finalBsModeUSD: totalListNominal - listPromoDiscounts, 
        finalCashModeUSD: totalCashNominal - cashPromoDiscounts, 
        taxableSubtotalList, taxableSubtotalCash 
    };
}