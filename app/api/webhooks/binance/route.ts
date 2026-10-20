import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { decrypt } from '@/utils/crypto';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList = req.headers;
    
    const timestamp = headersList.get('binancepay-timestamp') || headersList.get('Binancepay-Timestamp');
    const nonce = headersList.get('binancepay-nonce') || headersList.get('Binancepay-Nonce');
    const signature = headersList.get('binancepay-signature') || headersList.get('Binancepay-Signature');

    if (!timestamp || !nonce || !signature) {
      console.warn('[BINANCE WEBHOOK] Petición rechazada: Faltan headers de seguridad.');
      return NextResponse.json({ error: 'Missing security headers' }, { status: 400 });
    }

    let payloadObj: any;
    try {
      payloadObj = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (payloadObj.bizType === 'PAY_CLOSED') {
      return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null }, { status: 200 });
    }

    if (payloadObj.bizStatus !== 'PAY_SUCCESS') {
      return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null }, { status: 200 });
    }

    const prepayId = payloadObj.bizId;
    if (!prepayId) {
      return NextResponse.json({ error: 'Missing bizId in payload' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('pf_transaction_id', prepayId)
      .maybeSingle();

    if (orderError || !order) {
      console.warn('[BINANCE WEBHOOK] No se encontró orden asociada para el prepayId:', prepayId);
      return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null }, { status: 200 });
    }

    if (order.status === 'paid') {
      return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null }, { status: 200 });
    }

    const { data: credentials } = await supabaseAdmin
      .from('store_payment_credentials')
      .select('secret_key_encrypted')
      .eq('store_id', order.store_id)
      .eq('provider', 'binance')
      .single();

    if (!credentials) {
      console.error('[BINANCE WEBHOOK] Credenciales no disponibles para la tienda:', order.store_id);
      return NextResponse.json({ error: 'Store credentials not configured' }, { status: 500 });
    }

    const secretKey = decrypt(credentials.secret_key_encrypted);

    const payloadToSign = `${timestamp}\n${nonce}\n${rawBody}\n`;
    const expectedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(payloadToSign)
      .digest('hex')
      .toUpperCase();

    if (signature.toUpperCase() !== expectedSignature) {
      console.error(`[BINANCE WEBHOOK] 🚨 ATENTADO DE SEGURIDAD INTERCEPTADO. 
        Tienda: ${order.store_id} | Orden: ${order.order_number}`);
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        pf_payment_status: 'paid',
        pf_metadata: {
          ...order.pf_metadata,
          webhook_payload: payloadObj,
          reconciled_via: 'binance_webhook',
          reconciled_at: new Date().toISOString(),
        },
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('[BINANCE WEBHOOK] Error actualizando orden en DB:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://preziso.shop';
    fetch(`${appUrl}/api/web-push/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: order.store_id,
        orderNumber: order.order_number,
        totalUsd: order.total_usd,
        customerName: order.customer_name,
      }),
    }).catch(() => {});

    console.log(`✅ [BINANCE WEBHOOK] Orden #${order.order_number} conciliada con éxito.`);

    return NextResponse.json({ returnCode: 'SUCCESS', returnMessage: null }, { status: 200 });

  } catch (error: any) {
    console.error('[BINANCE WEBHOOK CRITICAL ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}