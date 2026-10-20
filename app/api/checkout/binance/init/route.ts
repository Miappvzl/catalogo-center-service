import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabaseAdmin';
import { decrypt } from '@/utils/crypto';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    console.log("\n==========================================");
    console.log("🚀 [BINANCE PAY INIT] INICIANDO SECUENCIA");
    
    const body = await req.json();
    const { storeId, clientData, orderData, items } = body;

    if (!storeId || !orderData) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Extraer credenciales desde la bóveda criptográfica
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('store_payment_credentials')
      .select('public_key, secret_key_encrypted')
      .eq('store_id', storeId)
      .eq('provider', 'binance')
      .single();

    if (credError || !credentials) {
      return NextResponse.json({ error: 'Comercio sin Binance Pay configurado' }, { status: 400 });
    }

    const binanceApiKey = credentials.public_key;
    const binanceSecretKey = decrypt(credentials.secret_key_encrypted);

    // 2. Crear la orden en Supabase (Status: pending)
    const { data: newOrder, error: orderError } = await supabaseAdmin.from('orders').insert({
      store_id: storeId,
      customer_name: clientData?.name || 'Cliente Binance',
      customer_phone: clientData?.phone || '',
      total_usd: orderData.total_usd,
      total_bs: orderData.total_bs,
      exchange_rate: orderData.exchange_rate,
      currency_type: orderData.currency_type || 'usd',
      status: 'pending',
      payment_method: 'Binance Pay',
      pf_payment_status: 'pending',
      shipping_method: orderData.shipping_method,
      fulfillment_type: orderData.fulfillment_type || 'pickup',
      delivery_info: orderData.delivery_info,
      shipping_cost: orderData.shipping_cost || 0,
      discount_amount: orderData.discount_amount || 0,
      subtotal_usd: orderData.subtotal_usd || 0
    }).select('id, order_number').single();

    if (orderError) {
      console.error("❌ ERROR BD:", orderError);
      return NextResponse.json({ error: 'Error al registrar orden' }, { status: 500 });
    }

    // 3. Insertar los ítems del carrito
    if (Array.isArray(items) && items.length > 0) {
      const itemsPayload = items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.productId || null,
        product_name: item.name,
        quantity: item.quantity,
        price_at_purchase: item.basePrice,
        sku: item.sku || null,
        variant_info: item.variantInfo || 'N/A'
      }));
      await supabaseAdmin.from('order_items').insert(itemsPayload);
    }

    // 4. Preparar Payload para Binance
    const merchantTradeNo = `pz-${newOrder.order_number}-${crypto.randomBytes(4).toString('hex')}`;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const requestBody = {
      env: {
        terminalType: "WEB"
      },
      merchantTradeNo: merchantTradeNo,
      orderAmount: Number(orderData.total_usd).toFixed(2),
      currency: "USDT",
      description: `Pedido #${newOrder.order_number} en Preziso`,
      goodsDetails: [{
        goodsType: "01",
        goodsCategory: "Z000",
        referenceGoodsId: newOrder.order_number.toString(),
        goodsName: `Pedido #${newOrder.order_number}`,
        goodsDetail: "Bienes o servicios comprados mediante Preziso"
      }],
      returnUrl: `${baseUrl}/checkout/success`,
      cancelUrl: `${baseUrl}/checkout/error`,
      webhookUrl: `${baseUrl}/api/webhooks/binance`
    };

    // 5. Motor de Firmas (Binance Pay Signature Standard)
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const bodyString = JSON.stringify(requestBody);
    
    const payloadToSign = `${timestamp}\n${nonce}\n${bodyString}\n`;
    const signature = crypto.createHmac('sha512', binanceSecretKey).update(payloadToSign).digest('hex').toUpperCase();

    // 6. Conexión Criptográfica a Binance
    const binanceRes = await fetch('https://bpay.binanceapi.com/binancepay/openapi/v3/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'BinancePay-Timestamp': timestamp,
        'BinancePay-Nonce': nonce,
        'BinancePay-Certificate-Sn': binanceApiKey,
        'BinancePay-Signature': signature
      },
      body: bodyString
    });

    const binanceData = await binanceRes.json();

    if (binanceData.status !== "SUCCESS") {
      console.error("❌ RECHAZO DE BINANCE:", binanceData);
      await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', newOrder.id);
      return NextResponse.json({ error: binanceData.errorMessage || 'Binance rechazó la orden' }, { status: 400 });
    }

    const prepayId = binanceData.data.prepayId;
    await supabaseAdmin.from('orders').update({ pf_transaction_id: prepayId }).eq('id', newOrder.id);
    
    console.log("✅ FIN DE LA SECUENCIA: ÉXITO. prepayId:", prepayId);
    
    return NextResponse.json({ 
      success: true, 
      order_id: newOrder.id, 
      order_number: newOrder.order_number,
      checkoutUrl: binanceData.data.checkoutUrl,
      qrcodeLink: binanceData.data.qrcodeLink,
      universalUrl: binanceData.data.universalUrl,
      prepayId: prepayId 
    });

  } catch (error: any) {
    console.error('💥 CRASH FATAL:', error.message);
    return NextResponse.json({ error: 'Error interno en la pasarela Binance' }, { status: 500 });
  }
}