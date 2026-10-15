import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { decrypt } from '@/utils/crypto';
import { generateSkylinkSignature } from '@/utils/skylink';

const SKYLINK_BASE_URL = process.env.SKYLINK_BASE_URL || 'https://dev-axis-payment.valinkgroup.com';

export async function POST(req: Request) {
  try {
    const { storeId, token, orderId } = await req.json();

    if (!token && !orderId) {
      return NextResponse.json({ error: 'Se requiere el token o el orderId para verificar' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Obtener la orden
    let query = supabaseAdmin.from('orders').select('*');
    if (orderId) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('pf_transaction_id', token);
    }
    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Si ya está pagada en Supabase, responder inmediatamente
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, status: 'paid', order });
    }

    const effectiveStoreId = storeId || order.store_id;

    // 2. Obtener credenciales para consultar a Skylink
    const { data: credentials } = await supabaseAdmin
      .from('store_payment_credentials')
      .select('public_key, secret_key_encrypted')
      .eq('store_id', effectiveStoreId)
      .eq('provider', 'skylink')
      .single();

    if (!credentials) {
      return NextResponse.json({ error: 'Credenciales del comercio no encontradas' }, { status: 400 });
    }

    const commerceCode = credentials.public_key;
    const apiKey = decrypt(credentials.secret_key_encrypted);
    const activeToken = token || order.pf_transaction_id;

    // 3. Firmar consulta GET /api/v1/merchant/transactions/token/{token}
    const path = `/api/v1/merchant/transactions/token/${activeToken}`;
    const { timestamp, signature } = generateSkylinkSignature('GET', path, {}, apiKey);

    const skylinkRes = await fetch(`${SKYLINK_BASE_URL}${path}`, {
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

    const skylinkData = await skylinkRes.json();

    if (!skylinkRes.ok || !skylinkData.success) {
      return NextResponse.json({ 
        success: false, 
        status: order.status, 
        message: skylinkData.message || 'No se pudo validar el cobro en Skylink' 
      });
    }

    const txStatus = skylinkData.data?.status;

    // Estados de éxito típicos en pasarelas: 'paid', 'completed', 'authorized', 'success'
    const isPaid = txStatus === 'paid' || txStatus === 'completed' || txStatus === 'authorized' || txStatus === 'success';

    if (isPaid) {
      // 4. Actualización atómica en Supabase
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          pf_payment_status: 'paid',
          pf_metadata: {
            ...order.pf_metadata,
            skylink_verification_response: skylinkData.data,
          },
        })
        .eq('id', order.id)
        .select()
        .single();

      if (!updateError) {
        // Disparar Web Push silente al comerciante
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://preziso.shop'}/api/web-push/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: effectiveStoreId,
            orderNumber: order.order_number,
            totalUsd: order.total_usd,
            customerName: order.customer_name,
          }),
        }).catch(() => {});

        return NextResponse.json({ success: true, status: 'paid', order: updatedOrder });
      }
    }

    return NextResponse.json({
      success: true,
      status: txStatus || order.status,
      isPending: !isPaid,
      order,
    });

  } catch (error: any) {
    console.error('[SKYLINK VERIFY ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error verificando transacción' }, { status: 500 });
  }
}