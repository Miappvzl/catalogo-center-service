// Archivo: app/[slug]/promotor/actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'

// 🛡️ ZERO-TRUST: Usamos el Service Role Key para interactuar con la BD de forma segura
// sin exponer los datos al cliente público, saltando el RLS temporalmente solo para estas funciones.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // CRÍTICO: Asegúrate de tener esta variable en tu .env.local
)

export async function loginOrRegisterAffiliate(storeId: string, phone: string, name?: string, promoCode?: string) {
    try {
        // 1. Intentamos buscar al promotor por su teléfono en esta tienda
        const { data: existingAffiliate } = await supabaseAdmin
            .from('affiliates')
            .select('*')
            .eq('store_id', storeId)
            .eq('phone', phone)
            .single()

        if (existingAffiliate) {
            return { success: true, isNew: false, affiliate: existingAffiliate }
        }

        // 2. Si no existe, y no mandó nombre (está en la pantalla de solo login), pedimos registro
        if (!name || !promoCode) {
            return { success: true, isNew: true, affiliate: null }
        }

        // 3. Si no existe y mandó datos completos, lo registramos
        const cleanCode = promoCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
        
        const { data: newAffiliate, error: insertError } = await supabaseAdmin
            .from('affiliates')
            .insert({
                store_id: storeId,
                name: name,
                phone: phone,
                promo_code: cleanCode
            })
            .select()
            .single()

        if (insertError) {
            if (insertError.code === '23505') throw new Error('Este código de promoción ya está en uso. Elige otro.')
            throw new Error('Error al registrar el afiliado.')
        }

        return { success: true, isNew: false, affiliate: newAffiliate }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getAffiliateDashboard(affiliateId: string) {
    try {
        // Obtenemos todas las comisiones de este promotor
        const { data: commissions, error } = await supabaseAdmin
            .from('commissions')
            .select('amount_usd, status, created_at')
            .eq('affiliate_id', affiliateId)
            .order('created_at', { ascending: false })

        if (error) throw error

        let pending = 0;
        let available = 0;
        let paid = 0;

        commissions.forEach(c => {
            if (c.status === 'pending') pending += Number(c.amount_usd)
            if (c.status === 'approved') available += Number(c.amount_usd)
            if (c.status === 'paid_out') paid += Number(c.amount_usd)
        })

        return { success: true, stats: { pending, available, paid }, history: commissions.slice(0, 10) }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function savePaymentDetails(affiliateId: string, details: any) {
    try {
        const { error } = await supabaseAdmin
            .from('affiliates')
            .update({ payment_details: details })
            .eq('id', affiliateId)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}