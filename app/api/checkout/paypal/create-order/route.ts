import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/lib/encryption';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// 🚀 SWITCH DINÁMICO DE ENTORNO
const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

export async function POST(req: Request) {
    try {
        const { storeId, amount } = await req.json();

        if (!storeId || !amount || amount <= 0) {
            return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
        }

        const { data: credentials, error: credError } = await supabase
            .from('store_payment_credentials')
            .select('public_key, secret_key_encrypted, is_active')
            .eq('store_id', storeId)
            .eq('provider', 'paypal')
            .single();

        if (credError || !credentials || !credentials.is_active) {
            return NextResponse.json({ success: false, error: 'PayPal no está configurado correctamente en esta tienda' }, { status: 403 });
        }

        const clientId = credentials.public_key;
        const secretKey = decryptSecret(credentials.secret_key_encrypted);
        const authString = Buffer.from(`${clientId}:${secretKey}`).toString('base64');

        // Autenticación con la URL Dinámica
        const authResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials'
        });

        const authData = await authResponse.json();
        if (!authResponse.ok) throw new Error(authData.error_description || 'Fallo de autenticación con PayPal');

        // Creación de orden con la URL Dinámica
        const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: amount.toFixed(2)
                    }
                }]
            })
        });

        const orderData = await orderResponse.json();
        if (!orderResponse.ok) throw new Error('No se pudo generar la orden en PayPal');

        return NextResponse.json({ success: true, id: orderData.id });

    } catch (error: any) {
        console.error('PayPal Create Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}