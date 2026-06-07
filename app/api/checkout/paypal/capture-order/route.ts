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
        const { storeId, orderId } = await req.json();

        const { data: credentials } = await supabase
            .from('store_payment_credentials')
            .select('public_key, secret_key_encrypted')
            .eq('store_id', storeId)
            .eq('provider', 'paypal')
            .single();

        if (!credentials) throw new Error('Credenciales no encontradas');

        const clientId = credentials.public_key;
        const secretKey = decryptSecret(credentials.secret_key_encrypted);
        const authString = Buffer.from(`${clientId}:${secretKey}`).toString('base64');

        // Autenticación con la URL Dinámica
        const authResponse = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
        });
        const authData = await authResponse.json();

        // Captura con la URL Dinámica
        const captureResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.access_token}`,
                'Content-Type': 'application/json',
            }
        });

        const captureData = await captureResponse.json();
        
        if (captureData.status === 'COMPLETED') {
            return NextResponse.json({ success: true, transactionId: captureData.id });
        } else {
            throw new Error(captureData.message || 'El pago no pudo ser capturado');
        }

    } catch (error: any) {
        console.error('PayPal Capture Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}