import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { decrypt } from '@/utils/crypto';
import { generateSkylinkSignature } from '@/utils/skylink';

const SKYLINK_BASE_URL = process.env.SKYLINK_BASE_URL || 'https://dev-axis-payment.valinkgroup.com';

export async function POST(req: Request) {
  try {
    const { storeId, clientData, orderData, items } = await req.json();

    if (!storeId || !orderData || !items || items.length === 0) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios de la orden' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Obtener credenciales de Skylink para esta tienda
    const { data: credentials, error: credsError } = await supabaseAdmin
      .from('store_payment_credentials')
      .select('public_key, secret_key_encrypted, is_active')
      .eq('store_id', storeId)
      .eq('provider', 'skylink')
      .maybeSingle();

    if (credsError || !credentials || !credentials.is_active) {
      return NextResponse.json({ error: 'La pasarela Pago Móvil (Skylink) no está configurada o activa en esta tienda' }, { status: 400 });
    }

    const commerceCode = credentials.public_key;
    const apiKey = decrypt(credentials.secret_key_encrypted);

    // 2. Registrar la orden en Supabase en estado 'pending'
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        store_id: storeId,
        customer_name: clientData.name,
        customer_phone: clientData.phone,
        total_usd: orderData.total_usd,
        total_bs: orderData.total_bs,
        exchange_rate: orderData.exchange_rate,
        currency_type: orderData.currency_type || 'usd',
        status: 'pending',
        source: 'web',
        payment_method: 'Pago Móvil Automatizado',
        shipping_method: orderData.shipping_method,
        fulfillment_type: orderData.fulfillment_type || 'pickup',
        table_number: orderData.table_number || null,
        delivery_info: orderData.delivery_info,
        shipping_cost: orderData.shipping_cost || 0,
        subtotal_usd: orderData.subtotal_usd || orderData.total_usd,
        discount_amount: orderData.discount_amount || 0,
        customer_dni: clientData.identityCard || null,
        shipping_details: clientData.shipping_details || {},
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('[SKYLINK INIT] Error creando orden preliminar:', orderError);
      return NextResponse.json({ error: 'No se pudo crear la orden en la base de datos' }, { status: 500 });
    }

    // 3. Registrar los ítems de la orden
    const orderItemsPayload = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId && !isNaN(Number(item.productId)) ? Number(item.productId) : null,
      product_name: item.name,
      variant_info: item.variantInfo || 'N/A',
      quantity: item.quantity,
      price_at_purchase: item.basePrice,
      variant_id: item.variantId && item.variantId.length === 36 ? item.variantId : null,
      sku: item.sku || null,
      modifiers_selected: item.foodModifiers || [],
      customer_notes: item.foodNotes || null,
    }));

    await supabaseAdmin.from('order_items').insert(orderItemsPayload);

    // 4. Preparar Payload para Skylink
    // Regla de Negocio: Monto en VES en céntimos (x100)
    const amountInCents = Math.round(Number(orderData.total_bs) * 100);
    const buyOrder = `ORD-${order.order_number}`;
    const sessionId = `SES-${Date.now()}`;

    const skylinkPayload = {
      amount: amountInCents,
      buyOrder,
      currency: 'VES',
      installments: 1,
      sessionId,
    };

    // 5. Firma Criptográfica HMAC-SHA256 (Llaves A-Z, salto \n)
    const path = '/api/v1/merchant/transactions';
    const { timestamp, signature, bodyString } = generateSkylinkSignature('POST', path, skylinkPayload, apiKey);

    // 6. Ejecutar petición al API de Skylink
    const skylinkResponse = await fetch(`${SKYLINK_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Commerce-Code': commerceCode,
        'X-Commerce-Id': commerceCode,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      body: bodyString,
    });

    const skylinkData = await skylinkResponse.json();

    if (!skylinkResponse.ok || !skylinkData.success) {
      console.error('[SKYLINK INIT] Error de respuesta de Skylink:', skylinkData);
      return NextResponse.json({ 
        error: skylinkData.message || 'Error al comunicarse con la pasarela de SkylinkPay' 
      }, { status: 502 });
    }

    const { token, url, id: transactionId } = skylinkData.data;

    // 7. Guardar el token y la referencia en la orden de Preziso para futura reconciliación
    await supabaseAdmin
      .from('orders')
      .update({
        pf_transaction_id: token, // Usamos este campo existente para almacenar el token de pago
        pf_metadata: {
          skylink_transaction_id: transactionId,
          skylink_token: token,
          buyOrder,
          amount_cents: amountInCents,
        },
      })
      .eq('id', order.id);

    return NextResponse.json({
      success: true,
      url,
      token,
      orderId: order.id,
      orderNumber: order.order_number,
    });

  } catch (error: any) {
    console.error('[SKYLINK INIT INTERNAL ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}