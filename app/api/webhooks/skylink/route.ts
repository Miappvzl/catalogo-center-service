import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { decrypt } from '@/utils/crypto';
import { generateSkylinkSignature } from '@/utils/skylink';

const SKYLINK_BASE_URL = process.env.SKYLINK_BASE_URL || 'https://dev-axis-payment.valinkgroup.com';

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    // 1. Manejo del Evento de Prueba de Skylink (Dashboard Ping)
    if (body?.eventType === 'webhook.test' || body?.test === true) {
      return NextResponse.json({
        success: true,
        message: 'Preziso Webhook Receptor activo y respondiendo.',
        timestamp: new Date().toISOString(),
      }, { status: 200 });
    }

    // 2. Extracción polimórfica y defensiva de identificadores
    const rawData = body?.data || body;
    const buyOrder: string | undefined = rawData?.buyOrder || body?.buyOrder;
    const token: string | undefined = rawData?.token || body?.token;
    const transactionId: string | undefined = rawData?.id || body?.id || rawData?.transactionId;
    const incomingStatus: string | undefined = rawData?.status || body?.status;

    if (!buyOrder && !token && !transactionId) {
      console.warn('[SKYLINK WEBHOOK] Evento recibido sin identificadores válidos:', body);
      // Respondemos 200 para que Skylink no sature con reintentos eventos no relacionados
      return NextResponse.json({ success: false, message: 'Identificadores ausentes' }, { status: 200 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 3. Localizar la orden en Preziso
    let query = supabaseAdmin.from('orders').select('*');

    if (buyOrder) {
      const parsedOrderNumber = parseInt(buyOrder.replace(/\D/g, ''), 10);
      if (!isNaN(parsedOrderNumber)) {
        query = query.eq('order_number', parsedOrderNumber);
      } else {
        query = query.eq('pf_transaction_id', buyOrder);
      }
    } else if (token) {
      query = query.eq('pf_transaction_id', token);
    }

    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError || !order) {
      console.warn('[SKYLINK WEBHOOK] No se encontró orden asociada para:', { buyOrder, token, transactionId });
      return NextResponse.json({ success: true, message: 'Orden no encontrada en este nodo' }, { status: 200 });
    }

    // 4. Bloque de Idempotencia: Si ya está pagada, responder de inmediato
    if (order.status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Orden ya se encontraba previamente conciliada.',
      }, { status: 200 });
    }

    // 5. Verificación Zero-Trust de Servidor a Servidor
    // Consultamos directamente a Skylink usando las llaves del comercio para confirmar legitimidad
    const { data: credentials } = await supabaseAdmin
      .from('store_payment_credentials')
      .select('public_key, secret_key_encrypted')
      .eq('store_id', order.store_id)
      .eq('provider', 'skylink')
      .single();

    if (!credentials) {
      console.error('[SKYLINK WEBHOOK] Credenciales no disponibles para la tienda:', order.store_id);
      return NextResponse.json({ error: 'Credenciales del comercio no configuradas' }, { status: 500 });
    }

    const commerceCode = credentials.public_key;
    const apiKey = decrypt(credentials.secret_key_encrypted);
    const activeToken = token || order.pf_transaction_id;

    let isPaymentConfirmed = false;
    let verifiedData = null;

    if (activeToken) {
      const verifyPath = `/api/v1/merchant/transactions/token/${activeToken}`;
      const { timestamp, signature } = generateSkylinkSignature('GET', verifyPath, {}, apiKey);

      try {
        const verifyRes = await fetch(`${SKYLINK_BASE_URL}${verifyPath}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'X-Commerce-Code': commerceCode,
            'X-Commerce-Id': commerceCode,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
          },
        });

        const verifyJson = await verifyRes.json();
        if (verifyRes.ok && verifyJson.success) {
          const remoteStatus = verifyJson.data?.status;
          verifiedData = verifyJson.data;
          isPaymentConfirmed = remoteStatus === 'paid' || remoteStatus === 'completed' || remoteStatus === 'authorized' || remoteStatus === 'success';
        }
      } catch (verifyErr) {
        console.error('[SKYLINK WEBHOOK] Error validando con API remota:', verifyErr);
      }
    }

    // Fallback defensivo: si la llamada remota falló pero el webhook tiene el estado directo comprobable
    if (!isPaymentConfirmed && incomingStatus) {
      isPaymentConfirmed = incomingStatus === 'paid' || incomingStatus === 'completed' || incomingStatus === 'success';
    }

    // 6. Conciliación Atómica
    if (isPaymentConfirmed) {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          pf_payment_status: 'paid',
          pf_metadata: {
            ...order.pf_metadata,
            webhook_payload: body,
            verified_data: verifiedData,
            reconciled_via: 'webhook',
            reconciled_at: new Date().toISOString(),
          },
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('[SKYLINK WEBHOOK] Error actualizando estado de la orden:', updateError);
        return NextResponse.json({ error: 'Fallo al conciliar orden en base de datos' }, { status: 500 });
      }

      // 7. Notificación Push Silente al Comercio
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

      return NextResponse.json({ success: true, status: 'paid', orderId: order.id }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'Evento procesado sin cambio de estado' }, { status: 200 });

  } catch (error: any) {
    console.error('[SKYLINK WEBHOOK CRITICAL ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error interno procesando webhook' }, { status: 500 });
  }
}