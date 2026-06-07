import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptSecret } from '@/lib/encryption';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// 🚀 SWITCH DINÁMICO DE ENTORNO
const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

export async function POST(req: Request) {
    try {
        const { storeId, clientId, secretKey, isActive } = await req.json();

        if (!storeId || !clientId || !secretKey) {
            return NextResponse.json({ success: false, error: 'Faltan credenciales obligatorias' }, { status: 400 });
        }

        if (clientId.length < 20 || secretKey.length < 20) {
            return NextResponse.json({ success: false, error: 'Las credenciales no parecen válidas.' }, { status: 400 });
        }

        const encryptedSecret = encryptSecret(secretKey);

        const { error: dbError } = await supabase
            .from('store_payment_credentials')
            .upsert({
                store_id: storeId,
                provider: 'paypal',
                public_key: clientId.trim(),
                secret_key_encrypted: encryptedSecret,
                is_active: isActive,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'store_id, provider'
            });

        if (dbError) throw new Error('Error al guardar en la bóveda de credenciales');

        const authString = Buffer.from(`${clientId.trim()}:${secretKey.trim()}`).toString('base64');
        
        // Verificación con la URL Dinámica
        const authResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
        });

        if (!authResponse.ok) {
            await supabase.from('store_payment_credentials').update({ is_active: false }).eq('store_id', storeId).eq('provider', 'paypal');
            return NextResponse.json({ success: false, error: `Credenciales guardadas, pero PayPal las rechazó. Verifica que sean correctas para el entorno actual (${process.env.PAYPAL_ENVIRONMENT}).` }, { status: 401 });
        }

        const { data: storeData } = await supabase.from('stores').select('payment_config').eq('id', storeId).single();
        const currentConfig = storeData?.payment_config || {};

        const { error: storeError } = await supabase
            .from('stores')
            .update({
                payment_config: {
                    ...currentConfig,
                    paypal: {
                        active: isActive,
                        client_id: clientId.trim() 
                    }
                }
            })
            .eq('id', storeId);

        if (storeError) throw new Error('Error al sincronizar con el frontend de la tienda');

        return NextResponse.json({ success: true, message: 'Credenciales validadas y sincronizadas' });

    } catch (error: any) {
        console.error('PayPal Setup Error:', error);
        return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}